import { createHmac } from "node:crypto";

type AccessTokenPayload = {
  sub: string;
  email: string;
  status: string;
};

const defaultAccessTokenTtlSeconds = 60 * 60;

function base64UrlEncode(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

function getAccessTokenTtlSeconds() {
  const value = Number(process.env.ACCESS_TOKEN_EXPIRES_IN_SECONDS);
  return Number.isFinite(value) && value > 0 ? value : defaultAccessTokenTtlSeconds;
}

function getJwtSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET이 설정되어 있지 않습니다.");
  }

  return process.env.JWT_SECRET;
}

export function issueAccessToken(payload: AccessTokenPayload) {
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = getAccessTokenTtlSeconds();
  const header = {
    alg: "HS256",
    typ: "JWT"
  };
  const claims = {
    sub: payload.sub,
    email: payload.email,
    status: payload.status,
    iat: now,
    exp: now + expiresIn
  };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedClaims = base64UrlEncode(JSON.stringify(claims));
  const signature = base64UrlEncode(
    createHmac("sha256", getJwtSecret()).update(`${encodedHeader}.${encodedClaims}`).digest()
  );

  return {
    accessToken: `${encodedHeader}.${encodedClaims}.${signature}`,
    expiresIn
  };
}
