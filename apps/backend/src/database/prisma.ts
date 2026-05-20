import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { resolveDatabaseUrl } from "./connection.js";

let pool: Pool | null = null;
let prisma: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient | null {
  const connectionString = resolveDatabaseUrl();

  if (!connectionString) {
    return null;
  }

  if (!pool) {
    pool = new Pool({
      connectionString
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
