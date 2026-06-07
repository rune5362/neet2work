import { afterEach, describe, expect, it, vi } from "vitest";

async function loadAiConfigWithEnv(env: Record<string, string | undefined>) {
  vi.resetModules();
  vi.unstubAllEnvs();

  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      vi.stubEnv(key, value);
    }
  }

  return import("./ai-config.js");
}

describe("aiConfig agy_cli contract", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("allows agy_cli in provider order and keeps fallback last when missing", async () => {
    const { aiConfig } = await loadAiConfigWithEnv({
      AI_PROVIDER_ORDER: "agy_cli,gemini"
    });

    expect(aiConfig.providerOrder).toEqual(["agy_cli", "gemini", "fallback"]);
  });

  it("parses safe agy_cli defaults while keeping the provider disabled", async () => {
    const { aiConfig, isAgyCliConfigured } = await loadAiConfigWithEnv({
      AGY_CLI_ENABLED: undefined,
      AGY_CLI_SANDBOX_ENABLED: undefined,
      AGY_CLI_TASK_PROFILE: undefined
    });

    expect(aiConfig.agyCli).toMatchObject({
      enabled: false,
      command: "",
      timeoutMs: 120_000,
      sandboxEnabled: true,
      maxPromptBytes: 200_000,
      maxOutputBytes: 1_000_000,
      maxConcurrency: 1,
      modelAllowlist: [],
      taskProfile: "cover_letter_review",
      configErrorReason: undefined
    });
    expect(isAgyCliConfigured()).toBe(false);
  });

  it("rejects any explicit sandbox value other than true", async () => {
    const { aiConfig } = await loadAiConfigWithEnv({
      AGY_CLI_SANDBOX_ENABLED: "false"
    });

    expect(aiConfig.agyCli.sandboxEnabled).toBe(false);
    expect(aiConfig.agyCli.configErrorReason).toBe("sandbox_required");
  });

  it("rejects unsupported agy_cli task profiles", async () => {
    const { aiConfig } = await loadAiConfigWithEnv({
      AGY_CLI_TASK_PROFILE: "general_agent"
    });

    expect(aiConfig.agyCli.configErrorReason).toBe("invalid_task_profile");
  });

  it("rejects relative commands, unapproved command names, and relative workdirs", async () => {
    await expect(loadAiConfigWithEnv({ AGY_CLI_COMMAND: "agy.exe" })).resolves.toMatchObject({
      aiConfig: { agyCli: { configErrorReason: "invalid_command" } }
    });

    await expect(loadAiConfigWithEnv({ AGY_CLI_COMMAND: "C:\\tools\\notepad.exe" })).resolves.toMatchObject({
      aiConfig: { agyCli: { configErrorReason: "invalid_command" } }
    });

    await expect(loadAiConfigWithEnv({ AGY_CLI_WORKDIR: "relative\\workdir" })).resolves.toMatchObject({
      aiConfig: { agyCli: { configErrorReason: "invalid_command" } }
    });
  });

  it("parses model allowlist and positive numeric limits", async () => {
    const { aiConfig } = await loadAiConfigWithEnv({
      AGY_CLI_TIMEOUT_MS: "90000",
      AGY_CLI_MAX_PROMPT_BYTES: "1234",
      AGY_CLI_MAX_OUTPUT_BYTES: "5678",
      AGY_CLI_MAX_CONCURRENCY: "2",
      AGY_CLI_MODEL_ALLOWLIST: "alpha,beta"
    });

    expect(aiConfig.agyCli.timeoutMs).toBe(90_000);
    expect(aiConfig.agyCli.maxPromptBytes).toBe(1_234);
    expect(aiConfig.agyCli.maxOutputBytes).toBe(5_678);
    expect(aiConfig.agyCli.maxConcurrency).toBe(2);
    expect(aiConfig.agyCli.modelAllowlist).toEqual(["alpha", "beta"]);
  });
});
