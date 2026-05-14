CREATE TYPE "AnalysisMode" AS ENUM ('mock', 'ai');

CREATE TABLE "job_postings" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "company" TEXT NOT NULL,
  "location" TEXT NOT NULL,
  "career_level" TEXT NOT NULL,
  "skills" TEXT[] NOT NULL,
  "description" TEXT NOT NULL,
  "source_url" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "job_postings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "resume_analyses" (
  "id" TEXT NOT NULL,
  "job_id" TEXT NOT NULL,
  "resume_text" TEXT NOT NULL,
  "match_score" INTEGER NOT NULL,
  "strengths" TEXT[] NOT NULL,
  "weaknesses" TEXT[] NOT NULL,
  "missing_keywords" TEXT[] NOT NULL,
  "rewrite_guides" TEXT[] NOT NULL,
  "suggested_sentences" TEXT[] NOT NULL,
  "mode" "AnalysisMode" NOT NULL DEFAULT 'mock',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "resume_analyses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "resume_analyses_job_id_idx" ON "resume_analyses"("job_id");

ALTER TABLE "resume_analyses"
ADD CONSTRAINT "resume_analyses_job_id_fkey"
FOREIGN KEY ("job_id") REFERENCES "job_postings"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
