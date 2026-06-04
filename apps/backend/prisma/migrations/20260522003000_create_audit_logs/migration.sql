CREATE TYPE "AuditAction" AS ENUM (
  'USER_SIGNED_UP',
  'LOGIN_SUCCEEDED',
  'LOGIN_FAILED',
  'LOGGED_OUT',
  'PASSWORD_CHANGED',
  'USER_WITHDREW',
  'ACCOUNT_LOCKED',
  'ACCOUNT_UNLOCKED'
);

CREATE TABLE "audit_logs" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "actor_id" TEXT,
  "target_id" TEXT,
  "action" "AuditAction" NOT NULL,
  "entity" TEXT NOT NULL,
  "entity_id" TEXT,
  "ip_address" TEXT,
  "user_agent" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs"("actor_id");
CREATE INDEX "audit_logs_target_id_idx" ON "audit_logs"("target_id");
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");
