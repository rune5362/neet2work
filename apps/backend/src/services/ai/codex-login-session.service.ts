import { aiConfig } from "../../config/ai-config.js";
import { HttpError } from "../../utils/http-error.js";
import { CodexAppServerClient, type CodexAccount } from "./codex-app-server-client.js";
import { ProviderExecutionError, withTimeout } from "./provider-utils.js";

type LoginSessionStatus = "pending" | "succeeded" | "failed" | "expired";

type LoginSession = {
  loginId: string;
  startedAt: string;
  expiresAt: number;
  status: LoginSessionStatus;
  error: string | null;
  account: CodexAccount | null;
  login: {
    type: string;
    loginId: string;
    authUrl: string | null;
    verificationUrl: string | null;
    userCode: string | null;
  };
  client: CodexAppServerClient;
};

const LOGIN_START_TIMEOUT_MS = 10_000;
const LOGIN_SESSION_TTL_MS = 5 * 60 * 1000;
const sessions = new Map<string, LoginSession>();

function accountIsUsable(accountState: Awaited<ReturnType<CodexAppServerClient["readAccount"]>>) {
  return Boolean(accountState.account) || !accountState.requiresOpenaiAuth;
}

function pruneExpiredSessions() {
  const now = Date.now();

  for (const [loginId, session] of sessions) {
    if (session.expiresAt > now) {
      continue;
    }

    if (session.status === "pending") {
      session.status = "expired";
      session.error = "codex_login_timeout";
    }

    session.client.close();
    sessions.delete(loginId);
  }
}

function toLoginResponse(session: LoginSession) {
  return {
    loginId: session.loginId,
    status: session.status,
    error: session.error,
    account: session.account,
    login: session.login,
    expiresAt: new Date(session.expiresAt).toISOString()
  };
}

function toAlreadyLoggedInResponse(account: CodexAccount | null) {
  return {
    loginId: null,
    status: "succeeded" as const,
    error: null,
    account,
    login: null,
    expiresAt: null
  };
}

export async function startCodexBridgeLogin() {
  if (!aiConfig.codexBridge.enabled) {
    throw new HttpError(400, "Codex Bridge가 비활성화되어 있습니다.");
  }

  pruneExpiredSessions();

  const client = new CodexAppServerClient({
    command: aiConfig.codexBridge.command,
    home: aiConfig.codexBridge.home
  });

  try {
    const accountState = await withTimeout(client.readAccount(true), LOGIN_START_TIMEOUT_MS, "codex account/read");
    if (accountIsUsable(accountState)) {
      client.close();
      return toAlreadyLoggedInResponse(accountState.account);
    }

    const login = await withTimeout(
      client.startChatGptLogin(true),
      LOGIN_START_TIMEOUT_MS,
      "codex account/login/start"
    );
    if (!login.loginId) {
      throw new ProviderExecutionError("provider_error", "codex app-server did not return a login id");
    }

    const session: LoginSession = {
      loginId: login.loginId,
      startedAt: new Date().toISOString(),
      expiresAt: Date.now() + LOGIN_SESSION_TTL_MS,
      status: "pending",
      error: null,
      account: null,
      login: {
        type: login.type,
        loginId: login.loginId,
        authUrl: login.authUrl ?? null,
        verificationUrl: login.verificationUrl ?? null,
        userCode: login.userCode ?? null
      },
      client
    };

    sessions.set(login.loginId, session);
    const timeout = setTimeout(() => {
      if (session.status !== "pending") {
        return;
      }

      session.status = "expired";
      session.error = "codex_login_timeout";
      void session.client.cancelLogin(session.loginId).catch(() => undefined);
      session.client.close();
    }, LOGIN_SESSION_TTL_MS);
    timeout.unref?.();

    void session.client
      .waitForLoginCompletion(session.loginId)
      .then(async (completion) => {
        if (!completion.success) {
          session.status = "failed";
          session.error = completion.error ?? "codex_login_failed";
          return;
        }

        const refreshedAccount = await session.client.readAccount(true);
        session.status = accountIsUsable(refreshedAccount) ? "succeeded" : "failed";
        session.error = session.status === "succeeded" ? null : "codex_not_logged_in";
        session.account = refreshedAccount.account;
      })
      .catch((error: unknown) => {
        session.status = "failed";
        session.error = error instanceof Error ? error.message : "codex_login_failed";
      })
      .finally(() => {
        session.client.close();
      });

    return toLoginResponse(session);
  } catch (error) {
    client.close();
    throw error;
  }
}

export function getCodexBridgeLoginStatus(loginId: string) {
  pruneExpiredSessions();
  const session = sessions.get(loginId);
  return session ? toLoginResponse(session) : null;
}
