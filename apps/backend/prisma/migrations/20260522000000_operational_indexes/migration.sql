CREATE INDEX "job_postings_created_at_idx" ON "job_postings"("created_at");

CREATE INDEX "resume_analyses_created_at_idx" ON "resume_analyses"("created_at");
CREATE INDEX "resume_analyses_job_id_idx" ON "resume_analyses"("job_id");
