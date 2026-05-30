import { aiConfig, isGeminiConfigured } from "../../config/ai-config.js";
import type {
  AiProvider,
  AiProviderExecuteInput,
  AiProviderExecuteResult,
  AiProviderStatus
} from "../../types/ai-routing.js";
import { buildDraftWorkflowPrompt } from "../draft-workflow/prompt-builder.js";
import { extractJsonObject, ProviderExecutionError, withTimeout } from "./provider-utils.js";

export class GeminiProvider implements AiProvider {
  readonly id = "gemini" as const;
  readonly label = "Gemini";

  async getStatus(): Promise<AiProviderStatus> {
    const configured = isGeminiConfigured();
    const modelId = aiConfig.gemini.model;

    if (!configured) {
      return {
        providerId: this.id,
        label: this.label,
        online: false,
        configured: false,
        quotaExceeded: false,
        reason: aiConfig.gemini.enabled ? "missing_key_or_model" : "disabled",
        models: modelId
          ? [{ modelId, label: modelId, online: false, quotaExceeded: false }]
          : []
      };
    }

    const startedAt = Date.now();
    try {
      await withTimeout(this.ping(), aiConfig.gemini.timeoutMs, "gemini ping");
      return {
        providerId: this.id,
        label: this.label,
        online: true,
        configured: true,
        quotaExceeded: false,
        latencyMs: Date.now() - startedAt,
        models: [{ modelId, label: modelId, online: true, quotaExceeded: false, recommended: true }]
      };
    } catch (error) {
      const quotaExceeded = error instanceof ProviderExecutionError && error.code === "quota_exceeded";
      return {
        providerId: this.id,
        label: this.label,
        online: false,
        configured: true,
        quotaExceeded,
        reason: error instanceof Error ? error.message : "gemini_unavailable",
        models: [{ modelId, label: modelId, online: false, quotaExceeded }]
      };
    }
  }

  async execute<T>(input: AiProviderExecuteInput<unknown>): Promise<AiProviderExecuteResult<T>> {
    if (!isGeminiConfigured()) {
      throw new ProviderExecutionError("offline", "gemini not configured");
    }

    const startedAt = Date.now();
    const modelId = input.modelId ?? aiConfig.gemini.model;
    const prompt = buildDraftWorkflowPrompt(input.operation, input.payload);

    const response = await withTimeout(
      fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelId)}:generateContent?key=${encodeURIComponent(aiConfig.gemini.apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: "application/json"
            }
          })
        }
      ),
      input.timeoutMs,
      "gemini generate"
    );

    if (response.status === 429) {
      throw new ProviderExecutionError("quota_exceeded", "gemini quota exceeded");
    }
    if (!response.ok) {
      throw new ProviderExecutionError("provider_error", `gemini http ${response.status}`);
    }

    const body = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = body.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n") ?? "";
    const parsed = extractJsonObject(text);

    return {
      data: parsed as T,
      modelId,
      latencyMs: Date.now() - startedAt
    };
  }

  private async ping() {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(aiConfig.gemini.apiKey)}`
    );
    if (response.status === 429) {
      throw new ProviderExecutionError("quota_exceeded", "gemini quota exceeded");
    }
    if (!response.ok) {
      throw new ProviderExecutionError("offline", `gemini ping failed ${response.status}`);
    }
  }
}
