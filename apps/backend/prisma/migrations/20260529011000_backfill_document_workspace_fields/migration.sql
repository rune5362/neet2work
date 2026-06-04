-- Backfill CandidateProfile from the currently selected profile version.
UPDATE "candidate_profiles" AS profile
SET
    "profile_text" = version."profile_text",
    "profile_json" = version."profile_json",
    "schema_version" = version."schema_version",
    "source" = version."source"::TEXT
FROM "candidate_profile_versions" AS version
WHERE profile."current_version_id" = version."id";

-- Ensure profiles without a current version still have a structured editable body.
UPDATE "candidate_profiles"
SET
    "profile_json" = '{
      "basics": { "name": "", "email": "", "phone": "", "location": "", "links": {} },
      "desired": { "roles": [], "industries": [], "locations": [], "employmentTypes": [] },
      "summary": { "headline": "", "description": "" },
      "skills": [],
      "projects": [],
      "experiences": [],
      "certifications": [],
      "education": [],
      "activities": [],
      "metadata": { "lastUpdatedBy": "system", "lastAiUpdatedAt": null }
    }'::JSONB
WHERE "profile_json" IS NULL;

-- Backfill ApplicationDocument from the currently selected document version.
UPDATE "application_documents" AS document
SET
    "content" = version."content",
    "content_json" = version."content_json",
    "source" = version."source",
    "profile_snapshot_text" = version."profile_snapshot_text",
    "profile_snapshot_json" = version."profile_snapshot_json",
    "job_snapshot_json" = version."job_snapshot_json"
FROM "application_document_versions" AS version
WHERE document."current_version_id" = version."id";
