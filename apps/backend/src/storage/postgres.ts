import { Pool } from "pg";

let pool: Pool | null = null;

export type PostgresStatus = "not_configured" | "connected" | "unavailable";

export function getPostgresPool(): Pool | null {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  pool ??= new Pool({
    connectionString: process.env.DATABASE_URL
  });

  return pool;
}

export async function checkPostgresConnection(): Promise<PostgresStatus> {
  const currentPool = getPostgresPool();

  if (!currentPool) {
    return "not_configured";
  }

  try {
    await currentPool.query("select 1");
    return "connected";
  } catch {
    return "unavailable";
  }
}
