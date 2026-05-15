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

export type JobCrawlerMatrixCheckOptions = {
  repoRoot: string;
  continueOnFail?: boolean;
  sources?: JobCrawlerSource[];
  runSource?: (source: JobCrawlerSource) => Promise<void>;
};

export class JobCrawlerMatrixCheckError extends Error {
  constructor(public readonly results: JobCrawlerMatrixResult[]) {
    super("Job crawler matrix check failed.");
  }
}

export function parseJobCrawlerMatrixCheckArgs(argv: string[]) {
  const parsed = {
    continueOnFail: false
  };

  for (const arg of argv) {
    if (arg === "--continue-on-fail") {
      parsed.continueOnFail = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return parsed;
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

  for (const source of sources) {
    try {
      await runSource(source);
      results.push({ source, ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ source, ok: false, error: message });

      if (!options.continueOnFail) {
        throw new JobCrawlerMatrixCheckError(results);
      }
    }
  }

  return results;
}

async function main() {
  const repoRoot = findRepoRoot();
  const options = parseJobCrawlerMatrixCheckArgs(process.argv.slice(2));
  const results = await runJobCrawlerMatrixCheck({
    repoRoot,
    ...options
  });
  const failed = results.filter((result) => !result.ok);

  console.log(`Job crawler matrix checked: ${results.length} sources`);

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
