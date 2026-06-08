import { mkdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";

for (const directory of [
  "docs/generated/api-html",
  "docs/generated/api-md",
  "docs/generated/classes",
  "docs/generated/database",
  "docs/generated/dependencies",
  "docs/generated/diagrams"
]) {
  mkdirSync(path.join(process.cwd(), directory), { recursive: true });
}
