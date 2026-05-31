import { spawn } from "node:child_process";
import { aiConfig } from "../../config/ai-config.js";
import type {
  AiProvider,
  AiProviderExecuteInput,
  AiProviderExecuteResult,
  AiProviderStatus
} from "../../types/ai-routing.js";
import { buildDraftWorkflowPrompt } from "../draft-workflow/prompt-builder.js";
import {
  extractAssistantOutputFromJsonl,
  extractJsonObject,
  ProviderExecutionError,
  withTimeout
} from "./provider-utils.js";

export class CodexBridgeProvider implements AiProvider {
  readonly id = "codex_bridge" as const;
  readonly label = "Codex Bridge";

  async getStatus(): Promise<AiProviderStatus> {
    if (!aiConfig.codexBridge.enabled) {
      return {
        providerId: this.id,
        label: this.label,
        online: false,
        configured: false,
        quotaExceeded: false,
        reason: "disabled",
        models: []
      };
    }

    const startedAt = Date.now();
    try {
      await withTimeout(this.probeLogin(), 5_000, "codex probe");
      const modelId = aiConfig.codexBridge.model || "codex-default";
      return {
        providerId: this.id,
        label: this.label,
        online: true,
        configured: true,
        quotaExceeded: false,
        latencyMs: Date.now() - startedAt,
        models: [
          {
            modelId,
            label: modelId,
            online: true,
            quotaExceeded: false,
            recommended: true
          }
        ]
      };
    } catch (error) {
      const reason =
        error instanceof ProviderExecutionError && error.code === "timeout"
          ? "codex_probe_timeout"
          : "codex_not_logged_in";
      return {
        providerId: this.id,
        label: this.label,
        online: false,
        configured: true,
        quotaExceeded: false,
        reason,
        models: aiConfig.codexBridge.model
          ? [
              {
                modelId: aiConfig.codexBridge.model,
                label: aiConfig.codexBridge.model,
                online: false,
                quotaExceeded: false
              }
            ]
          : []
      };
    }
  }

  async execute<T>(input: AiProviderExecuteInput<unknown>): Promise<AiProviderExecuteResult<T>> {
    if (!aiConfig.codexBridge.enabled) {
      throw new ProviderExecutionError("offline", "codex bridge disabled");
    }

    const startedAt = Date.now();
    const prompt = buildDraftWorkflowPrompt(input.operation, input.payload);
    const args = ["--ask-for-approval", "never"];

    if (aiConfig.codexBridge.reasoningEffort) {
      args.push("-c", `model_reasoning_effort=${JSON.stringify(aiConfig.codexBridge.reasoningEffort)}`);
    }

    args.push("exec", "--ephemeral", "--sandbox", "read-only", "--json");

    if (aiConfig.codexBridge.model || input.modelId) {
      args.push("-m", input.modelId ?? aiConfig.codexBridge.model);
    }
    if (aiConfig.codexBridge.profile) {
      args.push("-p", aiConfig.codexBridge.profile);
    }
    args.push("-");

    const stdout = await withTimeout(this.runCommand(args, prompt), input.timeoutMs, "codex exec");
    const assistantOutput = extractAssistantOutputFromJsonl(stdout);
    const parsed = extractJsonObject(assistantOutput);

    return {
      data: parsed as T,
      modelId: input.modelId ?? aiConfig.codexBridge.model ?? "codex-default",
      latencyMs: Date.now() - startedAt
    };
  }

  private probeLogin() {
    return this.runCommand(["login", "status"]);
  }

  private runCommand(args: string[], stdin?: string) {
    return new Promise<string>((resolve, reject) => {
      const child = spawn(aiConfig.codexBridge.command, args, {
        shell: false,
        windowsHide: true
      });

      let stdout = "";
      let stderr = "";

      child.stdin?.end(stdin);
      child.stdout.on("data", (chunk: Buffer | string) => {
        stdout += String(chunk);
      });
      child.stderr.on("data", (chunk: Buffer | string) => {
        stderr += String(chunk);
      });
      child.on("error", () => reject(new ProviderExecutionError("offline", "codex_not_logged_in")));
      child.on("close", (code) => {
        if (code === 0) {
          resolve(stdout);
          return;
        }

        const combined = `${stderr}\n${stdout}`.toLowerCase();
        if (combined.includes("login") || combined.includes("auth")) {
          reject(new ProviderExecutionError("offline", "codex_not_logged_in"));
          return;
        }
        reject(new ProviderExecutionError("provider_error", stderr || `codex exited with ${code}`));
      });
    });
  }
}
