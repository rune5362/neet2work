import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { aiConfig } from "../../config/ai-config.js";
import type {
  AgyCliStatusReason,
  AiProvider,
  AiProviderExecuteInput,
  AiProviderExecuteResult,
  AiProviderStatus
} from "../../types/ai-routing.js";
import { buildAgyCliDraftWorkflowPrompt } from "../draft-workflow/prompt-builder.js";
import { parseStrictJsonObject, ProviderExecutionError } from "./provider-utils.js";
import { runRemoteWrapperWithStdin } from "./ssh-helper.js";

type ProcessResult = {
  stdout: string;
  stderr: string;
  exitCode: number | null;
};

const AGY_COMMAND_NAMES = new Set(["agy.exe", "agy", "Antigravity.exe", "Antigravity"]);
const DEFAULT_MODEL_ID = "agy-cli";
const DEFAULT_WORKDIR_NAME = "neet2work-agy-workdir";

export class AgyCliProvider implements AiProvider {
  private static activeExecutions = 0;

  readonly id = "agy_cli" as const;
  readonly label = "Agy CLI";

  async getStatus(): Promise<AiProviderStatus> {
    const modelId = aiConfig.agyCli.model || DEFAULT_MODEL_ID;

    if (!aiConfig.agyCli.enabled) {
      return this.status(false, false, "disabled", modelId);
    }

    const configReason = aiConfig.agyCli.configErrorReason;
    if (configReason) {
      return this.status(false, false, configReason, modelId);
    }

    if (aiConfig.agyCli.ssh.enabled) {
      return this.onlineStatus(modelId);
    }

    const command = this.resolveCommand();
    if (!command) {
      return this.status(false, false, "missing_command", modelId);
    }

    if (!this.hasValidConfiguredWorkdir()) {
      return this.status(false, false, "invalid_command", modelId);
    }

    // Provider status is polled when the ai-analysis page loads. Even harmless-looking
    // Agy probes such as "--version" can attach to Antigravity and create conversations,
    // so status only validates local configuration. Real login/runtime errors surface
    // during execute(), which runs only for an explicit generation request.
    return this.onlineStatus(modelId);
  }

  async execute<T>(input: AiProviderExecuteInput<unknown>): Promise<AiProviderExecuteResult<T>> {
    if (!aiConfig.agyCli.enabled) {
      throw new ProviderExecutionError("offline", "disabled");
    }

    if (aiConfig.agyCli.configErrorReason) {
      throw new ProviderExecutionError("offline", aiConfig.agyCli.configErrorReason);
    }

    if (!this.hasProfileContexts(input.payload)) {
      throw new ProviderExecutionError("offline", "profile_context_required");
    }

    const modelId = this.resolveModelId(input.modelId);
    const prompt = buildAgyCliDraftWorkflowPrompt(input.operation, input.payload);
    const promptBytes = Buffer.byteLength(prompt, "utf8");
    if (promptBytes > aiConfig.agyCli.maxPromptBytes) {
      throw new ProviderExecutionError("provider_error", "prompt too large");
    }

    if (AgyCliProvider.activeExecutions >= aiConfig.agyCli.maxConcurrency) {
      throw new ProviderExecutionError("provider_error", "max concurrency exceeded");
    }

    const startedAt = Date.now();
    const timeoutMs = Math.min(input.timeoutMs, aiConfig.agyCli.timeoutMs);
    AgyCliProvider.activeExecutions += 1;

    try {
      if (aiConfig.agyCli.ssh.enabled) {
        const result = await runRemoteWrapperWithStdin(this.sshConfig(), prompt, timeoutMs);
        if (result.exitCode !== 0) {
          throw new ProviderExecutionError("provider_error", "agy ssh wrapper exited non-zero");
        }

        const parsed = parseStrictJsonObject(result.stdout);
        return {
          data: parsed as T,
          modelId,
          latencyMs: Date.now() - startedAt
        };
      }

      const command = this.resolveCommand();
      if (!command) {
        throw new ProviderExecutionError("offline", "missing_command");
      }

      const workdir = this.resolveWorkdir();
      if (!workdir) {
        throw new ProviderExecutionError("offline", "invalid_command");
      }

      const formatAgyPrintTimeout = (ms: number) => {
        return `${Math.max(1, Math.ceil(ms / 1000))}s`;
      };

      const args = ["--print-timeout", formatAgyPrintTimeout(timeoutMs), "--print", prompt];
      if (aiConfig.agyCli.sandboxEnabled) {
        args.unshift("--sandbox");
      }

      const result = await this.runLocalProcess(
        command,
        args,
        {
          timeoutMs,
          workdir,
          maxOutputBytes: aiConfig.agyCli.maxOutputBytes
        }
      );

      if (result.exitCode !== 0) {
        throw new ProviderExecutionError("provider_error", `agy cli exited non-zero (code: ${result.exitCode})`);
      }

      const stdout = result.stdout.trim() ? result.stdout : this.recoverTranscriptOutput(workdir, startedAt);
      const parsed = parseStrictJsonObject(stdout);
      return {
        data: parsed as T,
        modelId,
        latencyMs: Date.now() - startedAt
      };
    } finally {
      AgyCliProvider.activeExecutions -= 1;
    }
  }

