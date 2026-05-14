import { config } from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../src/generated/prisma/client.js";
import type { CollectedJobPosting } from "../src/types/job.js";

config({ path: path.resolve(process.cwd(), "../../.env") });
config({ path: path.resolve(process.cwd(), ".env"), override: true });

type ImportOptions = {
  dryRun: boolean;
  filePath: string;
};

type ImportSummary = {
  count: number;
  sources: Record<string, number>;
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

function assertString(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`필수 문자열 필드가 비어 있습니다: ${field}`);
  }
}

function assertStringArray(value: unknown, field: string): asserts value is string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`필수 문자열 배열 필드가 올바르지 않습니다: ${field}`);
  }
}

function validateJob(job: CollectedJobPosting, index: number) {
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

  if (!job.sourceJobId) {
    throw new Error(`중복 방지용 원본 ID가 비어 있습니다: ${prefix}.sourceJobId`);
  }
}

async function readJobs(filePath: string): Promise<CollectedJobPosting[]> {
  const file = await fs.readFile(filePath, "utf-8");
  const parsed = JSON.parse(file) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error("표준 채용공고 JSON은 배열이어야 합니다.");
  }

  const jobs = parsed as CollectedJobPosting[];
  jobs.forEach(validateJob);
  return jobs;
}

function summarize(jobs: CollectedJobPosting[]): ImportSummary {
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

function toPrismaData(job: CollectedJobPosting) {
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
    collectedAt: job.collectedAt ? new Date(job.collectedAt) : undefined
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
  const jobs = await readJobs(options.filePath);
  const summary = summarize(jobs);

  if (options.dryRun) {
    console.log(`Dry run passed: ${summary.count} job postings`);
    console.log(`Sources: ${JSON.stringify(summary.sources)}`);
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
    for (const job of jobs) {
      const jobData = toPrismaData(job);

      await prisma.jobPosting.upsert({
        where: {
          id: job.id
        },
        update: jobData,
        create: {
          id: job.id,
          ...jobData
        }
      });
    }

    console.log(`Import completed: ${summary.count} job postings`);
    console.log(`Sources: ${JSON.stringify(summary.sources)}`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
