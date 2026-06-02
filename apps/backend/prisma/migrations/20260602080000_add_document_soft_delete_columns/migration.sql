ALTER TABLE "candidate_profiles"
  ADD COLUMN "deleted_at" TIMESTAMP(3),
  ADD COLUMN "created_by" TEXT,
  ADD COLUMN "updated_by" TEXT,
  ADD COLUMN "deleted_by" TEXT;

ALTER TABLE "application_documents"
  ADD COLUMN "deleted_at" TIMESTAMP(3),
  ADD COLUMN "created_by" TEXT,
  ADD COLUMN "updated_by" TEXT,
  ADD COLUMN "deleted_by" TEXT;

CREATE INDEX "candidate_profiles_deleted_at_idx" ON "candidate_profiles"("deleted_at");
CREATE INDEX "application_documents_deleted_at_idx" ON "application_documents"("deleted_at");
