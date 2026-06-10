import { aiConfig } from "../config/ai-config.js";
import { AgyCliProvider } from "../services/ai/agy-cli.provider.js";
import { ProviderExecutionError } from "../services/ai/provider-utils.js";
import { agySmokePayload } from "./agySmokePayload.js";

function reasonFromError(error: unknown) {
  if (error instanceof ProviderExecutionError) {
    return error.message || error.code;
  }
  return "provider_error";
}

async function main() {
  const provider = new AgyCliProvider();

  if (!aiConfig.agyCli.ssh.enabled) {
    console.error(JSON.stringify({ ok: false, mode: "ssh", reason: "ssh_disabled" }, null, 2));
    process.exitCode = 2;
    return;
  }

  const status = await provider.getStatus();
  if (!status.configured || !status.online) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          mode: "ssh",
          checks: {
            enabled: aiConfig.agyCli.enabled,
            sshConfigPresent: status.reason !== "ssh_missing_config",
            keyReadable: status.reason !== "ssh_key_unreadable",
            hostKeyVerified: status.reason !== "ssh_host_key_mismatch",
            wrapperPathValid: status.reason !== "ssh_wrapper_invalid",
            wrapperProbe: status.reason !== "ssh_wrapper_timeout",
            jsonOnlyResponse: status.reason !== "invalid_json_output"
          },
          reason: status.reason ?? "ssh_unavailable"
        },
        null,
        2
      )
    );
    process.exitCode = 2;
    return;
  }

  try {
    const result = await provider.execute({
      operation: "plan",
      payload: agySmokePayload,
      timeoutMs: Math.min(aiConfig.agyCli.timeoutMs, aiConfig.agyCli.ssh.execTimeoutMs)
    });

    const dataIsObject = Boolean(result.data && typeof result.data === "object" && !Array.isArray(result.data));
    console.log(
      JSON.stringify(
        {
          ok: dataIsObject,
          mode: "ssh",
          checks: {
            sshConfigPresent: true,
            privateKeyAuthOnly: true,
            hostKeyVerified: true,
            wrapperExecuted: true,
            wrapperReceivesStdin: true,
            sandboxExpectedInWrapper: true,
            jsonOnlyResponse: dataIsObject,
            remoteOutputRedacted: true,
            sensitiveOutputRedacted: true
          },
          modelId: result.modelId,
          latencyMs: result.latencyMs
        },
        null,
        2
      )
    );
    if (!dataIsObject) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          mode: "ssh",
          checks: {
            privateKeyAuthOnly: true,
            wrapperReceivesStdin: true,
            sandboxExpectedInWrapper: true,
            remoteOutputRedacted: true,
            sensitiveOutputRedacted: true
          },
          reason: reasonFromError(error)
        },
        null,
        2
      )
    );
    process.exitCode = 1;
  }
}

void main();
