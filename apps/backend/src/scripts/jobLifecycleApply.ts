import { config } from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { resolveDatabaseUrl } from "../database/connection.js";
import { Prisma, PrismaClient } from "../generated/prisma/client.js";
import type {
  LifecycleDecision,
  LifecycleDryRunReport,
  LifecycleSkipped
} from "./jobLifecycleDryRun.js";
import type { JobPostingStatus } from "../types/job.js";

config({ path: path.resolve(process.cwd(), "../../.env") });
config({ path: path.resolve(process.cwd(), ".env"), override: true });

const REPORT_SCHEMA_VERSION = "job_lifecycle_dry_run_v1";
const ACTIVE_REASON = "observed_in_successful_crawl";
const CLOSED_REASON = "source_visible_closed_signal";
const INACTIVE_REASON = "missing_threshold_reached";
const MISSING_BELOW_THRESHOLD_REASON = "missing_threshold_not_met";
const KNOWN_SKIPPED_REASONS = new Set([
  MISSING_BELOW_THRESHOLD_REASON,
  "new_posting_not_lifecycle_transition",
  "partial_crawl_protects_absent_row",
  "existing_status_not_active",
  "closed_without_source_visible_evidence",
  "already_closed"
]);

export type LifecycleApplyJobRecord = {
  source: string;
  sourceJobId: string;
  status: JobPostingStatus | "unknown";
  closedAt?: Date | string | null;
  lastSeenAt?: Date | string | null;
  classifierMeta?: unknown;
};

export type LifecycleApplyUpdateWhere = {
  source: string;
  sourceJobId: string;
  expectedStatus: JobPostingStatus | "unknown";
};

export type LifecycleApplyUpdateData = {
  status?: JobPostingStatus;
  lastSeenAt?: Date;
  closedAt?: Date | null;
  classifierMeta: Record<string, unknown>;
};

export type LifecycleApplyStore = {
  transaction<T>(callback: (store: LifecycleApplyStore) => Promise<T>): Promise<T>;
  findJobs(source: string, sourceJobIds: string[]): Promise<LifecycleApplyJobRecord[]>;
  updateJob(where: LifecycleApplyUpdateWhere, data: LifecycleApplyUpdateData): Promise<number>;
};

export type LifecycleApplyOptions = {
  report: LifecycleDryRunReport;
  store: LifecycleApplyStore;
  appliedAt?: Date;
};

export type LifecycleApplyArgs = {
  reportPath: string;
};

export type LifecycleApplySummary = {
  source: string;
  crawlBatchId: string;
  updated: {
    activeObservations: number;
    closedCandidates: number;
    inactiveCandidates: number;
    missingThresholdNotMet: number;
    total: number;
  };
  alreadyApplied: {
    activeObservations: number;
    closedCandidates: number;
    inactiveCandidates: number;
    missingThresholdNotMet: number;
    total: number;
  };
};

type PlannedLifecycleUpdate = {
  source: string;
  sourceJobId: string;
  currentStatus: JobPostingStatus | "unknown";
  data: LifecycleApplyUpdateData;
  bucket: keyof Omit<LifecycleApplySummary["updated"], "total">;
  previousMissingCount?: number;
};

export function parseJobLifecycleApplyArgs(argv: string[]): LifecycleApplyArgs {
  const parsed: Partial<LifecycleApplyArgs> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--") {
      continue;
    }

    if (arg === "--report") {
      parsed.reportPath = requireValue(argv, index, arg);
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!parsed.reportPath) {
    throw new Error("--report is required.");
  }

  return parsed as LifecycleApplyArgs;
}

