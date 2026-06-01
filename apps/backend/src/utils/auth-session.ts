import { verifyAccessToken } from "../services/token.service.js";
import { HttpError } from "./http-error.js";

export function getAuthenticatedUserId(authorizationHeader: string | undefined) {
  const [type, token] = authorizationHeader?.split(" ") ?? [];

  if (type !== "Bearer" || !token) {
    throw new HttpError(401, "인증이 필요합니다.");
  }

  try {
    return verifyAccessToken(token).sub;
  } catch {
    throw new HttpError(401, "세션이 만료되었습니다. 다시 로그인해 주세요.");
  }
}

export function getAuthenticatedCandidateKey(authorizationHeader: string | undefined) {
  return getAuthenticatedUserId(authorizationHeader);
}
