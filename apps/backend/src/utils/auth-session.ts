import { verifyAccessToken } from "../services/token.service.js";
import { HttpError } from "./http-error.js";

export type AuthenticatedSession = {
  userId: string;
  email: string;
  status: string;
};

export function getAuthenticatedSession(authorizationHeader: string | undefined): AuthenticatedSession {
  const [type, token] = authorizationHeader?.split(" ") ?? [];

  if (type !== "Bearer" || !token) {
    throw new HttpError(401, "인증이 필요합니다.");
  }

  try {
    const payload = verifyAccessToken(token);
    if (payload.status !== "ACTIVE") {
      throw new Error("Inactive access token");
    }

    return {
      userId: payload.sub,
      email: payload.email,
      status: payload.status
    };
  } catch {
    throw new HttpError(401, "세션이 만료되었습니다. 다시 로그인해 주세요.");
  }
}

export function getAuthenticatedUserId(authorizationHeader: string | undefined) {
  return getAuthenticatedSession(authorizationHeader).userId;
}

export function getAuthenticatedCandidateKey(authorizationHeader: string | undefined) {
  return getAuthenticatedUserId(authorizationHeader);
}
