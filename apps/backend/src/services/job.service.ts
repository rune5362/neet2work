import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPrismaClient } from "../database/prisma.js";
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

export async function getJobs(): Promise<JobPosting[]> {
  const prisma = getPrismaClient();

  if (prisma) {
    try {
      const jobs = await prisma.jobPosting.findMany({
        select: PUBLIC_JOB_SELECT,
        orderBy: [{ collectedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
        take: 50
      });

      if (jobs.length > 0) {
        return jobs.map(toJobPosting);
      }
    } catch {
      // Keep the mock-first demo path alive when the local DB is missing or unmigrated.
    }
  }

  try {
    const file = await fs.readFile(sampleJobsPath, "utf-8");
    return JSON.parse(file) as JobPosting[];
  } catch {
    return fallbackJobs;
  }
}
