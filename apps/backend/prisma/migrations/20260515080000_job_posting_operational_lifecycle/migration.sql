CREATE TYPE "JobPostingStatus" AS ENUM ('active', 'closed', 'inactive', 'unknown');

ALTER TABLE "job_postings"
  ADD COLUMN "status" "JobPostingStatus" NOT NULL DEFAULT 'active',
  ADD COLUMN "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "last_seen_at" TIMESTAMP(3),
  ADD COLUMN "closed_at" TIMESTAMP(3),
  ADD COLUMN "job_category" TEXT,
  ADD COLUMN "career_stage" TEXT,
  ADD COLUMN "crawl_batch_id" TEXT,
  ADD COLUMN "classifier_meta" JSONB;

CREATE INDEX "job_postings_status_last_seen_at_idx" ON "job_postings"("status", "last_seen_at");
CREATE INDEX "job_postings_job_category_idx" ON "job_postings"("job_category");
CREATE INDEX "job_postings_career_stage_idx" ON "job_postings"("career_stage");
