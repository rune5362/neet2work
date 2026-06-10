import { aiConfig } from "../../config/ai-config.js";
import type {
  AiProvider,
  AiProviderExecuteInput,
  AiProviderExecuteResult,
  AiProviderStatus
} from "../../types/ai-routing.js";
import { buildDraftWorkflowPrompt } from "../draft-workflow/prompt-builder.js";
import { CodexAppServerClient } from "./codex-app-server-client.js";
import { extractWorkflowOutput, ProviderExecutionError, withTimeout } from "./provider-utils.js";

const CODEX_APP_SERVER_DEFAULT_MODEL_ID = "codex-app-server";

type CodexBridgeProviderOptions = {
  forceLocal?: boolean;
};

function codexModelId() {
  return aiConfig.codexBridge.model || CODEX_APP_SERVER_DEFAULT_MODEL_ID;
}

function normalizeCodexModelOverride(modelId?: string) {
  const normalized = modelId?.trim();
  if (!normalized || normalized === CODEX_APP_SERVER_DEFAULT_MODEL_ID) {
    return undefined;
  }
  return normalized;
}

function resolveCodexModelOverride(modelId?: string) {
  return normalizeCodexModelOverride(modelId) ?? normalizeCodexModelOverride(aiConfig.codexBridge.model);
}

function accountIsUsable(accountState: Awaited<ReturnType<CodexAppServerClient["readAccount"]>>) {
  return Boolean(accountState.account) || !accountState.requiresOpenaiAuth;
}

export class CodexBridgeProvider implements AiProvider {
  readonly id = "codex_bridge" as const;
  readonly label = "Codex Bridge";

  constructor(private readonly options: CodexBridgeProviderOptions = {}) {}

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

    if (this.shouldUseRemoteRelay()) {
      return this.getRemoteStatus();
    }

    const startedAt = Date.now();
    let client: CodexAppServerClient | undefined;

    try {
      client = new CodexAppServerClient({
        command: aiConfig.codexBridge.command,
        home: aiConfig.codexBridge.home
      });
      const accountState = await withTimeout(client.readAccount(true), 8_000, "codex app-server account/read");
      const modelId = codexModelId();

      if (!accountIsUsable(accountState)) {
        return {
          providerId: this.id,
          label: this.label,
          online: false,
          configured: true,
          quotaExceeded: false,
          reason: "codex_not_logged_in",
          models: [
            {
              modelId,
              label: modelId,
              online: false,
              quotaExceeded: false
            }
          ]
        };
      }

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
          : "codex_app_server_unavailable";

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
    } finally {
      client?.close();
    }
  }

  async execute<T>(input: AiProviderExecuteInput<unknown>): Promise<AiProviderExecuteResult<T>> {
    if (!aiConfig.codexBridge.enabled) {
      throw new ProviderExecutionError("offline", "codex bridge disabled");
    }

    if (this.shouldUseRemoteRelay()) {
      return this.executeRemote<T>(input);
    }

    const startedAt = Date.now();
    const prompt = buildDraftWorkflowPrompt(input.operation, input.payload);
    const modelId = resolveCodexModelOverride(input.modelId);
    let client: CodexAppServerClient | undefined;

    try {
      client = new CodexAppServerClient({
        command: aiConfig.codexBridge.command,
        home: aiConfig.codexBridge.home
      });
      const accountState = await withTimeout(client.readAccount(true), 8_000, "codex app-server account/read");
      if (!accountIsUsable(accountState)) {
        throw new ProviderExecutionError("offline", "codex_not_logged_in");
      }

      const turnTimeoutMs = Math.min(input.timeoutMs, aiConfig.codexBridge.turnTimeoutMs);
      const assistantOutput = await withTimeout(
        client.runPrompt({
          prompt,
          model: modelId || undefined,
          reasoningEffort: aiConfig.codexBridge.reasoningEffort || undefined,
          cwd: process.cwd()
        }),
        turnTimeoutMs,
        "codex app-server turn"
      );
      const parsed = extractWorkflowOutput(assistantOutput, input.operation);

      return {
        data: parsed as T,
        modelId: modelId || CODEX_APP_SERVER_DEFAULT_MODEL_ID,
        latencyMs: Date.now() - startedAt
      };
    } finally {
      client?.close();
    }
  }

  private shouldUseRemoteRelay() {
    return !this.options.forceLocal && Boolean(aiConfig.codexBridge.remoteBaseUrl);
  }

  private async getRemoteStatus() {
    const startedAt = Date.now();
    try {
      const response = await withTimeout(
        fetch(this.relayUrl("/api/codex-bridge-relay/status"), {
          headers: this.relayHeaders()
        }),
        8_000,
        "codex relay status"
      );

      if (!response.ok) {
        throw new ProviderExecutionError("offline", `codex relay status http ${response.status}`);
      }

      const body = (await response.json()) as { data?: AiProviderStatus };
      if (!body.data?.providerId) {
        throw new ProviderExecutionError("invalid_output", "codex relay status invalid");
      }

      return {
        ...body.data,
        latencyMs: Date.now() - startedAt
      };
    } catch (error) {
      return {
        providerId: this.id,
        label: this.label,
        online: false,
        configured: true,
        quotaExceeded: false,
        reason: error instanceof Error ? error.message : "codex_relay_unavailable",
        models: [
          {
            modelId: codexModelId(),
            label: codexModelId(),
            online: false,
            quotaExceeded: false
          }
        ]
      };
    }
  }

  private async executeRemote<T>(input: AiProviderExecuteInput<unknown>) {
    const response = await withTimeout(
      fetch(this.relayUrl("/api/codex-bridge-relay/execute"), {
        method: "POST",
        headers: {
          ...this.relayHeaders(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify(input)
      }),
      input.timeoutMs,
      "codex relay execute"
    );

    if (response.status === 429) {
      throw new ProviderExecutionError("quota_exceeded", "codex relay quota exceeded");
    }

    if (!response.ok) {
      throw new ProviderExecutionError("provider_error", `codex relay execute http ${response.status}`);
    }

    const body = (await response.json()) as { data?: AiProviderExecuteResult<T> };
    if (!body.data?.modelId) {
      throw new ProviderExecutionError("invalid_output", "codex relay execute invalid");
    }

    return body.data;
  }

  private relayUrl(pathname: string) {
    return `${aiConfig.codexBridge.remoteBaseUrl}${pathname}`;
  }

  private relayHeaders(): Record<string, string> {
    const token = aiConfig.codexBridge.relayToken.trim();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
}
