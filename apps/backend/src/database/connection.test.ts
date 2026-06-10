import { describe, expect, it } from "vitest";
import { hasDatabaseUrl, resolveDatabaseUrl } from "./connection.js";

describe("resolveDatabaseUrl", () => {
  it("returns undefined when DATABASE_URL is missing", () => {
    expect(resolveDatabaseUrl({})).toBeUndefined();
    expect(hasDatabaseUrl({})).toBe(false);
  });

  it("keeps a full DATABASE_URL usable without a separate password", () => {
    const databaseUrl =
      "postgresql://user:password@example.com:5432/postgres?sslmode=verify-full";

    expect(resolveDatabaseUrl({ DATABASE_URL: databaseUrl })).toBe(databaseUrl);
    expect(hasDatabaseUrl({ DATABASE_URL: databaseUrl })).toBe(true);
  });

  it("injects DATABASE_PASSWORD into a passwordless DATABASE_URL", () => {
    const resolved = resolveDatabaseUrl({
      DATABASE_URL:
        "postgresql://postgres.ref@example.pooler.supabase.com:5432/postgres?sslmode=verify-full",
      DATABASE_PASSWORD: "pa:ss@word"
    });

    expect(resolved).toBe(
      "postgresql://postgres.ref:pa%3Ass%40word@example.pooler.supabase.com:5432/postgres?sslmode=verify-full"
    );
  });

  it("rewrites a stale sslrootcert path to the bundled backend certificate when available", () => {
    const resolved = resolveDatabaseUrl({
      DATABASE_URL:
        "postgresql://user:password@example.com:5432/postgres?sslmode=verify-full&sslrootcert=C:\\old\\neet2work\\apps\\backend\\certs\\prod-ca-2021.crt"
    });

    expect(resolved).toBeDefined();
    const parsed = new URL(resolved ?? "");
    const resolvedCertPath = parsed.searchParams.get("sslrootcert") ?? "";
    expect(resolvedCertPath.replaceAll("\\", "/")).toMatch(
      /apps\/backend\/certs\/prod-ca-2021\.crt$/
    );
    expect(resolvedCertPath).not.toContain("C:\\old\\neet2work");
  });
});
