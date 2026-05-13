import { config } from "dotenv";
import { resolve } from "node:path";
import { defineConfig, env } from "prisma/config";

config({ path: resolve(process.cwd(), "../../.env") });
config({ path: resolve(process.cwd(), ".env"), override: true });

process.env.DATABASE_URL ??= "postgresql://neet2work:neet2work@localhost:5432/neet2work";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts"
  },
  datasource: {
    url: env("DATABASE_URL")
  }
});
