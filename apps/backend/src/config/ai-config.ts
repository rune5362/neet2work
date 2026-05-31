import type { AiProviderId, AiRoutingMode } from "../types/ai-routing.js";

function parseProviderOrder(raw: string | undefined): AiProviderId[] {
  const allowed: AiProviderId[] = ["codex_bridge", "gemini", "local", "fallback"];
  const parsed = (raw ?? "codex_bridge,gemini,local,fallback")
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is AiProviderId => allowed.includes(item as AiProviderId));

  if (!parsed.includes("fallback")) {
    parsed.push("fallback");
  }

  return parsed.length > 0 ? parsed : allowed;
}

export const aiConfig = {
  routingDefault: (process.env.AI_ROUTING_DEFAULT ?? "auto") as AiRoutingMode,
  providerOrder: parseProviderOrder(process.env.AI_PROVIDER_ORDER),
  providerTimeoutMs: Number(process.env.AI_PROVIDER_TIMEOUT_MS) || 180_000,

  codexBridge: {
    enabled: process.env.CODEX_BRIDGE_ENABLED === "true",
    command: process.env.CODEX_BRIDGE_COMMAND ?? "codex",
    model: process.env.CODEX_BRIDGE_MODEL ?? "",
    reasoningEffort: process.env.CODEX_BRIDGE_REASONING_EFFORT ?? "",
    profile: process.env.CODEX_BRIDGE_PROFILE ?? ""
  },

  gemini: {
    enabled: process.env.GEMINI_ENABLED === "true",
    apiKey: process.env.GEMINI_API_KEY ?? "",
    model: process.env.GEMINI_MODEL ?? "",
    timeoutMs: Number(process.env.GEMINI_TIMEOUT_MS) || 120_000
  },

  localAi: {
    enabled: process.env.LOCAL_AI_ENABLED === "true",
    baseUrl: process.env.LOCAL_AI_BASE_URL ?? "http://localhost:11434",
    model: process.env.LOCAL_AI_MODEL ?? "",
    timeoutMs: Number(process.env.LOCAL_AI_TIMEOUT_MS) || 120_000,
    protocol: (process.env.LOCAL_AI_PROTOCOL ?? "ollama") as "ollama" | "openai_compatible"
  }
};

export function isGeminiConfigured() {
  return aiConfig.gemini.enabled && Boolean(aiConfig.gemini.apiKey) && Boolean(aiConfig.gemini.model);
}

export function isLocalAiConfigured() {
  return aiConfig.localAi.enabled && Boolean(aiConfig.localAi.baseUrl);
}

export function isCodexBridgeConfigured() {
  return aiConfig.codexBridge.enabled;
}