export function parseLifecycleApplyReport(parsed: unknown): LifecycleDryRunReport {
  assertRecord(parsed, "lifecycle report");

  if (parsed.schemaVersion !== REPORT_SCHEMA_VERSION) {
    throw new Error(`Unsupported lifecycle report schemaVersion: ${String(parsed.schemaVersion)}`);
  }

  assertNonEmptyString(parsed.source, "report.source");
  assertNonEmptyString(parsed.crawlBatchId, "report.crawlBatchId");
  assertIsoDate(parsed.collectedAt, "report.collectedAt");
  assertIsoDate(parsed.generatedAt, "report.generatedAt");

  if (parsed.partial !== false) {
    throw new Error("partial lifecycle reports cannot be applied");
  }

  if (!Array.isArray(parsed.partialReasons)) {
    throw new Error("report.partialReasons must be an array.");
  }

  assertRecord(parsed.counts, "report.counts");
  const report = parsed as unknown as LifecycleDryRunReport;
  assertDecisionArray(report.activeObservations, "activeObservations");
  assertDecisionArray(report.closedCandidates, "closedCandidates");
  assertDecisionArray(report.inactiveCandidates, "inactiveCandidates");
  assertSkippedArray(report.skipped, "skipped");
  assertCount(report.counts.activeObservations, report.activeObservations.length, "activeObservations");
  assertCount(report.counts.closedCandidates, report.closedCandidates.length, "closedCandidates");
  assertCount(report.counts.inactiveCandidates, report.inactiveCandidates.length, "inactiveCandidates");
  assertCount(report.counts.skipped, report.skipped.length, "skipped");
  validateReasons(report);
  validateUniqueMutationTargets(report);

  return report;
}

export async function readLifecycleApplyReport(reportPath: string): Promise<LifecycleDryRunReport> {
  const parsed = JSON.parse(await fs.readFile(path.resolve(process.cwd(), reportPath), "utf-8"));
  return parseLifecycleApplyReport(parsed as unknown);
}

export async function applyLifecycleReport(
  options: LifecycleApplyOptions
): Promise<LifecycleApplySummary> {
  const report = parseLifecycleApplyReport(options.report);
  const appliedAt = options.appliedAt ?? new Date();
  const plannedUpdates = buildPlannedUpdates(report, appliedAt);

  return options.store.transaction(async (store) => {
    const existingJobs = await store.findJobs(
      report.source,
      plannedUpdates.map((update) => update.sourceJobId)
    );
    const jobsBySourceJobId = groupExistingJobs(report.source, existingJobs);
    const alreadyAppliedKeys = new Set<string>();

    for (const update of plannedUpdates) {
      const existing = jobsBySourceJobId.get(update.sourceJobId);
      if (!existing) {
        throw new Error(`Missing DB row for ${update.source}/${update.sourceJobId}`);
      }

      if (existing.status !== update.currentStatus) {
        throw new Error(
          `DB status drift for ${update.source}/${update.sourceJobId}: expected ${update.currentStatus}, got ${existing.status}`
        );
      }

      if (update.previousMissingCount !== undefined) {
        const actualMissingCount = readMissingCount(existing.classifierMeta);
        if (actualMissingCount !== update.previousMissingCount) {
          if (isAlreadyAppliedMissingUpdate(existing, update, actualMissingCount)) {
            alreadyAppliedKeys.add(updateKey(update));
            continue;
          }

          throw new Error(
            `DB missingCount drift for ${update.source}/${update.sourceJobId}: expected ${update.previousMissingCount}, got ${actualMissingCount}`
          );
        }
      }
    }

    const summary = createEmptySummary(report);

    for (const update of plannedUpdates) {
      if (alreadyAppliedKeys.has(updateKey(update))) {
        summary.alreadyApplied[update.bucket] += 1;
        summary.alreadyApplied.total += 1;
        continue;
      }

      const existing = jobsBySourceJobId.get(update.sourceJobId);
      if (!existing) {
        throw new Error(`Missing DB row for ${update.source}/${update.sourceJobId}`);
      }
      const data = {
        ...update.data,
        classifierMeta: mergeClassifierMeta(existing.classifierMeta, update.data.classifierMeta)
      };
      const updatedCount = await store.updateJob(
        {
          source: update.source,
          sourceJobId: update.sourceJobId,
          expectedStatus: update.currentStatus
        },
        data
      );

      if (updatedCount !== 1) {
        throw new Error(
          `Update count mismatch for ${update.source}/${update.sourceJobId}: expected 1, got ${updatedCount}`
        );
      }

      summary.updated[update.bucket] += 1;
      summary.updated.total += 1;
    }

    return summary;
  });
}

