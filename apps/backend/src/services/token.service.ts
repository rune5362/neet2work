import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

type AccessTokenPayload = {
  sub: string;
  email: string;
  status: string;
};

const defaultAccessTokenTtlSeconds = 60 * 60;
const defaultRefreshTokenTtlSeconds = 60 * 60 * 24 * 30;

function base64UrlEncode(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

function base64UrlDecode(value: string) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  return Buffer.from(padded, "base64").toString("utf8");
}

function getAccessTokenTtlSeconds() {
  const value = Number(process.env.ACCESS_TOKEN_EXPIRES_IN_SECONDS);
  return Number.isFinite(value) && value > 0 ? value : defaultAccessTokenTtlSeconds;
}

export function getRefreshTokenTtlSeconds() {
  const value = Number(process.env.REFRESH_TOKEN_EXPIRES_IN_SECONDS);
  return Number.isFinite(value) && value > 0 ? value : defaultRefreshTokenTtlSeconds;
}

function getJwtSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET이 설정되어 있지 않습니다.");
  }

  return process.env.JWT_SECRET;
}

export function issueRefreshToken() {
  const refreshToken = base64UrlEncode(randomBytes(48));
  const expiresIn = getRefreshTokenTtlSeconds();

  return {
    refreshToken,
    refreshTokenHash: hashRefreshToken(refreshToken),
    refreshTokenExpiresIn: expiresIn,
    refreshTokenExpiresAt: new Date(Date.now() + expiresIn * 1000)
  };
}

export function hashRefreshToken(refreshToken: string) {
  return createHash("sha256").update(refreshToken).digest("hex");
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

export function verifyAccessToken(accessToken: string): AccessTokenPayload {
  const [encodedHeader, encodedClaims, signature] = accessToken.split(".");

  if (!encodedHeader || !encodedClaims || !signature) {
    throw new Error("Invalid access token");
  }

  const expectedSignature = base64UrlEncode(
    createHmac("sha256", getJwtSecret()).update(`${encodedHeader}.${encodedClaims}`).digest()
  );
  const actualSignature = Buffer.from(signature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);

  if (
    actualSignature.length !== expectedSignatureBuffer.length ||
    !timingSafeEqual(actualSignature, expectedSignatureBuffer)
  ) {
    throw new Error("Invalid access token signature");
  }

  const claims = JSON.parse(base64UrlDecode(encodedClaims)) as AccessTokenPayload & {
    exp?: number;
  };

  if (!claims.sub || !claims.email || !claims.status || !claims.exp) {
    throw new Error("Invalid access token claims");
  }

  if (claims.exp <= Math.floor(Date.now() / 1000)) {
    throw new Error("Expired access token");
  }

  return {
    sub: claims.sub,
    email: claims.email,
    status: claims.status
  };
}
