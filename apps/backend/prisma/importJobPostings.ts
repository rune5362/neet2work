import { config } from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../src/generated/prisma/client.js";
import type { CollectedJobBatch, CollectedJobPosting, JobPostingStatus } from "../src/types/job.js";

config({ path: path.resolve(process.cwd(), "../../.env") });
config({ path: path.resolve(process.cwd(), ".env"), override: true });

const JOB_BATCH_SCHEMA_VERSION = "job_batch_v1";
const JOB_POSTING_STATUSES = new Set<JobPostingStatus>(["active", "closed", "inactive", "unknown"]);
const CAREER_STAGES = new Set([
  "intern",
  "entry",
  "junior",
  "career_unspecified",
  "mid",
  "senior",
  "lead_manager",
  "unknown"
]);

type ImportOptions = {
  dryRun: boolean;
  filePath: string;
};

type ImportSummary = {
  count: number;
  sources: Record<string, number>;
};

export type ParsedJobPayload = {
  jobs: CollectedJobPosting[];
  batch?: CollectedJobBatch;
};

function parseArgs(argv: string[]): ImportOptions {
  const dryRun = argv.includes("--dry-run");
  const fileArg = argv.find((arg) => arg !== "--dry-run");

  if (!fileArg) {
    throw new Error(
      "사용법: tsx prisma/importJobPostings.ts [--dry-run] <standard-job-postings-json>"
    );
  }

  return {
    dryRun,
    filePath: path.resolve(process.cwd(), fileArg)
  };
}

function assertRecord(value: unknown, field: string): asserts value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`필수 객체 필드가 올바르지 않습니다: ${field}`);
  }
}

function assertString(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`필수 문자열 필드가 비어 있습니다: ${field}`);
  }
}

function assertOptionalStringArray(value: unknown, field: string) {
  if (value === undefined) {
    return;
  }

  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`선택 문자열 배열 필드가 올바르지 않습니다: ${field}`);
  }
}

function assertStringArray(value: unknown, field: string): asserts value is string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`필수 문자열 배열 필드가 올바르지 않습니다: ${field}`);
  }
}

function assertOptionalDate(value: unknown, field: string) {
  if (value === undefined || value === null) {
    return;
  }

  assertString(value, field);
  parseDate(value, field);
}

function parseDate(value: string, field: string): Date {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`날짜 필드가 올바르지 않습니다: ${field}`);
  }

  return date;
}

function toOptionalDate(value: string | null | undefined, field: string): Date | undefined {
  if (!value) {
    return undefined;
  }

  return parseDate(value, field);
}

export function validateJob(job: CollectedJobPosting, index: number, expectedSource?: string) {
  const prefix = `jobs[${index}]`;

  assertString(job.id, `${prefix}.id`);
  assertString(job.title, `${prefix}.title`);
  assertString(job.company, `${prefix}.company`);
  assertString(job.location, `${prefix}.location`);
  assertString(job.careerLevel, `${prefix}.careerLevel`);
  assertStringArray(job.skills, `${prefix}.skills`);
  assertString(job.description, `${prefix}.description`);
  assertString(job.sourceUrl, `${prefix}.sourceUrl`);

  if (!job.source) {
    throw new Error(`필수 출처 필드가 비어 있습니다: ${prefix}.source`);
  }

  if (expectedSource && job.source !== expectedSource) {
    throw new Error(
      `배치 source와 공고 source가 다릅니다: ${prefix}.source=${job.source}, batch.source=${expectedSource}`
    );
  }

  if (!job.sourceJobId) {
    throw new Error(`중복 방지용 원본 ID가 비어 있습니다: ${prefix}.sourceJobId`);
  }

  if (job.status && !JOB_POSTING_STATUSES.has(job.status)) {
    throw new Error(`지원하지 않는 공고 상태입니다: ${prefix}.status=${job.status}`);
  }

  if (job.careerStage && !CAREER_STAGES.has(job.careerStage)) {
    throw new Error(`지원하지 않는 경력 단계입니다: ${prefix}.careerStage=${job.careerStage}`);
  }

  assertOptionalDate(job.collectedAt, `${prefix}.collectedAt`);
  assertOptionalDate(job.firstSeenAt, `${prefix}.firstSeenAt`);
  assertOptionalDate(job.lastSeenAt, `${prefix}.lastSeenAt`);
  assertOptionalDate(job.closedAt, `${prefix}.closedAt`);
}

