import { beforeEach, describe, expect, it } from "vitest";
import { AuditAction, UserStatus, type PrismaClient, type User } from "../generated/prisma/client.js";
import { HttpError } from "../errors/httpError.js";
import { hashPassword } from "./password.service.js";
import { loginWithClient } from "./auth.service.js";

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
  const state = {
    user
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
    }
  };
  const prisma = {
    user: {
      findFirst: async () => state.user
    },
    auditLog: tx.auditLog,
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
    expect(result.refreshToken).toBeNull();
    expect("passwordHash" in result.user).toBe(false);
    expect(mock.state.user?.failedLoginCount).toBe(0);
    expect(mock.state.user?.lastLoginAt).toBeInstanceOf(Date);
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
});
