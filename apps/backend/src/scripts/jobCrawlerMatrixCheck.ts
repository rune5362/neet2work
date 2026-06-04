import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  type JobCrawlerSource,
  findRepoRoot,
  runJobCrawlerImportCheck
} from "./jobCrawlerImportCheck.js";

export const GREEN_MATRIX_SOURCES: JobCrawlerSource[] = [
  "saramin",
  "jobkorea",
  "linkareer",
  "mynavi_tenshoku",
  "daijob",
  "careercross",
  "green_japan"
];

export type JobCrawlerMatrixResult = {
  source: JobCrawlerSource;
  ok: boolean;
  error?: string;
};

export type JobCrawlerMatrixReport = {
  schemaVersion: "job_crawler_matrix_report_v1";
  generatedAt: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
  results: JobCrawlerMatrixResult[];
};

export type JobCrawlerMatrixCheckOptions = {
  repoRoot: string;
  continueOnFail?: boolean;
  outputPath?: string;
  generatedAt?: Date;
  sources?: JobCrawlerSource[];
  runSource?: (source: JobCrawlerSource) => Promise<void>;
};

export class JobCrawlerMatrixCheckError extends Error {
  constructor(public readonly results: JobCrawlerMatrixResult[]) {
    super("Job crawler matrix check failed.");
  }
}

function defaultMatrixReportPath(repoRoot: string) {
  return path.join(repoRoot, "tmp", "job-crawler-matrix", "latest.json");
}

export function parseJobCrawlerMatrixCheckArgs(argv: string[]) {
  const parsed: {
    continueOnFail: boolean;
    outputPath?: string;
  } = {
    continueOnFail: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--continue-on-fail") {
      parsed.continueOnFail = true;
      continue;
    }

    if (arg === "--output") {
      parsed.outputPath = requireValue(argv, index, arg);
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return parsed;
}

function buildJobCrawlerMatrixReport(
  results: JobCrawlerMatrixResult[],
  generatedAt = new Date()
): JobCrawlerMatrixReport {
  const failed = results.filter((result) => !result.ok).length;

  return {
    schemaVersion: "job_crawler_matrix_report_v1",
    generatedAt: generatedAt.toISOString(),
    summary: {
      total: results.length,
      passed: results.length - failed,
      failed
    },
    results
  };
}

async function writeJobCrawlerMatrixReport(
  outputPath: string,
  report: JobCrawlerMatrixReport
) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf-8");
}

function requireValue(argv: string[], index: number, option: string) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value.`);
  }
  return value;
}

export async function runJobCrawlerMatrixCheck(options: JobCrawlerMatrixCheckOptions) {
  const sources = options.sources ?? GREEN_MATRIX_SOURCES;
  const runSource =
    options.runSource ??
    ((source: JobCrawlerSource) =>
      runJobCrawlerImportCheck({
        repoRoot: options.repoRoot,
        source
      }));
  const results: JobCrawlerMatrixResult[] = [];
  let stoppedEarly: JobCrawlerMatrixCheckError | undefined;

  for (const source of sources) {
    try {
      await runSource(source);
      results.push({ source, ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ source, ok: false, error: message });

      if (!options.continueOnFail) {
        stoppedEarly = new JobCrawlerMatrixCheckError(results);
        break;
      }
    }
  }

  if (options.outputPath) {
    await writeJobCrawlerMatrixReport(
      options.outputPath,
      buildJobCrawlerMatrixReport(results, options.generatedAt)
    );
  }

  if (stoppedEarly) {
    throw stoppedEarly;
  }

  return results;
}

async function main() {
  const repoRoot = findRepoRoot();
  const options = parseJobCrawlerMatrixCheckArgs(process.argv.slice(2));
  const outputPath = options.outputPath
    ? path.resolve(repoRoot, options.outputPath)
    : defaultMatrixReportPath(repoRoot);
  const results = await runJobCrawlerMatrixCheck({
    repoRoot,
    ...options,
    outputPath
  });
  const failed = results.filter((result) => !result.ok);

  console.log(`Job crawler matrix checked: ${results.length} sources`);
  console.log(`Job crawler matrix report: ${outputPath}`);

  if (failed.length > 0) {
    console.error(`Job crawler matrix failed: ${failed.length} sources`);
    process.exitCode = 1;
  }
}

const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (entryPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    if (error instanceof JobCrawlerMatrixCheckError) {
      console.error(error.message);
      for (const result of error.results) {
        console.error(`${result.source}: ${result.ok ? "ok" : result.error}`);
      }
    } else {
      console.error(error);
    }
    process.exitCode = 1;
  });
}
