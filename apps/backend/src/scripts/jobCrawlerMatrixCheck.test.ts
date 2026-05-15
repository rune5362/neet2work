import path from "node:path";
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
});