  private status(configured: boolean, online: boolean, reason: AgyCliStatusReason, modelId: string): AiProviderStatus {
    return {
      providerId: this.id,
      label: this.label,
      online,
      configured,
      quotaExceeded: false,
      reason,
      models: modelId ? [{ modelId, label: modelId, online, quotaExceeded: false, recommended: online }] : []
    };
  }

  private onlineStatus(modelId: string): AiProviderStatus {
    return {
      providerId: this.id,
      label: this.label,
      online: true,
      configured: true,
      quotaExceeded: false,
      models: [{ modelId, label: modelId, online: true, quotaExceeded: false, recommended: true }]
    };
  }

  private resolveCommand() {
    const explicit = aiConfig.agyCli.command.trim();
    if (explicit) {
      if (!this.isAllowedAbsoluteCommand(explicit) || !existsSync(explicit)) {
        return undefined;
      }
      return explicit;
    }

    if (process.platform === "win32" && process.env.LOCALAPPDATA) {
      const official = path.join(process.env.LOCALAPPDATA, "agy", "bin", "agy.exe");
      if (existsSync(official)) {
        return official;
      }
    }

    if (process.env.NODE_ENV === "development") {
      return process.platform === "win32" ? "agy.exe" : "agy";
    }

    return undefined;
  }

  private isAllowedAbsoluteCommand(command: string) {
    return path.isAbsolute(command) && AGY_COMMAND_NAMES.has(path.basename(command));
  }

  private resolveWorkdir() {
    const configured = aiConfig.agyCli.workdir.trim();
    if (configured) {
      if (!path.isAbsolute(configured) || !existsSync(configured)) {
        return undefined;
      }
      return configured;
    }

    const defaultWorkdir = path.join(os.tmpdir(), DEFAULT_WORKDIR_NAME);
    mkdirSync(defaultWorkdir, { recursive: true });
    return defaultWorkdir;
  }

  private hasValidConfiguredWorkdir() {
    const configured = aiConfig.agyCli.workdir.trim();
    if (!configured) {
      return true;
    }

    return path.isAbsolute(configured) && existsSync(configured);
  }

  private resolveModelId(requestedModelId?: string) {
    const configured = aiConfig.agyCli.model || DEFAULT_MODEL_ID;
    if (!requestedModelId) {
      return configured;
    }

    return aiConfig.agyCli.modelAllowlist.includes(requestedModelId) ? requestedModelId : configured;
  }

  private sshConfig() {
    return {
      host: aiConfig.agyCli.ssh.host,
      port: aiConfig.agyCli.ssh.port,
      username: aiConfig.agyCli.ssh.username,
      keyPath: aiConfig.agyCli.ssh.keyPath,
      hostFingerprint: aiConfig.agyCli.ssh.hostFingerprint,
      knownHostsPath: aiConfig.agyCli.ssh.knownHostsPath,
      remoteWrapper: aiConfig.agyCli.ssh.remoteWrapper,
      connectTimeoutMs: aiConfig.agyCli.ssh.connectTimeoutMs,
      execTimeoutMs: aiConfig.agyCli.ssh.execTimeoutMs,
      maxOutputBytes: aiConfig.agyCli.maxOutputBytes
    };
  }

  private hasProfileContexts(payload: unknown) {
    if (!payload || typeof payload !== "object") {
      return false;
    }

    const experienceInput = (payload as { experienceInput?: { profileContexts?: unknown[] } }).experienceInput;
    return Array.isArray(experienceInput?.profileContexts) && experienceInput.profileContexts.length > 0;
  }

