import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProviderExecutionError } from "./provider-utils.js";

const mockAiConfig = vi.hoisted(() => ({
  agyCli: {
    enabled: false,
    command: "C:\\tools\\agy.exe",
    model: "",
    timeoutMs: 90_000,
    sandboxEnabled: true,
    maxPromptBytes: 200_000,
    maxOutputBytes: 1_000_000,
    maxConcurrency: 1,
    modelAllowlist: [] as string[],
    taskProfile: "cover_letter_review",
    workdir: "C:\\work\\agy",
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
const mockExistsSync = vi.hoisted(() => vi.fn(() => true));
const mockMkdirSync = vi.hoisted(() => vi.fn());
const mockReadFileSync = vi.hoisted(() => vi.fn());
const mockStatSync = vi.hoisted(() => vi.fn(() => ({ mtimeMs: Date.now() })));
const mockRunRemoteWrapperWithStdin = vi.hoisted(() => vi.fn());
const MockAgySshExecutionError = vi.hoisted(() =>
  class AgySshExecutionError extends Error {
    readonly code: "offline" | "timeout";
    readonly reason: string;

    constructor(reason: string) {
      super(reason);
      this.code = reason.endsWith("timeout") ? "timeout" : "offline";
      this.reason = reason;
    }
  }
);

vi.mock("node:child_process", () => ({
  spawn: mockSpawn
}));

vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
  return {
    ...actual,
    existsSync: mockExistsSync,
    mkdirSync: mockMkdirSync,
    readFileSync: mockReadFileSync,
    statSync: mockStatSync
  };
});

vi.mock("../../config/ai-config.js", () => ({
  aiConfig: mockAiConfig
}));

vi.mock("./ssh-helper.js", () => ({
  AgySshExecutionError: MockAgySshExecutionError,
  runRemoteWrapperWithStdin: mockRunRemoteWrapperWithStdin
}));

function resetConfig() {
  mockAiConfig.agyCli.enabled = false;
  mockAiConfig.agyCli.command = "C:\\tools\\agy.exe";
  mockAiConfig.agyCli.model = "";
  mockAiConfig.agyCli.timeoutMs = 90_000;
  mockAiConfig.agyCli.sandboxEnabled = true;
  mockAiConfig.agyCli.maxPromptBytes = 200_000;
  mockAiConfig.agyCli.maxOutputBytes = 1_000_000;
  mockAiConfig.agyCli.maxConcurrency = 1;
  mockAiConfig.agyCli.modelAllowlist = [];
  mockAiConfig.agyCli.taskProfile = "cover_letter_review";
  mockAiConfig.agyCli.workdir = "C:\\work\\agy";
  mockAiConfig.agyCli.configErrorReason = undefined;
  mockAiConfig.agyCli.ssh.enabled = false;
}

function createChild(stdoutText: string, stderrText = "", exitCode = 0) {
  const child = new EventEmitter() as EventEmitter & {
    stdout: PassThrough;
    stderr: PassThrough;
    kill: ReturnType<typeof vi.fn>;
  };
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.kill = vi.fn();

  queueMicrotask(() => {
    if (stdoutText) child.stdout.write(stdoutText);
    if (stderrText) child.stderr.write(stderrText);
    child.emit("close", exitCode);
  });

  return child;
}

function createHangingChild() {
  const child = new EventEmitter() as EventEmitter & {
    stdout: PassThrough;
    stderr: PassThrough;
    kill: ReturnType<typeof vi.fn>;
  };
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.kill = vi.fn();
  return child;
}

const validPayload = {
  target: {
    company: "Backend Bridge",
    role: "Backend Engineer",
    questionText: "지원 동기를 작성하세요.",
    charCountRule: "with_spaces",
    jobPostingText: "Node.js REST API",
    blindRecruitment: false
  },
  experienceInput: {
    profileContexts: [
      {
        profileId: "profile-1",
        title: "백엔드 프로필",
        schemaVersion: 1,
        profileJson: { skills: ["Node.js"] },
        desiredRoles: ["백엔드 엔지니어"],
        skills: ["Node.js"]
      }
    ]
  }
};

describe("AgyCliProvider", () => {
  beforeEach(() => {
    resetConfig();
    mockSpawn.mockReset();
    mockExistsSync.mockReset();
    mockExistsSync.mockReturnValue(true);
    mockMkdirSync.mockReset();
    mockReadFileSync.mockReset();
    mockReadFileSync.mockImplementation(() => {
      throw new Error("unexpected read");
    });
    mockStatSync.mockReset();
    mockStatSync.mockReturnValue({ mtimeMs: Date.now() });
    mockRunRemoteWrapperWithStdin.mockReset();
    vi.unstubAllEnvs();
    vi.stubEnv("SECRET_TOKEN", "do-not-pass");
    vi.stubEnv("PATH", "C:\\Windows\\System32");
    vi.stubEnv("LOCALAPPDATA", "C:\\Users\\test\\AppData\\Local");
    vi.stubEnv("USERPROFILE", "C:\\Users\\test");
    vi.stubEnv("AGY_BROWSER_ACTIVE_PORT_FILE", "C:\\Users\\test\\AppData\\Local\\Temp\\agy-port.json");
    vi.stubEnv("AGY_BROWSER_WS_URL", "ws://127.0.0.1:12345/devtools/browser/test");
  });

  it("reports disabled status by default", async () => {
    const { AgyCliProvider } = await import("./agy-cli.provider.js");
    const status = await new AgyCliProvider().getStatus();

    expect(status).toMatchObject({
      providerId: "agy_cli",
      label: "Agy CLI",
      online: false,
      configured: false,
      reason: "disabled"
    });
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  it("reports local status without spawning agy", async () => {
    mockAiConfig.agyCli.enabled = true;
    mockSpawn.mockImplementation(() => createChild("", "status must not spawn", 1));

    const { AgyCliProvider } = await import("./agy-cli.provider.js");
    const status = await new AgyCliProvider().getStatus();

    expect(status).toMatchObject({ configured: true, online: true });
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  it("executes with fixed sandbox args, strict JSON parsing, and allowlisted env only", async () => {
    mockAiConfig.agyCli.enabled = true;
    mockSpawn.mockImplementation((_command: string, args: string[]) => {
      if (args.includes("--print")) return createChild("{\"state\":\"OUTLINE_READY\"}");
      return createChild("ok");
    });

    const { AgyCliProvider } = await import("./agy-cli.provider.js");
    const result = await new AgyCliProvider().execute<{ state: string }>({
      operation: "plan",
      payload: validPayload,
      modelId: "not-allowed-model",
      timeoutMs: 180_000
    });

    expect(result.data.state).toBe("OUTLINE_READY");
    expect(result.modelId).toBe("agy-cli");
    expect(mockSpawn).toHaveBeenCalledWith(
      "C:\\tools\\agy.exe",
      expect.arrayContaining(["--sandbox", "--print-timeout", "90s", "--print"]),
      expect.objectContaining({
        cwd: "C:\\work\\agy",
        shell: false,
        stdio: ["ignore", "pipe", "pipe"]
      })
    );
    const [, args, options] = mockSpawn.mock.calls.at(-1)!;
    expect(String(args[args.indexOf("--print") + 1])).toContain("AGY_CLI_FIXED_ROLE");
    expect(args).not.toContain("not-allowed-model");
    expect(String(args[args.indexOf("--print") + 1])).not.toContain("not-allowed-model");
    expect(options.env.SECRET_TOKEN).toBeUndefined();
    expect(options.env.PATH).toBe("C:\\Windows\\System32");
    expect(options.env.AGY_BROWSER_ACTIVE_PORT_FILE).toBe("C:\\Users\\test\\AppData\\Local\\Temp\\agy-port.json");
    expect(options.env.AGY_BROWSER_WS_URL).toBe("ws://127.0.0.1:12345/devtools/browser/test");
  });

  it("uses a stable default workdir when AGY_CLI_WORKDIR is empty", async () => {
    mockAiConfig.agyCli.enabled = true;
    mockAiConfig.agyCli.workdir = "";
    mockSpawn.mockImplementation((_command: string, args: string[]) => {
      if (args.includes("--print")) return createChild("{\"state\":\"OUTLINE_READY\"}");
      return createChild("", "unexpected", 1);
    });

    const { AgyCliProvider } = await import("./agy-cli.provider.js");
    await new AgyCliProvider().execute<{ state: string }>({
      operation: "plan",
      payload: validPayload,
      timeoutMs: 10_000
    });

    expect(mockMkdirSync).toHaveBeenCalledWith(
      expect.stringMatching(/neet2work-agy-workdir$/),
      { recursive: true }
    );
    expect(mockSpawn).toHaveBeenCalledWith(
      "C:\\tools\\agy.exe",
      expect.any(Array),
      expect.objectContaining({
        cwd: expect.stringMatching(/neet2work-agy-workdir$/)
      })
    );
  });

  it("reports config errors in status and execute without spawning", async () => {
    mockAiConfig.agyCli.enabled = true;
    mockAiConfig.agyCli.configErrorReason = "sandbox_required";

    const { AgyCliProvider } = await import("./agy-cli.provider.js");
    const provider = new AgyCliProvider();
    const status = await provider.getStatus();

    expect(status).toMatchObject({
      configured: false,
      online: false,
      reason: "sandbox_required"
    });
    await expect(
      provider.execute({
        operation: "plan",
        payload: validPayload,
        timeoutMs: 10_000
      })
    ).rejects.toMatchObject({ code: "offline", message: "sandbox_required" });
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  it("rejects unsafe local command and workdir resolution before execution", async () => {
    mockAiConfig.agyCli.enabled = true;
    mockAiConfig.agyCli.command = "agy.exe";

    const { AgyCliProvider } = await import("./agy-cli.provider.js");
    const provider = new AgyCliProvider();

    await expect(
      provider.execute({
        operation: "plan",
        payload: validPayload,
        timeoutMs: 10_000
      })
    ).rejects.toMatchObject({ code: "offline", message: "missing_command" });
    expect(mockSpawn).not.toHaveBeenCalled();

    mockAiConfig.agyCli.command = "C:\\tools\\agy.exe";
    mockAiConfig.agyCli.workdir = "relative\\workdir";
    await expect(
      provider.execute({
        operation: "plan",
        payload: validPayload,
        timeoutMs: 10_000
      })
    ).rejects.toMatchObject({ code: "offline", message: "invalid_command" });
  });

  it("cleans up a timed-out local execution", async () => {
    vi.useFakeTimers();
    try {
      mockAiConfig.agyCli.enabled = true;
      const child = createHangingChild();
      mockSpawn.mockReturnValue(child);

      const { AgyCliProvider } = await import("./agy-cli.provider.js");
      const executePromise = new AgyCliProvider().execute({
        operation: "plan",
        payload: validPayload,
        timeoutMs: 5_000
      }).catch((error) => error);
      await vi.advanceTimersByTimeAsync(5_000);

      await expect(executePromise).resolves.toMatchObject({ code: "timeout", message: "agy cli timeout" });
      expect(child.kill).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not probe local app data permissions during status", async () => {
    mockAiConfig.agyCli.enabled = true;
    mockSpawn.mockImplementation(() => createChild("", "EACCES: permission denied", 1));

    const { AgyCliProvider } = await import("./agy-cli.provider.js");
    const status = await new AgyCliProvider().getStatus();

    expect(status).toMatchObject({ configured: true, online: true });
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  it("does not execute without profileContexts", async () => {
    mockAiConfig.agyCli.enabled = true;
    const { AgyCliProvider } = await import("./agy-cli.provider.js");

    await expect(
      new AgyCliProvider().execute({
        operation: "plan",
        payload: { target: validPayload.target, experienceInput: { manualExperienceText: "경험" } },
        timeoutMs: 10_000
      })
    ).rejects.toMatchObject({ code: "offline", message: "profile_context_required" });
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  it("rejects stdout with text around JSON", async () => {
    mockAiConfig.agyCli.enabled = true;
    mockSpawn.mockImplementation(() => createChild("warning\n{\"ok\":true}"));

    const { AgyCliProvider } = await import("./agy-cli.provider.js");

    await expect(
      new AgyCliProvider().execute({
        operation: "plan",
        payload: validPayload,
        timeoutMs: 10_000
      })
    ).rejects.toBeInstanceOf(ProviderExecutionError);
  });

  it("recovers empty local print stdout from the full Agy transcript", async () => {
    mockAiConfig.agyCli.enabled = true;
    mockSpawn.mockImplementation(() => createChild(""));
    mockReadFileSync.mockImplementation((filePath: string) => {
      if (filePath.endsWith("last_conversations.json")) {
        return JSON.stringify({ "C:\\work\\agy": "11111111-1111-4111-8111-111111111111" });
      }
      if (filePath.endsWith("transcript_full.jsonl")) {
        return [
          JSON.stringify({ source: "USER_EXPLICIT", status: "DONE", content: "prompt" }),
          JSON.stringify({ source: "MODEL", status: "DONE", content: "{\"state\":\"OUTLINE_READY\"}" })
        ].join("\n");
      }
      throw new Error(`unexpected read: ${filePath}`);
    });

    const { AgyCliProvider } = await import("./agy-cli.provider.js");
    const result = await new AgyCliProvider().execute<{ state: string }>({
      operation: "plan",
      payload: validPayload,
      timeoutMs: 10_000
    });

    expect(result.data.state).toBe("OUTLINE_READY");
    expect(mockReadFileSync).toHaveBeenCalledWith(
      expect.stringContaining("transcript_full.jsonl"),
      "utf8"
    );
  });

  it("uses SSH wrapper stdin without local fallback when SSH mode is enabled", async () => {
    mockAiConfig.agyCli.enabled = true;
    mockAiConfig.agyCli.ssh.enabled = true;
    mockAiConfig.agyCli.ssh.host = "ssh.example.internal";
    mockAiConfig.agyCli.ssh.username = "agyuser";
    mockAiConfig.agyCli.ssh.keyPath = "C:\\keys\\agy";
    mockAiConfig.agyCli.ssh.hostFingerprint = "SHA256:test";
    mockRunRemoteWrapperWithStdin.mockResolvedValue({
      stdout: "{\"state\":\"OUTLINE_READY\"}",
      stderr: "remote stderr must not leak",
      exitCode: 0
    });

    const { AgyCliProvider } = await import("./agy-cli.provider.js");
    const result = await new AgyCliProvider().execute<{ state: string }>({
      operation: "plan",
      payload: validPayload,
      modelId: "not-allowed-model",
      timeoutMs: 180_000
    });

    expect(result.data.state).toBe("OUTLINE_READY");
    expect(mockSpawn).not.toHaveBeenCalled();
    expect(mockRunRemoteWrapperWithStdin).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "ssh.example.internal",
        username: "agyuser",
        remoteWrapper: "/opt/neet2work/run-agy-sandbox-print"
      }),
      expect.stringContaining("AGY_CLI_FIXED_ROLE"),
      90_000
    );
    expect(JSON.stringify(mockRunRemoteWrapperWithStdin.mock.calls[0])).not.toContain("not-allowed-model");
  });

  it("reports SSH configured status without using local command fallback or wrapper probe", async () => {
    mockAiConfig.agyCli.enabled = true;
    mockAiConfig.agyCli.ssh.enabled = true;
    mockAiConfig.agyCli.ssh.host = "ssh.example.internal";
    mockAiConfig.agyCli.ssh.username = "agyuser";
    mockAiConfig.agyCli.ssh.keyPath = "C:\\keys\\agy";
    mockAiConfig.agyCli.ssh.hostFingerprint = "SHA256:test";
    mockRunRemoteWrapperWithStdin.mockRejectedValue(new MockAgySshExecutionError("ssh_wrapper_timeout"));

    const { AgyCliProvider } = await import("./agy-cli.provider.js");
    const status = await new AgyCliProvider().getStatus();

    expect(status).toMatchObject({ configured: true, online: true });
    expect(mockSpawn).not.toHaveBeenCalled();
    expect(mockRunRemoteWrapperWithStdin).not.toHaveBeenCalled();
  });

  it("does not fall back to local command when SSH mode is enabled but incomplete", async () => {
    mockAiConfig.agyCli.enabled = true;
    mockAiConfig.agyCli.command = "C:\\tools\\agy.exe";
    mockAiConfig.agyCli.ssh.enabled = true;
    mockAiConfig.agyCli.configErrorReason = "ssh_missing_config";

    const { AgyCliProvider } = await import("./agy-cli.provider.js");
    const provider = new AgyCliProvider();
    const status = await provider.getStatus();

    expect(status).toMatchObject({ configured: false, online: false, reason: "ssh_missing_config" });
    await expect(
      provider.execute({
        operation: "plan",
        payload: validPayload,
        timeoutMs: 10_000
      })
    ).rejects.toMatchObject({ code: "offline", message: "ssh_missing_config" });
    expect(mockSpawn).not.toHaveBeenCalled();
    expect(mockRunRemoteWrapperWithStdin).not.toHaveBeenCalled();
  });

  it("surfaces SSH wrapper errors during execution", async () => {
    mockAiConfig.agyCli.enabled = true;
    mockAiConfig.agyCli.ssh.enabled = true;
    mockAiConfig.agyCli.ssh.host = "ssh.example.internal";
    mockAiConfig.agyCli.ssh.username = "agyuser";
    mockAiConfig.agyCli.ssh.keyPath = "C:\\keys\\agy";
    mockAiConfig.agyCli.ssh.hostFingerprint = "SHA256:test";
    mockRunRemoteWrapperWithStdin.mockRejectedValue(new MockAgySshExecutionError("ssh_host_key_mismatch"));

    const { AgyCliProvider } = await import("./agy-cli.provider.js");
    const provider = new AgyCliProvider();

    await expect(
      provider.execute({
        operation: "plan",
        payload: validPayload,
        timeoutMs: 10_000
      })
    ).rejects.toMatchObject({
      reason: "ssh_host_key_mismatch"
    });
    expect(mockSpawn).not.toHaveBeenCalled();
  });
});
