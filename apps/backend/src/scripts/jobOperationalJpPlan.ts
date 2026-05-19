import path from "node:path";
import { fileURLToPath } from "node:url";
import { findRepoRoot } from "./jobCrawlerImportCheck.js";
import {
  buildJobOperationalPipelinePlan,
  type JobOperationalPipelinePlan,
  type JobOperationalSource
} from "./jobOperationalPipeline.js";

export type JobOperationalJpSource = Extract<
  JobOperationalSource,
  "mynavi_tenshoku" | "green_japan" | "daijob" | "careercross"
>;

export type JobOperationalJpPlan = {
  schemaVersion: "job_operational_jp_plan_v1";
  scope: "jp";
  country: "JP";
  defaultSource: "mynavi_tenshoku";
  sources: JobOperationalJpSource[];
  executionPolicy: "plan_only_no_db_writes";
  sourcePlans: JobOperationalPipelinePlan[];
  rollout: {
    nextSources: JobOperationalJpSource[];
    heldSources: string[];
    notes: string[];
  };
  architectureCloseout: JobOperationalJpArchitectureCloseout;
};

export type JobOperationalJpArchitectureCloseout = {
  goal: "jp_architecture_closeout";
  status: "in_progress" | "ready_for_manual_db_review";
  completionPolicy: "all_jp_green_sources_plan_only_no_db_writes";
  requiredEvidence: string[];
  deferredWork: string[];
};

export type JobOperationalJpPlanOptions = {
  repoRoot: string;
  sources?: JobOperationalJpSource[];
  pythonCommand?: string;
  tsxCommand?: string;
};

export type JobOperationalJpPlanArgs = {
  sources?: JobOperationalJpSource[];
};

const DEFAULT_JP_SOURCES: JobOperationalJpSource[] = ["mynavi_tenshoku"];
const JP_GREEN_SOURCES: JobOperationalJpSource[] = [
  "mynavi_tenshoku",
  "green_japan",
  "daijob",
  "careercross"
];
const JP_GREEN_SOURCE_SET = new Set<JobOperationalJpSource>(JP_GREEN_SOURCES);

export function buildJobOperationalJpPlan(
  options: JobOperationalJpPlanOptions
): JobOperationalJpPlan {
  const repoRoot = path.resolve(options.repoRoot);
  const sources = options.sources?.length ? dedupeSources(options.sources) : DEFAULT_JP_SOURCES;
  const includesAllGreenSources = JP_GREEN_SOURCES.every((source) => sources.includes(source));

  return {
    schemaVersion: "job_operational_jp_plan_v1",
    scope: "jp",
    country: "JP",
    defaultSource: "mynavi_tenshoku",
    sources,
    executionPolicy: "plan_only_no_db_writes",
    sourcePlans: sources.map((source) =>
      buildJobOperationalPipelinePlan({
        repoRoot,
        source,
        mode: "review",
        pythonCommand: options.pythonCommand,
        tsxCommand: options.tsxCommand
      })
    ),
    rollout: {
      nextSources: JP_GREEN_SOURCES.filter((source) => !sources.includes(source)),
      heldSources: ["doda", "rikunabi_next"],
      notes: [
        "Start with one JP/ja source before widening source-specific behavior.",
        "Keep DB writes approval-gated and out of the JP architecture start."
      ]
    },
    architectureCloseout: buildJpArchitectureCloseout(includesAllGreenSources)
  };
}

export function parseJobOperationalJpPlanArgs(argv: string[]): JobOperationalJpPlanArgs {
  const sources: JobOperationalJpSource[] = [];
  let allSources = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--") {
      continue;
    }

    if (arg === "--all") {
      allSources = true;
      continue;
    }

    if (arg === "--source") {
      const source = requireValue(argv, index, arg);
      if (!isJpGreenSource(source)) {
        throw new Error(`Unsupported JP operational source: ${source}`);
      }
      sources.push(source);
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (allSources && sources.length) {
    throw new Error("--all cannot be combined with --source.");
  }

  if (allSources) {
    return { sources: [...JP_GREEN_SOURCES] };
  }

  return sources.length ? { sources: dedupeSources(sources) } : {};
}

function dedupeSources(sources: JobOperationalJpSource[]) {
  return [...new Set(sources)];
}

function buildJpArchitectureCloseout(
  includesAllGreenSources: boolean
): JobOperationalJpArchitectureCloseout {
  return {
    goal: "jp_architecture_closeout",
    status: includesAllGreenSources ? "ready_for_manual_db_review" : "in_progress",
    completionPolicy: "all_jp_green_sources_plan_only_no_db_writes",
    requiredEvidence: [
      "jobs:operational:jp-plan emits every current JP GREEN source.",
      "Each JP source reuses the KR-proven collection, import dry-run, SQL artifact, lifecycle, and approval-gated apply stages.",
      "Sample checks pass for mynavi_tenshoku, green_japan, daijob, and careercross.",
      "doda and rikunabi_next remain held until fresh public HTML evidence changes their status.",
      "JP import and lifecycle database writes remain approval-gated."
    ],
    deferredWork: [
      "JP database import approval and apply.",
      "JP lifecycle snapshot/apply against Supabase.",
      "cron or background scheduling.",
      "source-specific JP inactive-threshold tuning.",
      "frontend exposure of JP lifecycle/category fields."
    ]
  };
}

function isJpGreenSource(source: string): source is JobOperationalJpSource {
  return JP_GREEN_SOURCE_SET.has(source as JobOperationalJpSource);
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
  const args = parseJobOperationalJpPlanArgs(process.argv.slice(2));
  const plan = buildJobOperationalJpPlan({
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
