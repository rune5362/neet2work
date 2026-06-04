ALTER TABLE "job_postings"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
  ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "deleted_at" TIMESTAMP(3),
  ADD COLUMN "created_by" TEXT,
  ADD COLUMN "updated_by" TEXT,
  ADD COLUMN "deleted_by" TEXT;

ALTER TABLE "resume_analyses"
  ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "deleted_at" TIMESTAMP(3),
  ADD COLUMN "created_by" TEXT,
  ADD COLUMN "updated_by" TEXT,
  ADD COLUMN "deleted_by" TEXT;

CREATE INDEX "job_postings_deleted_at_idx" ON "job_postings"("deleted_at");
CREATE INDEX "resume_analyses_deleted_at_idx" ON "resume_analyses"("deleted_at");
