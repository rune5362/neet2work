import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPrismaClient } from "../database/prisma.js";
import type { Prisma } from "../generated/prisma/client.js";
import type { JobPosting } from "../types/job.js";

const serviceDir = path.dirname(fileURLToPath(import.meta.url));
const sampleJobsPath = path.resolve(serviceDir, "../../data/sampleJobs.json");

const fallbackJobs: JobPosting[] = [
  {
    id: "job-001",
    title: "프론트엔드 개발자",
    company: "샘플테크",
    location: "서울",
    careerLevel: "신입",
    skills: ["React", "TypeScript", "JavaScript", "HTML", "CSS"],
    description: "React 기반 웹 서비스 개발자를 채용합니다.",
    source: "sample",
    sourceJobId: "job-001",
    country: "KR",
    language: "ko",
    sourceUrl: "https://example.com/jobs/1"
  }
];

type PublicJobRow = {
  id: string;
  title: string;
  company: string;
  location: string;
  careerLevel: string;
  skills: string[];
  description: string;
  source: string;
  sourceJobId: string | null;
  sourceUrl: string;
  country: string;
  language: string;
  employmentType: string | null;
  educationLevel: string | null;
  salaryText: string | null;
  deadlineText: string | null;
  applyMethod: string | null;
  collectedAt: Date | null;
};

export type JobListQuery = {
  q?: string;
  source?: string;
  country?: string;
  location?: string;
  language?: string;
  limit?: number;
};

type NormalizedJobListQuery = {
  q?: string;
  source?: string;
  country?: string;
  location?: string;
  language?: string;
  limit: number;
};

export type JobFacetOption = {
  value: string;
  count: number;
};

export type JobFacets = {
  sources: JobFacetOption[];
  countries: JobFacetOption[];
  languages: JobFacetOption[];
  total: number;
};

const DEFAULT_JOB_LIMIT = 50;
const MAX_JOB_LIMIT = 100;
const ACTIVE_PUBLIC_JOB_WHERE = {
  status: "active"
} satisfies Prisma.JobPostingWhereInput;

export const PUBLIC_JOB_SELECT = {
  id: true,
  title: true,
  company: true,
  location: true,
  careerLevel: true,
  skills: true,
  description: true,
  source: true,
  sourceJobId: true,
  sourceUrl: true,
  country: true,
  language: true,
  employmentType: true,
  educationLevel: true,
  salaryText: true,
  deadlineText: true,
  applyMethod: true,
  collectedAt: true
};

function normalizeQuery(query: JobListQuery = {}): NormalizedJobListQuery {
  const limit = Number.isFinite(query.limit)
    ? Math.min(Math.max(Math.trunc(query.limit ?? DEFAULT_JOB_LIMIT), 1), MAX_JOB_LIMIT)
    : DEFAULT_JOB_LIMIT;

  return {
    q: query.q?.trim() || undefined,
    source: query.source?.trim() || undefined,
    country: query.country?.trim() || undefined,
    location: query.location?.trim() || undefined,
    language: query.language?.trim() || undefined,
    limit
  };
}

function hasFilters(query: NormalizedJobListQuery): boolean {
  return Boolean(query.q || query.source || query.country || query.location || query.language);
}

function buildJobWhere(query: NormalizedJobListQuery): Prisma.JobPostingWhereInput {
  const where: Prisma.JobPostingWhereInput = { ...ACTIVE_PUBLIC_JOB_WHERE };

  if (query.source) {
    where.source = query.source;
  }

  if (query.country) {
    where.country = query.country;
  }

  if (query.location) {
    where.location = { contains: query.location, mode: "insensitive" };
  }

  if (query.language) {
    where.language = query.language;
  }

  if (query.q) {
    where.OR = [
      { title: { contains: query.q, mode: "insensitive" } },
      { company: { contains: query.q, mode: "insensitive" } },
      { description: { contains: query.q, mode: "insensitive" } }
    ];
  }

  return where;
}

function includesText(value: string, query: string): boolean {
  return value.toLowerCase().includes(query.toLowerCase());
}

function matchesJobQuery(job: JobPosting, query: NormalizedJobListQuery): boolean {
  if (query.source && job.source !== query.source) {
    return false;
  }

  if (query.country && job.country !== query.country) {
    return false;
  }

  if (query.location && !includesText(job.location, query.location)) {
    return false;
  }

  if (query.language && job.language !== query.language) {
    return false;
  }

  if (query.q) {
    return (
      includesText(job.title, query.q) ||
      includesText(job.company, query.q) ||
      includesText(job.description, query.q)
    );
  }

  return true;
}

function compareFacetOption(a: JobFacetOption, b: JobFacetOption): number {
  return b.count - a.count || a.value.localeCompare(b.value);
}

