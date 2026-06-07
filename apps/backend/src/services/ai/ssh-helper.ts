import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import type { ClientChannel, ConnectConfig } from "ssh2";
import type { AgyCliStatusReason } from "../../types/ai-routing.js";
import { ProviderExecutionError } from "./provider-utils.js";

export type AgySshConfig = {
  host: string;
  port: number;
  username: string;
  keyPath: string;
  hostFingerprint: string;
  knownHostsPath: string;
  remoteWrapper: string;
  connectTimeoutMs: number;
  execTimeoutMs: number;
  maxOutputBytes: number;
};

export class AgySshExecutionError extends ProviderExecutionError {
  readonly reason: AgyCliStatusReason;

  constructor(reason: AgyCliStatusReason) {
    super(reason.endsWith("timeout") ? "timeout" : "offline", reason);
    this.reason = reason;
  }
}

type RemoteResult = {
  stdout: string;
  stderr: string;
  exitCode: number | null;
};

export async function runRemoteWrapperWithStdin(config: AgySshConfig, stdinData: string, timeoutMs: number) {
  validateSshConfig(config);

  const privateKey = readPrivateKey(config.keyPath);
  const allowedFingerprints = buildAllowedFingerprints(config);
  const { Client } = await import("ssh2");
  const conn = new Client();

  return new Promise<RemoteResult>((resolve, reject) => {
    let settled = false;
    let channel: ClientChannel | undefined;

    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        channel?.close();
      } catch {
        // Best-effort cleanup.
      }
      conn.end();
      conn.destroy();
      callback();
    };

    const timer = setTimeout(() => {
      finish(() => reject(new AgySshExecutionError("ssh_wrapper_timeout")));
    }, Math.min(timeoutMs, config.execTimeoutMs));

    conn
      .on("ready", () => {
        conn.exec(config.remoteWrapper, { pty: false, x11: false, env: {} }, (err, stream) => {
          if (err) {
            finish(() => reject(new AgySshExecutionError("ssh_wrapper_invalid")));
            return;
          }

          channel = stream;
          collectChannelOutput(stream, config.maxOutputBytes)
            .then((result) => finish(() => resolve(result)))
            .catch((error) => finish(() => reject(error)));

          stream.end(stdinData);
        });
      })
      .on("error", (error: Error) => {
        const reason = error.message === "ssh_host_key_mismatch" ? "ssh_host_key_mismatch" : "ssh_missing_config";
        finish(() => reject(new AgySshExecutionError(reason)));
      })
      .connect({
        host: config.host,
        port: config.port,
        username: config.username,
        privateKey,
        readyTimeout: config.connectTimeoutMs,
        hostHash: "sha256",
        hostVerifier: (hashedKey) => {
          const fingerprint = normalizeFingerprint(`SHA256:${hashedKey}`);
          return allowedFingerprints.has(fingerprint);
        },
        tryKeyboard: false
      } satisfies ConnectConfig);
  });
}

function validateSshConfig(config: AgySshConfig) {
  if (!config.host || !config.username || !config.keyPath || (!config.hostFingerprint && !config.knownHostsPath)) {
    throw new AgySshExecutionError("ssh_missing_config");
  }

  if (!isValidWrapperPath(config.remoteWrapper)) {
    throw new AgySshExecutionError("ssh_wrapper_invalid");
  }
}

function readPrivateKey(keyPath: string) {
  try {
    return readFileSync(keyPath, "utf8");
  } catch {
    throw new AgySshExecutionError("ssh_key_unreadable");
  }
}

function buildAllowedFingerprints(config: AgySshConfig) {
  const fingerprints = new Set<string>();
  const explicit = normalizeFingerprint(config.hostFingerprint);
  if (explicit) {
    fingerprints.add(explicit);
  }

  if (config.knownHostsPath) {
    for (const fingerprint of readKnownHostsFingerprints(config.knownHostsPath, config.host, config.port)) {
      fingerprints.add(fingerprint);
    }
  }

  if (fingerprints.size === 0) {
    throw new AgySshExecutionError("ssh_missing_config");
  }

  return fingerprints;
}

function readKnownHostsFingerprints(knownHostsPath: string, host: string, port: number) {
  let text = "";
  try {
    text = readFileSync(knownHostsPath, "utf8");
  } catch {
    throw new AgySshExecutionError("ssh_missing_config");
  }

  const matches: string[] = [];
  const hostTokens = new Set([host, `[${host}]:${port}`]);

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || line.startsWith("@")) continue;

    const [hosts, keyType, key] = line.split(/\s+/);
    if (!hosts || !keyType || !key) continue;

    const hostMatches = hosts.split(",").some((item) => hostTokens.has(item));
    if (!hostMatches) continue;

    matches.push(fingerprintFromBase64Key(key));
  }

  return matches;
}

function fingerprintFromBase64Key(base64Key: string) {
  return normalizeFingerprint(`SHA256:${createHash("sha256").update(Buffer.from(base64Key, "base64")).digest("base64").replace(/=+$/, "")}`);
}

function normalizeFingerprint(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("SHA256:") ? trimmed : `SHA256:${trimmed}`;
}

function isValidWrapperPath(wrapperPath: string) {
  return (
    (/^\/[^\s"'`;&|<>$]+$/.test(wrapperPath) || /^[A-Za-z]:\\[^\s"'`;&|<>$]+$/.test(wrapperPath)) &&
    !wrapperPath.includes("..")
  );
}

function collectChannelOutput(stream: ClientChannel, maxOutputBytes: number) {
  return new Promise<RemoteResult>((resolve, reject) => {
    let settled = false;
    let stdout = "";
    let stderr = "";
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let exitCode: number | null = null;

    const collect = (chunk: Buffer, target: "stdout" | "stderr") => {
      const bytes = chunk.byteLength;
      if (target === "stdout") {
        stdoutBytes += bytes;
        stdout += chunk.toString("utf8");
      } else {
        stderrBytes += bytes;
        stderr += chunk.toString("utf8");
      }

      if (stdoutBytes + stderrBytes > maxOutputBytes) {
        stream.close();
        finish(() => reject(new AgySshExecutionError("output_limit_exceeded")));
      }
    };

    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      callback();
    };

    stream.on("data", (chunk: Buffer) => collect(chunk, "stdout"));
    stream.stderr.on("data", (chunk: Buffer) => collect(chunk, "stderr"));
    stream.on("exit", (code: number | null) => {
      exitCode = code;
    });
    stream.on("close", () => finish(() => resolve({ stdout, stderr, exitCode })));
    stream.on("error", () => finish(() => reject(new AgySshExecutionError("ssh_wrapper_timeout"))));
  });
}
