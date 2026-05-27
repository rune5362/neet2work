import { beforeEach, describe, expect, it } from "vitest";
import { AuditAction, UserStatus, type PrismaClient, type User } from "../generated/prisma/client.js";
import { HttpError } from "../errors/httpError.js";
import { hashPassword, verifyPassword } from "./password.service.js";
import {
  loginWithClient,
  logoutWithClient,
  refreshAccessTokenWithClient,
  signUpSchema,
  signUpWithClient,
  updateProfileWithClient
} from "./auth.service.js";

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
  const priorLoginIpAddress = "192.168.0.10";
  const refreshTokens: MockRefreshToken[] = [];
  const state = {
    findFirstArgs: null as unknown,
    findUniqueArgs: null as unknown,
    user,
    refreshTokens
  };
  const tx = {
    user: {
      create: async ({ data }: { data: Partial<User> }) => {
        const createdUser = createUser({
          ...data,
          createdAt: new Date("2026-01-02T00:00:00.000Z"),
          updatedAt: new Date("2026-01-02T00:00:00.000Z")
        });
        state.user = createdUser;
        return createdUser;
      },
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

        if (data.lockedUntil !== undefined) {
          state.user.lockedUntil = data.lockedUntil;
        }

        if (data.name !== undefined) {
          state.user.name = data.name;
        }

        if (data.nickname !== undefined) {
          state.user.nickname = data.nickname;
        }

        if (data.profileImageUrl !== undefined) {
          state.user.profileImageUrl = data.profileImageUrl;
        }

        if (data.updatedBy !== undefined) {
          state.user.updatedBy = data.updatedBy;
        }

        return state.user;
      }
    },
    auditLog: {
      create: async ({ data }: { data: unknown }) => {
        auditLogs.push(data);
        return data;
      },
      findMany: async () => {
        return [{ ipAddress: priorLoginIpAddress }];
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
      findFirst: async (args: unknown) => {
        state.findFirstArgs = args;
        return state.user;
      },
      findUnique: async (args: unknown) => {
        state.findUniqueArgs = args;
        return state.user;
      },
      update: tx.user.update
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
    priorLoginIpAddress,
    state
  };
}

