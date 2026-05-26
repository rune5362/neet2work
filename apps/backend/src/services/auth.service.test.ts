import { beforeEach, describe, expect, it } from "vitest";
import { AuditAction, UserStatus, type PrismaClient, type User } from "../generated/prisma/client.js";
import { HttpError } from "../errors/httpError.js";
import { hashPassword } from "./password.service.js";
import { loginWithClient, logoutWithClient, refreshAccessTokenWithClient } from "./auth.service.js";

type MockRefreshToken = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
  deletedAt: Date | null;
  user?: User;
};

function createUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    email: "user@example.com",
    passwordHash: "placeholder",
    name: "사용자",
    nickname: null,
    profileImageUrl: null,
    status: UserStatus.ACTIVE,
    emailVerifiedAt: null,
    lastLoginAt: null,
    failedLoginCount: 2,
    lockedUntil: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    deletedAt: null,
    createdBy: "user-1",
    updatedBy: null,
    deletedBy: null,
    ...overrides
  };
}

function createMockPrisma(user: User | null) {
  const auditLogs: unknown[] = [];
  const refreshTokens: MockRefreshToken[] = [];
  const state = {
    user,
    refreshTokens
  };
  const tx = {
    user: {
      update: async ({ data }: { data: Partial<User> & { failedLoginCount?: number | { increment: number } } }) => {
        if (!state.user) {
          throw new Error("Missing user");
        }

        if (typeof data.failedLoginCount === "object" && data.failedLoginCount !== null) {
          state.user.failedLoginCount += data.failedLoginCount.increment;
        } else if (typeof data.failedLoginCount === "number") {
          state.user.failedLoginCount = data.failedLoginCount;
        }

        if (data.lastLoginAt) {
          state.user.lastLoginAt = data.lastLoginAt;
        }

        return state.user;
      }
    },
    auditLog: {
      create: async ({ data }: { data: unknown }) => {
        auditLogs.push(data);
        return data;
      }
    },
    refreshToken: {
      create: async ({ data }: { data: Omit<MockRefreshToken, "id" | "revokedAt" | "lastUsedAt" | "deletedAt"> }) => {
        const token = {
          id: `refresh-token-${refreshTokens.length + 1}`,
          revokedAt: null,
          lastUsedAt: null,
          deletedAt: null,
          ...data
        };
        refreshTokens.push(token);
        return token;
      },
      update: async ({ where, data }: { where: { id: string }; data: Partial<MockRefreshToken> }) => {
        const token = refreshTokens.find((item) => item.id === where.id);
        if (!token) {
          throw new Error("Missing refresh token");
        }

        Object.assign(token, data);
        return token;
      }
    }
  };
  const prisma = {
    user: {
      findFirst: async () => state.user
    },
    auditLog: tx.auditLog,
    refreshToken: {
      findUnique: async ({ where, include }: { where: { tokenHash: string }; include?: { user?: boolean } }) => {
        const token = refreshTokens.find((item) => item.tokenHash === where.tokenHash) ?? null;
        if (!token) {
          return null;
        }

        return include?.user ? { ...token, user: state.user } : token;
      }
    },
    $transaction: async <T>(callback: (client: typeof tx) => Promise<T>) => callback(tx)
  } as unknown as PrismaClient;

  return {
    auditLogs,
    prisma,
    state
  };
}

describe("auth service login", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret";
    process.env.ACCESS_TOKEN_EXPIRES_IN_SECONDS = "3600";
  });

  it("issues an access token and omits passwordHash on successful login", async () => {
    const passwordHash = await hashPassword("StrongPass1");
    const mock = createMockPrisma(createUser({ passwordHash }));

    const result = await loginWithClient(mock.prisma, {
      email: "user@example.com",
      password: "StrongPass1"
    });

    expect(result.accessToken.split(".")).toHaveLength(3);
    expect(result.tokenType).toBe("Bearer");
    expect(result.expiresIn).toBe(3600);
    expect(result.refreshToken).toEqual(expect.any(String));
    expect(result.refreshTokenExpiresIn).toBe(60 * 60 * 24 * 30);
    expect("passwordHash" in result.user).toBe(false);
    expect(mock.state.user?.failedLoginCount).toBe(0);
    expect(mock.state.user?.lastLoginAt).toBeInstanceOf(Date);
    expect(mock.state.refreshTokens).toHaveLength(1);
    expect(mock.auditLogs).toMatchObject([{ action: AuditAction.LOGIN_SUCCEEDED }]);
  });

  it("increments failedLoginCount and writes an audit log on wrong password", async () => {
    const passwordHash = await hashPassword("StrongPass1");
    const mock = createMockPrisma(createUser({ passwordHash, failedLoginCount: 0 }));

    await expect(
      loginWithClient(mock.prisma, {
        email: "user@example.com",
        password: "WrongPass1"
      })
    ).rejects.toBeInstanceOf(HttpError);

    expect(mock.state.user?.failedLoginCount).toBe(1);
    expect(mock.auditLogs).toMatchObject([{ action: AuditAction.LOGIN_FAILED }]);
  });

  it("rotates refresh tokens and returns a new access token", async () => {
    const passwordHash = await hashPassword("StrongPass1");
    const mock = createMockPrisma(createUser({ passwordHash }));
    const loginResult = await loginWithClient(mock.prisma, {
      email: "user@example.com",
      password: "StrongPass1"
    });

    const refreshResult = await refreshAccessTokenWithClient(mock.prisma, {
      refreshToken: loginResult.refreshToken
    });

    expect(refreshResult.accessToken.split(".")).toHaveLength(3);
    expect(refreshResult.refreshToken).not.toBe(loginResult.refreshToken);
    expect(mock.state.refreshTokens).toHaveLength(2);
    expect(mock.state.refreshTokens[0]?.revokedAt).toBeInstanceOf(Date);
  });

  it("revokes refresh token on logout and writes an audit log", async () => {
    const passwordHash = await hashPassword("StrongPass1");
    const mock = createMockPrisma(createUser({ passwordHash }));
    const loginResult = await loginWithClient(mock.prisma, {
      email: "user@example.com",
      password: "StrongPass1"
    });

    const logoutResult = await logoutWithClient(mock.prisma, {
      refreshToken: loginResult.refreshToken
    });

    expect(logoutResult.revoked).toBe(true);
    expect(mock.state.refreshTokens[0]?.revokedAt).toBeInstanceOf(Date);
    expect(mock.auditLogs).toMatchObject([
      { action: AuditAction.LOGIN_SUCCEEDED },
      { action: AuditAction.LOGGED_OUT }
    ]);
  });
});