export async function runJobLifecycleApply(args: LifecycleApplyArgs) {
  const connectionString = resolveDatabaseUrl();

  if (!connectionString) {
    throw new Error("DATABASE_URL이 없어 lifecycle apply를 실행할 수 없습니다.");
  }

  const report = await readLifecycleApplyReport(args.reportPath);
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const summary = await applyLifecycleReport({
      report,
      store: new PrismaLifecycleApplyStore(prisma)
    });
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    return summary;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

function buildPlannedUpdates(
  report: LifecycleDryRunReport,
  appliedAt: Date
): PlannedLifecycleUpdate[] {
  const observedAt = parseDate(report.collectedAt, "report.collectedAt");

  return [
    ...report.activeObservations.map((decision) =>
      planDecisionUpdate(report, decision, appliedAt, {
        bucket: "activeObservations",
        status: "active",
        lastSeenAt: observedAt,
        missingCount: 0
      })
    ),
    ...report.closedCandidates.map((decision) =>
      planDecisionUpdate(report, decision, appliedAt, {
        bucket: "closedCandidates",
        status: "closed",
        lastSeenAt: observedAt,
        closedAt: observedAt,
        missingCount: 0,
        closedEvidence: decision.evidence
      })
    ),
    ...report.inactiveCandidates.map((decision) =>
      planDecisionUpdate(report, decision, appliedAt, {
        bucket: "inactiveCandidates",
        status: "inactive",
        missingCount: requireNumber(decision.nextMissingCount, decision, "nextMissingCount"),
        previousMissingCount: requireNumber(
          decision.previousMissingCount,
          decision,
          "previousMissingCount"
        )
      })
    ),
    ...report.skipped
      .filter((skipped) => skipped.reason === MISSING_BELOW_THRESHOLD_REASON)
      .map((skipped) =>
        planSkippedUpdate(report, skipped, appliedAt, {
          bucket: "missingThresholdNotMet",
          missingCount: requireNumber(skipped.nextMissingCount, skipped, "nextMissingCount"),
          previousMissingCount: requireNumber(
            skipped.previousMissingCount,
            skipped,
            "previousMissingCount"
          )
        })
      )
  ];
}

function planDecisionUpdate(
  report: LifecycleDryRunReport,
  decision: LifecycleDecision,
  appliedAt: Date,
  options: {
    bucket: PlannedLifecycleUpdate["bucket"];
    status: JobPostingStatus;
    missingCount: number;
    lastSeenAt?: Date;
    closedAt?: Date;
    closedEvidence?: string;
    previousMissingCount?: number;
  }
): PlannedLifecycleUpdate {
  return {
    source: decision.source,
    sourceJobId: decision.sourceJobId,
    currentStatus: decision.currentStatus,
    bucket: options.bucket,
    previousMissingCount: options.previousMissingCount,
    data: {
      status: options.status,
      lastSeenAt: options.lastSeenAt,
      closedAt: options.closedAt,
      classifierMeta: buildLifecycleMeta(report, appliedAt, {
        missingCount: options.missingCount,
        lastDecision: decision.reason,
        closedEvidence: options.closedEvidence
      })
    }
  };
}

function planSkippedUpdate(
  report: LifecycleDryRunReport,
  skipped: LifecycleSkipped,
  appliedAt: Date,
  options: {
    bucket: PlannedLifecycleUpdate["bucket"];
    missingCount: number;
    previousMissingCount: number;
  }
): PlannedLifecycleUpdate {
  return {
    source: skipped.source,
    sourceJobId: skipped.sourceJobId,
    currentStatus: skipped.currentStatus,
    bucket: options.bucket,
    previousMissingCount: options.previousMissingCount,
    data: {
      classifierMeta: buildLifecycleMeta(report, appliedAt, {
        missingCount: options.missingCount,
        lastDecision: skipped.reason
      })
    }
  };
}

function buildLifecycleMeta(
  report: LifecycleDryRunReport,
  appliedAt: Date,
  options: {
    missingCount: number;
    lastDecision: string;
    closedEvidence?: string;
  }
) {
  return {
    lifecycle: {
      missingCount: options.missingCount,
      lastDecision: options.lastDecision,
      reportCrawlBatchId: report.crawlBatchId,
      reportCollectedAt: report.collectedAt,
      appliedAt: appliedAt.toISOString(),
      ...(options.closedEvidence ? { closedEvidence: options.closedEvidence } : {})
    }
  };
}

function createEmptySummary(report: LifecycleDryRunReport): LifecycleApplySummary {
  return {
    source: report.source,
    crawlBatchId: report.crawlBatchId,
    updated: {
      activeObservations: 0,
      closedCandidates: 0,
      inactiveCandidates: 0,
      missingThresholdNotMet: 0,
      total: 0
    },
    alreadyApplied: {
      activeObservations: 0,
      closedCandidates: 0,
      inactiveCandidates: 0,
      missingThresholdNotMet: 0,
      total: 0
    }
  };
}

function groupExistingJobs(source: string, jobs: LifecycleApplyJobRecord[]) {
  const bySourceJobId = new Map<string, LifecycleApplyJobRecord>();

  for (const job of jobs) {
    if (job.source !== source) {
      continue;
    }

    if (bySourceJobId.has(job.sourceJobId)) {
      throw new Error(`Duplicate DB row for ${source}/${job.sourceJobId}`);
    }

    bySourceJobId.set(job.sourceJobId, job);
  }

  return bySourceJobId;
}

function validateReasons(report: LifecycleDryRunReport) {
  for (const decision of report.activeObservations) {
    assertDecisionReason(decision, ACTIVE_REASON);
    assertDecisionSource(report.source, decision.source, decision.sourceJobId);
  }

  for (const decision of report.closedCandidates) {
    assertDecisionReason(decision, CLOSED_REASON);
    if (!decision.evidence) {
      throw new Error(`closed candidate missing evidence: ${decision.source}/${decision.sourceJobId}`);
    }
    assertDecisionSource(report.source, decision.source, decision.sourceJobId);
  }

  for (const decision of report.inactiveCandidates) {
    assertDecisionReason(decision, INACTIVE_REASON);
    assertDecisionSource(report.source, decision.source, decision.sourceJobId);
  }

  for (const skipped of report.skipped) {
    if (!KNOWN_SKIPPED_REASONS.has(skipped.reason)) {
      throw new Error(`Unknown skipped reason: ${skipped.reason}`);
    }
    assertDecisionSource(report.source, skipped.source, skipped.sourceJobId);
  }
}

function validateUniqueMutationTargets(report: LifecycleDryRunReport) {
  const seen = new Set<string>();
  const mutationTargets = [
    ...report.activeObservations,
    ...report.closedCandidates,
    ...report.inactiveCandidates,
    ...report.skipped.filter((skipped) => skipped.reason === MISSING_BELOW_THRESHOLD_REASON)
  ];

  for (const decision of mutationTargets) {
    const key = `${decision.source}/${decision.sourceJobId}`;
    if (seen.has(key)) {
      throw new Error(`Duplicate lifecycle mutation target: ${key}`);
    }
    seen.add(key);
  }
}

function assertDecisionReason(decision: LifecycleDecision, expectedReason: string) {
  if (decision.reason !== expectedReason) {
    throw new Error(`Unknown lifecycle decision reason: ${decision.reason}`);
  }
}

function assertDecisionSource(expectedSource: string, source: string, sourceJobId: string) {
  if (source !== expectedSource) {
    throw new Error(`Decision source mismatch for ${source}/${sourceJobId}`);
  }
}

function assertDecisionArray(value: unknown, field: string): asserts value is LifecycleDecision[] {
  if (!Array.isArray(value)) {
    throw new Error(`report.${field} must be an array.`);
  }
}

function assertSkippedArray(value: unknown, field: string): asserts value is LifecycleSkipped[] {
  if (!Array.isArray(value)) {
    throw new Error(`report.${field} must be an array.`);
  }
}

function assertCount(value: unknown, expected: number, field: string) {
  if (value !== expected) {
    throw new Error(`${field} count mismatch: expected ${expected}, got ${String(value)}`);
  }
}

function assertRecord(value: unknown, field: string): asserts value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${field} must be an object.`);
  }
}

function assertNonEmptyString(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string.`);
  }
}

