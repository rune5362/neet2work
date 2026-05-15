import { Pool } from "pg";

let pool: Pool | null = null;

export type PostgresStatus = "not_configured" | "connected" | "unavailable";

export type PostgresHealth = {
  status: PostgresStatus;
  error?: {
    code?: string;
    message: string;
  };
};

export function getPostgresPool(): Pool | null {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  pool ??= new Pool({
    connectionString: process.env.DATABASE_URL
  });

  return pool;
}

export async function checkPostgresConnection(): Promise<PostgresHealth> {
  const currentPool = getPostgresPool();

  if (!currentPool) {
    return {
      status: "not_configured"
    };
  }

  try {
    await currentPool.query("select 1");
    return {
      status: "connected"
    };
  } catch (error) {
    return {
      status: "unavailable",
      error: normalizePostgresError(error)
    };
  }
}

function normalizePostgresError(error: unknown): PostgresHealth["error"] {
  if (error instanceof Error) {
    const maybeCode = "code" in error ? String(error.code) : undefined;

    return {
      code: maybeCode,
      message: error.message
    };
  }

  return {
    message: "Unknown PostgreSQL connection error"
  };
}
