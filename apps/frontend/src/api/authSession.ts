import { refreshSession, type AuthUser, type LoginResult } from "./client";

const ACCESS_TOKEN_KEY = "neet2work.auth.accessToken";
const REFRESH_TOKEN_KEY = "neet2work.auth.refreshToken";
const EXPIRES_AT_KEY = "neet2work.auth.expiresAt";
const REFRESH_EXPIRES_AT_KEY = "neet2work.auth.refreshExpiresAt";
const TOKEN_TYPE_KEY = "neet2work.auth.tokenType";
const USER_KEY = "neet2work.auth.user";
const ACCESS_TOKEN_REFRESH_BUFFER_MS = 30_000;

function getBrowserSession() {
  if (typeof window === "undefined") {
    return null;
  }

  return window;
}

function ensureBrowserSession() {
  const currentWindow = getBrowserSession();
  if (!currentWindow) {
    throw new Error("로그인이 필요합니다.");
  }

  return currentWindow;
}

export function saveLoginSession(result: LoginResult) {
  const currentWindow = ensureBrowserSession();
  currentWindow.localStorage.setItem(USER_KEY, JSON.stringify(result.user));
  currentWindow.localStorage.setItem(ACCESS_TOKEN_KEY, result.accessToken);
  currentWindow.localStorage.setItem(REFRESH_TOKEN_KEY, result.refreshToken);
  currentWindow.localStorage.setItem(TOKEN_TYPE_KEY, result.tokenType);
  currentWindow.localStorage.setItem(EXPIRES_AT_KEY, String(Date.now() + result.expiresIn * 1000));
  currentWindow.localStorage.setItem(
    REFRESH_EXPIRES_AT_KEY,
    String(Date.now() + result.refreshTokenExpiresIn * 1000)
  );
  currentWindow.dispatchEvent(new Event("neet2work.auth.changed"));
}

export function getStoredAuthUser(): AuthUser | null {
  const currentWindow = getBrowserSession();
  if (!currentWindow) {
    return null;
  }

  const storedUser = currentWindow.localStorage.getItem(USER_KEY);
  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser) as AuthUser;
  } catch {
    return null;
  }
}

export function saveStoredAuthUser(user: AuthUser) {
  const currentWindow = ensureBrowserSession();
  currentWindow.localStorage.setItem(USER_KEY, JSON.stringify(user));
  currentWindow.dispatchEvent(new Event("neet2work.auth.changed"));
}

export function getStoredRefreshToken() {
  const currentWindow = getBrowserSession();
  return currentWindow?.localStorage.getItem(REFRESH_TOKEN_KEY) ?? null;
}

export function clearLoginSession() {
  const currentWindow = ensureBrowserSession();
  currentWindow.localStorage.removeItem(USER_KEY);
  currentWindow.localStorage.removeItem(ACCESS_TOKEN_KEY);
  currentWindow.localStorage.removeItem(REFRESH_TOKEN_KEY);
  currentWindow.localStorage.removeItem(TOKEN_TYPE_KEY);
  currentWindow.localStorage.removeItem(EXPIRES_AT_KEY);
  currentWindow.localStorage.removeItem(REFRESH_EXPIRES_AT_KEY);
  currentWindow.dispatchEvent(new Event("neet2work.auth.changed"));
}

export async function getRequiredAccessToken() {
  const currentWindow = ensureBrowserSession();
  const accessToken = currentWindow.localStorage.getItem(ACCESS_TOKEN_KEY);
  const expiresAt = Number(currentWindow.localStorage.getItem(EXPIRES_AT_KEY));

  if (accessToken && Number.isFinite(expiresAt) && expiresAt > Date.now() + ACCESS_TOKEN_REFRESH_BUFFER_MS) {
    return accessToken;
  }

  const refreshToken = currentWindow.localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) {
    throw new Error("로그인이 필요합니다.");
  }

  const refreshedSession = await refreshSession(refreshToken);
  saveLoginSession(refreshedSession);
  return refreshedSession.accessToken;
}
