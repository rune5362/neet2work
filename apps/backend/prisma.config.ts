import { config } from "dotenv";
import { resolve } from "node:path";
import { defineConfig, env } from "prisma/config";

config({ path: resolve(process.cwd(), "../../.env") });
config({ path: resolve(process.cwd(), ".env"), override: true });

function resolveDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const databasePassword = process.env.DATABASE_PASSWORD?.trim();

  if (!databaseUrl || !databasePassword) {
    return databaseUrl;
  }

  const parsedUrl = new URL(databaseUrl);
  parsedUrl.password = databasePassword;
  return parsedUrl.toString();
}

const databaseUrl = resolveDatabaseUrl();
// `prisma generate` does not connect to the database, but Prisma 7 still
// resolves datasource env vars while loading config.
const usesGeneratePlaceholder =
  !databaseUrl && process.argv.some((argument) => argument === "generate");

if (databaseUrl) {
  process.env.DATABASE_URL = databaseUrl;
} else if (usesGeneratePlaceholder) {
  process.env.DATABASE_URL = "postgresql://neet2work:neet2work@localhost:5432/neet2work";
}

export default defineConfig({
  schema: "prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts"
  },
  datasource: {
    url: env("DATABASE_URL")
  }
});
