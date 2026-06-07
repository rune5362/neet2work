import { aiConfig } from "../../config/ai-config.js";
import type {
  AiExecutionMeta,
  AiProvider,
  AiProviderId,
  AiProviderStatus,
  AiRoutingMode,
  AiSelection,
  AiWorkflowOperation,
  FallbackReason
} from "../../types/ai-routing.js";
import { AgyCliProvider } from "./agy-cli.provider.js";
import { CodexBridgeProvider } from "./codex-bridge.provider.js";
import { GeminiProvider } from "./gemini.provider.js";
import { HardcodedFallbackProvider } from "./hardcoded-fallback.provider.js";
import { LocalAiProvider } from "./local-ai.provider.js";
import { ProviderExecutionError } from "./provider-utils.js";

export class AiRouter {
  private readonly providers: Map<AiProviderId, AiProvider>;

  constructor(providers: AiProvider[]) {
    this.providers = new Map(providers.map((provider) => [provider.id, provider]));
  }

  static createDefault() {
    return new AiRouter([
      new CodexBridgeProvider(),
      new GeminiProvider(),
      new LocalAiProvider(),
      new AgyCliProvider(),
      new HardcodedFallbackProvider()
    ]);
  }

  async listProviderStatuses(): Promise<AiProviderStatus[]> {
    const statuses = await Promise.all(
      aiConfig.providerOrder.map(async (providerId) => {
        const provider = this.providers.get(providerId);
        if (!provider) {
          return {
            providerId,
            label: providerId,
            online: false,
            configured: false,
            quotaExceeded: false,
            reason: "unknown_provider",
            models: []
          } satisfies AiProviderStatus;
        }
        return provider.getStatus();
      })
    );
    return statuses;
  }

  async execute<T>(input: {
    operation: AiWorkflowOperation;
    payload: unknown;
    aiSelection: AiSelection;
  }): Promise<{ data: T; aiMeta: AiExecutionMeta }> {
    const routingMode = input.aiSelection.mode ?? aiConfig.routingDefault;
    const candidates = this.resolveCandidates(routingMode, input.aiSelection);
    const timeoutMs = aiConfig.providerTimeoutMs;
    let lastReason: FallbackReason = "all_providers_unavailable";

    for (const candidate of candidates) {
      if (candidate === "fallback") {
        continue;
      }

      const provider = this.providers.get(candidate);
      if (!provider) continue;

      const status = await provider.getStatus();
      if (!status.configured) {
        lastReason = "offline";
        continue;
      }
      if (status.quotaExceeded) {
        lastReason = "quota_exceeded";
        if (routingMode === "manual") break;
        continue;
      }
      if (!status.online) {
        lastReason = "offline";
        if (routingMode === "manual") break;
        continue;
      }

      try {
        const result = await provider.execute<T>({
          operation: input.operation,
          payload: input.payload,
          modelId: input.aiSelection.modelId,
          timeoutMs
        });

        return {
          data: result.data,
          aiMeta: {
            providerId: provider.id,
            modelId: result.modelId,
            routingMode,
            usedFallback: false
          }
        };
      } catch (error) {
        if (error instanceof ProviderExecutionError) {
          lastReason = error.code;
          if (routingMode === "manual") break;
          continue;
        }
        lastReason = "provider_error";
        if (routingMode === "manual") break;
      }
    }

    return this.executeFallback<T>({
      operation: input.operation,
      payload: input.payload,
      routingMode,
      fallbackReason: lastReason
    });
  }

  async executeFallback<T>(input: {
    operation: AiWorkflowOperation;
    payload: unknown;
    routingMode?: AiRoutingMode;
    fallbackReason?: FallbackReason;
  }): Promise<{ data: T; aiMeta: AiExecutionMeta }> {
    const fallback = this.providers.get("fallback");
    if (!fallback) {
      throw new Error("fallback provider unavailable");
    }

    const fallbackResult = await fallback.execute<T>({
      operation: input.operation,
      payload: input.payload,
      timeoutMs: aiConfig.providerTimeoutMs
    });

    return {
      data: fallbackResult.data,
      aiMeta: {
        providerId: "fallback",
        modelId: fallbackResult.modelId,
        routingMode: input.routingMode ?? aiConfig.routingDefault,
        usedFallback: true,
        fallbackReason: input.fallbackReason ?? "all_providers_unavailable"
      }
    };
  }

  private resolveCandidates(mode: AiSelection["mode"], selection: AiSelection): AiProviderId[] {
    if (mode === "manual" && selection.providerId) {
      return selection.providerId === "fallback" ? ["fallback"] : [selection.providerId, "fallback"];
    }

    const ordered = aiConfig.providerOrder.filter((providerId) => providerId !== "fallback");
    return [...ordered, "fallback"];
  }
}

export const defaultAiRouter = AiRouter.createDefault();
