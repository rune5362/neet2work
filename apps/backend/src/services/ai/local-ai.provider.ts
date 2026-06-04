import { aiConfig, isLocalAiConfigured } from "../../config/ai-config.js";
import type {
  AiProvider,
  AiProviderExecuteInput,
  AiProviderExecuteResult,
  AiProviderStatus
} from "../../types/ai-routing.js";
import { buildDraftWorkflowPrompt } from "../draft-workflow/prompt-builder.js";
import { extractJsonObject, ProviderExecutionError, withTimeout } from "./provider-utils.js";

export class LocalAiProvider implements AiProvider {
  readonly id = "local" as const;
  readonly label = "Local AI";

  async getStatus(): Promise<AiProviderStatus> {
    const configured = isLocalAiConfigured();
    const modelId = aiConfig.localAi.model || "local-default";

    if (!configured) {
      return {
        providerId: this.id,
        label: this.label,
        online: false,
        configured: false,
        quotaExceeded: false,
        reason: aiConfig.localAi.enabled ? "missing_base_url" : "disabled",
        models: []
      };
    }

    const startedAt = Date.now();
    try {
      await withTimeout(this.ping(), 3_000, "local ai ping");
      return {
        providerId: this.id,
        label: this.label,
        online: true,
        configured: true,
        quotaExceeded: false,
        latencyMs: Date.now() - startedAt,
        models: [{ modelId, label: modelId, online: true, quotaExceeded: false, recommended: true }]
      };
    } catch {
      return {
        providerId: this.id,
        label: this.label,
        online: false,
        configured: true,
        quotaExceeded: false,
        reason: "local_offline",
        models: [{ modelId, label: modelId, online: false, quotaExceeded: false }]
      };
    }
  }

  async execute<T>(input: AiProviderExecuteInput<unknown>): Promise<AiProviderExecuteResult<T>> {
    if (!isLocalAiConfigured()) {
      throw new ProviderExecutionError("offline", "local ai not configured");
    }

    const startedAt = Date.now();
    const prompt = buildDraftWorkflowPrompt(input.operation, input.payload);
    const modelId = input.modelId ?? aiConfig.localAi.model ?? "local-default";

    const text =
      aiConfig.localAi.protocol === "openai_compatible"
        ? await this.callOpenAiCompatible(prompt, modelId, input.timeoutMs)
        : await this.callOllama(prompt, modelId, input.timeoutMs);

    const parsed = extractJsonObject(text);
    return {
      data: parsed as T,
      modelId,
      latencyMs: Date.now() - startedAt
    };
  }

  private async ping() {
    const url =
      aiConfig.localAi.protocol === "openai_compatible"
        ? `${aiConfig.localAi.baseUrl.replace(/\/$/, "")}/v1/models`
        : `${aiConfig.localAi.baseUrl.replace(/\/$/, "")}/api/tags`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new ProviderExecutionError("offline", "local ai offline");
    }
  }

  private async callOllama(prompt: string, model: string, timeoutMs: number) {
    const response = await withTimeout(
      fetch(`${aiConfig.localAi.baseUrl.replace(/\/$/, "")}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          format: "json"
        })
      }),
      timeoutMs,
      "ollama generate"
    );

    if (!response.ok) {
      throw new ProviderExecutionError("provider_error", `ollama http ${response.status}`);
    }

    const body = (await response.json()) as { response?: string };
    return body.response ?? "";
  }

  private async callOpenAiCompatible(prompt: string, model: string, timeoutMs: number) {
    const response = await withTimeout(
      fetch(`${aiConfig.localAi.baseUrl.replace(/\/$/, "")}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
          response_format: { type: "json_object" }
        })
      }),
      timeoutMs,
      "openai compatible generate"
    );

    if (!response.ok) {
      throw new ProviderExecutionError("provider_error", `openai compatible http ${response.status}`);
    }

    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return body.choices?.[0]?.message?.content ?? "";
  }
}
