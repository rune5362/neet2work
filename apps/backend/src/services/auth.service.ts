import { randomUUID } from "node:crypto";
import { z } from "zod";
import { createAuditLog } from "../database/auditLog.js";
import { getPrismaClient } from "../database/prisma.js";
import { AuditAction, UserStatus, type PrismaClient, type User } from "../generated/prisma/client.js";
import { HttpError } from "../errors/httpError.js";
import { hashPassword, verifyPassword } from "./password.service.js";
import { hashRefreshToken, issueAccessToken, issueRefreshToken } from "./token.service.js";

const passwordSchema = z
  .string()
  .min(8, "비밀번호는 8자 이상이어야 합니다.")
  .refine((value) => /[a-z]/.test(value), "비밀번호에는 소문자가 포함되어야 합니다.")
  .refine((value) => /[A-Z]/.test(value), "비밀번호에는 대문자가 포함되어야 합니다.")
  .refine((value) => /[0-9]/.test(value), "비밀번호에는 숫자가 포함되어야 합니다.");

const nameSchema = z
  .string()
  .trim()
  .refine((value) => {
    const length = Array.from(value).length;
    return length >= 2 && length <= 30;
  }, "이름은 2자 이상 30자 이하여야 합니다.");

export const signUpSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: passwordSchema,
  name: nameSchema.optional(),
  nickname: z.string().trim().max(30).optional(),
  profileImageUrl: z.string().trim().url().optional()
});

export type SignUpInput = z.infer<typeof signUpSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1)
});

export type LoginInput = z.infer<typeof loginSchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1)
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

export const logoutSchema = refreshTokenSchema;

export type LogoutInput = z.infer<typeof logoutSchema>;

type RequestContext = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

type PublicUser = Pick<
  User,
  | "id"
  | "email"
  | "name"
  | "nickname"
  | "profileImageUrl"
  | "status"
  | "emailVerifiedAt"
  | "createdAt"
  | "updatedAt"
>;

function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    nickname: user.nickname,
    profileImageUrl: user.profileImageUrl,
    status: user.status,
    emailVerifiedAt: user.emailVerifiedAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

export async function signUp(input: SignUpInput, context: RequestContext = {}) {
  const prisma = getPrismaClient();

  if (!prisma) {
    throw new HttpError(503, "데이터베이스가 설정되어 있지 않습니다.");
  }

  return signUpWithClient(prisma, input, context);
}

export async function signUpWithClient(
  prisma: PrismaClient,
  input: SignUpInput,
  context: RequestContext = {}
) {
  const existingUser = await prisma.user.findUnique({
    where: {
      email: input.email
    },
    select: {
      id: true,
      deletedAt: true
    }
  });

  if (existingUser) {
    throw new HttpError(409, "이미 가입된 이메일입니다.");
  }

  const userId = randomUUID();
  const passwordHash = await hashPassword(input.password);

  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        id: userId,
        email: input.email,
        passwordHash,
        name: input.name,
        nickname: input.nickname,
        profileImageUrl: input.profileImageUrl,
        status: UserStatus.ACTIVE,
        createdBy: userId
      }
    });

    await createAuditLog(tx, {
      actorId: createdUser.id,
      targetId: createdUser.id,
      action: AuditAction.USER_SIGNED_UP,
      entity: "User",
      entityId: createdUser.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: {
        emailVerified: false
      }
    });

    return createdUser;
  });

  return toPublicUser(user);
}

export async function login(input: LoginInput, context: RequestContext = {}) {
  const prisma = getPrismaClient();

  if (!prisma) {
    throw new HttpError(503, "데이터베이스가 설정되어 있지 않습니다.");
  }

  return loginWithClient(prisma, input, context);
}