function countFacetValues(values: Array<string | undefined>): JobFacetOption[] {
  const counts = new Map<string, number>();

  for (const value of values) {
    if (!value) {
      continue;
    }

    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return Array.from(counts, ([value, count]) => ({ value, count })).sort(compareFacetOption);
}

function buildFallbackFacets(jobs: JobPosting[]): JobFacets {
  return {
    sources: countFacetValues(jobs.map((job) => job.source)),
    countries: countFacetValues(jobs.map((job) => job.country)),
    languages: countFacetValues(jobs.map((job) => job.language)),
    total: jobs.length
  };
}

function isDatabaseUnavailableError(error: unknown): boolean {
  const code = readErrorString(error, "code");
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  const cause = readErrorString(error, "cause")?.toLowerCase() ?? "";
  const combined = `${code ?? ""} ${message} ${cause}`;

  return [
    "p1001",
    "econnrefused",
    "econnreset",
    "enotfound",
    "etimedout",
    "timeout",
    "timed out",
    "connection terminated",
    "connection refused",
    "can't reach database server",
    "cannot reach database server",
    "server closed the connection",
    "certificate",
    "tls",
    "ssl"
  ].some((pattern) => combined.includes(pattern));
}

function readErrorString(error: unknown, key: string): string | undefined {
  if (typeof error !== "object" || error === null || Array.isArray(error)) {
    return undefined;
  }

  const value = (error as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

function redactSensitiveLogMessage(message: string): string {
  return message
    .replace(
      /\b([a-z][a-z0-9+.-]*:\/\/[^:\s/@]+):([^@\s]+)@/gi,
      "$1:[redacted]@"
    )
    .replace(
      /\b(database_password|password|passwd|pwd|secret|token|api[_-]?key)\b\s*[:=]\s*("[^"]*"|'[^']*'|[^\s,;]+)/gi,
      "$1=[redacted]"
    );
}

function shouldFallbackToSamples(error: unknown, context: string): boolean {
  if (!isDatabaseUnavailableError(error)) {
    return false;
  }

  const message = error instanceof Error ? error.message : String(error);
  console.warn(
    `${context} database unavailable; using sample fallback: ${redactSensitiveLogMessage(message)}`
  );
  return true;
}

function toJobPosting(job: PublicJobRow): JobPosting {
  return {
    id: job.id,
    title: job.title,
    company: job.company,
    location: job.location,
    careerLevel: job.careerLevel,
    skills: job.skills,
    description: job.description,
    source: job.source,
    sourceJobId: job.sourceJobId,
    sourceUrl: job.sourceUrl,
    country: job.country,
    language: job.language,
    employmentType: job.employmentType,
    educationLevel: job.educationLevel,
    salaryText: job.salaryText,
    deadlineText: job.deadlineText,
    applyMethod: job.applyMethod,
    collectedAt: job.collectedAt?.toISOString() ?? null
  };
}

async function getFallbackJobs(): Promise<JobPosting[]> {
  try {
    const file = await fs.readFile(sampleJobsPath, "utf-8");
    return JSON.parse(file) as JobPosting[];
  } catch {
    return fallbackJobs;
  }
}

export async function getJobs(query: JobListQuery = {}): Promise<JobPosting[]> {
  const normalizedQuery = normalizeQuery(query);
  const prisma = getPrismaClient();

  if (prisma) {
    try {
      const jobs = await prisma.jobPosting.findMany({
        where: buildJobWhere(normalizedQuery),
        select: PUBLIC_JOB_SELECT,
        orderBy: [{ collectedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
        take: normalizedQuery.limit
      });

      if (jobs.length > 0 || hasFilters(normalizedQuery)) {
        return jobs.map(toJobPosting);
      }
    } catch (error) {
      if (!shouldFallbackToSamples(error, "getJobs")) {
        throw error;
      }
    }
  }

  const jobs = await getFallbackJobs();
  return jobs.filter((job) => matchesJobQuery(job, normalizedQuery)).slice(0, normalizedQuery.limit);
}

export async function getJobFacets(): Promise<JobFacets> {
  const prisma = getPrismaClient();

  if (prisma) {
    try {
      const [sources, countries, languages, total] = await Promise.all([
        prisma.jobPosting.groupBy({
          by: ["source"],
          where: ACTIVE_PUBLIC_JOB_WHERE,
          _count: { _all: true }
        }),
        prisma.jobPosting.groupBy({
          by: ["country"],
          where: ACTIVE_PUBLIC_JOB_WHERE,
          _count: { _all: true }
        }),
        prisma.jobPosting.groupBy({
          by: ["language"],
          where: ACTIVE_PUBLIC_JOB_WHERE,
          _count: { _all: true }
        }),
        prisma.jobPosting.count({
          where: ACTIVE_PUBLIC_JOB_WHERE
        })
      ]);

      if (total > 0) {
        return {
          sources: sources
            .map((row) => ({ value: row.source, count: row._count._all }))
            .sort(compareFacetOption),
          countries: countries
            .map((row) => ({ value: row.country, count: row._count._all }))
            .sort(compareFacetOption),
          languages: languages
            .map((row) => ({ value: row.language, count: row._count._all }))
            .sort(compareFacetOption),
          total
        };
      }
    } catch (error) {
      if (!shouldFallbackToSamples(error, "getJobFacets")) {
        throw error;
      }
    }
  }

  const jobs = await getFallbackJobs();
  return buildFallbackFacets(jobs);
}

export async function getJobById(id: string): Promise<JobPosting | undefined> {
  const prisma = getPrismaClient();

  if (prisma) {
    try {
      const job = await prisma.jobPosting.findFirst({
        where: { id, ...ACTIVE_PUBLIC_JOB_WHERE },
        select: PUBLIC_JOB_SELECT
      });

      return job ? toJobPosting(job) : undefined;
    } catch (error) {
      if (!shouldFallbackToSamples(error, "getJobById")) {
        throw error;
      }
    }
  }

  const jobs = await getFallbackJobs();
  return jobs.find((job) => job.id === id);
}
