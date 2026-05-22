import { UserStatus, type PrismaClient } from "../generated/prisma/client.js";

export const activeRecordWhere = {
  deletedAt: null
} as const;

export function activeUserLoginWhere(email: string) {
  return {
    email,
    deletedAt: null,
    status: UserStatus.ACTIVE
  } as const;
}

export async function softDeleteUser(
  prisma: PrismaClient,
  id: string,
  deletedBy?: string | null
) {
  return prisma.user.update({
    where: { id },
    data: {
      status: UserStatus.DELETED,
      deletedAt: new Date(),
      deletedBy: deletedBy ?? null
    }
  });
}

export async function softDeleteJobPosting(
  prisma: PrismaClient,
  id: string,
  deletedBy?: string | null
) {
  return prisma.jobPosting.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      deletedBy: deletedBy ?? null
    }
  });
}

export async function softDeleteResumeAnalysis(
  prisma: PrismaClient,
  id: string,
  deletedBy?: string | null
) {
  return prisma.resumeAnalysis.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      deletedBy: deletedBy ?? null
    }
  });
}
