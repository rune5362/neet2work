import { config } from "dotenv";
import fs from "node:fs/promises";
import { resolve } from "node:path";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type { JobPosting } from "../src/types/job.js";

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
  const jobs = JSON.parse(file) as JobPosting[];

  for (const job of jobs) {
    await prisma.jobPosting.upsert({
      where: {
        id: job.id
      },
      update: {
        title: job.title,
        company: job.company,
        location: job.location,
        careerLevel: job.careerLevel,
        skills: job.skills,
        description: job.description,
        sourceUrl: job.sourceUrl
      },
      create: {
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        careerLevel: job.careerLevel,
        skills: job.skills,
        description: job.description,
        sourceUrl: job.sourceUrl
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
