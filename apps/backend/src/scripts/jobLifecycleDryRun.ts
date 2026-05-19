import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { CollectedJobBatch, CollectedJobPosting, JobPostingStatus } from "../types/job.js";

const REPORT_SCHEMA_VERSION = "job_lifecycle_dry_run_v1";
const DEFAULT_INACTIVE_THRESHOLD = 3;
const CLOSED_SIGNAL_PATTERNS = [
  "접수마감",
  "채용마감",
  "지원마감",
  "접수종료",
  "마감",
  "종료",
  "募集終了",
  "掲載終了",
  "受付終了",
  "応募終了",
  "closed",
  "expired",
  "no longer accepting",
  "ended"
];
const PARTIAL_WARNING_PATTERN = /timeout|timed out|fail|failed|failure|skipped|selector|drift|error/i;

export type ExistingLifecycleJob = {
  source: string;
  sourceJobId: string;
  status?: JobPostingStatus | null;
  closedAt?: string | null;
  lastSeenAt?: string | null;
  classifierMeta?: Record<string, unknown> | null;
  missingCount?: number | null;
};

export type LifecycleDryRunOptions = {
  batch: CollectedJobBatch;
  existingJobs: ExistingLifecycleJob[];
  inactiveThreshold?: number;
};

export type LifecycleDryRunArgs = {
  batchPath: string;
  existingPath: string;
  inactiveThreshold: number;
  outputPath?: string;
};

export type LifecycleDecision = {
  source: string;
  sourceJobId: string;
  currentStatus: JobPostingStatus | "unknown";
  proposedStatus: JobPostingStatus;
  reason: string;
  evidence?: string;
  previousMissingCount?: number;
  nextMissingCount?: number;
};

export type LifecycleSkipped = {
  source: string;
  sourceJobId: string;
  currentStatus: JobPostingStatus | "unknown";
  reason: string;
  detail?: string;
  previousMissingCount?: number;
  nextMissingCount?: number;
};

export type LifecycleDryRunReport = {
  schemaVersion: typeof REPORT_SCHEMA_VERSION;
  source: string;
  crawlBatchId: string;
  collectedAt: string;
  generatedAt: string;
  inactiveThreshold: number;
  partial: boolean;
  partialReasons: string[];
  counts: {
    existing: number;
    observed: number;
    activeObservations: number;
    closedCandidates: number;
    inactiveCandidates: number;
    skipped: number;
  };
  activeObservations: LifecycleDecision[];
  closedCandidates: LifecycleDecision[];
  inactiveCandidates: LifecycleDecision[];
  skipped: LifecycleSkipped[];
};

export function buildLifecycleDryRunReport(
  options: LifecycleDryRunOptions
): LifecycleDryRunReport {
  const inactiveThreshold = options.inactiveThreshold ?? DEFAULT_INACTIVE_THRESHOLD;

  if (!Number.isInteger(inactiveThreshold) || inactiveThreshold < 1) {
    throw new Error("--inactive-threshold must be a positive integer.");
  }

  const existingJobs = options.existingJobs.filter((job) => job.source === options.batch.source);
  const existingBySourceJobId = new Map(existingJobs.map((job) => [job.sourceJobId, job]));
  const observedBySourceJobId = new Map(
    options.batch.postings.map((posting) => [posting.sourceJobId ?? "", posting])
  );
  const partialReasons = getPartialReasons(options.batch, existingJobs.length);
  const partial = partialReasons.length > 0;
  const activeObservations: LifecycleDecision[] = [];
  const closedCandidates: LifecycleDecision[] = [];
  const inactiveCandidates: LifecycleDecision[] = [];
  const skipped: LifecycleSkipped[] = [];

  for (const posting of options.batch.postings) {
    if (!posting.sourceJobId) {
      continue;
    }

    const existing = existingBySourceJobId.get(posting.sourceJobId);
    if (!existing) {
      skipped.push({
        source: options.batch.source,
        sourceJobId: posting.sourceJobId,
        currentStatus: "unknown",
        reason: "new_posting_not_lifecycle_transition"
      });
      continue;
    }

    const currentStatus = normalizeStatus(existing.status);

    if (posting.status === "closed") {
      const evidence = findClosedEvidence(posting);

      if (!evidence) {
        skipped.push({
          source: options.batch.source,
          sourceJobId: posting.sourceJobId,
          currentStatus,
          reason: "closed_without_source_visible_evidence"
        });
        continue;
      }

      if (currentStatus === "closed") {
        skipped.push({
          source: options.batch.source,
          sourceJobId: posting.sourceJobId,
          currentStatus,
          reason: "already_closed"
        });
        continue;
      }

      closedCandidates.push({
        source: options.batch.source,
        sourceJobId: posting.sourceJobId,
        currentStatus,
        proposedStatus: "closed",
        reason: "source_visible_closed_signal",
        evidence
      });
      continue;
    }

    activeObservations.push({
      source: options.batch.source,
      sourceJobId: posting.sourceJobId,
      currentStatus,
      proposedStatus: "active",
      reason: "observed_in_successful_crawl"
    });
  }

  for (const existing of existingJobs) {
    if (observedBySourceJobId.has(existing.sourceJobId)) {
      continue;
    }

    const currentStatus = normalizeStatus(existing.status);

    if (partial) {
      skipped.push({
        source: existing.source,
        sourceJobId: existing.sourceJobId,
        currentStatus,
        reason: "partial_crawl_protects_absent_row",
        detail: partialReasons.join(", ")
      });
      continue;
    }

    if (currentStatus !== "active" && currentStatus !== "unknown") {
      skipped.push({
        source: existing.source,
        sourceJobId: existing.sourceJobId,
        currentStatus,
        reason: "existing_status_not_active"
      });
      continue;
    }

    const previousMissingCount = resolveMissingCount(existing);
    const nextMissingCount = previousMissingCount + 1;

    if (nextMissingCount >= inactiveThreshold) {
      inactiveCandidates.push({
        source: existing.source,
        sourceJobId: existing.sourceJobId,
        currentStatus,
        proposedStatus: "inactive",
        reason: "missing_threshold_reached",
        previousMissingCount,
        nextMissingCount
      });
      continue;
    }

    skipped.push({
      source: existing.source,
      sourceJobId: existing.sourceJobId,
      currentStatus,
      reason: "missing_threshold_not_met",
      previousMissingCount,
      nextMissingCount
    });
  }

  return {
    schemaVersion: REPORT_SCHEMA_VERSION,
    source: options.batch.source,
    crawlBatchId: options.batch.crawlBatchId,
    collectedAt: options.batch.collectedAt,
    generatedAt: new Date().toISOString(),
    inactiveThreshold,
    partial,
    partialReasons,
    counts: {
      existing: existingJobs.length,
      observed: options.batch.postings.length,
      activeObservations: activeObservations.length,
      closedCandidates: closedCandidates.length,
      inactiveCandidates: inactiveCandidates.length,
      skipped: skipped.length
    },
    activeObservations,
    closedCandidates,
    inactiveCandidates,
    skipped
  };
}

