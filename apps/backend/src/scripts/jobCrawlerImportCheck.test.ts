import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildJobCrawlerImportCheckCommands,
  parseJobCrawlerImportCheckArgs
} from "./jobCrawlerImportCheck.js";

describe("buildJobCrawlerImportCheckCommands", () => {
  it("runs Saramin collection before the JobPosting dry-run import", () => {
    const repoRoot = path.resolve("C:/work/neet2work");

    const plan = buildJobCrawlerImportCheckCommands({
      repoRoot,
      source: "saramin",
      pythonCommand: "python",
      tsxCommand: "tsx"
    });

    expect(plan.outputPath).toBe(path.join(repoRoot, "tmp", "saramin_import_check.json"));
    expect(plan.commands).toEqual([
      {
        label: "Collect saramin sample",
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

  it("maps JobKorea to its source collector", () => {
    const repoRoot = path.resolve("C:/work/neet2work");

    const plan = buildJobCrawlerImportCheckCommands({
      repoRoot,
      source: "jobkorea",
      limit: 3,
      delaySeconds: 0,
      pythonCommand: "py",
      tsxCommand: "tsx"
    });

    expect(plan.outputPath).toBe(path.join(repoRoot, "tmp", "jobkorea_import_check.json"));
    expect(plan.commands[0]).toMatchObject({
      label: "Collect jobkorea sample",
      command: "py",
      cwd: repoRoot
    });
    expect(plan.commands[0]?.args).toEqual([
      path.join(repoRoot, "scripts", "job_crawler", "jobkorea.py"),
      "--limit",
      "3",
      "--delay-seconds",
      "0",
      "--output",
      path.join(repoRoot, "tmp", "jobkorea_import_check.json")
    ]);
  });

  it("maps Linkareer to its source collector", () => {
    const repoRoot = path.resolve("C:/work/neet2work");

    const plan = buildJobCrawlerImportCheckCommands({
      repoRoot,
      source: "linkareer",
      pythonCommand: "python",
      tsxCommand: "tsx"
    });

    expect(plan.outputPath).toBe(path.join(repoRoot, "tmp", "linkareer_import_check.json"));
    expect(plan.commands[0]?.args[0]).toBe(
      path.join(repoRoot, "scripts", "job_crawler", "linkareer.py")
    );
  });

  it("maps Mynavi Tenshoku to its source collector", () => {
    const repoRoot = path.resolve("C:/work/neet2work");

    const plan = buildJobCrawlerImportCheckCommands({
      repoRoot,
      source: "mynavi_tenshoku",
      pythonCommand: "python",
      tsxCommand: "tsx"
    });

    expect(plan.outputPath).toBe(path.join(repoRoot, "tmp", "mynavi_tenshoku_import_check.json"));
    expect(plan.commands[0]?.args[0]).toBe(
      path.join(repoRoot, "scripts", "job_crawler", "mynavi_tenshoku.py")
    );
  });

  it("maps Daijob to its source collector", () => {
    const repoRoot = path.resolve("C:/work/neet2work");

    const plan = buildJobCrawlerImportCheckCommands({
      repoRoot,
      source: "daijob",
      pythonCommand: "python",
      tsxCommand: "tsx"
    });

    expect(plan.outputPath).toBe(path.join(repoRoot, "tmp", "daijob_import_check.json"));
    expect(plan.commands[0]?.args[0]).toBe(
      path.join(repoRoot, "scripts", "job_crawler", "daijob.py")
    );
  });

  it("maps CareerCross to its source collector", () => {
    const repoRoot = path.resolve("C:/work/neet2work");

    const plan = buildJobCrawlerImportCheckCommands({
      repoRoot,
      source: "careercross",
      pythonCommand: "python",
      tsxCommand: "tsx"
    });

    expect(plan.outputPath).toBe(path.join(repoRoot, "tmp", "careercross_import_check.json"));
    expect(plan.commands[0]?.args[0]).toBe(
      path.join(repoRoot, "scripts", "job_crawler", "careercross.py")
    );
  });

  it("maps Green Japan to its source collector", () => {
    const repoRoot = path.resolve("C:/work/neet2work");

    const plan = buildJobCrawlerImportCheckCommands({
      repoRoot,
      source: "green_japan",
      pythonCommand: "python",
      tsxCommand: "tsx"
    });

    expect(plan.outputPath).toBe(path.join(repoRoot, "tmp", "green_japan_import_check.json"));
    expect(plan.commands[0]?.args[0]).toBe(
      path.join(repoRoot, "scripts", "job_crawler", "green_japan.py")
    );
  });

  it("uses the repository-local tsx CLI when no command override is provided", () => {
    const repoRoot = path.resolve("C:/work/neet2work");

    const plan = buildJobCrawlerImportCheckCommands({ repoRoot, source: "jobkorea" });

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

describe("parseJobCrawlerImportCheckArgs", () => {
  it("rejects unsupported sources before command execution", () => {
    expect(() => parseJobCrawlerImportCheckArgs(["--source", "korec"])).toThrow(
      "Unsupported source: korec"
    );
  });
});
