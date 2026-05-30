import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAiConfig = vi.hoisted(() => ({
  routingDefault: "auto" as const,
  providerOrder: ["codex_bridge", "gemini", "local", "fallback"] as const,
  providerTimeoutMs: 180_000,
  codexBridge: {
    enabled: false,
    command: "codex",
    model: "",
    profile: ""
  },
  gemini: {
    enabled: false,
    apiKey: "",
    model: "",
    timeoutMs: 120_000
  },
  localAi: {
    enabled: false,
    baseUrl: "http://localhost:11434",
    model: "",
    timeoutMs: 120_000,
    protocol: "ollama" as const
  }
}));

const mockSpawn = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", () => ({
  spawn: mockSpawn
}));

vi.mock("../../config/ai-config.js", () => ({
  aiConfig: mockAiConfig,
  isGeminiConfigured: () =>
    mockAiConfig.gemini.enabled &&
    Boolean(mockAiConfig.gemini.apiKey) &&
    Boolean(mockAiConfig.gemini.model),
  isLocalAiConfigured: () =>
    mockAiConfig.localAi.enabled && Boolean(mockAiConfig.localAi.baseUrl),
  isCodexBridgeConfigured: () => mockAiConfig.codexBridge.enabled
}));

function resetConfig() {
  mockAiConfig.codexBridge.enabled = false;
  mockAiConfig.codexBridge.model = "";
  mockAiConfig.gemini.enabled = false;
  mockAiConfig.gemini.apiKey = "";
  mockAiConfig.gemini.model = "";
  mockAiConfig.localAi.enabled = false;
  mockAiConfig.localAi.baseUrl = "http://localhost:11434";
}

