import { Prisma, type AuditAction, type PrismaClient } from "../generated/prisma/client.js";

type AuditLogClient = Pick<PrismaClient, "auditLog">;

type AuditLogInput = {
  actorId?: string | null;
  targetId?: string | null;
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Prisma.InputJsonValue | null;
};

export async function createAuditLog(prisma: AuditLogClient, input: AuditLogInput) {
  return prisma.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      targetId: input.targetId ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      metadata: input.metadata ?? Prisma.JsonNull
    }
  });
}
