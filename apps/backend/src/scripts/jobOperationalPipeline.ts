import path from "node:path";
import { fileURLToPath } from "node:url";
import { findRepoRoot, type JobCrawlerSource } from "./jobCrawlerImportCheck.js";

export type JobOperationalSource = Extract<
  JobCrawlerSource,
  | "saramin"
  | "jobkorea"
  | "linkareer"
  | "mynavi_tenshoku"
  | "daijob"
  | "careercross"
  | "green_japan"
>;
export type JobOperationalPipelineMode = "review" | "apply";
export type JobOperationalPipelineStageId =
  | "collect_batch"
  | "import_dry_run"
  | "import_sql_artifact"
  | "import_apply"
  | "lifecycle_snapshot"
  | "lifecycle_plan"
  | "lifecycle_sql_artifact"
  | "lifecycle_apply";
export type JobOperationalPipelineRunner = "shell" | "supabase_plugin";
export type JobOperationalPipelineStageStatus = "implemented" | "external" | "stub";

export type JobOperationalPipelineStage = {
  id: JobOperationalPipelineStageId;
  label: string;
  runner: JobOperationalPipelineRunner;
  status: JobOperationalPipelineStageStatus;
  writesDb: boolean;
  requiresApproval: boolean;
  command?: string;
  args?: string[];
  cwd?: string;
  inputPaths?: string[];
  outputPaths?: string[];
  notes?: string[];
};

export type JobOperationalPipelinePlan = {
  schemaVersion: "job_operational_pipeline_v1";
  source: JobOperationalSource;
  mode: JobOperationalPipelineMode;
  executionPolicy: "plan_only_no_db_writes" | "approval_gated_db_writes";
  artifacts: {
    batchReviewPath: string;
    importApplySqlPath: string;
    lifecycleSnapshotPath: string;
    lifecycleReportPath: string;
    lifecycleApplySqlPath: string;
  };
  stages: JobOperationalPipelineStage[];
};

export type JobOperationalPipelineOptions = {
  repoRoot: string;
  source: JobOperationalSource;
  mode?: JobOperationalPipelineMode;
  limit?: number;
  delaySeconds?: number;
  sourceCap?: number;
  inactiveThreshold?: number;
  pythonCommand?: string;
  tsxCommand?: string;
};

export type JobOperationalPipelineArgs = {
  source: JobOperationalSource;
  mode: JobOperationalPipelineMode;
};

const OPERATIONAL_SOURCES: Record<JobOperationalSource, true> = {
  saramin: true,
  jobkorea: true,
  linkareer: true,
  mynavi_tenshoku: true,
  daijob: true,
  careercross: true,
  green_japan: true
};
const RUNNER_SCRIPT = path.join("scripts", "job_crawler", "run_source.py");
const DEFAULT_LIMIT = 50;
const DEFAULT_DELAY_SECONDS = 1;
const DEFAULT_SOURCE_CAP = 20;
const DEFAULT_INACTIVE_THRESHOLD = 3;

