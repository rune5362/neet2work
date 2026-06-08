import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { issueAccessToken, verifyAccessToken } from "./token.service.js";

function base64UrlEncode(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

function signToken(header: unknown, claims: unknown, secret: string) {
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedClaims = base64UrlEncode(JSON.stringify(claims));
  const signature = base64UrlEncode(
    createHmac("sha256", secret).update(`${encodedHeader}.${encodedClaims}`).digest()
  );

  return `${encodedHeader}.${encodedClaims}.${signature}`;
}

describe("token service", () => {
  beforeEach(() => {
    process.env.ACCESS_TOKEN_EXPIRES_IN_SECONDS = "3600";
    process.env.JWT_SECRET = "test-secret";
  });

  afterEach(() => {
    delete process.env.ACCESS_TOKEN_EXPIRES_IN_SECONDS;
    delete process.env.JWT_SECRET;
    delete process.env.NODE_ENV;
  });

  it("verifies access tokens issued by the service", () => {
    const { accessToken } = issueAccessToken({
      sub: "user-1",
      email: "user@example.com",
      status: "ACTIVE"
    });

    expect(verifyAccessToken(accessToken)).toEqual({
      sub: "user-1",
      email: "user@example.com",
      status: "ACTIVE"
    });
  });

  it("rejects tokens with extra segments", () => {
    const { accessToken } = issueAccessToken({
      sub: "user-1",
      email: "user@example.com",
      status: "ACTIVE"
    });

    expect(() => verifyAccessToken(`${accessToken}.extra`)).toThrow("Invalid access token");
  });

  it("rejects tokens signed with unsupported JWT headers", () => {
    const accessToken = signToken(
      {
        alg: "HS512",
        typ: "JWT"
      },
      {
        sub: "user-1",
        email: "user@example.com",
        status: "ACTIVE",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      },
      "test-secret"
    );

    expect(() => verifyAccessToken(accessToken)).toThrow("Invalid access token header");
  });

  it("rejects placeholder JWT secrets in production", () => {
    process.env.NODE_ENV = "production";
    process.env.JWT_SECRET = "change-me-to-a-long-random-secret";

    expect(() =>
      issueAccessToken({
        sub: "user-1",
        email: "user@example.com",
        status: "ACTIVE"
      })
    ).toThrow("운영 환경 JWT_SECRET은 32바이트 이상의 무작위 값이어야 합니다.");
  });

  it("rejects short JWT secrets in production", () => {
    process.env.NODE_ENV = "production";
    process.env.JWT_SECRET = "short-secret";

    expect(() =>
      issueAccessToken({
        sub: "user-1",
        email: "user@example.com",
        status: "ACTIVE"
      })
    ).toThrow("운영 환경 JWT_SECRET은 32바이트 이상의 무작위 값이어야 합니다.");
  });
});
