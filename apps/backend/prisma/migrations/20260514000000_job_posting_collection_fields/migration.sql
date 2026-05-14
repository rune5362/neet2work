ALTER TABLE "job_postings"
  ADD COLUMN "source" TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN "source_job_id" TEXT,
  ADD COLUMN "country" TEXT NOT NULL DEFAULT 'KR',
  ADD COLUMN "language" TEXT NOT NULL DEFAULT 'ko',
  ADD COLUMN "employment_type" TEXT,
  ADD COLUMN "education_level" TEXT,
  ADD COLUMN "salary_text" TEXT,
  ADD COLUMN "deadline_text" TEXT,
  ADD COLUMN "apply_method" TEXT,
  ADD COLUMN "company_info" JSONB,
  ADD COLUMN "raw_text" TEXT,
  ADD COLUMN "raw_json" JSONB,
  ADD COLUMN "collected_at" TIMESTAMP(3);

CREATE UNIQUE INDEX "job_postings_source_source_job_id_key" ON "job_postings"("source", "source_job_id");
CREATE INDEX "job_postings_country_idx" ON "job_postings"("country");
CREATE INDEX "job_postings_source_collected_at_idx" ON "job_postings"("source", "collected_at");
