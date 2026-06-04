import path from "node:path";
import fs from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  GREEN_MATRIX_SOURCES,
  JobCrawlerMatrixCheckError,
  parseJobCrawlerMatrixCheckArgs,
  runJobCrawlerMatrixCheck
} from "./jobCrawlerMatrixCheck.js";

describe("GREEN_MATRIX_SOURCES", () => {
  it("contains only sources with verified GREEN collectors", () => {
    expect(GREEN_MATRIX_SOURCES).toEqual([
      "saramin",
      "jobkorea",
      "linkareer",
      "mynavi_tenshoku",
      "daijob",
      "careercross",
      "green_japan"
    ]);
    expect(GREEN_MATRIX_SOURCES).not.toContain("catch");
    expect(GREEN_MATRIX_SOURCES).not.toContain("jobplanet");
    expect(GREEN_MATRIX_SOURCES).not.toContain("indeed_kr");
    expect(GREEN_MATRIX_SOURCES).not.toContain("korec");
    expect(GREEN_MATRIX_SOURCES).not.toContain("doda");
    expect(GREEN_MATRIX_SOURCES).not.toContain("rikunabi_next");
  });
});

describe("parseJobCrawlerMatrixCheckArgs", () => {
  it("parses continue-on-fail mode", () => {
    expect(parseJobCrawlerMatrixCheckArgs(["--continue-on-fail"])).toEqual({
      continueOnFail: true
    });
  });

  it("parses a matrix report output path", () => {
    expect(parseJobCrawlerMatrixCheckArgs(["--output", "tmp/job-crawler-matrix/latest.json"])).toEqual({
      continueOnFail: false,
      outputPath: "tmp/job-crawler-matrix/latest.json"
    });
  });

  it("rejects unknown flags", () => {
    expect(() => parseJobCrawlerMatrixCheckArgs(["--source", "korec"])).toThrow(
      "Unknown argument: --source"
    );
  });
});

describe("runJobCrawlerMatrixCheck", () => {
  it("stops on the first failed source by default", async () => {
    const visited: string[] = [];

    await expect(
      runJobCrawlerMatrixCheck({
        repoRoot: path.resolve("C:/work/neet2work"),
        sources: ["saramin", "jobkorea", "linkareer"],
        runSource: async (source) => {
          visited.push(source);
          if (source === "jobkorea") {
            throw new Error("sample failed");
          }
        }
      })
    ).rejects.toBeInstanceOf(JobCrawlerMatrixCheckError);

    expect(visited).toEqual(["saramin", "jobkorea"]);
  });

  it("continues after failures when requested", async () => {
    const results = await runJobCrawlerMatrixCheck({
      repoRoot: path.resolve("C:/work/neet2work"),
      continueOnFail: true,
      sources: ["saramin", "jobkorea"],
      runSource: async (source) => {
        if (source === "saramin") {
          throw new Error("network failed");
        }
      }
    });

    expect(results).toEqual([
      { source: "saramin", ok: false, error: "network failed" },
      { source: "jobkorea", ok: true }
    ]);
  });

  it("writes one latest evidence report and overwrites it on the next run", async () => {
    const outputDir = path.resolve("tmp", "job-crawler-matrix-test", `case-${Date.now()}`);
    const outputPath = path.join(outputDir, "latest.json");

    try {
      await runJobCrawlerMatrixCheck({
        repoRoot: path.resolve("C:/work/neet2work"),
        outputPath,
        generatedAt: new Date("2026-05-20T01:00:00.000Z"),
        sources: ["saramin"],
        runSource: async () => undefined
      });

      await runJobCrawlerMatrixCheck({
        repoRoot: path.resolve("C:/work/neet2work"),
        continueOnFail: true,
        outputPath,
        generatedAt: new Date("2026-05-20T02:00:00.000Z"),
        sources: ["jobkorea"],
        runSource: async () => {
          throw new Error("network failed");
        }
      });

      const files = await fs.readdir(outputDir);
      const report = JSON.parse(await fs.readFile(outputPath, "utf-8")) as unknown;

      expect(files).toEqual(["latest.json"]);
      expect(report).toEqual({
        schemaVersion: "job_crawler_matrix_report_v1",
        generatedAt: "2026-05-20T02:00:00.000Z",
        summary: {
          total: 1,
          passed: 0,
          failed: 1
        },
        results: [{ source: "jobkorea", ok: false, error: "network failed" }]
      });
    } finally {
      await fs.rm(outputDir, { recursive: true, force: true });
    }
  });
});
