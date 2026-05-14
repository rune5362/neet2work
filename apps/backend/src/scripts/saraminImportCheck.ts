import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type SaraminImportCheckCommand = {
  label: string;
  command: string;
  args: string[];
  cwd: string;
};

export type SaraminImportCheckPlan = {
  outputPath: string;
  commands: SaraminImportCheckCommand[];
};

export type SaraminImportCheckOptions = {
  repoRoot: string;
  outputPath?: string;
  limit?: number;
  delaySeconds?: number;
  pythonCommand?: string;
  tsxCommand?: string;
};

const DEFAULT_OUTPUT_PATH = path.join("tmp", "saramin_import_check.json");

export function buildSaraminImportCheckCommands(
  options: SaraminImportCheckOptions
): SaraminImportCheckPlan {
  const repoRoot = path.resolve(options.repoRoot);
  const outputPath = path.resolve(repoRoot, options.outputPath ?? DEFAULT_OUTPUT_PATH);
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
        label: "Collect Saramin sample",
        command: pythonCommand,
        args: [
          path.join(repoRoot, "scripts", "job_crawler", "saramin.py"),
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
      existsSync(path.join(current, "scripts", "job_crawler", "saramin.py"))
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

export function parseSaraminImportCheckArgs(argv: string[]) {
  const parsed: Omit<SaraminImportCheckOptions, "repoRoot"> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

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

  return parsed;
}

export async function runSaraminImportCheck(options: SaraminImportCheckOptions) {
  const plan = buildSaraminImportCheckCommands(options);

  for (const command of plan.commands) {
    await runCommand(command);
  }

  console.log(`Saramin import check passed: ${plan.outputPath}`);
}

function requireValue(argv: string[], index: number, option: string): string {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value.`);
  }
  return value;
}

function runCommand(command: SaraminImportCheckCommand) {
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
  const options = parseSaraminImportCheckArgs(process.argv.slice(2));
  await runSaraminImportCheck({
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
