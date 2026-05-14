import { config } from "dotenv";
import fs from "node:fs/promises";
import { resolve } from "node:path";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import type { CollectedJobPosting } from "../src/types/job.js";

config({ path: resolve(process.cwd(), "../../.env") });
config({ path: resolve(process.cwd(), ".env"), override: true });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL이 없어 Prisma seed를 실행할 수 없습니다.");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const sampleJobsPath = resolve(process.cwd(), "data/sampleJobs.json");
  const file = await fs.readFile(sampleJobsPath, "utf-8");
  const jobs = JSON.parse(file) as CollectedJobPosting[];

  for (const job of jobs) {
    const jobData = {
      title: job.title,
      company: job.company,
      location: job.location,
      careerLevel: job.careerLevel,
      skills: job.skills,
      description: job.description,
      source: job.source ?? "sample",
      sourceJobId: job.sourceJobId ?? job.id,
      sourceUrl: job.sourceUrl,
      country: job.country ?? "KR",
      language: job.language ?? "ko",
      employmentType: job.employmentType,
      educationLevel: job.educationLevel,
      salaryText: job.salaryText,
      deadlineText: job.deadlineText,
      applyMethod: job.applyMethod,
      companyInfo: job.companyInfo,
      rawText: job.rawText,
      rawJson: job.rawJson,
      collectedAt: job.collectedAt ? new Date(job.collectedAt) : undefined
    };

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

  console.log(`Seed completed: ${jobs.length} job postings`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
