import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildJobOperationalPipelinePlan,
  type JobOperationalSource
} from "./jobOperationalPipeline.js";
import { findRepoRoot } from "./jobCrawlerImportCheck.js";

export type KrOperationalSource = Extract<
  JobOperationalSource,
  "saramin" | "jobkorea" | "linkareer"
>;

export type JobOperationalManualRunStepKind =
  | "local_commands"
  | "supabase_sql"
  | "approval_gate";

export type JobOperationalManualRunStepId =
  | "collect_batch"
  | "import_dry_run"
  | "import_sql_artifact"
  | "import_apply_approval"
  | "import_apply"
  | "lifecycle_snapshot"
  | "lifecycle_plan"
  | "lifecycle_sql_artifact"
  | "lifecycle_apply_approval"
  | "lifecycle_apply"
  | "post_apply_verification";
export type JobOperationalManualRunSqlPurpose =
  | "export_existing_lifecycle_snapshot"
  | "import_apply_preflight"
  | "lifecycle_apply_preflight"
  | "apply_lifecycle_report"
  | "post_apply_verification";

export type JobOperationalManualRunCommand = {
  source: KrOperationalSource;
  label: string;
  command: string;
  args: string[];
  cwd: string;
};

export type JobOperationalManualRunStep = {
  id: JobOperationalManualRunStepId;
  label: string;
  kind: JobOperationalManualRunStepKind;
  writesDb: boolean;
  requiresApproval: boolean;
  commands?: JobOperationalManualRunCommand[];
  sqlPurpose?: JobOperationalManualRunSqlPurpose;
  notes?: string[];
};

export type JobOperationalManualRunSql = {
  lifecycleSnapshot: string;
  importApplyPreflight: string;
  lifecycleApplyPreflight: string;
  lifecycleApply: string;
  postApplyVerification: string;
};

export type JobOperationalManualRunPlan = {
  schemaVersion: "job_operational_manual_run_v1";
  scope: "kr";
  mode: "manual";
  sources: KrOperationalSource[];
  requiresSupabasePlugin: true;
  executionPolicy: "manual_steps_with_approval_gates";
  artifacts: Record<
    KrOperationalSource,
    {
      batchReviewPath: string;
      importApplySqlPath: string;
      lifecycleSnapshotPath: string;
      lifecycleReportPath: string;
      lifecycleApplySqlPath: string;
    }
  >;
  steps: JobOperationalManualRunStep[];
  supabaseSql: JobOperationalManualRunSql;
};

export type JobOperationalManualRunOptions = {
  repoRoot: string;
  sources?: KrOperationalSource[];
  pythonCommand?: string;
  tsxCommand?: string;
};

export type JobOperationalManualRunArgs = {
  sources?: KrOperationalSource[];
};

const DEFAULT_KR_SOURCES: KrOperationalSource[] = ["saramin", "jobkorea", "linkareer"];
const SOURCE_SET = new Set<KrOperationalSource>(DEFAULT_KR_SOURCES);

export function buildJobOperationalManualRunPlan(
  options: JobOperationalManualRunOptions
): JobOperationalManualRunPlan {
  const repoRoot = path.resolve(options.repoRoot);
  const sources = options.sources?.length ? dedupeSources(options.sources) : DEFAULT_KR_SOURCES;
  const sourcePlans = sources.map((source) =>
    buildJobOperationalPipelinePlan({
      repoRoot,
      source,
      mode: "apply",
      pythonCommand: options.pythonCommand,
      tsxCommand: options.tsxCommand
    })
  );
  const artifacts = Object.fromEntries(
    sourcePlans.map((plan) => [plan.source, plan.artifacts])
  ) as JobOperationalManualRunPlan["artifacts"];

  return {
    schemaVersion: "job_operational_manual_run_v1",
    scope: "kr",
    mode: "manual",
    sources,
    requiresSupabasePlugin: true,
    executionPolicy: "manual_steps_with_approval_gates",
    artifacts,
    steps: [
      {
        id: "collect_batch",
        label: "Collect KR batch artifacts",
        kind: "local_commands",
        writesDb: false,
        requiresApproval: false,
        commands: commandsForStage(sourcePlans, "collect_batch")
      },
      {
        id: "import_dry_run",
        label: "Dry-run import payloads",
        kind: "local_commands",
        writesDb: false,
        requiresApproval: false,
        commands: commandsForStage(sourcePlans, "import_dry_run")
      },
      {
        id: "import_sql_artifact",
        label: "Generate import SQL artifacts",
        kind: "local_commands",
        writesDb: false,
        requiresApproval: false,
        commands: commandsForStage(sourcePlans, "import_sql_artifact")
      },
      {
        id: "import_apply_approval",
        label: "Approve import apply",
        kind: "approval_gate",
        writesDb: false,
        requiresApproval: true,
        notes: ["Required before applying batch artifacts to the configured Supabase project DB."]
      },
      {
        id: "import_apply",
        label: "Apply import payloads",
        kind: "local_commands",
        writesDb: true,
        requiresApproval: true,
        commands: commandsForStage(sourcePlans, "import_apply"),
        notes: [
          "Use the Supabase plugin SQL path when local DATABASE_URL is unavailable or the user selected plugin operations."
        ]
      },
      {
        id: "lifecycle_snapshot",
        label: "Export lifecycle snapshots",
        kind: "supabase_sql",
        writesDb: false,
        requiresApproval: false,
        sqlPurpose: "export_existing_lifecycle_snapshot"
      },
      {
        id: "lifecycle_plan",
        label: "Build lifecycle dry-run reports",
        kind: "local_commands",
        writesDb: false,
        requiresApproval: false,
        commands: commandsForStage(sourcePlans, "lifecycle_plan")
      },
      {
        id: "lifecycle_sql_artifact",
        label: "Generate lifecycle SQL artifacts",
        kind: "local_commands",
        writesDb: false,
        requiresApproval: false,
        commands: commandsForStage(sourcePlans, "lifecycle_sql_artifact")
      },
      {
        id: "lifecycle_apply_approval",
        label: "Approve lifecycle apply",
        kind: "approval_gate",
        writesDb: false,
        requiresApproval: true,
        notes: ["Required before mutating lifecycle status or classifierMeta.lifecycle fields."]
      },
      {
        id: "lifecycle_apply",
        label: "Apply lifecycle reports",
        kind: "supabase_sql",
        writesDb: true,
        requiresApproval: true,
        sqlPurpose: "apply_lifecycle_report"
      },
      {
        id: "post_apply_verification",
        label: "Verify KR operational run result",
        kind: "supabase_sql",
        writesDb: false,
        requiresApproval: false,
        sqlPurpose: "post_apply_verification"
      }
    ],
    supabaseSql: buildSupabaseSql(sources)
  };
}

