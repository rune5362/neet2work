import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type JobCrawlerSource =
  | "saramin"
  | "jobkorea"
  | "linkareer"
  | "mynavi_tenshoku"
  | "daijob"
  | "careercross"
  | "green_japan";

export type JobCrawlerImportCheckCommand = {
  label: string;
  command: string;
  args: string[];
  cwd: string;
};

export type JobCrawlerImportCheckPlan = {
  outputPath: string;
  commands: JobCrawlerImportCheckCommand[];
};

export type JobCrawlerImportCheckOptions = {
  repoRoot: string;
  source: JobCrawlerSource;
  outputPath?: string;
  limit?: number;
  delaySeconds?: number;
  pythonCommand?: string;
  tsxCommand?: string;
};

const SUPPORTED_SOURCES: Record<JobCrawlerSource, string> = {
  saramin: path.join("scripts", "job_crawler", "saramin.py"),
  jobkorea: path.join("scripts", "job_crawler", "jobkorea.py"),
  linkareer: path.join("scripts", "job_crawler", "linkareer.py"),
  mynavi_tenshoku: path.join("scripts", "job_crawler", "mynavi_tenshoku.py"),
  daijob: path.join("scripts", "job_crawler", "daijob.py"),
  careercross: path.join("scripts", "job_crawler", "careercross.py"),
  green_japan: path.join("scripts", "job_crawler", "green_japan.py")
};

export function buildJobCrawlerImportCheckCommands(
  options: JobCrawlerImportCheckOptions
): JobCrawlerImportCheckPlan {
  const repoRoot = path.resolve(options.repoRoot);
  const sourceScript = SUPPORTED_SOURCES[options.source];
  const outputPath = path.resolve(
    repoRoot,
    options.outputPath ?? path.join("tmp", `${options.source}_import_check.json`)
  );
  const limit = options.limit ?? 1;
  const delaySeconds = options.delaySeconds ?? 1;
  const pythonCommand = options.pythonCommand ?? process.env.PYTHON ?? "python";
  const tsxCommand = options.tsxCommand ?? process.execPath;
  const tsxArgs = options.tsxCommand
    ? []
    : [path.join(repoRoot, "node_modules", "tsx", "dist", "cli.mjs")];

  return {
    outputPath,
    commands: [
      {
        label: `Collect ${options.source} sample`,
        command: pythonCommand,
        args: [
          path.join(repoRoot, sourceScript),
          "--limit",
          String(limit),
          "--delay-seconds",
          String(delaySeconds),
          "--output",
          outputPath
        ],
        cwd: repoRoot
      },
      {
        label: "Validate JobPosting import payload",
        command: tsxCommand,
        args: [
          ...tsxArgs,
          path.join(repoRoot, "apps", "backend", "prisma", "importJobPostings.ts"),
          "--dry-run",
          outputPath
        ],
        cwd: repoRoot
      }
    ]
  };
}

export function findRepoRoot(startDir = process.cwd()): string {
  let current = path.resolve(startDir);

  while (true) {
    if (
      existsSync(path.join(current, "package.json")) &&
      existsSync(path.join(current, "scripts", "job_crawler", "models.py"))
    ) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error("Could not find neet2work repository root.");
    }
    current = parent;
  }
}

export function parseJobCrawlerImportCheckArgs(argv: string[]) {
  const parsed: Partial<Omit<JobCrawlerImportCheckOptions, "repoRoot">> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--source") {
      const source = requireValue(argv, index, arg);
      if (!isSupportedSource(source)) {
        throw new Error(`Unsupported source: ${source}`);
      }
      parsed.source = source;
      index += 1;
      continue;
    }

    if (arg === "--output") {
      parsed.outputPath = requireValue(argv, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--limit") {
      parsed.limit = Number.parseInt(requireValue(argv, index, arg), 10);
      index += 1;
      continue;
    }

    if (arg === "--delay-seconds") {
      parsed.delaySeconds = Number.parseFloat(requireValue(argv, index, arg));
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!parsed.source) {
    throw new Error("--source is required.");
  }

  return parsed as Omit<JobCrawlerImportCheckOptions, "repoRoot">;
}

export async function runJobCrawlerImportCheck(options: JobCrawlerImportCheckOptions) {
  const plan = buildJobCrawlerImportCheckCommands(options);

  for (const command of plan.commands) {
    await runCommand(command);
  }

  console.log(`${options.source} import check passed: ${plan.outputPath}`);
}

function isSupportedSource(value: string): value is JobCrawlerSource {
  return Object.hasOwn(SUPPORTED_SOURCES, value);
}

function requireValue(argv: string[], index: number, option: string): string {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value.`);
  }
  return value;
}

function runCommand(command: JobCrawlerImportCheckCommand) {
  console.log(`\n> ${command.label}`);
  console.log(`${command.command} ${command.args.join(" ")}`);

  return new Promise<void>((resolve, reject) => {
    const child = spawn(command.command, command.args, {
      cwd: command.cwd,
      env: {
        ...process.env,
        PYTHONIOENCODING: "utf-8"
      },
      stdio: "inherit"
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command.label} failed with exit code ${code}.`));
    });
  });
}

async function main() {
  const repoRoot = findRepoRoot();
  const options = parseJobCrawlerImportCheckArgs(process.argv.slice(2));
  await runJobCrawlerImportCheck({
    repoRoot,
    ...options
  });
}

const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (entryPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
