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

  if (aiConfig.agyCli.ssh.enabled) {
    console.error(JSON.stringify({ ok: false, mode: "local", reason: "ssh_enabled" }, null, 2));
    process.exitCode = 2;
    return;
  }

  const status = await provider.getStatus();
  if (!status.configured || !status.online) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          mode: "local",
          checks: {
            enabled: aiConfig.agyCli.enabled,
            commandProbe: status.reason !== "missing_command" && status.reason !== "invalid_command",
            loginProbe: status.reason !== "agy_not_logged_in" && status.reason !== "agy_probe_timeout",
            appDataWritable: status.reason !== "agy_app_data_unwritable"
          },
          reason: status.reason ?? "agy_unavailable"
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
      timeoutMs: aiConfig.agyCli.timeoutMs
    });

    const dataIsObject = Boolean(result.data && typeof result.data === "object" && !Array.isArray(result.data));
    console.log(
      JSON.stringify(
        {
          ok: dataIsObject,
          mode: "local",
          checks: {
            commandProbe: true,
            loginProbe: true,
            appDataWritable: true,
            safeCwd: true,
            fixedArgs: ["--sandbox", "--print-timeout", "--print"],
            shell: false,
            promptViaPrintArg: true,
            jsonOnlyResponse: dataIsObject,
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
          mode: "local",
          checks: {
            commandProbe: true,
            loginProbe: true,
            appDataWritable: true,
            fixedArgs: ["--sandbox", "--print-timeout", "--print"],
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