function assertIsoDate(value: unknown, field: string) {
  assertNonEmptyString(value, field);
  parseDate(value, field);
}

function parseDate(value: string, field: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${field} must be an ISO date.`);
  }

  return date;
}

function requireValue(argv: string[], index: number, option: string) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value.`);
  }
  return value;
}

function requireNumber(
  value: number | undefined,
  decision: LifecycleDecision | LifecycleSkipped,
  field: string
) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${decision.source}/${decision.sourceJobId} missing ${field}.`);
  }
  return value;
}

function readMissingCount(classifierMeta: unknown) {
  const meta = readRecord(classifierMeta);
  const lifecycle = readRecord(meta?.lifecycle);
  const count = lifecycle?.missingCount ?? meta?.missingCount ?? meta?.lifecycleMissingCount;

  return typeof count === "number" && Number.isFinite(count) ? Math.trunc(count) : 0;
}

function isAlreadyAppliedMissingUpdate(
  existing: LifecycleApplyJobRecord,
  update: PlannedLifecycleUpdate,
  actualMissingCount: number
) {
  if (update.bucket !== "missingThresholdNotMet") {
    return false;
  }

  const existingLifecycle = readRecord(readRecord(existing.classifierMeta)?.lifecycle);
  const patchLifecycle = readRecord(update.data.classifierMeta.lifecycle);
  const plannedMissingCount = patchLifecycle?.missingCount;
  const plannedBatchId = patchLifecycle?.reportCrawlBatchId;
  const existingBatchId = existingLifecycle?.reportCrawlBatchId ?? existingLifecycle?.lastCrawlBatchId;

  return (
    typeof plannedMissingCount === "number" &&
    actualMissingCount === plannedMissingCount &&
    existingLifecycle?.lastDecision === patchLifecycle?.lastDecision &&
    existingBatchId === plannedBatchId
  );
}

function updateKey(update: PlannedLifecycleUpdate) {
  return `${update.source}/${update.sourceJobId}`;
}

function readRecord(value: unknown) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function mergeClassifierMeta(existingMeta: unknown, patchMeta: Record<string, unknown>) {
  const existing = readRecord(existingMeta) ?? {};
  const existingLifecycle = readRecord(existing.lifecycle) ?? {};
  const patchLifecycle = readRecord(patchMeta.lifecycle) ?? {};

  return {
    ...existing,
    ...patchMeta,
    lifecycle: {
      ...existingLifecycle,
      ...patchLifecycle
    }
  };
}

class PrismaLifecycleApplyStore implements LifecycleApplyStore {
  constructor(private readonly client: PrismaClient | Prisma.TransactionClient) {}

  async transaction<T>(callback: (store: LifecycleApplyStore) => Promise<T>): Promise<T> {
    if (!("$transaction" in this.client)) {
      return callback(this);
    }

    return this.client.$transaction(
      async (client) => callback(new PrismaLifecycleApplyStore(client)),
      { maxWait: 5000, timeout: 30000 }
    );
  }

  async findJobs(source: string, sourceJobIds: string[]): Promise<LifecycleApplyJobRecord[]> {
    const jobs = await this.client.jobPosting.findMany({
      where: {
        source,
        sourceJobId: {
          in: sourceJobIds
        }
      },
      select: {
        source: true,
        sourceJobId: true,
        status: true,
        closedAt: true,
        lastSeenAt: true,
        classifierMeta: true
      }
    });

    return jobs.map((job) => {
      if (!job.sourceJobId) {
        throw new Error(`DB row missing sourceJobId for ${job.source}`);
      }

      return {
        source: job.source,
        sourceJobId: job.sourceJobId,
        status: job.status,
        closedAt: job.closedAt,
        lastSeenAt: job.lastSeenAt,
        classifierMeta: job.classifierMeta
      };
    });
  }

  async updateJob(
    where: LifecycleApplyUpdateWhere,
    data: LifecycleApplyUpdateData
  ): Promise<number> {
    const result = await this.client.jobPosting.updateMany({
      where: {
        source: where.source,
        sourceJobId: where.sourceJobId,
        status: where.expectedStatus
      },
      data: toPrismaUpdateData(data)
    });

    return result.count;
  }
}

function toPrismaUpdateData(data: LifecycleApplyUpdateData): Prisma.JobPostingUpdateManyMutationInput {
  return {
    status: data.status,
    lastSeenAt: data.lastSeenAt,
    closedAt: data.closedAt,
    classifierMeta: data.classifierMeta as Prisma.InputJsonValue
  };
}

const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (entryPath === fileURLToPath(import.meta.url)) {
  runJobLifecycleApply(parseJobLifecycleApplyArgs(process.argv.slice(2))).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
