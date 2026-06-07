import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type DatabaseEnv = {
  DATABASE_URL?: string;
  DATABASE_PASSWORD?: string;
};

const databaseDir = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(databaseDir, "../..");
const bundledCertsDir = path.resolve(backendRoot, "certs");

function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function resolveDatabaseUrl(env: DatabaseEnv = process.env): string | undefined {
  const databaseUrl = nonEmpty(env.DATABASE_URL);

  if (!databaseUrl) {
    return undefined;
  }

  const parsedUrl = new URL(databaseUrl);
  normalizeDatabaseCertificatePath(parsedUrl);
  const databasePassword = nonEmpty(env.DATABASE_PASSWORD);

  if (databasePassword) {
    parsedUrl.password = databasePassword;
  }

  return parsedUrl.toString();
}

export function hasDatabaseUrl(env: DatabaseEnv = process.env): boolean {
  return Boolean(resolveDatabaseUrl(env));
}

function normalizeDatabaseCertificatePath(parsedUrl: URL) {
  const configuredPath = parsedUrl.searchParams.get("sslrootcert");

  if (!configuredPath || fs.existsSync(configuredPath)) {
    return;
  }

  const bundledPath = path.resolve(bundledCertsDir, path.basename(configuredPath));
  if (fs.existsSync(bundledPath)) {
    parsedUrl.searchParams.set("sslrootcert", bundledPath);
  }
}
