CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED');

CREATE TABLE "users" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "email" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "name" TEXT,
  "nickname" TEXT,
  "profile_image_url" TEXT,
  "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
  "email_verified_at" TIMESTAMP(3),
  "last_login_at" TIMESTAMP(3),
  "failed_login_count" INTEGER NOT NULL DEFAULT 0,
  "locked_until" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP(3),
  "created_by" TEXT,
  "updated_by" TEXT,
  "deleted_by" TEXT,

  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_created_at_idx" ON "users"("created_at");
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");
