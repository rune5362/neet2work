import dotenv from "dotenv";
import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AgyCliStatusReason, AiProviderId, AiRoutingMode } from "../types/ai-routing.js";

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
  const allowed: AiProviderId[] = ["codex_bridge", "gemini", "local", "agy_cli", "fallback"];
  const parsed = (raw ?? "codex_bridge,gemini,local,agy_cli,fallback")
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is AiProviderId => allowed.includes(item as AiProviderId));

  if (!parsed.includes("fallback")) {
    parsed.push("fallback");
  }

  return parsed.length > 0 ? parsed : allowed;
}

function parsePositiveInteger(raw: string | undefined, fallback: number) {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseModelList(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isAllowedAgyCliCommand(command: string) {
  const allowedNames = new Set(["agy.exe", "agy", "Antigravity.exe", "Antigravity"]);
  return path.isAbsolute(command) && allowedNames.has(path.basename(command));
}

function isValidAgyCliWorkdir(workdir: string) {
  return path.isAbsolute(workdir);
}

function isValidRemoteWrapperPath(wrapperPath: string) {
  return (
    (/^\/[^\s"'`;&|<>$]+$/.test(wrapperPath) || /^[A-Za-z]:\\[^\s"'`;&|<>$]+$/.test(wrapperPath)) &&
    !wrapperPath.includes("..")
  );
}

function parseAgyCliConfigError(input: {
  enabled: boolean;
  command: string;
  sandboxEnabled: boolean;
  taskProfile: string;
  workdir: string;
  sshEnabled: boolean;
  sshHost: string;
  sshUsername: string;
  sshKeyPath: string;
  sshHostFingerprint: string;
  sshKnownHostsPath: string;
  sshRemoteWrapper: string;
}): AgyCliStatusReason | undefined {
  if (!input.sandboxEnabled) {
    return "sandbox_required";
  }

  if (input.taskProfile !== "cover_letter_review") {
    return "invalid_task_profile";
  }

  if (input.command && !isAllowedAgyCliCommand(input.command)) {
    return "invalid_command";
  }

  if (input.workdir && !isValidAgyCliWorkdir(input.workdir)) {
    return "invalid_command";
  }

  if (input.sshEnabled) {
    if (!input.sshHost || !input.sshUsername || !input.sshKeyPath || (!input.sshHostFingerprint && !input.sshKnownHostsPath)) {
      return "ssh_missing_config";
    }

    if (!isValidRemoteWrapperPath(input.sshRemoteWrapper)) {
      return "ssh_wrapper_invalid";
    }
  }

  return undefined;
}

function normalizeBaseUrl(raw: string | undefined) {
  return raw?.trim().replace(/\/+$/, "") ?? "";
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
  providerTimeoutMs: parsePositiveInteger(process.env.AI_PROVIDER_TIMEOUT_MS, DEFAULT_PROVIDER_TIMEOUT_MS),

  codexBridge: {
    enabled: process.env.CODEX_BRIDGE_ENABLED === "true",
    command: resolveCodexBridgeCommand(),
    home: resolveCodexBridgeHome(),
    model: process.env.CODEX_BRIDGE_MODEL ?? "",
    reasoningEffort: process.env.CODEX_BRIDGE_REASONING_EFFORT ?? "",
    turnTimeoutMs: parsePositiveInteger(process.env.CODEX_BRIDGE_TURN_TIMEOUT_MS, DEFAULT_CODEX_BRIDGE_TURN_TIMEOUT_MS),
    remoteBaseUrl: normalizeBaseUrl(process.env.CODEX_BRIDGE_REMOTE_BASE_URL),
    relayEnabled: process.env.CODEX_BRIDGE_RELAY_ENABLED === "true",
    relayToken: process.env.CODEX_BRIDGE_RELAY_TOKEN ?? ""
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
      timeoutMs: parsePositiveInteger(process.env.GEMINI_TIMEOUT_MS, 120_000)
    };
  })(),

  localAi: {
    enabled: process.env.LOCAL_AI_ENABLED === "true",
    baseUrl: process.env.LOCAL_AI_BASE_URL ?? "http://localhost:11434",
    model: process.env.LOCAL_AI_MODEL ?? "",
    timeoutMs: parsePositiveInteger(process.env.LOCAL_AI_TIMEOUT_MS, 120_000),
    protocol: (process.env.LOCAL_AI_PROTOCOL ?? "ollama") as "ollama" | "openai_compatible"
  },

  agyCli: (() => {
    const enabled = process.env.AGY_CLI_ENABLED === "true";
    const command = process.env.AGY_CLI_COMMAND?.trim() ?? "";
    const sandboxRaw = process.env.AGY_CLI_SANDBOX_ENABLED?.trim();
    const sandboxEnabled = sandboxRaw === undefined ? true : sandboxRaw === "true";
    const taskProfile = process.env.AGY_CLI_TASK_PROFILE?.trim() || "cover_letter_review";
    const workdir = process.env.AGY_CLI_WORKDIR?.trim() ?? "";
    const sshEnabled = process.env.AGY_SSH_ENABLED === "true";
    const sshHost = process.env.AGY_SSH_HOST?.trim() ?? "";
    const sshUsername = process.env.AGY_SSH_USERNAME?.trim() ?? "";
    const sshKeyPath = process.env.AGY_SSH_KEY_PATH?.trim() ?? "";
    const sshHostFingerprint = process.env.AGY_SSH_HOST_FINGERPRINT?.trim() ?? "";
    const sshKnownHostsPath = process.env.AGY_SSH_KNOWN_HOSTS_PATH?.trim() ?? "";
    const sshRemoteWrapper = process.env.AGY_SSH_REMOTE_WRAPPER?.trim() || "/opt/neet2work/run-agy-sandbox-print";

    return {
      enabled,
      command,
      model: process.env.AGY_CLI_MODEL?.trim() ?? "",
      timeoutMs: parsePositiveInteger(process.env.AGY_CLI_TIMEOUT_MS, 120_000),
      sandboxEnabled,
      maxPromptBytes: parsePositiveInteger(process.env.AGY_CLI_MAX_PROMPT_BYTES, 200_000),
      maxOutputBytes: parsePositiveInteger(process.env.AGY_CLI_MAX_OUTPUT_BYTES, 1_000_000),
      maxConcurrency: parsePositiveInteger(process.env.AGY_CLI_MAX_CONCURRENCY, 1),
      modelAllowlist: parseModelList(process.env.AGY_CLI_MODEL_ALLOWLIST),
      taskProfile,
      workdir,
      ssh: {
        enabled: sshEnabled,
        host: sshHost,
        port: parsePositiveInteger(process.env.AGY_SSH_PORT, 22),
        username: sshUsername,
        keyPath: sshKeyPath,
        hostFingerprint: sshHostFingerprint,
        knownHostsPath: sshKnownHostsPath,
        remoteWrapper: sshRemoteWrapper,
        connectTimeoutMs: parsePositiveInteger(process.env.AGY_SSH_CONNECT_TIMEOUT_MS, 10_000),
        execTimeoutMs: parsePositiveInteger(process.env.AGY_SSH_EXEC_TIMEOUT_MS, 120_000)
      },
      configErrorReason: parseAgyCliConfigError({
        enabled,
        command,
        sandboxEnabled,
        taskProfile,
        workdir,
        sshEnabled,
        sshHost,
        sshUsername,
        sshKeyPath,
        sshHostFingerprint,
        sshKnownHostsPath,
        sshRemoteWrapper
      })
    };
  })()
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

export function isAgyCliConfigured() {
  return aiConfig.agyCli.enabled && !aiConfig.agyCli.configErrorReason;
}