  private runLocalProcess(
    command: string,
    args: string[],
    options: { timeoutMs: number; workdir: string; maxOutputBytes: number }
  ) {
    return new Promise<ProcessResult>((resolve, reject) => {
      let settled = false;
      let stdout = "";
      let stderr = "";
      let stdoutBytes = 0;
      let stderrBytes = 0;

      const child = spawn(command, args, {
        cwd: options.workdir,
        env: this.buildChildEnv(),
        shell: false,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true
      });

      const finish = (callback: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        callback();
      };

      const killChild = () => {
        try {
          child.kill();
        } catch {
          // Best-effort cleanup only.
        }
      };

      const timer = setTimeout(() => {
        killChild();
        finish(() => reject(new ProviderExecutionError("timeout", "agy cli timeout")));
      }, options.timeoutMs);

      const collect = (chunk: Buffer, stream: "stdout" | "stderr") => {
        const bytes = chunk.byteLength;
        if (stream === "stdout") {
          stdoutBytes += bytes;
          stdout += chunk.toString("utf8");
        } else {
          stderrBytes += bytes;
          stderr += chunk.toString("utf8");
        }

        if (stdoutBytes + stderrBytes > options.maxOutputBytes) {
          killChild();
          finish(() => reject(new ProviderExecutionError("provider_error", "output_limit_exceeded")));
        }
      };

      child.stdout?.on("data", (chunk: Buffer) => collect(chunk, "stdout"));
      child.stderr?.on("data", (chunk: Buffer) => collect(chunk, "stderr"));
      child.on("error", () => {
        finish(() => reject(new ProviderExecutionError("offline", "missing_command")));
      });
      child.on("close", (exitCode) => {
        finish(() => resolve({ stdout, stderr, exitCode }));
      });
    });
  }

  private buildChildEnv() {
    const keys = [
      "PATH",
      "Path",
      "SystemRoot",
      "WINDIR",
      "USERPROFILE",
      "HOME",
      "LOCALAPPDATA",
      "APPDATA",
      "TMP",
      "TEMP"
    ];
    const env: NodeJS.ProcessEnv = {};

    for (const key of keys) {
      if (process.env[key]) {
        env[key] = process.env[key];
      }
    }

    delete env.AGY_BROWSER_ACTIVE_PORT_FILE;
    delete env.AGY_BROWSER_WS_URL;

    return env;
  }

  private recoverTranscriptOutput(workdir: string, startedAt: number) {
    const appDataDir = this.resolveAgyAppDataDir();
    if (!appDataDir) {
      return "";
    }

    const conversationId = this.resolveLastConversationId(appDataDir, workdir);
    if (!conversationId || !/^[0-9a-f-]{36}$/i.test(conversationId)) {
      return "";
    }

    const transcriptPaths = ["transcript_full.jsonl", "transcript.jsonl"].map((fileName) =>
      path.join(
        appDataDir,
        "brain",
        conversationId,
        ".system_generated",
        "logs",
        fileName
      )
    );

    for (const transcriptPath of transcriptPaths) {
      try {
        const stats = statSync(transcriptPath);
        if (stats.mtimeMs + 2_000 < startedAt) {
          continue;
        }

        const lines = readFileSync(transcriptPath, "utf8").split(/\r?\n/).filter(Boolean);
        for (let index = lines.length - 1; index >= 0; index -= 1) {
          const line = lines[index];
          try {
            const entry = JSON.parse(line) as {
              source?: string;
              type?: string;
              status?: string;
              content?: unknown;
            };
            if (entry.source === "MODEL" && entry.status === "DONE" && typeof entry.content === "string") {
              return entry.content;
            }
          } catch {
            // Ignore malformed transcript lines.
          }
        }
      } catch {
        // Try the next transcript format.
      }
    }

    return "";
  }

  private resolveLastConversationId(appDataDir: string, workdir: string) {
    try {
      const raw = readFileSync(path.join(appDataDir, "cache", "last_conversations.json"), "utf8");
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const direct = parsed[workdir];
      if (typeof direct === "string") {
        return direct;
      }

      const normalizedWorkdir = path.resolve(workdir).toLowerCase();
      const matched = Object.entries(parsed).find(([key]) => path.resolve(key).toLowerCase() === normalizedWorkdir);
      return typeof matched?.[1] === "string" ? matched[1] : "";
    } catch {
      return "";
    }
  }

  private resolveAgyAppDataDir() {
    const home = process.env.USERPROFILE || process.env.HOME;
    return home ? path.join(home, ".gemini", "antigravity-cli") : "";
  }

}
