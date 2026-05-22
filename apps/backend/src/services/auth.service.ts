import { randomUUID } from "node:crypto";
import { z } from "zod";
import { createAuditLog } from "../database/auditLog.js";
import { getPrismaClient } from "../database/prisma.js";
import { AuditAction, UserStatus, type PrismaClient, type User } from "../generated/prisma/client.js";
import { HttpError } from "../errors/httpError.js";
import { hashPassword } from "./password.service.js";

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
