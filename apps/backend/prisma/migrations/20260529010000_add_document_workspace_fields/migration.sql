-- AlterTable
ALTER TABLE "candidate_profiles"
ADD COLUMN "profile_text" TEXT NOT NULL DEFAULT '',
ADD COLUMN "profile_json" JSONB,
ADD COLUMN "schema_version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "source" TEXT NOT NULL DEFAULT 'user';

-- AlterTable
ALTER TABLE "application_documents"
ADD COLUMN "content" TEXT NOT NULL DEFAULT '',
ADD COLUMN "content_json" JSONB,
ADD COLUMN "source" "ApplicationDocumentSource" NOT NULL DEFAULT 'user',
ADD COLUMN "profile_snapshot_text" TEXT,
ADD COLUMN "profile_snapshot_json" JSONB,
ADD COLUMN "job_snapshot_json" JSONB;

-- CreateTable
CREATE TABLE "application_sets" (
    "id" TEXT NOT NULL,
    "candidate_key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "profile_id" TEXT,
    "resume_document_id" TEXT,
    "cover_letter_document_id" TEXT,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_sets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "application_sets_candidate_key_idx" ON "application_sets"("candidate_key");

-- CreateIndex
CREATE INDEX "application_sets_candidate_key_is_archived_idx" ON "application_sets"("candidate_key", "is_archived");

-- CreateIndex
CREATE INDEX "application_sets_profile_id_idx" ON "application_sets"("profile_id");

-- CreateIndex
CREATE INDEX "application_sets_resume_document_id_idx" ON "application_sets"("resume_document_id");

-- CreateIndex
CREATE INDEX "application_sets_cover_letter_document_id_idx" ON "application_sets"("cover_letter_document_id");

-- AddForeignKey
ALTER TABLE "application_sets" ADD CONSTRAINT "application_sets_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "candidate_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_sets" ADD CONSTRAINT "application_sets_resume_document_id_fkey" FOREIGN KEY ("resume_document_id") REFERENCES "application_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_sets" ADD CONSTRAINT "application_sets_cover_letter_document_id_fkey" FOREIGN KEY ("cover_letter_document_id") REFERENCES "application_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