export function buildJobOperationalPipelinePlan(
  options: JobOperationalPipelineOptions
): JobOperationalPipelinePlan {
  if (!isOperationalSource(options.source)) {
    throw new Error(`Unsupported operational source: ${options.source}`);
  }

  const repoRoot = path.resolve(options.repoRoot);
  const mode = options.mode ?? "review";
  const limit = options.limit ?? DEFAULT_LIMIT;
  const delaySeconds = options.delaySeconds ?? DEFAULT_DELAY_SECONDS;
  const sourceCap = options.sourceCap ?? DEFAULT_SOURCE_CAP;
  const inactiveThreshold = options.inactiveThreshold ?? DEFAULT_INACTIVE_THRESHOLD;
  const pythonCommand = options.pythonCommand ?? process.env.PYTHON ?? "python";
  const tsxCommand = options.tsxCommand ?? process.execPath;
  const tsxPrefixArgs = options.tsxCommand
    ? []
    : [path.join(repoRoot, "node_modules", "tsx", "dist", "cli.mjs")];
  const batchReviewPath = path.join(repoRoot, "tmp", `${options.source}_batch_review.json`);
  const sqlArtifactDir = path.join(repoRoot, "tmp", "job-operational-sql");
  const importApplySqlPath = path.join(sqlArtifactDir, `${options.source}_import_apply.sql`);
  const lifecycleSnapshotPath = path.join(
    repoRoot,
    "tmp",
    `${options.source}_existing_lifecycle_snapshot.json`
  );
  const lifecycleReportPath = path.join(
    repoRoot,
    "tmp",
    `${options.source}_lifecycle_dry_run.json`
  );
  const lifecycleApplySqlPath = path.join(sqlArtifactDir, `${options.source}_lifecycle_apply.sql`);
  const importScriptPath = path.join(
    repoRoot,
    "apps",
    "backend",
    "prisma",
    "importJobPostings.ts"
  );
  const lifecycleDryRunScriptPath = path.join(
    repoRoot,
    "apps",
    "backend",
    "src",
    "scripts",
    "jobLifecycleDryRun.ts"
  );
  const lifecycleApplyScriptPath = path.join(
    repoRoot,
    "apps",
    "backend",
    "src",
    "scripts",
    "jobLifecycleApply.ts"
  );
  const sqlArtifactsScriptPath = path.join(
    repoRoot,
    "apps",
    "backend",
    "src",
    "scripts",
    "jobOperationalSqlArtifacts.ts"
  );

  return {
    schemaVersion: "job_operational_pipeline_v1",
    source: options.source,
    mode,
    executionPolicy: mode === "review" ? "plan_only_no_db_writes" : "approval_gated_db_writes",
    artifacts: {
      batchReviewPath,
      importApplySqlPath,
      lifecycleSnapshotPath,
      lifecycleReportPath,
      lifecycleApplySqlPath
    },
    stages: [
      {
        id: "collect_batch",
        label: `Collect ${options.source} batch review artifact`,
        runner: "shell",
        status: "implemented",
        writesDb: false,
        requiresApproval: false,
        command: pythonCommand,
        args: [
          path.join(repoRoot, RUNNER_SCRIPT),
          "--source",
          options.source,
          "--limit",
          String(limit),
          "--delay-seconds",
          String(delaySeconds),
          "--format",
          "batch",
          "--mode",
          "batch",
          "--source-cap",
          String(sourceCap),
          "--output",
          batchReviewPath
        ],
        cwd: repoRoot,
        outputPaths: [batchReviewPath]
      },
      {
        id: "import_dry_run",
        label: `Validate ${options.source} batch import payload`,
        runner: "shell",
        status: "implemented",
        writesDb: false,
        requiresApproval: false,
        command: tsxCommand,
        args: [...tsxPrefixArgs, importScriptPath, "--dry-run", batchReviewPath],
        cwd: repoRoot,
        inputPaths: [batchReviewPath]
      },
      {
        id: "import_sql_artifact",
        label: `Generate ${options.source} import SQL artifact`,
        runner: "shell",
        status: "implemented",
        writesDb: false,
        requiresApproval: false,
        command: tsxCommand,
        args: [
          ...tsxPrefixArgs,
          sqlArtifactsScriptPath,
          "--batch",
          batchReviewPath,
          "--output-dir",
          sqlArtifactDir
        ],
        cwd: repoRoot,
        inputPaths: [batchReviewPath],
        outputPaths: [importApplySqlPath]
      },
      {
        id: "import_apply",
        label: `Apply ${options.source} batch import to the configured database`,
        runner: "shell",
        status: "implemented",
        writesDb: true,
        requiresApproval: true,
        command: tsxCommand,
        args: [...tsxPrefixArgs, importScriptPath, batchReviewPath],
        cwd: repoRoot,
        inputPaths: [batchReviewPath],
        notes: ["Approval is required because this stage mutates the configured database."]
      },
      {
        id: "lifecycle_snapshot",
        label: `Export ${options.source} lifecycle snapshot from Supabase`,
        runner: "supabase_plugin",
        status: "external",
        writesDb: false,
        requiresApproval: false,
        outputPaths: [lifecycleSnapshotPath],
        notes: [
          "Use the Supabase plugin to read existing job_posting rows for the source.",
          "The snapshot feeds lifecycle dry-run planning and is not a database mutation."
        ]
      },
      {
        id: "lifecycle_plan",
        label: `Build ${options.source} lifecycle dry-run report`,
        runner: "shell",
        status: "implemented",
        writesDb: false,
        requiresApproval: false,
        command: tsxCommand,
        args: [
          ...tsxPrefixArgs,
          lifecycleDryRunScriptPath,
          "--batch",
          batchReviewPath,
          "--existing",
          lifecycleSnapshotPath,
          "--inactive-threshold",
          String(inactiveThreshold),
          "--output",
          lifecycleReportPath
        ],
        cwd: repoRoot,
        inputPaths: [batchReviewPath, lifecycleSnapshotPath],
        outputPaths: [lifecycleReportPath]
      },
      {
        id: "lifecycle_sql_artifact",
        label: `Generate ${options.source} lifecycle SQL artifact`,
        runner: "shell",
        status: "implemented",
        writesDb: false,
        requiresApproval: false,
        command: tsxCommand,
        args: [
          ...tsxPrefixArgs,
          sqlArtifactsScriptPath,
          "--lifecycle-report",
          lifecycleReportPath,
          "--output-dir",
          sqlArtifactDir
        ],
        cwd: repoRoot,
        inputPaths: [lifecycleReportPath],
        outputPaths: [lifecycleApplySqlPath]
      },
      {
        id: "lifecycle_apply",
        label: `Apply ${options.source} lifecycle report to the configured database`,
        runner: "shell",
        status: "implemented",
        writesDb: true,
        requiresApproval: true,
        command: tsxCommand,
        args: [...tsxPrefixArgs, lifecycleApplyScriptPath, "--report", lifecycleReportPath],
        cwd: repoRoot,
        inputPaths: [lifecycleReportPath],
        notes: ["Approval is required because this stage mutates lifecycle fields in the database."]
      }
    ]
  };
}

export function parseJobOperationalPipelineArgs(argv: string[]): JobOperationalPipelineArgs {
  const parsed: Partial<JobOperationalPipelineArgs> = {
    mode: "review"
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--") {
      continue;
    }

    if (arg === "--source") {
      const source = requireValue(argv, index, arg);
      if (!isOperationalSource(source)) {
        throw new Error(`Unsupported operational source: ${source}`);
      }
      parsed.source = source;
      index += 1;
      continue;
    }

    if (arg === "--mode") {
      const mode = requireValue(argv, index, arg);
      if (mode !== "review" && mode !== "apply") {
        throw new Error(`Unsupported mode: ${mode}`);
      }
      parsed.mode = mode;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!parsed.source) {
    throw new Error("--source is required.");
  }

  return parsed as JobOperationalPipelineArgs;
}

function isOperationalSource(source: string): source is JobOperationalSource {
  return Object.hasOwn(OPERATIONAL_SOURCES, source);
}

function requireValue(argv: string[], index: number, option: string) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value.`);
  }
  return value;
}

async function main() {
  const repoRoot = findRepoRoot();
  const args = parseJobOperationalPipelineArgs(process.argv.slice(2));
  const plan = buildJobOperationalPipelinePlan({
    repoRoot,
    ...args
  });

  process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
}

const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (entryPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
