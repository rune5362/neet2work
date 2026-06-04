import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildSaraminImportCheckCommands } from "./saraminImportCheck.js";

describe("buildSaraminImportCheckCommands", () => {
  it("runs Saramin collection before the JobPosting dry-run import", () => {
    const repoRoot = path.resolve("C:/work/neet2work");

    const plan = buildSaraminImportCheckCommands({
      repoRoot,
      pythonCommand: "python",
      tsxCommand: "tsx"
    });

    expect(plan.outputPath).toBe(path.join(repoRoot, "tmp", "saramin_import_check.json"));
    expect(plan.commands).toEqual([
      {
        label: "Collect Saramin sample",
        command: "python",
        args: [
          path.join(repoRoot, "scripts", "job_crawler", "saramin.py"),
          "--limit",
          "1",
          "--delay-seconds",
          "1",
          "--output",
          path.join(repoRoot, "tmp", "saramin_import_check.json")
        ],
        cwd: repoRoot
      },
      {
        label: "Validate JobPosting import payload",
        command: "tsx",
        args: [
          path.join(repoRoot, "apps", "backend", "prisma", "importJobPostings.ts"),
          "--dry-run",
          path.join(repoRoot, "tmp", "saramin_import_check.json")
        ],
        cwd: repoRoot
      }
    ]);
  });

  it("allows a custom output path and sample size", () => {
    const repoRoot = path.resolve("C:/work/neet2work");
    const outputPath = path.join(repoRoot, "tmp", "custom-saramin.json");

    const plan = buildSaraminImportCheckCommands({
      repoRoot,
      outputPath,
      limit: 3,
      delaySeconds: 0,
      pythonCommand: "py",
      tsxCommand: "tsx"
    });

    expect(plan.outputPath).toBe(outputPath);
    expect(plan.commands[0]?.args).toContain("3");
    expect(plan.commands[0]?.args).toContain("0");
    expect(plan.commands[1]?.args.at(-1)).toBe(outputPath);
  });

  it("uses the repository-local tsx CLI when no command override is provided", () => {
    const repoRoot = path.resolve("C:/work/neet2work");

    const plan = buildSaraminImportCheckCommands({ repoRoot });

    expect(plan.commands[1]).toMatchObject({
      label: "Validate JobPosting import payload",
      command: process.execPath,
      cwd: repoRoot
    });
    expect(plan.commands[1]?.args[0]).toBe(
      path.join(repoRoot, "node_modules", "tsx", "dist", "cli.mjs")
    );
  });
});