export async function loginWithClient(
  prisma: PrismaClient,
  input: LoginInput,
  context: RequestContext = {}
) {
  const user = await prisma.user.findFirst({
    where: {
      email: input.email,
      deletedAt: null
    }
  });

  if (!user) {
    await createAuditLog(prisma, {
      action: AuditAction.LOGIN_FAILED,
      entity: "User",
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: {
        reason: "invalid_credentials"
      }
    });
    throw new HttpError(401, "이메일 또는 비밀번호가 올바르지 않습니다.");
  }

  if (user.status !== UserStatus.ACTIVE) {
    await createAuditLog(prisma, {
      actorId: user.id,
      targetId: user.id,
      action: AuditAction.LOGIN_FAILED,
      entity: "User",
      entityId: user.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: {
        reason: "blocked_status",
        status: user.status
      }
    });
    throw new HttpError(403, "로그인할 수 없는 계정입니다.");
  }

  const passwordMatches = await verifyPassword(input.password, user.passwordHash);

  if (!passwordMatches) {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: {
          id: user.id
        },
        data: {
          failedLoginCount: {
            increment: 1
          }
        }
      });

      await createAuditLog(tx, {
        actorId: user.id,
        targetId: user.id,
        action: AuditAction.LOGIN_FAILED,
        entity: "User",
        entityId: user.id,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        metadata: {
          reason: "invalid_credentials"
        }
      });
    });

    throw new HttpError(401, "이메일 또는 비밀번호가 올바르지 않습니다.");
  }

  const { accessToken, expiresIn } = issueAccessToken({
    sub: user.id,
    email: user.email,
    status: user.status
  });
  const { refreshToken, refreshTokenHash, refreshTokenExpiresIn, refreshTokenExpiresAt } = issueRefreshToken();

  const loggedInUser = await prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: {
        id: user.id
      },
      data: {
        failedLoginCount: 0,
        lastLoginAt: new Date()
        }
      });

    await tx.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshTokenHash,
        expiresAt: refreshTokenExpiresAt,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        createdBy: user.id
      }
    });

    await createAuditLog(tx, {
      actorId: user.id,
      targetId: user.id,
      action: AuditAction.LOGIN_SUCCEEDED,
      entity: "User",
      entityId: user.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: {
        tokenType: "access_refresh",
        refreshTokenStorage: "database"
      }
    });

    return updatedUser;
  });

  return {
    user: toPublicUser(loggedInUser),
    accessToken,
    tokenType: "Bearer" as const,
    expiresIn,
    refreshToken,
    refreshTokenExpiresIn
  };
}

export async function refreshAccessToken(input: RefreshTokenInput, context: RequestContext = {}) {
  const prisma = getPrismaClient();

  if (!prisma) {
    throw new HttpError(503, "데이터베이스가 설정되어 있지 않습니다.");
  }

  return refreshAccessTokenWithClient(prisma, input, context);
}

export async function refreshAccessTokenWithClient(
  prisma: PrismaClient,
  input: RefreshTokenInput,
  context: RequestContext = {}
) {
  const tokenHash = hashRefreshToken(input.refreshToken);
  const storedToken = await prisma.refreshToken.findUnique({
    where: {
      tokenHash
    },
    include: {
      user: true
    }
  });

  const now = new Date();

  if (
    !storedToken ||
    storedToken.deletedAt ||
    storedToken.revokedAt ||
    storedToken.expiresAt <= now ||
    storedToken.user.deletedAt ||
    storedToken.user.status !== UserStatus.ACTIVE
  ) {
    throw new HttpError(401, "세션이 만료되었습니다. 다시 로그인해 주세요.");
  }

  const { accessToken, expiresIn } = issueAccessToken({
    sub: storedToken.user.id,
    email: storedToken.user.email,
    status: storedToken.user.status
  });
  const { refreshToken, refreshTokenHash, refreshTokenExpiresIn, refreshTokenExpiresAt } = issueRefreshToken();

  await prisma.$transaction(async (tx) => {
    await tx.refreshToken.update({
      where: {
        id: storedToken.id
      },
      data: {
        revokedAt: now,
        lastUsedAt: now,
        updatedBy: storedToken.user.id
      }
    });

    await tx.refreshToken.create({
      data: {
        userId: storedToken.user.id,
        tokenHash: refreshTokenHash,
        expiresAt: refreshTokenExpiresAt,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        createdBy: storedToken.user.id
      }
    });
  });

  return {
    user: toPublicUser(storedToken.user),
    accessToken,
    tokenType: "Bearer" as const,
    expiresIn,
    refreshToken,
    refreshTokenExpiresIn
  };
}

export async function logout(input: LogoutInput, context: RequestContext = {}) {
  const prisma = getPrismaClient();

  if (!prisma) {
    throw new HttpError(503, "데이터베이스가 설정되어 있지 않습니다.");
  }

  return logoutWithClient(prisma, input, context);
}

export async function logoutWithClient(
  prisma: PrismaClient,
  input: LogoutInput,
  context: RequestContext = {}
) {
  const tokenHash = hashRefreshToken(input.refreshToken);
  const storedToken = await prisma.refreshToken.findUnique({
    where: {
      tokenHash
    }
  });

  if (!storedToken || storedToken.revokedAt || storedToken.deletedAt) {
    return {
      revoked: false
    };
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.refreshToken.update({
      where: {
        id: storedToken.id
      },
      data: {
        revokedAt: now,
        lastUsedAt: now,
        updatedBy: storedToken.userId
      }
    });

    await createAuditLog(tx, {
      actorId: storedToken.userId,
      targetId: storedToken.userId,
      action: AuditAction.LOGGED_OUT,
      entity: "User",
      entityId: storedToken.userId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: {
        refreshTokenRevoked: true
      }
    });
  });

  return {
    revoked: true
  };
}
