import { aiConfig } from "../config/ai-config.js";
import { CodexAppServerClient } from "../services/ai/codex-app-server-client.js";
import { ProviderExecutionError, withTimeout } from "../services/ai/provider-utils.js";

const command = aiConfig.codexBridge.command;
const codexHome = aiConfig.codexBridge.home || null;
const timeoutMs = Number(process.env.CODEX_BRIDGE_SMOKE_TIMEOUT_MS) || 10_000;
const shouldStartLogin =
  process.argv.includes("--start-login") || process.env.CODEX_BRIDGE_SMOKE_START_LOGIN === "true";
const shouldWaitForLogin =
  shouldStartLogin && (process.argv.includes("--wait-login") || process.env.CODEX_BRIDGE_SMOKE_WAIT_LOGIN === "true");

function sanitizedLoginResult(login: Awaited<ReturnType<CodexAppServerClient["startChatGptLogin"]>>) {
  return {
    type: login.type,
    loginId: login.loginId ?? null,
    authUrl: login.authUrl ?? null,
    verificationUrl: login.verificationUrl ?? null,
    userCode: login.userCode ?? null
  };
}

async function main() {
  let client: CodexAppServerClient | undefined;

  try {
    client = new CodexAppServerClient({ command, home: aiConfig.codexBridge.home });
    let accountState = await withTimeout(client.readAccount(true), timeoutMs, "codex bridge smoke account/read");
    let loggedIn = Boolean(accountState.account) || !accountState.requiresOpenaiAuth;
    let loginResult: ReturnType<typeof sanitizedLoginResult> | null = null;
    let loginCompletion: Awaited<ReturnType<CodexAppServerClient["waitForLoginCompletion"]>> | null = null;

    if (!loggedIn && shouldStartLogin) {
      const login = await withTimeout(
        client.startChatGptLogin(true),
        timeoutMs,
        "codex bridge smoke account/login/start"
      );
      loginResult = sanitizedLoginResult(login);

      if (shouldWaitForLogin && login.loginId) {
        console.log(
          JSON.stringify(
            {
              ok: false,
              event: "login_started",
              command,
              codexHome,
              appServer: "stdio",
              login: loginResult
            },
            null,
            2
          )
        );
        loginCompletion = await withTimeout(
          client.waitForLoginCompletion(login.loginId),
          timeoutMs,
          "codex bridge smoke account/login/completed"
        );
        accountState = await withTimeout(client.readAccount(true), timeoutMs, "codex bridge smoke account/read after login");
        loggedIn = Boolean(accountState.account) || !accountState.requiresOpenaiAuth;
      }
    }

    const result = {
      ok: loggedIn,
      command,
      codexHome,
      appServer: "stdio",
      requiresOpenaiAuth: accountState.requiresOpenaiAuth,
      accountType: accountState.account?.type ?? null,
      planType: accountState.account?.planType ?? null,
      loginStarted: Boolean(loginResult),
      login: loginResult,
      loginCompletion
    };

    console.log(JSON.stringify(result, null, 2));

    if (!loggedIn) {
      process.exitCode = 2;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown Codex bridge smoke failure";
    const code = error instanceof ProviderExecutionError ? error.code : "provider_error";
    console.error(JSON.stringify({ ok: false, command, codexHome, code, message }, null, 2));
    process.exitCode = 1;
  } finally {
    client?.close();
  }
}

void main();
