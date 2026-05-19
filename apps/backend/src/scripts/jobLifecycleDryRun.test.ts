import path from "node:path";
import { describe, expect, it } from "vitest";
import type { CollectedJobBatch, CollectedJobPosting } from "../types/job.js";
import {
  buildLifecycleDryRunReport,
  parseJobLifecycleDryRunArgs,
  resolveLifecyclePath
} from "./jobLifecycleDryRun.js";

const observedJob = {
  id: "saramin-1",
  title: "백엔드 개발자",
  company: "샘플",
  location: "서울",
  careerLevel: "경력무관",
  skills: ["TypeScript"],
  description: "서비스 API 개발",
  source: "saramin",
  sourceJobId: "1",
  sourceUrl: "https://example.test/jobs/1",
  collectedAt: "2026-05-18T00:00:00.000Z"
} satisfies CollectedJobPosting;

function batch(postings: CollectedJobPosting[], overrides: Partial<CollectedJobBatch> = {}) {
  return {
    schemaVersion: "job_batch_v1",
    source: "saramin",
    mode: "batch",
    crawlBatchId: "saramin-20260518T000000Z",
    collectedAt: "2026-05-18T00:00:00.000Z",
    postings,
    warnings: [],
    errors: [],
    ...overrides
  } satisfies CollectedJobBatch;
}

describe("buildLifecycleDryRunReport", () => {
  it("keeps observed active rows without proposing a status mutation", () => {
    const report = buildLifecycleDryRunReport({
      batch: batch([observedJob]),
      existingJobs: [{ source: "saramin", sourceJobId: "1", status: "active" }]
    });

    expect(report.partial).toBe(false);
    expect(report.activeObservations).toEqual([
      expect.objectContaining({
        sourceJobId: "1",
        currentStatus: "active",
        proposedStatus: "active",
        reason: "observed_in_successful_crawl"
      })
    ]);
    expect(report.closedCandidates).toEqual([]);
    expect(report.inactiveCandidates).toEqual([]);
  });

  it("only proposes closed when the current posting carries source-visible closed evidence", () => {
    const noEvidence = buildLifecycleDryRunReport({
      batch: batch([{ ...observedJob, status: "closed" }]),
      existingJobs: [{ source: "saramin", sourceJobId: "1", status: "active" }]
    });

    expect(noEvidence.closedCandidates).toEqual([]);
    expect(noEvidence.skipped).toContainEqual(
      expect.objectContaining({
        sourceJobId: "1",
        reason: "closed_without_source_visible_evidence"
      })
    );

    const withEvidence = buildLifecycleDryRunReport({
      batch: batch([{ ...observedJob, status: "closed", deadlineText: "접수마감" }]),
      existingJobs: [{ source: "saramin", sourceJobId: "1", status: "active" }]
    });

    expect(withEvidence.closedCandidates).toEqual([
      expect.objectContaining({
        sourceJobId: "1",
        currentStatus: "active",
        proposedStatus: "closed",
        reason: "source_visible_closed_signal",
        evidence: "접수마감"
      })
    ]);
  });

  it("protects absent rows when the crawl is partial", () => {
    const report = buildLifecycleDryRunReport({
      batch: batch([], { warnings: ["saramin/1 skipped: TimeoutError: read timed out"] }),
      existingJobs: [{ source: "saramin", sourceJobId: "1", status: "active" }]
    });

    expect(report.partial).toBe(true);
    expect(report.partialReasons).toEqual(["batch_warning", "zero_postings"]);
    expect(report.inactiveCandidates).toEqual([]);
    expect(report.skipped).toContainEqual(
      expect.objectContaining({
        sourceJobId: "1",
        reason: "partial_crawl_protects_absent_row"
      })
    );
  });

  it("proposes inactive only after the missing threshold is reached", () => {
    const belowThreshold = buildLifecycleDryRunReport({
      batch: batch([{ ...observedJob, sourceJobId: "2" }]),
      existingJobs: [{ source: "saramin", sourceJobId: "1", status: "active", missingCount: 1 }],
      inactiveThreshold: 3
    });

    expect(belowThreshold.inactiveCandidates).toEqual([]);
    expect(belowThreshold.skipped).toContainEqual(
      expect.objectContaining({
        sourceJobId: "1",
        reason: "missing_threshold_not_met",
        previousMissingCount: 1,
        nextMissingCount: 2
      })
    );

    const atThreshold = buildLifecycleDryRunReport({
      batch: batch([{ ...observedJob, sourceJobId: "2" }]),
      existingJobs: [{ source: "saramin", sourceJobId: "1", status: "active", missingCount: 2 }],
      inactiveThreshold: 3
    });

    expect(atThreshold.inactiveCandidates).toEqual([
      expect.objectContaining({
        sourceJobId: "1",
        currentStatus: "active",
        proposedStatus: "inactive",
        previousMissingCount: 2,
        nextMissingCount: 3
      })
    ]);
  });
});

describe("parseJobLifecycleDryRunArgs", () => {
  it("parses the required dry-run file arguments", () => {
    expect(
      parseJobLifecycleDryRunArgs([
        "--",
        "--batch",
        "tmp/saramin_batch_review.json",
        "--existing",
        "tmp/saramin_existing.json",
        "--inactive-threshold",
        "3",
        "--output",
        "tmp/saramin_lifecycle_dry_run.json"
      ])
    ).toEqual({
      batchPath: "tmp/saramin_batch_review.json",
      existingPath: "tmp/saramin_existing.json",
      inactiveThreshold: 3,
      outputPath: "tmp/saramin_lifecycle_dry_run.json"
    });
  });
});

describe("resolveLifecyclePath", () => {
  it("falls back to repo-root relative paths when the backend cwd candidate is missing", () => {
    const repoRoot = path.resolve("C:/work/neet2work");
    const input = path.join("tmp", "linkareer_batch_review.json");
    const expected = path.join(repoRoot, input);

    expect(
      resolveLifecyclePath(input, {
        cwd: path.join(repoRoot, "apps", "backend"),
        repoRoot,
        pathExists: (candidate) => candidate === expected
      })
    ).toBe(expected);
  });
});
