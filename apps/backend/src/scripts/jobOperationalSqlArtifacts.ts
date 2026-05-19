import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseLifecycleApplyReport } from "./jobLifecycleApply.js";
import { findRepoRoot } from "./jobCrawlerImportCheck.js";
import type { CollectedJobBatch } from "../types/job.js";
import type {
  LifecycleDecision,
  LifecycleDryRunReport,
  LifecycleSkipped
} from "./jobLifecycleDryRun.js";

export type JobOperationalSqlArtifactsArgs = {
  batchPath?: string;
  lifecycleReportPath?: string;
  outputDir: string;
};

export type JobOperationalSqlArtifactsManifest = {
  schemaVersion: "job_operational_sql_artifacts_v1";
  source: string;
  generatedAt: string;
  executionPolicy: "artifact_only_no_db_writes";
  generatedFiles: string[];
};

type SqlArtifactManifestOptions = {
  source: string;
  outputDir: string;
  generatedFiles: string[];
  generatedAt?: Date;
};

type LifecycleSqlUpdate = {
  bucket:
    | "activeObservations"
    | "closedCandidates"
    | "inactiveCandidates"
    | "missingThresholdNotMet";
  source: string;
  source_job_id: string;
  expected_status: string;
  new_status: string | null;
  last_seen_at: string | null;
  closed_at: string | null;
  expected_missing_count: number | null;
  new_missing_count: number;
  last_decision: string;
  closed_evidence: string | null;
};

const DEFAULT_OUTPUT_DIR = path.join("tmp", "job-operational-sql");
const MISSING_BELOW_THRESHOLD_REASON = "missing_threshold_not_met";