export function parseJobOperationalManualRunArgs(
  argv: string[]
): JobOperationalManualRunArgs {
  const sources: KrOperationalSource[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--") {
      continue;
    }

    if (arg === "--source") {
      const source = requireValue(argv, index, arg);
      if (!isManualRunSource(source)) {
        throw new Error(`Unsupported manual run source: ${source}`);
      }
      sources.push(source);
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return sources.length ? { sources: dedupeSources(sources) } : {};
}

function commandsForStage(
  sourcePlans: ReturnType<typeof buildJobOperationalPipelinePlan>[],
  stageId: string
): JobOperationalManualRunCommand[] {
  return sourcePlans.map((plan) => {
    const stage = plan.stages.find((candidate) => candidate.id === stageId);
    if (!stage?.command || !stage.args || !stage.cwd) {
      throw new Error(`Missing command stage: ${plan.source}/${stageId}`);
    }

    return {
      source: plan.source as KrOperationalSource,
      label: stage.label,
      command: stage.command,
      args: stage.args,
      cwd: stage.cwd
    };
  });
}

function buildSupabaseSql(sources: JobOperationalSource[]): JobOperationalManualRunSql {
  const sourceList = sources.map((source) => `'${source}'`).join(", ");
  const sourceArray = `array[${sourceList}]::text[]`;

  return {
    lifecycleSnapshot: [
      "-- Export one source at a time through the Supabase plugin and save as tmp/<source>_existing_lifecycle_snapshot.json.",
      "select",
      "  source,",
      "  source_job_id as \"sourceJobId\",",
      "  status::text as status,",
      "  closed_at as \"closedAt\",",
      "  last_seen_at as \"lastSeenAt\",",
      "  classifier_meta as \"classifierMeta\"",
      "from public.job_postings",
      `where source = '<source>'`,
      "order by source_job_id;"
    ].join("\n"),
    importApplyPreflight: [
      "select",
      "  source,",
      "  count(*)::int as rows,",
      "  count(*) filter (where source_job_id is null)::int as missing_source_job_id",
      "from public.job_postings",
      `where source = any(${sourceArray})`,
      "group by source",
      "order by source;"
    ].join("\n"),
    lifecycleApplyPreflight: [
      "select",
      "  source,",
      "  status::text as status,",
      "  coalesce((classifier_meta->'lifecycle'->>'missingCount')::int, 0) as missing_count,",
      "  count(*)::int as rows",
      "from public.job_postings",
      `where source = any(${sourceArray})`,
      "group by source, status, missing_count",
      "order by source, status, missing_count;"
    ].join("\n"),
    lifecycleApply: [
      "-- Use the generated tmp/<source>_lifecycle_dry_run.json reports.",
      "-- Apply source-by-source in a transaction with advisory lock, drift checks, and exact update-count checks.",
      "-- Keep same-crawl missing rows idempotent: do not increment missingCount twice for one crawlBatchId."
    ].join("\n"),
    postApplyVerification: [
      "with duplicate_rows as (",
      "  select source, source_job_id, count(*)::int as duplicate_count",
      "  from public.job_postings",
      `  where source = any(${sourceArray})`,
      "  group by source, source_job_id",
      "  having count(*) > 1",
      "), source_summary as (",
      "  select",
      "    source,",
      "    count(*)::int as rows,",
      "    count(*) filter (where status::text = 'active')::int as active_rows,",
      "    count(*) filter (where status::text = 'closed')::int as closed_rows,",
      "    count(*) filter (where status::text = 'inactive')::int as inactive_rows,",
      "    count(*) filter (where job_category = 'non_it')::int as non_it",
      "  from public.job_postings",
      `  where source = any(${sourceArray})`,
      "  group by source",
      ")",
      "select jsonb_build_object(",
      "  'sourceSummary', (select jsonb_agg(row_to_json(source_summary) order by source) from source_summary),",
      "  'duplicates', coalesce((select jsonb_agg(row_to_json(duplicate_rows)) from duplicate_rows), '[]'::jsonb)",
      ") as verification;"
    ].join("\n")
  };
}

function dedupeSources(sources: KrOperationalSource[]) {
  return [...new Set(sources)];
}

function isManualRunSource(source: string): source is KrOperationalSource {
  return SOURCE_SET.has(source as KrOperationalSource);
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
  const args = parseJobOperationalManualRunArgs(process.argv.slice(2));
  const plan = buildJobOperationalManualRunPlan({
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
