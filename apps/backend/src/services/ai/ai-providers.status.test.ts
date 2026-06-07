import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAiConfig = vi.hoisted(() => ({
  routingDefault: "auto" as const,
  providerOrder: ["codex_bridge", "gemini", "local", "fallback"] as const,
  providerTimeoutMs: 180_000,
  codexBridge: {
    enabled: false,
    command: "codex",
    home: "C:\\Users\\test\\.codex",
    model: "",
    reasoningEffort: ""
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
  },
  agyCli: {
    enabled: false,
    command: "C:\\tools\\agy.exe",
    model: "",
    timeoutMs: 120_000,
    sandboxEnabled: true,
    maxPromptBytes: 200_000,
    maxOutputBytes: 1_000_000,
    maxConcurrency: 1,
    modelAllowlist: [] as string[],
    taskProfile: "cover_letter_review",
    workdir: "",
    configErrorReason: undefined as string | undefined,
    ssh: {
      enabled: false,
      host: "",
      port: 22,
      username: "",
      keyPath: "",
      hostFingerprint: "",
      knownHostsPath: "",
      remoteWrapper: "/opt/neet2work/run-agy-sandbox-print",
      connectTimeoutMs: 10_000,
      execTimeoutMs: 120_000
    }
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
  mockAiConfig.codexBridge.home = "C:\\Users\\test\\.codex";
  mockAiConfig.codexBridge.model = "";
  mockAiConfig.codexBridge.reasoningEffort = "";
  mockAiConfig.gemini.enabled = false;
  mockAiConfig.gemini.apiKey = "";
  mockAiConfig.gemini.model = "";
  mockAiConfig.localAi.enabled = false;
  mockAiConfig.localAi.baseUrl = "http://localhost:11434";
  mockAiConfig.agyCli.enabled = false;
  mockAiConfig.agyCli.configErrorReason = undefined;
  mockAiConfig.agyCli.ssh.enabled = false;
}

function createCodexAppServerMock(
  handler: (message: { id?: number; method?: string; params?: unknown }) => Array<Record<string, unknown>> | Record<string, unknown> | undefined
) {
  const child = new EventEmitter() as EventEmitter & {
    stdin: { write: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> };
    stdout: PassThrough;
    stderr: PassThrough;
    kill: ReturnType<typeof vi.fn>;
  };
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.kill = vi.fn();
  child.stdin = {
    write: vi.fn((line: string) => {
      const messages = String(line)
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean);
      for (const rawMessage of messages) {
        const message = JSON.parse(rawMessage) as { id?: number; method?: string; params?: unknown };
        const responses = handler(message);
        const responseList = Array.isArray(responses) ? responses : responses ? [responses] : [];
        for (const response of responseList) {
          queueMicrotask(() => {
            child.stdout.write(`${JSON.stringify(response)}\n`);
          });
        }
      }
      return true;
    }),
    end: vi.fn()
  };
  return child;
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
    const { AgyCliProvider } = await import("./agy-cli.provider.js");
    const { HardcodedFallbackProvider } = await import("./hardcoded-fallback.provider.js");

    const statuses = await Promise.all([
      new CodexBridgeProvider().getStatus(),
      new GeminiProvider().getStatus(),
      new LocalAiProvider().getStatus(),
      new AgyCliProvider().getStatus(),
      new HardcodedFallbackProvider().getStatus()
    ]);

    expect(statuses[0]).toMatchObject({ providerId: "codex_bridge", online: false, configured: false });
    expect(statuses[1]).toMatchObject({ providerId: "gemini", online: false, configured: false });
    expect(statuses[2]).toMatchObject({ providerId: "local", online: false, configured: false });
    expect(statuses[3]).toMatchObject({ providerId: "agy_cli", online: false, configured: false });
    expect(statuses[4]).toMatchObject({ providerId: "fallback", online: true, configured: true });
  });

  it("reports Codex enabled but unavailable when login probe fails", async () => {
    mockAiConfig.codexBridge.enabled = true;
    mockAiConfig.codexBridge.model = "codex-test";

    mockSpawn.mockImplementation(() =>
      createCodexAppServerMock((message) => {
        if (message.method === "initialize") {
          return { id: message.id, result: { userAgent: "codex-test" } };
        }
        if (message.method === "account/read") {
          return { id: message.id, result: { account: null, requiresOpenaiAuth: true } };
        }
        return undefined;
      })
    );

    const { CodexBridgeProvider } = await import("./codex-bridge.provider.js");
    const status = await new CodexBridgeProvider().getStatus();

    expect(status.configured).toBe(true);
    expect(status.online).toBe(false);
    expect(status.reason).toBe("codex_not_logged_in");
    expect(mockSpawn).toHaveBeenCalledWith(
      "codex",
      ["app-server", "--listen", "stdio://"],
      expect.objectContaining({
        env: expect.objectContaining({ CODEX_HOME: "C:\\Users\\test\\.codex" }),
        shell: false,
        stdio: ["pipe", "pipe", "pipe"]
      })
    );
  });

  it("does not treat malformed Codex account payloads as logged in", async () => {
    mockAiConfig.codexBridge.enabled = true;
    mockAiConfig.codexBridge.model = "codex-test";

    mockSpawn.mockImplementation(() =>
      createCodexAppServerMock((message) => {
        if (message.method === "initialize") {
          return { id: message.id, result: { userAgent: "codex-test" } };
        }
        if (message.method === "account/read") {
          return { id: message.id, result: { account: {}, requiresOpenaiAuth: true } };
        }
        return undefined;
      })
    );

    const { CodexBridgeProvider } = await import("./codex-bridge.provider.js");
    const status = await new CodexBridgeProvider().getStatus();

    expect(status.configured).toBe(true);
    expect(status.online).toBe(false);
    expect(status.reason).toBe("codex_not_logged_in");
  });

  it("starts Codex ChatGPT OAuth login through app-server when requested", async () => {
    let child: ReturnType<typeof createCodexAppServerMock>;

    mockSpawn.mockImplementation(() => {
      child = createCodexAppServerMock((message) => {
        if (message.method === "initialize") {
          return { id: message.id, result: { userAgent: "codex-test" } };
        }
        if (message.method === "account/login/start") {
          return {
            id: message.id,
            result: {
              type: "chatgpt",
              loginId: "login_test",
              authUrl: "https://auth.openai.com/oauth/test"
            }
          };
        }
        return undefined;
      });
      return child;
    });

    const { CodexAppServerClient } = await import("./codex-app-server-client.js");
    const client = new CodexAppServerClient({ command: "codex" });

    try {
      const login = await client.startChatGptLogin();
      expect(login).toMatchObject({
        type: "chatgpt",
        loginId: "login_test",
        authUrl: "https://auth.openai.com/oauth/test"
      });
      const loginStartWrite = child!.stdin.write.mock.calls.find(([line]) =>
        String(line).includes('"method":"account/login/start"')
      );
      expect(loginStartWrite).toBeTruthy();
      expect(JSON.parse(String(loginStartWrite?.[0] ?? "{}")).params).toMatchObject({
        type: "chatgpt",
        codexStreamlinedLogin: true
      });

      const completionPromise = client.waitForLoginCompletion("login_test");
      await Promise.resolve();
      child!.stdout.write(
        `${JSON.stringify({
          method: "account/login/completed",
          params: { loginId: "login_test", success: true, error: null }
        })}\n`
      );
      await expect(completionPromise).resolves.toEqual({
        loginId: "login_test",
        success: true,
        error: null
      });
    } finally {
      client.close();
    }
  });

  it("keeps a Codex login session alive until app-server reports OAuth completion", async () => {
    mockAiConfig.codexBridge.enabled = true;
    let child: ReturnType<typeof createCodexAppServerMock>;
    let loginCompleted = false;

    mockSpawn.mockImplementation(() => {
      child = createCodexAppServerMock((message) => {
        if (message.method === "initialize") {
          return { id: message.id, result: { userAgent: "codex-test" } };
        }
        if (message.method === "account/read") {
          return {
            id: message.id,
            result: {
              account: loginCompleted
                ? { type: "chatgpt", email: "user@example.com", planType: "pro" }
                : null,
              requiresOpenaiAuth: true
            }
          };
        }
        if (message.method === "account/login/start") {
          return {
            id: message.id,
            result: {
              type: "chatgpt",
              loginId: "login_session_test",
              authUrl: "https://auth.openai.com/oauth/session-test"
            }
          };
        }
        return undefined;
      });
      return child;
    });

    const { startCodexBridgeLogin, getCodexBridgeLoginStatus } = await import("./codex-login-session.service.js");
    const started = await startCodexBridgeLogin();

    expect(started).toMatchObject({
      loginId: "login_session_test",
      status: "pending",
      login: {
        authUrl: "https://auth.openai.com/oauth/session-test"
      }
    });

    loginCompleted = true;
    child!.stdout.write(
      `${JSON.stringify({
        method: "account/login/completed",
        params: { loginId: "login_session_test", success: true, error: null }
      })}\n`
    );
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(getCodexBridgeLoginStatus("login_session_test")).toMatchObject({
      status: "succeeded",
      account: {
        type: "chatgpt",
        email: "user@example.com",
        planType: "pro"
      }
    });
  });

  it("reports Codex app-server unavailable when the local Codex executable cannot spawn", async () => {
    mockAiConfig.codexBridge.enabled = true;
    mockSpawn.mockImplementation(() => {
      throw new Error("spawn EPERM");
    });

    const { CodexBridgeProvider } = await import("./codex-bridge.provider.js");
    const status = await new CodexBridgeProvider().getStatus();

    expect(status.configured).toBe(true);
    expect(status.online).toBe(false);
    expect(status.reason).toBe("codex_app_server_unavailable");
  });

  it("passes Codex prompts through the app-server turn input instead of command arguments", async () => {
    mockAiConfig.codexBridge.enabled = true;
    mockAiConfig.codexBridge.model = "codex-test";
    let child: ReturnType<typeof createCodexAppServerMock>;

    mockSpawn.mockImplementation(() => {
      child = createCodexAppServerMock((message) => {
        if (message.method === "initialize") {
          return { id: message.id, result: { userAgent: "codex-test" } };
        }
        if (message.method === "account/read") {
          return {
            id: message.id,
            result: {
              account: { type: "chatgpt", email: "user@example.com", planType: "pro" },
              requiresOpenaiAuth: true
            }
          };
        }
        if (message.method === "thread/start") {
          return { id: message.id, result: { thread: { id: "thr_test" } } };
        }
        if (message.method === "turn/start") {
          return [
            { id: message.id, result: { turn: { id: "turn_test", status: "inProgress", items: [] } } },
            {
              method: "item/completed",
              params: { item: { type: "agentMessage", id: "msg_test", text: "{\"ok\":true}" } }
            },
            { method: "turn/completed", params: { turn: { id: "turn_test", status: "completed" } } }
          ];
        }
        return undefined;
      });
      return child;
    });

    const { CodexBridgeProvider } = await import("./codex-bridge.provider.js");
    const result = await new CodexBridgeProvider().execute<{ ok: boolean }>({
      operation: "plan",
      payload: { userText: 'quoted "portfolio" & shell chars' },
      timeoutMs: 1_000
    });

    const [, args, options] = mockSpawn.mock.calls[0];
    expect(args).toEqual(["app-server", "--listen", "stdio://"]);
    expect(args).not.toContain(JSON.stringify({ operation: "plan", payload: { userText: 'quoted "portfolio" & shell chars' } }));
    expect(options).toMatchObject({ shell: false });
    const turnStartWrite = child!.stdin.write.mock.calls.find(([line]) => String(line).includes('"method":"turn/start"'));
    expect(turnStartWrite).toBeTruthy();
    const turnStart = JSON.parse(String(turnStartWrite?.[0] ?? "{}")) as {
      params?: { input?: Array<{ text?: string }> };
    };
    const prompt = String(turnStart.params?.input?.[0]?.text ?? "");
    expect(prompt).toContain("evidence-locked Korean self-introduction");
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
