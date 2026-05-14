ALTER TABLE "job_postings"
  ALTER COLUMN "skills" SET DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "resume_analyses"
  ALTER COLUMN "strengths" SET DEFAULT ARRAY[]::TEXT[],
  ALTER COLUMN "weaknesses" SET DEFAULT ARRAY[]::TEXT[],
  ALTER COLUMN "missing_keywords" SET DEFAULT ARRAY[]::TEXT[],
  ALTER COLUMN "rewrite_guides" SET DEFAULT ARRAY[]::TEXT[],
  ALTER COLUMN "suggested_sentences" SET DEFAULT ARRAY[]::TEXT[];
