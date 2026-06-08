import dotenv from "dotenv";
import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AiProviderId, AiRoutingMode } from "../types/ai-routing.js";

const configDir = path.dirname(fileURLToPath(import.meta.url));
const rootEnvPath = path.resolve(configDir, "../../../..", ".env");
const backendEnvPath = path.resolve(configDir, "../..", ".env");

if (process.env.NODE_ENV !== "test") {
  dotenv.config({ path: rootEnvPath });
  dotenv.config({ path: backendEnvPath, override: true });
}

const DEFAULT_PROVIDER_TIMEOUT_MS = 180_000;
const DEFAULT_CODEX_BRIDGE_TURN_TIMEOUT_MS = 300_000;

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

function parseModelList(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function resolveCodexBridgeCommand() {
  const explicit = process.env.CODEX_BRIDGE_COMMAND?.trim();
  if (explicit) {
    return explicit;
  }

  const codexCliPath = process.env.CODEX_CLI_PATH?.trim();
  if (codexCliPath) {
    return codexCliPath;
  }

  if (process.platform === "win32" && process.env.LOCALAPPDATA) {
    const baseDir = path.join(process.env.LOCALAPPDATA, "OpenAI", "Codex", "bin");

    try {
      const candidates = readdirSync(baseDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => path.join(baseDir, entry.name, "codex.exe"))
        .filter((candidate) => existsSync(candidate))
        .map((candidate) => ({ path: candidate, mtimeMs: statSync(candidate).mtimeMs }))
        .sort((left, right) => right.mtimeMs - left.mtimeMs);

      if (candidates[0]) {
        return candidates[0].path;
      }
    } catch {
      // Fall through to PATH lookup below.
    }
  }

  return "codex";
}

function defaultUserCodexHome() {
  const home = process.env.USERPROFILE || process.env.HOME;
  return home ? path.join(home, ".codex") : "";
}

function resolveCodexBridgeHome() {
  const explicit = process.env.CODEX_BRIDGE_HOME?.trim();
  if (explicit) {
    return explicit;
  }

  const defaultHome = defaultUserCodexHome();
  if (defaultHome && existsSync(defaultHome)) {
    return defaultHome;
  }

  return process.env.CODEX_HOME?.trim() ?? "";
}

export const aiConfig = {
  routingDefault: (process.env.AI_ROUTING_DEFAULT ?? "auto") as AiRoutingMode,
  providerOrder: parseProviderOrder(process.env.AI_PROVIDER_ORDER),
  providerTimeoutMs: Number(process.env.AI_PROVIDER_TIMEOUT_MS) || DEFAULT_PROVIDER_TIMEOUT_MS,

  codexBridge: {
    enabled: process.env.CODEX_BRIDGE_ENABLED === "true",
    command: resolveCodexBridgeCommand(),
    home: resolveCodexBridgeHome(),
    model: process.env.CODEX_BRIDGE_MODEL ?? "",
    reasoningEffort: process.env.CODEX_BRIDGE_REASONING_EFFORT ?? "",
    turnTimeoutMs: Number(process.env.CODEX_BRIDGE_TURN_TIMEOUT_MS) || DEFAULT_CODEX_BRIDGE_TURN_TIMEOUT_MS
  },

  gemini: (() => {
    const modelsFromList = parseModelList(process.env.GEMINI_MODELS);
    const legacyModel = process.env.GEMINI_MODEL?.trim() ?? "";
    const models = modelsFromList.length > 0 ? modelsFromList : legacyModel ? [legacyModel] : [];

    return {
      enabled: process.env.GEMINI_ENABLED === "true",
      apiKey: process.env.GEMINI_API_KEY ?? "",
      model: models[0] ?? "",
      models,
      timeoutMs: Number(process.env.GEMINI_TIMEOUT_MS) || 120_000
    };
  })(),

  localAi: {
    enabled: process.env.LOCAL_AI_ENABLED === "true",
    baseUrl: process.env.LOCAL_AI_BASE_URL ?? "http://localhost:11434",
    model: process.env.LOCAL_AI_MODEL ?? "",
    timeoutMs: Number(process.env.LOCAL_AI_TIMEOUT_MS) || 120_000,
    protocol: (process.env.LOCAL_AI_PROTOCOL ?? "ollama") as "ollama" | "openai_compatible"
  }
};

export function isGeminiConfigured() {
  return aiConfig.gemini.enabled && Boolean(aiConfig.gemini.apiKey) && aiConfig.gemini.models.length > 0;
}

export function isLocalAiConfigured() {
  return aiConfig.localAi.enabled && Boolean(aiConfig.localAi.baseUrl);
}

export function isCodexBridgeConfigured() {
  return aiConfig.codexBridge.enabled;
}
