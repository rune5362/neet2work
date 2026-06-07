import { aiConfig, isGeminiConfigured } from "../../config/ai-config.js";
import type {
  AiProvider,
  AiProviderExecuteInput,
  AiProviderExecuteResult,
  AiProviderStatus
} from "../../types/ai-routing.js";
import { buildDraftWorkflowPrompt } from "../draft-workflow/prompt-builder.js";
import { extractJsonObject, ProviderExecutionError, withTimeout } from "./provider-utils.js";

const TRANSIENT_HTTP_RETRY_COUNT = 1;

export class GeminiProvider implements AiProvider {
  readonly id = "gemini" as const;
  readonly label = "Gemini";

  async getStatus(): Promise<AiProviderStatus> {
    const configured = isGeminiConfigured();
    const modelIds = aiConfig.gemini.models;

    if (!configured) {
      return {
        providerId: this.id,
        label: this.label,
        online: false,
        configured: false,
        quotaExceeded: false,
        reason: aiConfig.gemini.enabled ? "missing_key_or_model" : "disabled",
        models: modelIds.map((modelId) => ({ modelId, label: modelId, online: false, quotaExceeded: false }))
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
        models: modelIds.map((modelId, index) => ({
          modelId,
          label: modelId,
          online: true,
          quotaExceeded: false,
          recommended: index === 0
        }))
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
        models: modelIds.map((modelId) => ({ modelId, label: modelId, online: false, quotaExceeded }))
      };
    }
  }

  async execute<T>(input: AiProviderExecuteInput<unknown>): Promise<AiProviderExecuteResult<T>> {
    if (!isGeminiConfigured()) {
      throw new ProviderExecutionError("offline", "gemini not configured");
    }

    const startedAt = Date.now();
    const prompt = buildDraftWorkflowPrompt(input.operation, input.payload);
    const modelIds = this.resolveExecutionModels(input.modelId);
    let lastError: ProviderExecutionError | undefined;

    for (const modelId of modelIds) {
      try {
        const data = await this.generateWithModel<T>(modelId, prompt, input.timeoutMs);

        return {
          data,
          modelId,
          latencyMs: Date.now() - startedAt
        };
      } catch (error) {
        if (error instanceof ProviderExecutionError) {
          lastError = error;
          continue;
        }

        lastError = new ProviderExecutionError("provider_error", "gemini provider error");
      }
    }

    throw lastError ?? new ProviderExecutionError("provider_error", "gemini provider error");
  }

  private async generateWithModel<T>(modelId: string, prompt: string, timeoutMs: number) {
    let response: Response | undefined;

    for (let attempt = 0; attempt <= TRANSIENT_HTTP_RETRY_COUNT; attempt += 1) {
      response = await this.callGenerateContent(modelId, prompt, timeoutMs);

      if (response.status === 429) {
        throw new ProviderExecutionError("quota_exceeded", "gemini quota exceeded");
      }

      if (response.ok) {
        break;
      }

      const isLastAttempt = attempt === TRANSIENT_HTTP_RETRY_COUNT;
      if (response.status < 500 || isLastAttempt) {
        throw new ProviderExecutionError("provider_error", `gemini http ${response.status}`);
      }
    }

    if (!response?.ok) {
      throw new ProviderExecutionError("provider_error", "gemini provider error");
    }

    const body = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = body.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n") ?? "";
    const parsed = extractJsonObject(text);

    return parsed as T;
  }

  private async callGenerateContent(modelId: string, prompt: string, timeoutMs: number) {
    const apiVersion = this.resolveApiVersion(modelId);

    return withTimeout(
      fetch(
        `https://generativelanguage.googleapis.com/${apiVersion}/models/${encodeURIComponent(modelId)}:generateContent?key=${encodeURIComponent(aiConfig.gemini.apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              ...(modelId.startsWith("gemma-") ? {} : { responseMimeType: "application/json" })
            }
          })
        }
      ),
      timeoutMs,
      "gemini generate"
    );
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

  private resolveExecutionModels(selectedModelId?: string) {
    const selected = selectedModelId?.trim();
    const configured = aiConfig.gemini.models;

    if (!selected) {
      return configured;
    }

    return [selected, ...configured.filter((modelId) => modelId !== selected)];
  }

  private resolveApiVersion(modelId: string) {
    return modelId.startsWith("gemma-") ? "v1" : "v1beta";
  }
}
