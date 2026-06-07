import { mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runRemoteWrapperWithStdin } from "./ssh-helper.js";

const baseConfig = {
  host: "ssh.example.internal",
  port: 22,
  username: "agyuser",
  keyPath: "C:\\missing\\agy-key",
  hostFingerprint: "SHA256:test",
  knownHostsPath: "",
  remoteWrapper: "/opt/neet2work/run-agy-sandbox-print",
  connectTimeoutMs: 10_000,
  execTimeoutMs: 120_000,
  maxOutputBytes: 1_000_000
};

describe("ssh helper preflight validation", () => {
  it("rejects SSH config without host key verification", async () => {
    await expect(
      runRemoteWrapperWithStdin({ ...baseConfig, hostFingerprint: "", knownHostsPath: "" }, "prompt", 1_000)
    ).rejects.toMatchObject({ reason: "ssh_missing_config" });
  });

  it("rejects wrapper paths containing arguments or shell metacharacters", async () => {
    await expect(
      runRemoteWrapperWithStdin({ ...baseConfig, remoteWrapper: "/opt/neet2work/run wrapper --bad" }, "prompt", 1_000)
    ).rejects.toMatchObject({ reason: "ssh_wrapper_invalid" });
  });

  it("rejects unreadable private key paths before connecting", async () => {
    await expect(runRemoteWrapperWithStdin(baseConfig, "prompt", 1_000)).rejects.toMatchObject({
      reason: "ssh_key_unreadable"
    });
  });

  it("requires known_hosts entries to match host and port", async () => {
    const dir = path.join(os.tmpdir(), `neet2work-known-hosts-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const keyPath = path.join(dir, "key");
    const knownHostsPath = path.join(dir, "known_hosts");
    writeFileSync(keyPath, "PRIVATE KEY");
    writeFileSync(knownHostsPath, "[ssh.example.internal]:2222 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIA==");

    await expect(
      runRemoteWrapperWithStdin(
        { ...baseConfig, keyPath, hostFingerprint: "", knownHostsPath, port: 22 },
        "prompt",
        1_000
      )
    ).rejects.toMatchObject({ reason: "ssh_missing_config" });
  });
});
