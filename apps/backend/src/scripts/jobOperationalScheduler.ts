import path from "node:path";
import { fileURLToPath } from "node:url";
import { findRepoRoot } from "./jobCrawlerImportCheck.js";
import {
  buildJobOperationalManualRunPlan,
  parseJobOperationalManualRunArgs,
  type KrOperationalSource,
  type JobOperationalManualRunCommand,
  type JobOperationalManualRunStep,
  type JobOperationalManualRunStepId
} from "./jobOperationalManualRun.js";

export type JobOperationalSchedulerStepId =
  | "manual_run_plan"
  | Extract<
      JobOperationalManualRunStepId,
      | "collect_batch"
      | "import_dry_run"
      | "import_sql_artifact"
      | "lifecycle_snapshot"
      | "lifecycle_plan"
      | "lifecycle_sql_artifact"
      | "post_apply_verification"
    >;

export type JobOperationalSchedulerStep = {
  id: JobOperationalSchedulerStepId;
  label: string;
  kind: "local_commands" | "supabase_sql";
  writesDb: false;
  requiresApproval: false;
  commands?: JobOperationalManualRunCommand[];
  sqlPurpose?: JobOperationalManualRunStep["sqlPurpose"];
  notes?: string[];
};

export type JobOperationalSchedulerPlan = {
  schemaVersion: "job_operational_scheduler_v1";
  scope: "kr";
  trigger: "manual";
  executionPolicy: "artifact_generation_only_no_db_writes";
  sources: KrOperationalSource[];
  architectureCloseout: {
    goal: "kr_architecture_closeout_before_jp";
    jpExpansionPolicy: "start_jp_after_kr_architecture_rehearsal";
    requiredEvidence: string[];
    deferredWork: string[];
  };
  manualRunCommand: {
    command: "corepack";
    args: string[];
    cwd: string;
  };
  steps: JobOperationalSchedulerStep[];
  excludedApprovalGatedWriteSteps: ["import_apply", "lifecycle_apply"];
};

export type JobOperationalSchedulerOptions = {
  repoRoot: string;
  sources?: KrOperationalSource[];
  pythonCommand?: string;
  tsxCommand?: string;
};

export type JobOperationalSchedulerArgs = {
  sources?: KrOperationalSource[];
};

const SCHEDULER_STEP_IDS: JobOperationalSchedulerStepId[] = [
  "collect_batch",
  "import_dry_run",
  "import_sql_artifact",
  "lifecycle_snapshot",
  "lifecycle_plan",
  "lifecycle_sql_artifact",
  "post_apply_verification"
];

export function buildJobOperationalSchedulerPlan(
  options: JobOperationalSchedulerOptions
): JobOperationalSchedulerPlan {
  const repoRoot = path.resolve(options.repoRoot);
  const manualRunPlan = buildJobOperationalManualRunPlan({
    repoRoot,
    sources: options.sources,
    pythonCommand: options.pythonCommand,
    tsxCommand: options.tsxCommand
  });

  return {
    schemaVersion: "job_operational_scheduler_v1",
    scope: "kr",
    trigger: "manual",
    executionPolicy: "artifact_generation_only_no_db_writes",
    sources: manualRunPlan.sources,
    architectureCloseout: {
      goal: "kr_architecture_closeout_before_jp",
      jpExpansionPolicy: "start_jp_after_kr_architecture_rehearsal",
      requiredEvidence: [
        "scheduler plan emits all non-mutating KR steps",
        "3 KR sources can generate import SQL artifacts",
        "3 KR sources can generate lifecycle SQL artifacts",
        "runbook documents JP handoff and deferred KR details"
      ],
      deferredWork: [
        "cron or background scheduling",
        "automatic Supabase apply",
        "exhaustive closed/inactive edge-case tuning"
      ]
    },
    manualRunCommand: {
      command: "corepack",
      args: ["pnpm", "run", "jobs:operational:manual-run"],
      cwd: repoRoot
    },
    steps: [
      {
        id: "manual_run_plan",
        label: "Build manual operational run plan",
        kind: "local_commands",
        writesDb: false,
        requiresApproval: false,
        commands: [
          {
            source: manualRunPlan.sources[0] ?? "saramin",
            label: "Emit the current KR manual run plan",
            command: "corepack",
            args: [
              "pnpm",
              "run",
              "jobs:operational:manual-run",
              ...manualRunPlan.sources.flatMap((source) => ["--source", source])
            ],
            cwd: repoRoot
          }
        ],
        notes: ["This skeleton does not execute approval-gated DB mutation stages."]
      },
      ...manualRunPlan.steps
        .filter((step) => SCHEDULER_STEP_IDS.includes(step.id as JobOperationalSchedulerStepId))
        .map(toSchedulerStep)
    ],
    excludedApprovalGatedWriteSteps: ["import_apply", "lifecycle_apply"]
  };
}

export function parseJobOperationalSchedulerArgs(argv: string[]): JobOperationalSchedulerArgs {
  try {
    return parseJobOperationalManualRunArgs(argv);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Unsupported manual run source: ")) {
      throw new Error(
        error.message.replace("Unsupported manual run source: ", "Unsupported scheduler source: ")
      );
    }
    throw error;
  }
}

function toSchedulerStep(step: JobOperationalManualRunStep): JobOperationalSchedulerStep {
  if (step.writesDb || step.requiresApproval) {
    throw new Error(`Scheduler skeleton cannot include write or approval step: ${step.id}`);
  }

  if (step.kind === "approval_gate") {
    throw new Error(`Scheduler skeleton cannot include approval gate step: ${step.id}`);
  }

  return {
    id: step.id as JobOperationalSchedulerStepId,
    label: step.label,
    kind: step.kind,
    writesDb: false,
    requiresApproval: false,
    commands: step.commands,
    sqlPurpose: step.sqlPurpose,
    notes: step.notes
  };
}

async function main() {
  const repoRoot = findRepoRoot();
  const args = parseJobOperationalSchedulerArgs(process.argv.slice(2));
  const plan = buildJobOperationalSchedulerPlan({
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