describe("auth service signup", () => {
  it("creates a user, hashes the password, omits passwordHash, and writes an audit log", async () => {
    const mock = createMockPrisma(null);

    const result = await signUpWithClient(
      mock.prisma,
      {
        email: "new.user@example.com",
        password: "StrongPass1",
        name: "새사용자"
      },
      {
        ipAddress: "127.0.0.1",
        userAgent: "vitest"
      }
    );

    expect(result.email).toBe("new.user@example.com");
    expect("passwordHash" in result).toBe(false);
    expect(mock.state.user?.passwordHash).not.toBe("StrongPass1");
    await expect(verifyPassword("StrongPass1", mock.state.user?.passwordHash ?? "")).resolves.toBe(true);
    expect(mock.state.user?.createdBy).toBe(mock.state.user?.id);
    expect(mock.auditLogs).toMatchObject([{ action: AuditAction.USER_SIGNED_UP }]);
  });

  it("rejects duplicate email signup", async () => {
    const mock = createMockPrisma(createUser({ email: "user@example.com" }));

    await expect(
      signUpWithClient(mock.prisma, {
        email: "user@example.com",
        password: "StrongPass1",
        name: "사용자"
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "이미 가입된 이메일입니다."
    });
  });

  it("rejects invalid email input", () => {
    const result = signUpSchema.safeParse({
      email: "invalid-email",
      password: "StrongPass1",
      name: "사용자"
    });

    expect(result.success).toBe(false);
  });

  it("rejects weak password input", () => {
    const result = signUpSchema.safeParse({
      email: "user@example.com",
      password: "weakpass",
      name: "사용자"
    });

    expect(result.success).toBe(false);
  });
});

describe("auth service login", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret";
    process.env.ACCESS_TOKEN_EXPIRES_IN_SECONDS = "3600";
    process.env.LOGIN_MAX_FAILED_ATTEMPTS = "5";
    process.env.LOGIN_LOCK_MINUTES = "15";
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
    expect(result.user.lastLoginIpAddress).toBe(mock.priorLoginIpAddress);
    expect("passwordHash" in result.user).toBe(false);
    expect(mock.state.user?.failedLoginCount).toBe(0);
    expect(mock.state.user?.lockedUntil).toBeNull();
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

  it("rejects missing users with a generic message and audit log", async () => {
    const mock = createMockPrisma(null);

    await expect(
      loginWithClient(mock.prisma, {
        email: "missing@example.com",
        password: "StrongPass1"
      })
    ).rejects.toMatchObject({
      statusCode: 401,
      message: "이메일 또는 비밀번호가 올바르지 않습니다."
    });

    expect(mock.auditLogs).toMatchObject([{ action: AuditAction.LOGIN_FAILED }]);
  });

  it("applies deletedAt null filter when looking up a login user", async () => {
    const passwordHash = await hashPassword("StrongPass1");
    const mock = createMockPrisma(createUser({ passwordHash }));

    await loginWithClient(mock.prisma, {
      email: "user@example.com",
      password: "StrongPass1"
    });

    expect(mock.state.findFirstArgs).toMatchObject({
      where: {
        email: "user@example.com",
        deletedAt: null
      }
    });
  });

  it("blocks soft deleted users when the lookup returns no active row", async () => {
    const mock = createMockPrisma(null);

    await expect(
      loginWithClient(mock.prisma, {
        email: "deleted@example.com",
        password: "StrongPass1"
      })
    ).rejects.toMatchObject({
      statusCode: 401,
      message: "이메일 또는 비밀번호가 올바르지 않습니다."
    });
  });

  it("blocks suspended users with a generic message and audit log", async () => {
    const passwordHash = await hashPassword("StrongPass1");
    const mock = createMockPrisma(createUser({ passwordHash, status: UserStatus.SUSPENDED }));

    await expect(
      loginWithClient(mock.prisma, {
        email: "user@example.com",
        password: "StrongPass1"
      })
    ).rejects.toMatchObject({
      statusCode: 401,
      message: "이메일 또는 비밀번호가 올바르지 않습니다."
    });

    expect(mock.auditLogs).toMatchObject([{ action: AuditAction.LOGIN_FAILED }]);
    expect(mock.state.refreshTokens).toHaveLength(0);
  });

  it("locks an account after too many failed logins", async () => {
    const passwordHash = await hashPassword("StrongPass1");
    const mock = createMockPrisma(createUser({ passwordHash, failedLoginCount: 4 }));

    await expect(
      loginWithClient(mock.prisma, {
        email: "user@example.com",
        password: "WrongPass1"
      })
    ).rejects.toMatchObject({
      statusCode: 401,
      message: "이메일 또는 비밀번호가 올바르지 않습니다."
    });

    expect(mock.state.user?.failedLoginCount).toBe(5);
    expect(mock.state.user?.lockedUntil).toBeInstanceOf(Date);
    expect(mock.auditLogs).toMatchObject([
      { action: AuditAction.LOGIN_FAILED },
      { action: AuditAction.ACCOUNT_LOCKED }
    ]);
  });

  it("blocks login while the account is locked", async () => {
    const passwordHash = await hashPassword("StrongPass1");
    const mock = createMockPrisma(
      createUser({
        passwordHash,
        lockedUntil: new Date(Date.now() + 60_000)
      })
    );

    await expect(
      loginWithClient(mock.prisma, {
        email: "user@example.com",
        password: "StrongPass1"
      })
    ).rejects.toMatchObject({
      statusCode: 423,
      message: "로그인 실패 횟수가 초과되었습니다. 잠시 후 다시 시도해 주세요."
    });

    expect(mock.state.refreshTokens).toHaveLength(0);
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

describe("auth service profile", () => {
  it("updates editable profile fields and omits passwordHash", async () => {
    const mock = createMockPrisma(createUser({ name: "이전이름", nickname: "old" }));

    const result = await updateProfileWithClient(mock.prisma, "user-1", {
      name: "새이름",
      nickname: "new",
      profileImageUrl: "https://example.com/profile.png"
    });

    expect(result.name).toBe("새이름");
    expect(result.nickname).toBe("new");
    expect(result.profileImageUrl).toBe("https://example.com/profile.png");
    expect("passwordHash" in result).toBe(false);
    expect(mock.state.findFirstArgs).toMatchObject({
      where: {
        id: "user-1",
        deletedAt: null,
        status: UserStatus.ACTIVE
      }
    });
    expect(mock.state.user?.updatedBy).toBe("user-1");
  });
});
