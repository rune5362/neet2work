import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

let pool: Pool | null = null;
let prisma: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient | null {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
  }

  if (!prisma) {
    prisma = new PrismaClient({
      adapter: new PrismaPg(pool)
    });
  }

  return prisma;
}

export async function disconnectPrismaClient() {
  await prisma?.$disconnect();
  await pool?.end();
  prisma = null;
  pool = null;
}