export function parseJobPayload(parsed: unknown): ParsedJobPayload {
  if (Array.isArray(parsed)) {
    const jobs = parsed as CollectedJobPosting[];
    jobs.forEach((job, index) => validateJob(job, index));
    return { jobs };
  }

  assertRecord(parsed, "payload");

  if (parsed.schemaVersion !== JOB_BATCH_SCHEMA_VERSION) {
    throw new Error("표준 채용공고 JSON은 배열 또는 job_batch_v1 객체여야 합니다.");
  }

  assertString(parsed.source, "batch.source");
  assertString(parsed.mode, "batch.mode");
  assertString(parsed.crawlBatchId, "batch.crawlBatchId");
  assertString(parsed.collectedAt, "batch.collectedAt");
  parseDate(parsed.collectedAt, "batch.collectedAt");
  assertOptionalStringArray(parsed.warnings, "batch.warnings");
  assertOptionalStringArray(parsed.errors, "batch.errors");

  if (parsed.mode !== "sample" && parsed.mode !== "batch") {
    throw new Error(`지원하지 않는 배치 모드입니다: ${parsed.mode}`);
  }

  if (
    parsed.sourceCap !== undefined &&
    parsed.sourceCap !== null &&
    (typeof parsed.sourceCap !== "number" || parsed.sourceCap < 0)
  ) {
    throw new Error("batch.sourceCap은 0 이상의 숫자여야 합니다.");
  }

  if (!Array.isArray(parsed.postings)) {
    throw new Error("batch.postings는 배열이어야 합니다.");
  }

  const batch = parsed as CollectedJobBatch;
  batch.postings.forEach((job, index) => validateJob(job, index, batch.source));
  return { jobs: batch.postings, batch };
}

export async function readJobPayload(filePath: string): Promise<ParsedJobPayload> {
  const file = await fs.readFile(filePath, "utf-8");
  return parseJobPayload(JSON.parse(file) as unknown);
}

export function summarize(jobs: CollectedJobPosting[]): ImportSummary {
  return jobs.reduce<ImportSummary>(
    (summary, job) => {
      const source = job.source ?? "unknown";
      summary.count += 1;
      summary.sources[source] = (summary.sources[source] ?? 0) + 1;
      return summary;
    },
    { count: 0, sources: {} }
  );
}

function resolveObservedAt(job: CollectedJobPosting, batch?: CollectedJobBatch): Date | undefined {
  return (
    toOptionalDate(job.lastSeenAt, "job.lastSeenAt") ??
    toOptionalDate(job.collectedAt, "job.collectedAt") ??
    (batch ? toOptionalDate(batch.collectedAt, "batch.collectedAt") : undefined)
  );
}

export function toPrismaData(job: CollectedJobPosting, batch?: CollectedJobBatch) {
  const status = job.status ?? "active";
  const observedAt = resolveObservedAt(job, batch);
  const closedAt =
    status === "closed" ? toOptionalDate(job.closedAt, "job.closedAt") ?? observedAt : null;

  return {
    title: job.title,
    company: job.company,
    location: job.location,
    careerLevel: job.careerLevel,
    skills: job.skills,
    description: job.description,
    source: job.source ?? "manual",
    sourceJobId: job.sourceJobId,
    sourceUrl: job.sourceUrl,
    country: job.country ?? "KR",
    language: job.language ?? "ko",
    employmentType: job.employmentType,
    educationLevel: job.educationLevel,
    salaryText: job.salaryText,
    deadlineText: job.deadlineText,
    applyMethod: job.applyMethod,
    companyInfo: toNullableJson(job.companyInfo),
    rawText: job.rawText,
    rawJson: toNullableJson(job.rawJson),
    collectedAt: toOptionalDate(job.collectedAt, "job.collectedAt"),
    status,
    lastSeenAt: observedAt,
    closedAt,
    jobCategory: job.jobCategory,
    careerStage: job.careerStage,
    crawlBatchId: job.crawlBatchId ?? batch?.crawlBatchId,
    classifierMeta: toNullableJson(job.classifierMeta)
  };
}

function toPrismaCreateData(job: CollectedJobPosting, batch?: CollectedJobBatch) {
  return {
    id: job.id,
    ...toPrismaData(job, batch),
    firstSeenAt: toOptionalDate(job.firstSeenAt, "job.firstSeenAt")
  };
}

function toNullableJson(value: Record<string, unknown> | null | undefined) {
  if (value === null) {
    return Prisma.JsonNull;
  }

  return value === undefined ? undefined : (value as Prisma.InputJsonValue);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const payload = await readJobPayload(options.filePath);
  const summary = summarize(payload.jobs);

  if (options.dryRun) {
    console.log(`Dry run passed: ${summary.count} job postings`);
    console.log(`Sources: ${JSON.stringify(summary.sources)}`);
    if (payload.batch) {
      console.log(
        `Batch: ${payload.batch.source}/${payload.batch.mode}/${payload.batch.crawlBatchId}`
      );
    }
    return;
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL이 없어 채용공고 import를 실행할 수 없습니다.");
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    for (const job of payload.jobs) {
      if (!job.source || !job.sourceJobId) {
        throw new Error(`source/sourceJobId가 없어 upsert할 수 없습니다: ${job.id}`);
      }

      await prisma.jobPosting.upsert({
        where: {
          source_sourceJobId: {
            source: job.source,
            sourceJobId: job.sourceJobId
          }
        },
        update: toPrismaData(job, payload.batch),
        create: toPrismaCreateData(job, payload.batch)
      });
    }

    console.log(`Import completed: ${summary.count} job postings`);
    console.log(`Sources: ${JSON.stringify(summary.sources)}`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

const currentModulePath = fileURLToPath(import.meta.url);
const entryModulePath = process.argv[1] ? path.resolve(process.argv[1]) : "";

if (entryModulePath === currentModulePath) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
