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

vi.mock("node:child_process", () => ({
  spawn: mockSpawn
}));

vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
  return {
    ...actual,
    existsSync: vi.fn(() => true),
    mkdtempSync: vi.fn(() => "C:\\tmp\\neet2work-agy-test")
  };
});

vi.mock("../../config/ai-config.js", () => ({
  aiConfig: mockAiConfig
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
    vi.unstubAllEnvs();
    vi.stubEnv("SECRET_TOKEN", "do-not-pass");
    vi.stubEnv("PATH", "C:\\Windows\\System32");
    vi.stubEnv("LOCALAPPDATA", "C:\\Users\\test\\AppData\\Local");
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

  it("runs version and models probes for local status", async () => {
    mockAiConfig.agyCli.enabled = true;
    mockSpawn.mockImplementation((_command: string, args: string[]) => {
      if (args[0] === "--version") return createChild("1.0.5\n");
      if (args[0] === "models") return createChild("model-a\n");
      return createChild("", "unexpected", 1);
    });

    const { AgyCliProvider } = await import("./agy-cli.provider.js");
    const status = await new AgyCliProvider().getStatus();

    expect(status).toMatchObject({ configured: true, online: true });
    expect(mockSpawn).toHaveBeenNthCalledWith(
      1,
      "C:\\tools\\agy.exe",
      ["--version"],
      expect.objectContaining({ shell: false, stdio: ["ignore", "pipe", "pipe"] })
    );
    expect(mockSpawn).toHaveBeenNthCalledWith(
      2,
      "C:\\tools\\agy.exe",
      ["models"],
      expect.objectContaining({ shell: false, stdio: ["ignore", "pipe", "pipe"] })
    );
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
      expect.arrayContaining(["--sandbox", "--print-timeout", "90000", "--print"]),
      expect.objectContaining({
        cwd: "C:\\work\\agy",
        shell: false,
        stdio: ["ignore", "pipe", "pipe"]
      })
    );
    const [, args, options] = mockSpawn.mock.calls.at(-1)!;
    expect(String(args[args.indexOf("--print") + 1])).toContain("AGY_CLI_FIXED_ROLE");
    expect(options.env.SECRET_TOKEN).toBeUndefined();
    expect(options.env.PATH).toBe("C:\\Windows\\System32");
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
});
