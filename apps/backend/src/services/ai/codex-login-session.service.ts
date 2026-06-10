import { aiConfig } from "../../config/ai-config.js";
import { HttpError } from "../../utils/http-error.js";
import { CodexAppServerClient, type CodexAccount } from "./codex-app-server-client.js";
import { ProviderExecutionError, withTimeout } from "./provider-utils.js";

type LoginSessionStatus = "pending" | "succeeded" | "failed" | "expired";

type CodexLoginOptions = {
  forceLocal?: boolean;
};

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

function shouldUseRemoteRelay(options?: CodexLoginOptions) {
  return !options?.forceLocal && Boolean(aiConfig.codexBridge.remoteBaseUrl);
}

function relayUrl(pathname: string) {
  return `${aiConfig.codexBridge.remoteBaseUrl}${pathname}`;
}

function relayHeaders(): Record<string, string> {
  const token = aiConfig.codexBridge.relayToken.trim();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseRelayResponse<T>(response: Response, label: string) {
  if (!response.ok) {
    throw new HttpError(502, `${label} relay failed`);
  }

  const body = (await response.json()) as { data?: T };
  if (!body.data) {
    throw new HttpError(502, `${label} relay invalid`);
  }

  return body.data;
}

async function startRemoteCodexBridgeLogin() {
  const response = await withTimeout(
    fetch(relayUrl("/api/codex-bridge-relay/login"), {
      method: "POST",
      headers: relayHeaders()
    }),
    LOGIN_START_TIMEOUT_MS,
    "codex relay login/start"
  );

  return parseRelayResponse(response, "Codex login");
}

async function getRemoteCodexBridgeLoginStatus(loginId: string) {
  const response = await withTimeout(
    fetch(relayUrl(`/api/codex-bridge-relay/login/${encodeURIComponent(loginId)}`), {
      headers: relayHeaders()
    }),
    LOGIN_START_TIMEOUT_MS,
    "codex relay login/status"
  );

  return parseRelayResponse(response, "Codex login status");
}

export async function startCodexBridgeLogin(options?: CodexLoginOptions) {
  if (!aiConfig.codexBridge.enabled) {
    throw new HttpError(400, "Codex Bridge가 비활성화되어 있습니다.");
  }

  if (shouldUseRemoteRelay(options)) {
    return startRemoteCodexBridgeLogin();
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

export async function getCodexBridgeLoginStatus(loginId: string, options?: CodexLoginOptions) {
  if (shouldUseRemoteRelay(options)) {
    return getRemoteCodexBridgeLoginStatus(loginId);
  }

  pruneExpiredSessions();
  const session = sessions.get(loginId);
  return session ? toLoginResponse(session) : null;
}
