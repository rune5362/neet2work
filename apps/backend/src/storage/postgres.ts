import { Pool } from "pg";
import { resolveDatabaseUrl } from "../database/connection.js";

let pool: Pool | null = null;

export type PostgresStatus = "not_configured" | "connected" | "unavailable";

export function getPostgresPool(): Pool | null {
  const connectionString = resolveDatabaseUrl();

  if (!connectionString) {
    return null;
  }

  pool ??= new Pool({
    connectionString
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
