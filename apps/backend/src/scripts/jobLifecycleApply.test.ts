import { describe, expect, it } from "vitest";
import {
  applyLifecycleReport,
  parseJobLifecycleApplyArgs,
  parseLifecycleApplyReport,
  type LifecycleApplyJobRecord,
  type LifecycleApplyStore,
  type LifecycleApplyUpdateData,
  type LifecycleApplyUpdateWhere
} from "./jobLifecycleApply.js";

const appliedAt = new Date("2026-05-18T06:00:00.000Z");

function report(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: "job_lifecycle_dry_run_v1",
    source: "saramin",
    crawlBatchId: "saramin-20260518T000000Z",
    collectedAt: "2026-05-18T00:00:00.000Z",
    generatedAt: "2026-05-18T00:05:00.000Z",
    inactiveThreshold: 3,
    partial: false,
    partialReasons: [],
    counts: {
      existing: 4,
      observed: 2,
      activeObservations: 1,
      closedCandidates: 1,
      inactiveCandidates: 1,
      skipped: 1
    },
    activeObservations: [
      {
        source: "saramin",
        sourceJobId: "active-1",
        currentStatus: "active",
        proposedStatus: "active",
        reason: "observed_in_successful_crawl"
      }
    ],
    closedCandidates: [
      {
        source: "saramin",
        sourceJobId: "closed-1",
        currentStatus: "active",
        proposedStatus: "closed",
        reason: "source_visible_closed_signal",
        evidence: "접수마감"
      }
    ],
    inactiveCandidates: [
      {
        source: "saramin",
        sourceJobId: "inactive-1",
        currentStatus: "active",
        proposedStatus: "inactive",
        reason: "missing_threshold_reached",
        previousMissingCount: 2,
        nextMissingCount: 3
      }
    ],
    skipped: [
      {
        source: "saramin",
        sourceJobId: "missing-1",
        currentStatus: "active",
        reason: "missing_threshold_not_met",
        previousMissingCount: 1,
        nextMissingCount: 2
      }
    ],
    ...overrides
  };
}

describe("parseLifecycleApplyReport", () => {
  it("rejects partial reports before any database mutation can be planned", () => {
    expect(() =>
      parseLifecycleApplyReport(
        report({
          partial: true,
          partialReasons: ["batch_warning"]
        })
      )
    ).toThrow("partial lifecycle reports cannot be applied");
  });

  it("rejects reports whose bucket counts do not match their decision arrays", () => {
    expect(() =>
      parseLifecycleApplyReport(
        report({
          counts: {
            existing: 4,
            observed: 2,
            activeObservations: 99,
            closedCandidates: 1,
            inactiveCandidates: 1,
            skipped: 1
          }
        })
      )
    ).toThrow("activeObservations count mismatch");
  });
});