export function parseJobOperationalSqlArtifactsArgs(
  argv: string[]
): JobOperationalSqlArtifactsArgs {
  const parsed: Partial<JobOperationalSqlArtifactsArgs> = {
    outputDir: DEFAULT_OUTPUT_DIR
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--") {
      continue;
    }

    if (arg === "--batch") {
      parsed.batchPath = requireValue(argv, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--lifecycle-report") {
      parsed.lifecycleReportPath = requireValue(argv, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--output-dir") {
      parsed.outputDir = requireValue(argv, index, arg);
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!parsed.batchPath && !parsed.lifecycleReportPath) {
    throw new Error("--batch or --lifecycle-report is required.");
  }

  return parsed as JobOperationalSqlArtifactsArgs;
}

export function buildImportApplySql(batch: CollectedJobBatch): string {
  const payload = validateJobBatch(batch);

  const postingsJson = dollarQuoteJson(payload.jobs, "n2w_import_payload");
  const sourceLiteral = quoteSqlString(payload.batch.source);
  const advisoryKey = quoteSqlString(`neet2work:jobs:import:${payload.batch.source}`);
  const batchCollectedAt = quoteSqlString(payload.batch.collectedAt);

  return [
    "-- schemaVersion: job_operational_import_sql_v1",
    `-- source: ${payload.batch.source}`,
    `-- crawlBatchId: ${payload.batch.crawlBatchId}`,
    "-- Generated artifact only. Review and approve before running in Supabase.",
    "begin;",
    `select pg_advisory_xact_lock(hashtext(${advisoryKey}));`,
    "",
    "do $n2w_import_guard$",
    "declare",
    "  duplicate_count integer;",
    "  missing_required_count integer;",
    "begin",
    "  select count(*)::int into duplicate_count",
    "  from (",
    "    select item->>'source' as source, item->>'sourceJobId' as source_job_id, count(*)",
    `    from jsonb_array_elements(${postingsJson}::jsonb) as payload(item)`,
    "    group by item->>'source', item->>'sourceJobId'",
    "    having count(*) > 1",
    "  ) duplicates;",
    "",
    "  if duplicate_count > 0 then",
    "    raise exception 'duplicate source/sourceJobId keys in import payload';",
    "  end if;",
    "",
    "  select count(*)::int into missing_required_count",
    `  from jsonb_array_elements(${postingsJson}::jsonb) as payload(item)`,
    "  where coalesce(item->>'source', '') = ''",
    "     or coalesce(item->>'sourceJobId', '') = ''",
    "     or coalesce(item->>'id', '') = '';",
    "",
    "  if missing_required_count > 0 then",
    "    raise exception 'import payload contains rows without source/sourceJobId/id';",
    "  end if;",
    "end",
    "$n2w_import_guard$;",
    "",
    "with payload as (",
    `  select item from jsonb_array_elements(${postingsJson}::jsonb) as payload(item)`,
    "), normalized as (",
    "  select",
    "    item->>'id' as id,",
    "    item->>'title' as title,",
    "    item->>'company' as company,",
    "    item->>'location' as location,",
    "    item->>'careerLevel' as career_level,",
    "    coalesce(array(select jsonb_array_elements_text(coalesce(item->'skills', '[]'::jsonb))), array[]::text[]) as skills,",
    "    item->>'description' as description,",
    "    coalesce(nullif(item->>'source', ''), " + sourceLiteral + ") as source,",
    "    item->>'sourceJobId' as source_job_id,",
    "    item->>'sourceUrl' as source_url,",
    "    coalesce(nullif(item->>'country', ''), 'KR') as country,",
    "    coalesce(nullif(item->>'language', ''), 'ko') as language,",
    "    nullif(item->>'employmentType', '') as employment_type,",
    "    nullif(item->>'educationLevel', '') as education_level,",
    "    nullif(item->>'salaryText', '') as salary_text,",
    "    nullif(item->>'deadlineText', '') as deadline_text,",
    "    nullif(item->>'applyMethod', '') as apply_method,",
    "    case when item ? 'companyInfo' then item->'companyInfo' else null end as company_info,",
    "    nullif(item->>'rawText', '') as raw_text,",
    "    case when item ? 'rawJson' then item->'rawJson' else null end as raw_json,",
    "    nullif(item->>'collectedAt', '')::timestamp(3) as collected_at,",
    "    coalesce(nullif(item->>'status', ''), 'active')::\"JobPostingStatus\" as status,",
    "    coalesce(nullif(item->>'firstSeenAt', '')::timestamp(3), current_timestamp) as first_seen_at,",
    "    coalesce(",
    "      nullif(item->>'lastSeenAt', '')::timestamp(3),",
    "      nullif(item->>'collectedAt', '')::timestamp(3),",
    `      ${batchCollectedAt}::timestamp(3)`,
    "    ) as last_seen_at,",
    "    nullif(item->>'closedAt', '')::timestamp(3) as closed_at_raw,",
    "    nullif(item->>'jobCategory', '') as job_category,",
    "    nullif(item->>'careerStage', '') as career_stage,",
    "    coalesce(nullif(item->>'crawlBatchId', ''), " +
      quoteSqlString(payload.batch.crawlBatchId) +
      ") as crawl_batch_id,",
    "    case when item ? 'classifierMeta' then item->'classifierMeta' else null end as classifier_meta",
    "  from payload",
    ")",
    "insert into public.job_postings (",
    "  \"id\", \"title\", \"company\", \"location\", \"career_level\", \"skills\",",
    "  \"description\", \"source\", \"source_job_id\", \"source_url\", \"country\",",
    "  \"language\", \"employment_type\", \"education_level\", \"salary_text\",",
    "  \"deadline_text\", \"apply_method\", \"company_info\", \"raw_text\",",
    "  \"raw_json\", \"collected_at\", \"status\", \"first_seen_at\",",
    "  \"last_seen_at\", \"closed_at\", \"job_category\", \"career_stage\",",
    "  \"crawl_batch_id\", \"classifier_meta\"",
    ")",
    "select",
    "  id, title, company, location, career_level, skills, description, source,",
    "  source_job_id, source_url, country, language, employment_type, education_level,",
    "  salary_text, deadline_text, apply_method, company_info, raw_text, raw_json,",
    "  collected_at, status, first_seen_at, last_seen_at,",
    "  case when status = 'closed' then coalesce(closed_at_raw, last_seen_at) else null end,",
    "  job_category, career_stage, crawl_batch_id, classifier_meta",
    "from normalized",
    "on conflict (\"source\", \"source_job_id\") do update set",
    "  \"title\" = excluded.\"title\",",
    "  \"company\" = excluded.\"company\",",
    "  \"location\" = excluded.\"location\",",
    "  \"career_level\" = excluded.\"career_level\",",
    "  \"skills\" = excluded.\"skills\",",
    "  \"description\" = excluded.\"description\",",
    "  \"source_url\" = excluded.\"source_url\",",
    "  \"country\" = excluded.\"country\",",
    "  \"language\" = excluded.\"language\",",
    "  \"employment_type\" = excluded.\"employment_type\",",
    "  \"education_level\" = excluded.\"education_level\",",
    "  \"salary_text\" = excluded.\"salary_text\",",
    "  \"deadline_text\" = excluded.\"deadline_text\",",
    "  \"apply_method\" = excluded.\"apply_method\",",
    "  \"company_info\" = excluded.\"company_info\",",
    "  \"raw_text\" = excluded.\"raw_text\",",
    "  \"raw_json\" = excluded.\"raw_json\",",
    "  \"collected_at\" = excluded.\"collected_at\",",
    "  \"status\" = excluded.\"status\",",
    "  \"last_seen_at\" = excluded.\"last_seen_at\",",
    "  \"closed_at\" = excluded.\"closed_at\",",
    "  \"job_category\" = excluded.\"job_category\",",
    "  \"career_stage\" = excluded.\"career_stage\",",
    "  \"crawl_batch_id\" = excluded.\"crawl_batch_id\",",
    "  \"classifier_meta\" = excluded.\"classifier_meta\",",
    "  \"updated_at\" = current_timestamp;",
    "",
    "commit;",
    ""
  ].join("\n");
}

export function buildLifecycleApplySql(parsedReport: unknown): string {
  const report = parseLifecycleApplyReport(parsedReport);
  const updates = buildLifecycleSqlUpdates(report);
  const updatesJson = dollarQuoteJson(updates, "n2w_lifecycle_updates");
  const advisoryKey = quoteSqlString(
    `neet2work:jobs:lifecycle:${report.source}:${report.crawlBatchId}`
  );
  const crawlBatchId = quoteSqlString(report.crawlBatchId);
  const reportCollectedAt = quoteSqlString(report.collectedAt);

  return [
    "-- schemaVersion: job_operational_lifecycle_sql_v1",
    `-- source: ${report.source}`,
    `-- crawlBatchId: ${report.crawlBatchId}`,
    "-- Generated artifact only. Review and approve before running in Supabase.",
    "-- partial reports cannot be applied; this artifact was generated only after report validation.",
    "begin;",
    `select pg_advisory_xact_lock(hashtext(${advisoryKey}));`,
    "",
    "create temporary table _n2w_lifecycle_updates on commit drop as",
    "select *",
    `from jsonb_to_recordset(${updatesJson}::jsonb) as update_row(`,
    "  bucket text,",
    "  source text,",
    "  source_job_id text,",
    "  expected_status text,",
    "  new_status text,",
    "  last_seen_at text,",
    "  closed_at text,",
    "  expected_missing_count integer,",
    "  new_missing_count integer,",
    "  last_decision text,",
    "  closed_evidence text",
    ");",
    "",
    "do $n2w_lifecycle_guard$",
    "declare",
    "  expected_count integer;",
    "  matched_count integer;",
    "  actual_count integer;",
    "begin",
    "  select count(*)::int into expected_count from _n2w_lifecycle_updates;",
    "",
    "  if exists (",
    "    select 1",
    "    from _n2w_lifecycle_updates",
    "    group by source, source_job_id",
    "    having count(*) > 1",
    "  ) then",
    "    raise exception 'duplicate lifecycle mutation target';",
    "  end if;",
    "",
    "  select count(*)::int into matched_count",
    "  from public.job_postings jp",
    "  join _n2w_lifecycle_updates u",
    "    on u.source = jp.source and u.source_job_id = jp.source_job_id;",
    "",
    "  if matched_count <> expected_count then",
    "    raise exception 'row count drift before lifecycle apply: expected %, got %', expected_count, matched_count;",
    "  end if;",
    "",
    "  if exists (",
    "    select 1",
    "    from public.job_postings jp",
    "    join _n2w_lifecycle_updates u",
    "      on u.source = jp.source and u.source_job_id = jp.source_job_id",
    "    where jp.status::text <> u.expected_status",
    "  ) then",
    "    raise exception 'status drift before lifecycle apply';",
    "  end if;",
    "",
    "  if exists (",
    "    select 1",
    "    from public.job_postings jp",
    "    join _n2w_lifecycle_updates u",
    "      on u.source = jp.source and u.source_job_id = jp.source_job_id",
    "    where u.expected_missing_count is not null",
    "      and coalesce((jp.classifier_meta->'lifecycle'->>'missingCount')::int, 0) <> u.expected_missing_count",
    "      and not (",
    `        u.last_decision = '${MISSING_BELOW_THRESHOLD_REASON}'`,
    "        and coalesce((jp.classifier_meta->'lifecycle'->>'missingCount')::int, 0) = u.new_missing_count",
    "        and jp.classifier_meta->'lifecycle'->>'lastDecision' = u.last_decision",
    `        and coalesce(jp.classifier_meta->'lifecycle'->>'reportCrawlBatchId', jp.classifier_meta->'lifecycle'->>'lastCrawlBatchId') = ${crawlBatchId}`,
    "      )",
    "  ) then",
    "    raise exception 'missingCount drift before lifecycle apply';",
    "  end if;",
    "",
    "  update public.job_postings jp",
    "  set",
    "    status = coalesce(u.new_status::\"JobPostingStatus\", jp.status),",
    "    last_seen_at = coalesce(nullif(u.last_seen_at, '')::timestamp(3), jp.last_seen_at),",
    "    closed_at = case",
    "      when nullif(u.closed_at, '') is not null then nullif(u.closed_at, '')::timestamp(3)",
    "      else jp.closed_at",
    "    end,",
    "    classifier_meta = coalesce(jp.classifier_meta, '{}'::jsonb) || jsonb_build_object(",
    "      'lifecycle',",
    "      coalesce(jp.classifier_meta->'lifecycle', '{}'::jsonb)",
    "        || jsonb_build_object(",
    "          'missingCount', u.new_missing_count,",
    "          'lastDecision', u.last_decision,",
    `          'reportCrawlBatchId', ${crawlBatchId},`,
    `          'reportCollectedAt', ${reportCollectedAt},`,
    "          'appliedAt', to_char(timezone('utc', current_timestamp), 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"')",
    "        )",
    "        || case when u.closed_evidence is null then '{}'::jsonb else jsonb_build_object('closedEvidence', u.closed_evidence) end",
    "    ),",
    "    updated_at = current_timestamp",
    "  from _n2w_lifecycle_updates u",
    "  where u.source = jp.source",
    "    and u.source_job_id = jp.source_job_id",
    "    and jp.status::text = u.expected_status;",
    "",
    "  GET DIAGNOSTICS actual_count = ROW_COUNT;",
    "  if actual_count <> expected_count then",
    "    raise exception 'lifecycle update count mismatch: expected %, got %', expected_count, actual_count;",
    "  end if;",
    "end",
    "$n2w_lifecycle_guard$;",
    "",
    "commit;",
    ""
  ].join("\n");
}

export function buildJobOperationalSqlArtifactsManifest(
  options: SqlArtifactManifestOptions
): JobOperationalSqlArtifactsManifest {
  return {
    schemaVersion: "job_operational_sql_artifacts_v1",
    source: options.source,
    generatedAt: (options.generatedAt ?? new Date()).toISOString(),
    executionPolicy: "artifact_only_no_db_writes",
    generatedFiles: options.generatedFiles.map((file) => path.resolve(options.outputDir, file))
  };
}

export async function runJobOperationalSqlArtifacts(args: JobOperationalSqlArtifactsArgs) {
  const repoRoot = findRepoRoot();
  const outputDir = resolveOperationalPath(args.outputDir, repoRoot, { mustExist: false });
  await fs.mkdir(outputDir, { recursive: true });

  const generatedFiles: string[] = [];
  const sources = new Set<string>();

  if (args.batchPath) {
    const batch = await readBatchArtifact(args.batchPath, repoRoot);
    const filename = `${batch.source}_import_apply.sql`;
    await fs.writeFile(path.join(outputDir, filename), buildImportApplySql(batch), "utf-8");
    generatedFiles.push(filename);
    sources.add(batch.source);
  }

  if (args.lifecycleReportPath) {
    const report = await readJsonArtifact(args.lifecycleReportPath, repoRoot);
    const parsedReport = parseLifecycleApplyReport(report);
    const filename = `${parsedReport.source}_lifecycle_apply.sql`;
    await fs.writeFile(path.join(outputDir, filename), buildLifecycleApplySql(parsedReport), "utf-8");
    generatedFiles.push(filename);
    sources.add(parsedReport.source);
  }

  if (sources.size !== 1) {
    throw new Error("SQL artifact inputs must resolve to exactly one source.");
  }

  const [source] = [...sources];
  const manifest = buildJobOperationalSqlArtifactsManifest({
    source,
    outputDir,
    generatedFiles
  });
  const manifestPath = path.join(outputDir, `${source}_sql_artifacts_manifest.json`);
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf-8");
  process.stdout.write(`${JSON.stringify({ ...manifest, manifestPath }, null, 2)}\n`);
  return manifest;
}

function buildLifecycleSqlUpdates(report: LifecycleDryRunReport): LifecycleSqlUpdate[] {
  return [
    ...report.activeObservations.map((decision) =>
      lifecycleDecisionToUpdate(report, decision, {
        bucket: "activeObservations",
        newStatus: "active",
        lastSeenAt: report.collectedAt,
        newMissingCount: 0
      })
    ),
    ...report.closedCandidates.map((decision) =>
      lifecycleDecisionToUpdate(report, decision, {
        bucket: "closedCandidates",
        newStatus: "closed",
        lastSeenAt: report.collectedAt,
        closedAt: report.collectedAt,
        newMissingCount: 0,
        closedEvidence: decision.evidence ?? null
      })
    ),
    ...report.inactiveCandidates.map((decision) =>
      lifecycleDecisionToUpdate(report, decision, {
        bucket: "inactiveCandidates",
        newStatus: "inactive",
        expectedMissingCount: requiredNumber(decision.previousMissingCount, decision),
        newMissingCount: requiredNumber(decision.nextMissingCount, decision)
      })
    ),
    ...report.skipped
      .filter((skipped) => skipped.reason === MISSING_BELOW_THRESHOLD_REASON)
      .map((skipped) =>
        lifecycleSkippedToUpdate(skipped, {
          expectedMissingCount: requiredNumber(skipped.previousMissingCount, skipped),
          newMissingCount: requiredNumber(skipped.nextMissingCount, skipped)
        })
      )
  ];
}

function lifecycleDecisionToUpdate(
  report: LifecycleDryRunReport,
  decision: LifecycleDecision,
  options: {
    bucket: LifecycleSqlUpdate["bucket"];
    newStatus: string;
    newMissingCount: number;
    lastSeenAt?: string;
    closedAt?: string;
    expectedMissingCount?: number;
    closedEvidence?: string | null;
  }
): LifecycleSqlUpdate {
  return {
    bucket: options.bucket,
    source: decision.source,
    source_job_id: decision.sourceJobId,
    expected_status: decision.currentStatus,
    new_status: options.newStatus,
    last_seen_at: options.lastSeenAt ?? null,
    closed_at: options.closedAt ?? null,
    expected_missing_count: options.expectedMissingCount ?? null,
    new_missing_count: options.newMissingCount,
    last_decision: decision.reason,
    closed_evidence: options.closedEvidence ?? null
  };
}

function lifecycleSkippedToUpdate(
  skipped: LifecycleSkipped,
  options: {
    expectedMissingCount: number;
    newMissingCount: number;
  }
): LifecycleSqlUpdate {
  return {
    bucket: "missingThresholdNotMet",
    source: skipped.source,
    source_job_id: skipped.sourceJobId,
    expected_status: skipped.currentStatus,
    new_status: null,
    last_seen_at: null,
    closed_at: null,
    expected_missing_count: options.expectedMissingCount,
    new_missing_count: options.newMissingCount,
    last_decision: skipped.reason,
    closed_evidence: null
  };
}

async function readBatchArtifact(inputPath: string, repoRoot: string) {
  const parsed = await readJsonArtifact(inputPath, repoRoot);
  return validateJobBatch(parsed).batch;
}

async function readJsonArtifact(inputPath: string, repoRoot: string) {
  return JSON.parse(await fs.readFile(resolveOperationalPath(inputPath, repoRoot), "utf-8")) as unknown;
}

function resolveOperationalPath(
  inputPath: string,
  repoRoot: string,
  options: { mustExist?: boolean } = {}
) {
  if (path.isAbsolute(inputPath)) {
    return inputPath;
  }

  const cwdCandidate = path.resolve(process.cwd(), inputPath);
  if (existsSync(cwdCandidate)) {
    return cwdCandidate;
  }

  const repoCandidate = path.resolve(repoRoot, inputPath);
  if (options.mustExist === false || existsSync(repoCandidate)) {
    return repoCandidate;
  }

  return cwdCandidate;
}

function requiredNumber(
  value: number | undefined,
  item: LifecycleDecision | LifecycleSkipped
) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${item.source}/${item.sourceJobId} missing lifecycle count.`);
  }
  return value;
}

function validateJobBatch(parsed: unknown) {
  assertRecord(parsed, "batch");

  if (parsed.schemaVersion !== "job_batch_v1") {
    throw new Error("--batch must point to a job_batch_v1 artifact.");
  }

  assertNonEmptyString(parsed.source, "batch.source");
  assertNonEmptyString(parsed.mode, "batch.mode");
  assertNonEmptyString(parsed.crawlBatchId, "batch.crawlBatchId");
  assertIsoDate(parsed.collectedAt, "batch.collectedAt");

  if (parsed.mode !== "sample" && parsed.mode !== "batch") {
    throw new Error(`Unsupported batch mode: ${String(parsed.mode)}`);
  }

  if (!Array.isArray(parsed.postings)) {
    throw new Error("batch.postings must be an array.");
  }

  const batch = parsed as CollectedJobBatch;
  for (const [index, posting] of batch.postings.entries()) {
    validatePosting(posting, index, batch.source);
  }

  return {
    batch,
    jobs: batch.postings
  };
}

function validatePosting(posting: unknown, index: number, expectedSource: string) {
  assertRecord(posting, `postings[${index}]`);
  assertNonEmptyString(posting.id, `postings[${index}].id`);
  assertNonEmptyString(posting.title, `postings[${index}].title`);
  assertNonEmptyString(posting.company, `postings[${index}].company`);
  assertNonEmptyString(posting.location, `postings[${index}].location`);
  assertNonEmptyString(posting.careerLevel, `postings[${index}].careerLevel`);
  assertNonEmptyString(posting.description, `postings[${index}].description`);
  assertNonEmptyString(posting.source, `postings[${index}].source`);
  assertNonEmptyString(posting.sourceJobId, `postings[${index}].sourceJobId`);
  assertNonEmptyString(posting.sourceUrl, `postings[${index}].sourceUrl`);

  if (posting.source !== expectedSource) {
    throw new Error(
      `batch source mismatch: postings[${index}].source=${String(
        posting.source
      )}, batch.source=${expectedSource}`
    );
  }

  if (!Array.isArray(posting.skills) || posting.skills.some((skill) => typeof skill !== "string")) {
    throw new Error(`postings[${index}].skills must be a string array.`);
  }
}

function assertRecord(value: unknown, field: string): asserts value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${field} must be an object.`);
  }
}

function assertNonEmptyString(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string.`);
  }
}

function assertIsoDate(value: unknown, field: string) {
  assertNonEmptyString(value, field);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${field} must be an ISO date.`);
  }
}

function dollarQuoteJson(value: unknown, tagBase: string) {
  const json = JSON.stringify(value);
  let suffix = "";

  while (json.includes(`$${tagBase}${suffix}$`)) {
    suffix = suffix ? `${Number.parseInt(suffix, 10) + 1}` : "1";
  }

  const tag = `$${tagBase}${suffix}$`;
  return `${tag}${json}${tag}`;
}

function quoteSqlString(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

function requireValue(argv: string[], index: number, option: string) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value.`);
  }
  return value;
}

const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (entryPath === fileURLToPath(import.meta.url)) {
  runJobOperationalSqlArtifacts(parseJobOperationalSqlArtifactsArgs(process.argv.slice(2))).catch(
    (error) => {
      console.error(error);
      process.exitCode = 1;
    }
  );
}
