import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
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
    sourceUrl: "https://example.com/jobs/1"
  }
];

export async function getJobs(): Promise<JobPosting[]> {
  try {
    const file = await fs.readFile(sampleJobsPath, "utf-8");
    return JSON.parse(file) as JobPosting[];
  } catch {
    return fallbackJobs;
  }
}
