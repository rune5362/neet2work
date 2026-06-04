-- Drop version-era columns after profile/document bodies have been backfilled.
DROP INDEX IF EXISTS "application_documents_profile_version_id_idx";

ALTER TABLE "candidate_profiles" DROP COLUMN IF EXISTS "current_version_id";
ALTER TABLE "application_documents" DROP COLUMN IF EXISTS "current_version_id";
ALTER TABLE "application_documents" DROP COLUMN IF EXISTS "profile_version_id";

DROP TABLE IF EXISTS "candidate_profile_versions";
DROP TABLE IF EXISTS "application_document_versions";

DROP TYPE IF EXISTS "ProfileVersionSource";
DROP TYPE IF EXISTS "ProfileVersionStatus";
DROP TYPE IF EXISTS "ApplicationDocumentStatus";
