-- CreateEnum
CREATE TYPE "ApplicationDocumentSource" AS ENUM ('user', 'ai', 'system');

-- CreateEnum
CREATE TYPE "ApplicationDocumentStatus" AS ENUM ('draft', 'active', 'archived');

-- CreateEnum
CREATE TYPE "ApplicationDocumentType" AS ENUM ('resume', 'cover_letter');

-- CreateEnum
CREATE TYPE "ProfileVersionSource" AS ENUM ('user', 'ai', 'system');

-- CreateEnum
CREATE TYPE "ProfileVersionStatus" AS ENUM ('draft', 'active', 'archived');

-- AlterTable
ALTER TABLE "refresh_tokens" ALTER COLUMN "id" DROP DEFAULT;

-- CreateTable
CREATE TABLE "application_documents" (
    "id" TEXT NOT NULL,
    "candidate_key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "document_type" "ApplicationDocumentType" NOT NULL,
    "profile_id" TEXT,
    "profile_version_id" TEXT,
    "job_id" TEXT,
    "current_version_id" TEXT,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_document_versions" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "candidate_key" TEXT NOT NULL,
    "version_no" INTEGER NOT NULL,
    "title" TEXT,
    "memo" TEXT,
    "content" TEXT NOT NULL,
    "content_json" JSONB,
    "source" "ApplicationDocumentSource" NOT NULL DEFAULT 'user',
    "status" "ApplicationDocumentStatus" NOT NULL DEFAULT 'active',
    "parent_version_id" TEXT,
    "profile_snapshot_text" TEXT,
    "profile_snapshot_json" JSONB,
    "job_snapshot_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_profiles" (
    "id" TEXT NOT NULL,
    "candidate_key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "target_role" TEXT,
    "target_company" TEXT,
    "target_job_id" TEXT,
    "name" TEXT,
    "email" TEXT,
    "desired_roles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "current_version_id" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_profile_versions" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "candidate_key" TEXT NOT NULL,
    "version_no" INTEGER NOT NULL,
    "title" TEXT,
    "memo" TEXT,
    "profile_text" TEXT NOT NULL,
    "profile_json" JSONB NOT NULL,
    "schema_version" INTEGER NOT NULL DEFAULT 1,
    "source" "ProfileVersionSource" NOT NULL DEFAULT 'user',
    "status" "ProfileVersionStatus" NOT NULL DEFAULT 'active',
    "parent_version_id" TEXT,
    "change_summary" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_profile_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "application_documents_candidate_key_idx" ON "application_documents"("candidate_key");

-- CreateIndex
CREATE INDEX "application_documents_profile_id_idx" ON "application_documents"("profile_id");

-- CreateIndex
CREATE INDEX "application_documents_profile_version_id_idx" ON "application_documents"("profile_version_id");

-- CreateIndex
CREATE INDEX "application_documents_job_id_idx" ON "application_documents"("job_id");

-- CreateIndex
CREATE INDEX "application_document_versions_candidate_key_idx" ON "application_document_versions"("candidate_key");

-- CreateIndex
CREATE INDEX "application_document_versions_document_id_status_idx" ON "application_document_versions"("document_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "application_document_versions_document_id_version_no_key" ON "application_document_versions"("document_id", "version_no");

-- CreateIndex
CREATE INDEX "candidate_profiles_candidate_key_idx" ON "candidate_profiles"("candidate_key");

-- CreateIndex
CREATE INDEX "candidate_profiles_candidate_key_is_archived_idx" ON "candidate_profiles"("candidate_key", "is_archived");

-- CreateIndex
CREATE INDEX "candidate_profile_versions_candidate_key_idx" ON "candidate_profile_versions"("candidate_key");

-- CreateIndex
CREATE INDEX "candidate_profile_versions_profile_id_status_idx" ON "candidate_profile_versions"("profile_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_profile_versions_profile_id_version_no_key" ON "candidate_profile_versions"("profile_id", "version_no");

-- AddForeignKey
ALTER TABLE "application_document_versions" ADD CONSTRAINT "application_document_versions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "application_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_profile_versions" ADD CONSTRAINT "candidate_profile_versions_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
