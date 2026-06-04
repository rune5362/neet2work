import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildImportApplySql,
  buildLifecycleApplySql,
  buildJobOperationalSqlArtifactsManifest,
  parseJobOperationalSqlArtifactsArgs
} from "./jobOperationalSqlArtifacts.js";
import type { CollectedJobBatch } from "../types/job.js";

const batch: CollectedJobBatch = {
  schemaVersion: "job_batch_v1",
  source: "saramin",
  mode: "batch",
  crawlBatchId: "saramin-20260519T000000Z",
  collectedAt: "2026-05-19T00:00:00.000Z",
  postings: [
    {
      id: "saramin-100",
      title: "Backend Developer",
      company: "N2W",
      location: "Seoul",
      careerLevel: "경력",
      skills: ["TypeScript", "PostgreSQL"],
      description: "Build services",
      source: "saramin",
      sourceJobId: "100",
      sourceUrl: "https://example.test/jobs/100",
      country: "KR",
      language: "ko",
      rawText: "full text",
      rawJson: { detailFinalUrl: "https://example.test/jobs/100" },
      collectedAt: "2026-05-19T00:00:00.000Z",
      jobCategory: "backend",
      careerStage: "mid",
      classifierMeta: { rule: "fixture" }
    }
  ]
};

const lifecycleReport = {
  schemaVersion: "job_lifecycle_dry_run_v1",
  source: "saramin",
  crawlBatchId: "saramin-20260519T000000Z",
  collectedAt: "2026-05-19T00:00:00.000Z",
  generatedAt: "2026-05-19T00:05:00.000Z",
  inactiveThreshold: 3,
  partial: false,
  partialReasons: [],
  counts: {
    existing: 2,
    observed: 1,
    activeObservations: 1,
    closedCandidates: 0,
    inactiveCandidates: 0,
    skipped: 1
  },
  activeObservations: [
    {
      source: "saramin",
      sourceJobId: "100",
      currentStatus: "active",
      proposedStatus: "active",
      reason: "observed_in_successful_crawl"
    }
  ],
  closedCandidates: [],
  inactiveCandidates: [],
  skipped: [
    {
      source: "saramin",
      sourceJobId: "missing-1",
      currentStatus: "active",
      reason: "missing_threshold_not_met",
      previousMissingCount: 1,
      nextMissingCount: 2
    }
  ]
};

describe("buildImportApplySql", () => {
  it("generates a Supabase-ready upsert artifact without overwriting firstSeenAt", () => {
    const sql = buildImportApplySql(batch);

    expect(sql).toContain("schemaVersion: job_operational_import_sql_v1");
    expect(sql).toContain("on conflict (\"source\", \"source_job_id\") do update set");
    expect(sql).toContain("\"raw_json\"");
    expect(sql).toContain("\"classifier_meta\"");
    expect(sql).not.toContain("\"first_seen_at\" = excluded.\"first_seen_at\"");
  });
});

describe("buildLifecycleApplySql", () => {
  it("generates guarded lifecycle mutation SQL from a validated dry-run report", () => {
    const sql = buildLifecycleApplySql(lifecycleReport);

    expect(sql).toContain("schemaVersion: job_operational_lifecycle_sql_v1");
    expect(sql).toContain("partial reports cannot be applied");
    expect(sql).toContain("status drift");
    expect(sql).toContain("missingCount drift");
    expect(sql).toContain("GET DIAGNOSTICS actual_count = ROW_COUNT");
    expect(sql).toContain("missing_threshold_not_met");
  });

  it("rejects partial lifecycle reports before generating mutation SQL", () => {
    expect(() =>
      buildLifecycleApplySql({
        ...lifecycleReport,
        partial: true,
        partialReasons: ["batch_warning"]
      })
    ).toThrow("partial lifecycle reports cannot be applied");
  });
});

describe("buildJobOperationalSqlArtifactsManifest", () => {
  it("describes generated SQL files without implying they were executed", () => {
    const manifest = buildJobOperationalSqlArtifactsManifest({
      source: "saramin",
      outputDir: path.resolve("C:/work/neet2work/tmp/job-operational-sql"),
      generatedFiles: ["saramin_import_apply.sql", "saramin_lifecycle_apply.sql"]
    });

    expect(manifest).toMatchObject({
      schemaVersion: "job_operational_sql_artifacts_v1",
      source: "saramin",
      executionPolicy: "artifact_only_no_db_writes",
      generatedFiles: [
        path.resolve("C:/work/neet2work/tmp/job-operational-sql/saramin_import_apply.sql"),
        path.resolve("C:/work/neet2work/tmp/job-operational-sql/saramin_lifecycle_apply.sql")
      ]
    });
  });
});

describe("parseJobOperationalSqlArtifactsArgs", () => {
  it("parses batch and lifecycle report inputs while tolerating pnpm separators", () => {
    expect(
      parseJobOperationalSqlArtifactsArgs([
        "--",
        "--batch",
        "tmp/saramin_batch_review.json",
        "--lifecycle-report",
        "tmp/saramin_lifecycle_dry_run.json",
        "--output-dir",
        "tmp/sql"
      ])
    ).toEqual({
      batchPath: "tmp/saramin_batch_review.json",
      lifecycleReportPath: "tmp/saramin_lifecycle_dry_run.json",
      outputDir: "tmp/sql"
    });
  });
});
