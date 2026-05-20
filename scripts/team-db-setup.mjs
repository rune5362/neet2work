import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = resolve(import.meta.dirname, "..");
const envPath = resolve(rootDir, ".env");

function parseEnvFile(source) {
  const values = new Map();

  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const equalsIndex = trimmed.indexOf("=");

    if (equalsIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, equalsIndex).trim();
    const rawValue = trimmed.slice(equalsIndex + 1).trim();
    const value = rawValue.replace(/^(['"])(.*)\1$/, "$2");
    values.set(key, value);
  }

  return values;
}

function fail(message) {
  console.error(`\n${message}`);
  process.exit(1);
}

function getPnpmRunCommand(scriptName) {
  if (process.platform === "win32") {
    return {
      executable: process.env.ComSpec || "cmd.exe",
      args: ["/d", "/s", "/c", `corepack pnpm run ${scriptName}`]
    };
  }

  return {
    executable: "corepack",
    args: ["pnpm", "run", scriptName]
  };
}

function runPnpmScript(scriptName, label) {
  const { executable, args } = getPnpmRunCommand(scriptName);

  console.log(`\n[team:db:setup] ${label}`);

  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(executable, args, {
      cwd: rootDir,
      stdio: "inherit"
    });

    child.on("error", rejectRun);
    child.on("exit", (code) => {
      if (code === 0) {
        resolveRun();
        return;
      }

      rejectRun(new Error(`${scriptName} failed with exit code ${code ?? "unknown"}`));
    });
  });
}

if (!existsSync(envPath)) {
  fail(".env 파일이 없습니다. 먼저 `corepack pnpm run setup:env`를 실행한 뒤 DATABASE_URL을 입력하세요.");
}

const envValues = parseEnvFile(readFileSync(envPath, "utf-8"));
const databaseUrl = envValues.get("DATABASE_URL")?.trim();

if (!databaseUrl) {
  fail(".env의 DATABASE_URL이 비어 있습니다. 팀원 개인 PostgreSQL DB URL을 입력한 뒤 다시 실행하세요.");
}

console.log("[team:db:setup] .env에서 DATABASE_URL을 확인했습니다. 실제 URL과 비밀번호는 출력하지 않습니다.");

try {
  await runPnpmScript("db:generate", "Prisma Client 생성");
  await runPnpmScript("db:deploy", "개인 DB에 migration 적용");
  await runPnpmScript("db:seed", "개인 DB에 seed 입력");
  console.log("\n[team:db:setup] 완료: 개인 DB schema와 seed가 적용되었습니다.");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  fail(`[team:db:setup] 실패: ${message}`);
}
