import { copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = resolve(import.meta.dirname, "..");
const examplePath = resolve(rootDir, ".env.example");
const envPath = resolve(rootDir, ".env");

if (!existsSync(examplePath)) {
  console.error(".env.example 파일을 찾을 수 없습니다.");
  process.exit(1);
}

if (existsSync(envPath)) {
  console.log(".env 파일이 이미 있어 그대로 유지합니다.");
  process.exit(0);
}

copyFileSync(examplePath, envPath);
console.log(".env.example을 기준으로 .env 파일을 생성했습니다.");