describe("AI provider status", () => {
  beforeEach(() => {
    resetConfig();
    mockSpawn.mockReset();
    vi.restoreAllMocks();
  });

  it("reports all real providers offline when disabled", async () => {
    const { CodexBridgeProvider } = await import("./codex-bridge.provider.js");
    const { GeminiProvider } = await import("./gemini.provider.js");
    const { LocalAiProvider } = await import("./local-ai.provider.js");
    const { HardcodedFallbackProvider } = await import("./hardcoded-fallback.provider.js");

    const statuses = await Promise.all([
      new CodexBridgeProvider().getStatus(),
      new GeminiProvider().getStatus(),
      new LocalAiProvider().getStatus(),
      new HardcodedFallbackProvider().getStatus()
    ]);

    expect(statuses[0]).toMatchObject({ providerId: "codex_bridge", online: false, configured: false });
    expect(statuses[1]).toMatchObject({ providerId: "gemini", online: false, configured: false });
    expect(statuses[2]).toMatchObject({ providerId: "local", online: false, configured: false });
    expect(statuses[3]).toMatchObject({ providerId: "fallback", online: true, configured: true });
  });

  it("reports Codex enabled but unavailable when login probe fails", async () => {
    mockAiConfig.codexBridge.enabled = true;
    mockAiConfig.codexBridge.model = "codex-test";

    mockSpawn.mockImplementation(() => ({
      stdout: { on: vi.fn() },
      stderr: {
        on: vi.fn((event: string, cb: (chunk: string) => void) => {
          if (event === "data") cb("please login");
        })
      },
      on: vi.fn((event: string, cb: (value?: unknown) => void) => {
        if (event === "close") {
          queueMicrotask(() => cb(1));
        }
      })
    }));

    const { CodexBridgeProvider } = await import("./codex-bridge.provider.js");
    const status = await new CodexBridgeProvider().getStatus();

    expect(status.configured).toBe(true);
    expect(status.online).toBe(false);
    expect(status.reason).toBe("codex_not_logged_in");
    expect(mockSpawn).toHaveBeenCalledWith(
      "codex",
      ["login", "status"],
      expect.objectContaining({ shell: false })
    );
  });

  it("passes Codex prompts through stdin instead of command arguments", async () => {
    mockAiConfig.codexBridge.enabled = true;
    mockAiConfig.codexBridge.model = "codex-test";
    const stdinEnd = vi.fn();

    mockSpawn.mockImplementation(() => ({
      stdin: { end: stdinEnd },
      stdout: {
        on: vi.fn((event: string, cb: (chunk: string) => void) => {
          if (event === "data") {
            queueMicrotask(() => cb('{"type":"message","role":"assistant","content":"{\\"ok\\":true}"}\n'));
          }
        })
      },
      stderr: { on: vi.fn() },
      on: vi.fn((event: string, cb: (value?: unknown) => void) => {
        if (event === "close") {
          queueMicrotask(() => cb(0));
        }
      })
    }));

    const { CodexBridgeProvider } = await import("./codex-bridge.provider.js");
    const result = await new CodexBridgeProvider().execute<{ ok: boolean }>({
      operation: "plan",
      payload: { userText: 'quoted "portfolio" & shell chars' },
      timeoutMs: 1_000
    });

    const [, args, options] = mockSpawn.mock.calls[0];
    expect(args).toContain("-");
    expect(args).not.toContain(JSON.stringify({ operation: "plan", payload: { userText: 'quoted "portfolio" & shell chars' } }));
    expect(options).toMatchObject({ shell: false });
    expect(stdinEnd).toHaveBeenCalledWith(expect.stringContaining("evidence-locked Korean self-introduction"));
    const prompt = String(stdinEnd.mock.calls[0]?.[0] ?? "");
    expect(prompt).toContain("quoted");
    expect(prompt).toContain("portfolio");
    expect(prompt).toContain("shell chars");
    expect(result.data.ok).toBe(true);
  });

  it("reports Gemini disabled when enabled but key or model is missing", async () => {
    mockAiConfig.gemini.enabled = true;
    mockAiConfig.gemini.apiKey = "";
    mockAiConfig.gemini.model = "";

    const { GeminiProvider } = await import("./gemini.provider.js");
    const status = await new GeminiProvider().getStatus();

    expect(status.configured).toBe(false);
    expect(status.online).toBe(false);
    expect(status.reason).toBe("missing_key_or_model");
  });

  it("reports Gemini quota exceeded from ping response", async () => {
    mockAiConfig.gemini.enabled = true;
    mockAiConfig.gemini.apiKey = "test-key";
    mockAiConfig.gemini.model = "gemini-test";

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      status: 429,
      ok: false
    } as Response);

    const { GeminiProvider } = await import("./gemini.provider.js");
    const status = await new GeminiProvider().getStatus();

    expect(status.configured).toBe(true);
    expect(status.quotaExceeded).toBe(true);
    expect(status.online).toBe(false);
  });

  it("reports Gemini offline when ping fails for non-quota errors", async () => {
    mockAiConfig.gemini.enabled = true;
    mockAiConfig.gemini.apiKey = "test-key";
    mockAiConfig.gemini.model = "gemini-test";

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      status: 500,
      ok: false
    } as Response);

    const { GeminiProvider } = await import("./gemini.provider.js");
    const status = await new GeminiProvider().getStatus();

    expect(status.configured).toBe(true);
    expect(status.quotaExceeded).toBe(false);
    expect(status.online).toBe(false);
    expect(status.models[0]?.online).toBe(false);
  });

  it("reports Local AI offline when ping fails", async () => {
    mockAiConfig.localAi.enabled = true;
    mockAiConfig.localAi.baseUrl = "http://127.0.0.1:59999";
    mockAiConfig.localAi.model = "llama-test";

    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("connection refused"));

    const { LocalAiProvider } = await import("./local-ai.provider.js");
    const status = await new LocalAiProvider().getStatus();

    expect(status.configured).toBe(true);
    expect(status.online).toBe(false);
    expect(status.reason).toBe("local_offline");
  });

  it("always exposes fallback as available", async () => {
    const { HardcodedFallbackProvider } = await import("./hardcoded-fallback.provider.js");
    const status = await new HardcodedFallbackProvider().getStatus();

    expect(status.providerId).toBe("fallback");
    expect(status.online).toBe(true);
    expect(status.configured).toBe(true);
    expect(status.quotaExceeded).toBe(false);
  });
});
