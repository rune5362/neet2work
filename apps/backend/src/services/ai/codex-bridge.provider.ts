import { aiConfig } from "../../config/ai-config.js";
import type {
  AiProvider,
  AiProviderExecuteInput,
  AiProviderExecuteResult,
  AiProviderStatus
} from "../../types/ai-routing.js";
import { buildDraftWorkflowPrompt } from "../draft-workflow/prompt-builder.js";
import { CodexAppServerClient } from "./codex-app-server-client.js";
import { extractJsonObject, ProviderExecutionError, withTimeout } from "./provider-utils.js";

const CODEX_APP_SERVER_DEFAULT_MODEL_ID = "codex-app-server";

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

      const assistantOutput = await withTimeout(
        client.runPrompt({
          prompt,
          model: modelId || undefined,
          reasoningEffort: aiConfig.codexBridge.reasoningEffort || undefined,
          cwd: process.cwd()
        }),
        input.timeoutMs,
        "codex app-server turn"
      );
      const parsed = extractJsonObject(assistantOutput);

      return {
        data: parsed as T,
        modelId: modelId || CODEX_APP_SERVER_DEFAULT_MODEL_ID,
        latencyMs: Date.now() - startedAt
      };
    } finally {
      client?.close();
    }
  }
}
