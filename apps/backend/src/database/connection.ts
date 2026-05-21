type DatabaseEnv = {
  DATABASE_URL?: string;
  DATABASE_PASSWORD?: string;
};

function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function resolveDatabaseUrl(env: DatabaseEnv = process.env): string | undefined {
  const databaseUrl = nonEmpty(env.DATABASE_URL);

  if (!databaseUrl) {
    return undefined;
  }

  const databasePassword = nonEmpty(env.DATABASE_PASSWORD);

  if (!databasePassword) {
    return databaseUrl;
  }

  const parsedUrl = new URL(databaseUrl);
  parsedUrl.password = databasePassword;
  return parsedUrl.toString();
}

export function hasDatabaseUrl(env: DatabaseEnv = process.env): boolean {
  return Boolean(resolveDatabaseUrl(env));
}