describe("applyLifecycleReport", () => {
  it("applies active, closed, inactive, and below-threshold missing decisions in one transaction", async () => {
    const store = new FakeLifecycleApplyStore([
      job("active-1", { classifierMeta: { lifecycle: { missingCount: 2 } } }),
      job("closed-1"),
      job("inactive-1", { classifierMeta: { lifecycle: { missingCount: 2 } } }),
      job("missing-1", { classifierMeta: { lifecycle: { missingCount: 1 } } })
    ]);

    const summary = await applyLifecycleReport({
      report: parseLifecycleApplyReport(report()),
      store,
      appliedAt
    });

    expect(store.transactionCount).toBe(1);
    expect(summary.updated).toEqual({
      activeObservations: 1,
      closedCandidates: 1,
      inactiveCandidates: 1,
      missingThresholdNotMet: 1,
      total: 4
    });

    expect(updateFor(store, "active-1").data).toMatchObject({
      status: "active",
      lastSeenAt: new Date("2026-05-18T00:00:00.000Z"),
      classifierMeta: {
        lifecycle: {
          missingCount: 0,
          lastDecision: "observed_in_successful_crawl",
          reportCrawlBatchId: "saramin-20260518T000000Z",
          appliedAt: "2026-05-18T06:00:00.000Z"
        }
      }
    });
    expect(updateFor(store, "closed-1").data).toMatchObject({
      status: "closed",
      closedAt: new Date("2026-05-18T00:00:00.000Z"),
      classifierMeta: {
        lifecycle: {
          missingCount: 0,
          lastDecision: "source_visible_closed_signal",
          closedEvidence: "접수마감"
        }
      }
    });
    expect(updateFor(store, "inactive-1").data).toMatchObject({
      status: "inactive",
      classifierMeta: {
        lifecycle: {
          missingCount: 3,
          lastDecision: "missing_threshold_reached"
        }
      }
    });
    expect(updateFor(store, "missing-1").data.status).toBeUndefined();
    expect(updateFor(store, "missing-1").data.classifierMeta).toMatchObject({
      lifecycle: {
        missingCount: 2,
        lastDecision: "missing_threshold_not_met"
      }
    });
  });

  it("preserves existing classifier metadata while updating lifecycle metadata", async () => {
    const store = new FakeLifecycleApplyStore([
      job("active-1", {
        classifierMeta: {
          rule: "title-keyword",
          lifecycle: { missingCount: 2, reviewer: "manual" }
        }
      }),
      job("closed-1"),
      job("inactive-1", { classifierMeta: { lifecycle: { missingCount: 2 } } }),
      job("missing-1", { classifierMeta: { lifecycle: { missingCount: 1 } } })
    ]);

    await applyLifecycleReport({
      report: parseLifecycleApplyReport(report()),
      store,
      appliedAt
    });

    expect(updateFor(store, "active-1").data.classifierMeta).toMatchObject({
      rule: "title-keyword",
      lifecycle: {
        reviewer: "manual",
        missingCount: 0,
        lastDecision: "observed_in_successful_crawl"
      }
    });
  });

  it("fails before updating when the current database status differs from the report", async () => {
    const store = new FakeLifecycleApplyStore([
      job("active-1"),
      job("closed-1"),
      job("inactive-1", {
        status: "closed",
        classifierMeta: { lifecycle: { missingCount: 2 } }
      }),
      job("missing-1", { classifierMeta: { lifecycle: { missingCount: 1 } } })
    ]);

    await expect(
      applyLifecycleReport({
        report: parseLifecycleApplyReport(report()),
        store,
        appliedAt
      })
    ).rejects.toThrow("DB status drift for saramin/inactive-1");
    expect(store.updates).toEqual([]);
  });

  it("fails when an update count does not match the planned decision", async () => {
    const store = new FakeLifecycleApplyStore([
      job("active-1"),
      job("closed-1"),
      job("inactive-1", { classifierMeta: { lifecycle: { missingCount: 2 } } }),
      job("missing-1", { classifierMeta: { lifecycle: { missingCount: 1 } } })
    ]);
    store.updateCounts.set("closed-1", 0);

    await expect(
      applyLifecycleReport({
        report: parseLifecycleApplyReport(report()),
        store,
        appliedAt
      })
    ).rejects.toThrow("Update count mismatch for saramin/closed-1");
  });

  it("treats below-threshold missing rows from the same crawl as already applied", async () => {
    const store = new FakeLifecycleApplyStore([
      job("active-1"),
      job("closed-1"),
      job("inactive-1", { classifierMeta: { lifecycle: { missingCount: 2 } } }),
      job("missing-1", {
        classifierMeta: {
          lifecycle: {
            missingCount: 2,
            lastDecision: "missing_threshold_not_met",
            lastCrawlBatchId: "saramin-20260518T000000Z"
          }
        }
      })
    ]);

    const summary = await applyLifecycleReport({
      report: parseLifecycleApplyReport(
        report({
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
        })
      ),
      store,
      appliedAt
    });

    expect(summary.updated.missingThresholdNotMet).toBe(0);
    expect(summary.alreadyApplied.missingThresholdNotMet).toBe(1);
    expect(store.updates.some((update) => update.where.sourceJobId === "missing-1")).toBe(false);
  });
});

describe("parseJobLifecycleApplyArgs", () => {
  it("parses the report path while tolerating pnpm argument separators", () => {
    expect(
      parseJobLifecycleApplyArgs(["--", "--report", "tmp/saramin_lifecycle_dry_run.json"])
    ).toEqual({
      reportPath: "tmp/saramin_lifecycle_dry_run.json"
    });
  });
});

function job(
  sourceJobId: string,
  overrides: Partial<LifecycleApplyJobRecord> = {}
): LifecycleApplyJobRecord {
  return {
    source: "saramin",
    sourceJobId,
    status: "active",
    closedAt: null,
    lastSeenAt: null,
    classifierMeta: null,
    ...overrides
  };
}

function updateFor(store: FakeLifecycleApplyStore, sourceJobId: string) {
  const update = store.updates.find((item) => item.where.sourceJobId === sourceJobId);
  if (!update) {
    throw new Error(`Missing update for ${sourceJobId}`);
  }
  return update;
}

class FakeLifecycleApplyStore implements LifecycleApplyStore {
  transactionCount = 0;
  updates: Array<{
    where: LifecycleApplyUpdateWhere;
    data: LifecycleApplyUpdateData;
  }> = [];
  updateCounts = new Map<string, number>();

  constructor(private readonly jobs: LifecycleApplyJobRecord[]) {}

  async transaction<T>(callback: (store: LifecycleApplyStore) => Promise<T>): Promise<T> {
    this.transactionCount += 1;
    return callback(this);
  }

  async findJobs(source: string, sourceJobIds: string[]): Promise<LifecycleApplyJobRecord[]> {
    const requested = new Set(sourceJobIds);
    return this.jobs.filter((job) => job.source === source && requested.has(job.sourceJobId));
  }

  async updateJob(
    where: LifecycleApplyUpdateWhere,
    data: LifecycleApplyUpdateData
  ): Promise<number> {
    this.updates.push({ where, data });
    return this.updateCounts.get(where.sourceJobId) ?? 1;
  }
}