export function parseJobLifecycleDryRunArgs(argv: string[]): LifecycleDryRunArgs {
  const parsed: Partial<LifecycleDryRunArgs> = {
    inactiveThreshold: DEFAULT_INACTIVE_THRESHOLD
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--") {
      continue;
    }

    if (arg === "--batch") {
      parsed.batchPath = requireValue(argv, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--existing") {
      parsed.existingPath = requireValue(argv, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--inactive-threshold") {
      const value = Number.parseInt(requireValue(argv, index, arg), 10);
      if (!Number.isInteger(value) || value < 1) {
        throw new Error("--inactive-threshold must be a positive integer.");
      }
      parsed.inactiveThreshold = value;
      index += 1;
      continue;
    }

    if (arg === "--output") {
      parsed.outputPath = requireValue(argv, index, arg);
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!parsed.batchPath) {
    throw new Error("--batch is required.");
  }

  if (!parsed.existingPath) {
    throw new Error("--existing is required.");
  }

  return parsed as LifecycleDryRunArgs;
}

export function parseExistingLifecycleJobs(parsed: unknown): ExistingLifecycleJob[] {
  const jobs = selectExistingJobsArray(parsed);
  return jobs.map((job, index) => {
    assertRecord(job, `existingJobs[${index}]`);
    const source = assertNonEmptyString(job.source, `existingJobs[${index}].source`);
    const sourceJobId = assertNonEmptyString(
      job.sourceJobId ?? job.source_job_id,
      `existingJobs[${index}].sourceJobId`
    );
    const status = typeof job.status === "string" ? normalizeStatus(job.status) : undefined;
    const missingCount = readOptionalNumber(job.missingCount ?? job.missing_count);

    return {
      source,
      sourceJobId,
      status,
      closedAt: readOptionalString(job.closedAt ?? job.closed_at),
      lastSeenAt: readOptionalString(job.lastSeenAt ?? job.last_seen_at),
      classifierMeta: readOptionalRecord(job.classifierMeta ?? job.classifier_meta),
      missingCount
    };
  });
}

export async function readLifecycleBatch(batchPath: string): Promise<CollectedJobBatch> {
  const parsed = JSON.parse(await fs.readFile(batchPath, "utf-8")) as unknown;
  assertRecord(parsed, "batch");

  if (parsed.schemaVersion !== "job_batch_v1") {
    throw new Error("--batch must point to a job_batch_v1 artifact.");
  }

  if (!Array.isArray(parsed.postings)) {
    throw new Error("batch.postings must be an array.");
  }

  return parsed as CollectedJobBatch;
}

export async function readExistingLifecycleJobs(
  existingPath: string
): Promise<ExistingLifecycleJob[]> {
  const parsed = JSON.parse(await fs.readFile(existingPath, "utf-8")) as unknown;
  return parseExistingLifecycleJobs(parsed);
}

export async function runJobLifecycleDryRun(options: LifecycleDryRunArgs) {
  const batch = await readLifecycleBatch(resolveLifecyclePath(options.batchPath));
  const existingJobs = await readExistingLifecycleJobs(resolveLifecyclePath(options.existingPath));
  const report = buildLifecycleDryRunReport({
    batch,
    existingJobs,
    inactiveThreshold: options.inactiveThreshold
  });
  const output = `${JSON.stringify(report, null, 2)}\n`;

  if (options.outputPath) {
    await fs.writeFile(resolveLifecyclePath(options.outputPath, { mustExist: false }), output, "utf-8");
  } else {
    process.stdout.write(output);
  }

  return report;
}

export function resolveLifecyclePath(
  inputPath: string,
  options: {
    cwd?: string;
    repoRoot?: string;
    pathExists?: (candidate: string) => boolean;
    mustExist?: boolean;
  } = {}
) {
  const cwd = options.cwd ?? process.cwd();
  const repoRoot = options.repoRoot ?? findRepoRoot(cwd);
  const pathExists = options.pathExists ?? existsSync;
  const cwdCandidate = path.resolve(cwd, inputPath);

  if (path.isAbsolute(inputPath) || pathExists(cwdCandidate)) {
    return cwdCandidate;
  }

  const repoCandidate = path.resolve(repoRoot, inputPath);
  if (options.mustExist === false || pathExists(repoCandidate)) {
    return repoCandidate;
  }

  return cwdCandidate;
}

function getPartialReasons(batch: CollectedJobBatch, existingCount: number) {
  const reasons: string[] = [];

  if (batch.mode !== "batch") {
    reasons.push("not_batch_mode");
  }

  if ((batch.errors ?? []).length > 0) {
    reasons.push("batch_error");
  }

  if ((batch.warnings ?? []).some((warning) => PARTIAL_WARNING_PATTERN.test(warning))) {
    reasons.push("batch_warning");
  }

  if (existingCount > 0 && batch.postings.length === 0) {
    reasons.push("zero_postings");
  }

  return reasons;
}

function findClosedEvidence(posting: CollectedJobPosting) {
  const candidates = [
    posting.deadlineText,
    posting.description,
    posting.rawText,
    readNestedString(posting.classifierMeta, ["closedEvidence"]),
    readNestedString(posting.classifierMeta, ["statusEvidence"]),
    readNestedString(posting.classifierMeta, ["evidence"]),
    readNestedString(posting.rawJson, ["deadlineText"]),
    readNestedString(posting.rawJson, ["statusText"])
  ];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const evidence = findClosedSignal(candidate);
    if (evidence) {
      return evidence;
    }
  }

  return undefined;
}

function findClosedSignal(text: string) {
  const lowerText = text.toLowerCase();
  return CLOSED_SIGNAL_PATTERNS.find((pattern) => lowerText.includes(pattern.toLowerCase()));
}

function resolveMissingCount(job: ExistingLifecycleJob) {
  if (typeof job.missingCount === "number" && Number.isFinite(job.missingCount)) {
    return Math.max(0, Math.trunc(job.missingCount));
  }

  const lifecycle = readOptionalRecord(job.classifierMeta?.lifecycle);
  const count =
    readOptionalNumber(lifecycle?.missingCount) ??
    readOptionalNumber(job.classifierMeta?.missingCount) ??
    readOptionalNumber(job.classifierMeta?.lifecycleMissingCount);

  return count === undefined ? 0 : Math.max(0, Math.trunc(count));
}

function normalizeStatus(status: unknown): JobPostingStatus | "unknown" {
  if (
    status === "active" ||
    status === "closed" ||
    status === "inactive" ||
    status === "unknown"
  ) {
    return status;
  }

  return "unknown";
}

function selectExistingJobsArray(parsed: unknown) {
  if (Array.isArray(parsed)) {
    return parsed;
  }

  assertRecord(parsed, "existing snapshot");

  if (Array.isArray(parsed.jobs)) {
    return parsed.jobs;
  }

  if (Array.isArray(parsed.postings)) {
    return parsed.postings;
  }

  if (Array.isArray(parsed.existingJobs)) {
    return parsed.existingJobs;
  }

  throw new Error("--existing must contain an array, jobs, postings, or existingJobs.");
}

function requireValue(argv: string[], index: number, option: string) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value.`);
  }
  return value;
}

function assertRecord(value: unknown, field: string): asserts value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${field} must be an object.`);
  }
}

function assertNonEmptyString(value: unknown, field: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string.`);
  }
  return value;
}

function readOptionalString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function readOptionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readOptionalRecord(value: unknown) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function readNestedString(
  value: Record<string, unknown> | null | undefined,
  pathParts: string[]
) {
  let current: unknown = value;

  for (const part of pathParts) {
    if (typeof current !== "object" || current === null || Array.isArray(current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return typeof current === "string" ? current : undefined;
}

function findRepoRoot(startDir: string) {
  let current = path.resolve(startDir);

  while (true) {
    if (
      existsSync(path.join(current, "package.json")) &&
      existsSync(path.join(current, "scripts", "job_crawler", "models.py"))
    ) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return path.resolve(startDir);
    }
    current = parent;
  }
}

const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (entryPath === fileURLToPath(import.meta.url)) {
  runJobLifecycleDryRun(parseJobLifecycleDryRunArgs(process.argv.slice(2))).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
