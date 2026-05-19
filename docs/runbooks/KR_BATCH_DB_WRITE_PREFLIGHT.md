# KR Batch DB Write Preflight

Date: 2026-05-18

이 runbook은 KR 3개 source batch artifact를 공유 DB에 실제 import하기 전
승인 게이트와 승인 후 검증 결과를 고정한다.

## Goal

- 대상 source: `saramin`, `jobkorea`, `linkareer`
- 대상 artifact:
  - `tmp/saramin_batch_review.json`
  - `tmp/jobkorea_batch_review.json`
  - `tmp/linkareer_batch_review.json`
- 실제 DB write 전까지 허용되는 작업:
  - artifact schema/dry-run 검증
  - Supabase read-only count/overlap 확인
  - migration 상태 확인
  - 승인용 expected delta 계산
- 명시 승인 전 금지:
  - `db:import:jobs`에서 `--dry-run` 제거
  - `prisma migrate deploy`
  - Supabase SQL mutation
  - scheduler, inactive/closed 전환, JP source 확장

## Pre-Import State

Supabase project:

- name: `neet2work`
- project ref: `lqwggtuxgbhotnqqvtxz`
- region: `ap-northeast-1`
- status: `ACTIVE_HEALTHY`

DB state from read-only inspection before approved import:

| Check | Result |
| --- | ---: |
| `job_postings` total rows | 7 |
| `resume_analyses` total rows | 0 |
| rows without `source_job_id` | 0 |
| existing KR review overlap | 1 |
| expected new rows if import eventually runs | 30 |
| expected updated rows if import eventually runs | 1 |
| expected total `job_postings` after import | 37 |

Source-level expected delta:

| Source | Current rows | Artifact rows | Existing overlap | Expected new rows |
| --- | ---: | ---: | ---: | ---: |
| `saramin` | 1 | 10 | 0 | 10 |
| `jobkorea` | 1 | 18 | 1 | 17 |
| `linkareer` | 1 | 3 | 0 | 3 |

The existing overlap is `jobkorea/49157411`.

## Migration Sync Result

Status: resolved on 2026-05-18 through Supabase plugin SQL execution.

Applied migration:

- name: `20260515080000_job_posting_operational_lifecycle`
- checksum: `24c5226a7a900d6271676ce1423c04069f5197d85b1ce176aa4db72c44c330ab`
- sync method: direct Supabase SQL plus manual `_prisma_migrations` row insert
- verification:
  - matching `_prisma_migrations` row: 1
  - `JobPostingStatus` enum exists
  - lifecycle column count: 8
  - lifecycle index count: 3
  - existing 7 rows defaulted to `status='active'`

The shared DB now has the lifecycle columns required by the current import
code:

- `status`
- `first_seen_at`
- `last_seen_at`
- `closed_at`
- `job_category`
- `career_stage`
- `crawl_batch_id`
- `classifier_meta`

Real KR artifact import was separately approved by the user and executed on
2026-05-18 through the Supabase plugin SQL path. Prisma CLI import was not used
because the local environment did not expose `DATABASE_URL`, and the user asked
to keep Supabase operations plugin-based.

## Approved Import Result

Status: completed on 2026-05-18.

Write impact:

| Source | Before rows | Artifact rows | Existing overlap | New rows | Final rows |
| --- | ---: | ---: | ---: | ---: | ---: |
| `saramin` | 1 | 10 | 0 | 10 | 11 |
| `jobkorea` | 1 | 18 | 1 | 17 | 18 |
| `linkareer` | 1 | 3 | 0 | 3 | 4 |

Final verification:

| Check | Result |
| --- | ---: |
| `job_postings` total rows | 37 |
| expected imported KR source IDs present | 31 |
| missing expected KR source IDs | 0 |
| duplicate `(source, source_job_id)` keys | 0 |
| rows without `source_job_id` | 0 |
| KR non-active rows | 0 |
| KR `jobCategory=non_it` rows | 0 |

Source counts after import:

| Source | Rows | Active rows |
| --- | ---: | ---: |
| `saramin` | 11 | 11 |
| `jobkorea` | 18 | 18 |
| `linkareer` | 4 | 4 |

Implementation note:

- The plugin SQL import preserved normalized posting fields, lifecycle fields,
  `job_category`, `career_stage`, `crawl_batch_id`, and `classifier_meta`.
- `first_seen_at` was preserved on conflict and `last_seen_at` was refreshed
  from the batch observation.
- `jobkorea` and `linkareer` raw trace fields were backfilled after import with
  a compact normalized DB snapshot trace. This closes the shared DB null-trace
  gap without trying to replay one large plugin payload containing every heavy
  crawler raw field.

Raw trace verification after backfill:

| Source | Rows | `raw_json` | `raw_text` | `company_info` | Backfill marker |
| --- | ---: | ---: | ---: | ---: | ---: |
| `jobkorea` | 18 | 18 | 18 | 18 | 18 |
| `linkareer` | 4 | 4 | 4 | 4 | 4 |
| `saramin` | 11 | 11 | 1 | 10 | 0 |

The backfill marker is `raw_json.traceBackfill =
normalized-db-snapshot-v1`.

## Required Approval Sequence

1. Confirm artifact set:
   - `tmp/saramin_batch_review.json`
   - `tmp/jobkorea_batch_review.json`
   - `tmp/linkareer_batch_review.json`
2. Confirm expected write impact:
   - 30 new rows
   - 1 update
   - total `job_postings` expected to become 37
3. Re-run all three dry-run imports.
4. Explicitly approve real import without `--dry-run`.
5. Import one source first unless the user explicitly approves all 3 at once.
6. Verify counts and overlap after each source import.

## Commands After Approval

Dry-run checks are allowed before real import:

```powershell
Push-Location apps/backend
corepack pnpm run db:import:jobs --dry-run ../../tmp/saramin_batch_review.json
corepack pnpm run db:import:jobs --dry-run ../../tmp/jobkorea_batch_review.json
corepack pnpm run db:import:jobs --dry-run ../../tmp/linkareer_batch_review.json
Pop-Location
```

The original Prisma import commands below remain the canonical command-line
path for a future environment that exposes `DATABASE_URL`. They require explicit
approval before any new real write:

```powershell
Push-Location apps/backend
corepack pnpm run db:import:jobs -- ../../tmp/saramin_batch_review.json
corepack pnpm run db:import:jobs -- ../../tmp/jobkorea_batch_review.json
corepack pnpm run db:import:jobs -- ../../tmp/linkareer_batch_review.json
Pop-Location
```

## Supabase Plugin Operating Standard

When the local environment does not expose `DATABASE_URL`, approved shared DB
operations use the Supabase plugin path:

- Use plugin SQL only after the artifact/delta is known and the user approves
  the write.
- Wrap write operations in a transaction and take a scoped advisory lock when
  the operation can overlap with import or migration work.
- Keep large payload writes chunked or use compact DB-derived trace snapshots;
  do not paste one oversized raw payload if plugin payload handling is brittle.
- Verify after every mutation with independent read-only count/security checks.
- Keep Prisma CLI import as the canonical local command path when
  `DATABASE_URL` is available, but do not block plugin-based operations on that
  environment variable when the user has approved the plugin path.

## Lifecycle Transition Dry-Run

Status: implemented as a dry-run-only local planner. It does not write to
Supabase or Prisma.

Command shape:

```powershell
corepack pnpm run db:lifecycle:jobs:dry-run -- `
  --batch tmp/<source>_batch_review.json `
  --existing tmp/<source>_existing_lifecycle_snapshot.json `
  --inactive-threshold 3 `
  --output tmp/<source>_lifecycle_dry_run.json
```

Existing snapshot input can be a JSON array or an object with `jobs`,
`postings`, or `existingJobs`. Each row needs at least:

```json
{
  "source": "saramin",
  "sourceJobId": "123",
  "status": "active",
  "missingCount": 2
}
```

Dry-run output:

- `activeObservations`: existing source rows observed in the successful crawl;
  proposed status remains `active`.
- `closedCandidates`: existing rows observed with `status=closed` and a
  source-visible closed signal such as `접수마감`, `募集終了`, or `expired`.
- `inactiveCandidates`: absent active rows only when the next missing count
  reaches the threshold, default `3`.
- `skipped`: protected or non-actionable rows, including new postings,
  below-threshold missing rows, partial crawl protection, and closed rows
  without visible source evidence.

Partial crawl protection:

- `mode` must be `batch`.
- Any batch error blocks absent-row lifecycle changes.
- Timeout/failure/skip/drift warnings block absent-row lifecycle changes.
- A zero-posting crawl with existing rows blocks absent-row lifecycle changes.

Source snapshots for shared Supabase should still be gathered through the
Supabase plugin read path when `DATABASE_URL` is unavailable. The dry-run
planner consumes that snapshot as JSON and remains DB-write-free.

## Operational Pipeline Skeleton

Status: implemented as a plan-only CLI. It does not execute any collection,
import, Supabase query, or DB write.

Command shape:

```powershell
corepack pnpm run jobs:operational:plan -- --source <source>
```

Current KR sources accepted by the skeleton:

- `saramin`
- `jobkorea`
- `linkareer`

The emitted `job_operational_pipeline_v1` plan fixes the stage order:

1. `collect_batch`: generate `tmp/<source>_batch_review.json`.
2. `import_dry_run`: validate the batch artifact without writing DB rows.
3. `import_apply`: approval-gated DB mutation stage.
4. `lifecycle_snapshot`: Supabase plugin read step that writes
   `tmp/<source>_existing_lifecycle_snapshot.json`.
5. `lifecycle_plan`: generate `tmp/<source>_lifecycle_dry_run.json`.
6. `lifecycle_apply`: approval-gated DB lifecycle mutation stage.

This keeps the Supabase plugin path explicit while preserving the local
TypeScript/Prisma command path as the canonical import boundary.

## Manual Operational Run Plan

Status: implemented as a plan-only CLI for the full KR manual operation loop.
It emits local commands and Supabase plugin SQL snippets, but does not execute
them.

Command shape:

```powershell
corepack pnpm run jobs:operational:manual-run
```

Optional source subset:

```powershell
corepack pnpm run jobs:operational:manual-run -- --source saramin
```

The emitted `job_operational_manual_run_v1` plan fixes the current manual
run order:

1. `collect_batch`: local crawler commands for `saramin`, `jobkorea`,
   `linkareer`.
2. `import_dry_run`: local import dry-run checks.
3. `import_sql_artifact`: generate `tmp/job-operational-sql/<source>_import_apply.sql`.
4. `import_apply_approval`: approval gate before DB import mutation.
5. `import_apply`: approval-gated DB import stage. Use Supabase plugin SQL
   when local `DATABASE_URL` is unavailable or plugin operations are selected.
6. `lifecycle_snapshot`: Supabase plugin read step for existing source rows.
7. `lifecycle_plan`: local lifecycle dry-run report generation.
8. `lifecycle_sql_artifact`: generate
   `tmp/job-operational-sql/<source>_lifecycle_apply.sql`.
9. `lifecycle_apply_approval`: approval gate before lifecycle mutation.
10. `lifecycle_apply`: Supabase plugin lifecycle mutation stage with drift and
   exact update-count checks.
11. `post_apply_verification`: Supabase plugin readback for source counts,
   duplicate keys, statuses, and `non_it` absence.

This is the current scheduler substitute: run it manually, keep write stages
approval-gated, and record the readback evidence before expanding to JP sources
or automation.

## SQL Artifact Generator And Scheduler Skeleton

Status: implemented as artifact-only CLIs. They write local SQL files and
plans, but do not execute collection, Supabase queries, or DB mutations.

Generate import apply SQL after a batch artifact has passed import dry-run:

```powershell
corepack pnpm run jobs:operational:sql-artifacts -- `
  --batch tmp/<source>_batch_review.json `
  --output-dir tmp/job-operational-sql
```

Generate lifecycle apply SQL after the lifecycle dry-run report has passed
validation:

```powershell
corepack pnpm run jobs:operational:sql-artifacts -- `
  --lifecycle-report tmp/<source>_lifecycle_dry_run.json `
  --output-dir tmp/job-operational-sql
```

Generated SQL artifacts use these schemas:

- `job_operational_import_sql_v1`
- `job_operational_lifecycle_sql_v1`
- manifest: `job_operational_sql_artifacts_v1`

The lifecycle SQL is generated only after the report parser accepts the report.
It keeps the same safety posture as the local apply command: partial reports
are rejected, duplicate targets are rejected, current rows are re-read, status
and missing-count drift are checked, updates run under a transaction/advisory
lock, and the final update count must match the planned target count.

The manual scheduler skeleton is:

```powershell
corepack pnpm run jobs:operational:scheduler
```

Output schema: `job_operational_scheduler_v1`. It derives from the manual run
plan and includes only non-mutating steps: manual plan emission, collection,
import dry-run, SQL artifact generation, lifecycle snapshot, lifecycle dry-run,
lifecycle SQL artifact generation, and verification readback. Approval-gated
write steps remain excluded until the user approves a concrete DB mutation.

## KR Architecture Close-Out Before JP

Use this as the handoff gate before starting JP source work. Do not keep
polishing KR details unless one of these checks fails.

KR architecture is good enough for JP expansion when:

1. `corepack pnpm run jobs:operational:scheduler` emits the full non-mutating
   KR flow for `saramin`, `jobkorea`, and `linkareer`.
2. Each KR source can generate both SQL artifacts:
   - `tmp/job-operational-sql/<source>_import_apply.sql`
   - `tmp/job-operational-sql/<source>_lifecycle_apply.sql`
3. The generated SQL artifacts include schema markers, advisory locks, and
   drift guards.
4. DB mutation remains explicit: import apply and lifecycle apply require
   separate approval.

Backlog after JP architecture starts:

- cron/background scheduling
- automatic Supabase apply
- exhaustive closed/inactive edge-case tuning
- source-specific inactive thresholds
- UI exposure of lifecycle/category fields

Approved manual operational rehearsal result on 2026-05-18:

| Source | Batch rows | New rows applied | Final rows | Active | Closed | Inactive | `non_it` | `missingCount=0` | `missingCount=1` | `missingCount=2` |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `saramin` | 7 | 5 | 16 | 16 | 0 | 0 | 0 | 7 | 8 | 1 |
| `jobkorea` | 17 | 1 | 19 | 19 | 0 | 0 | 0 | 17 | 2 | 0 |
| `linkareer` | 4 | 1 | 5 | 5 | 0 | 0 | 0 | 4 | 0 | 1 |

Lifecycle apply for the rehearsal updated active observations `28/28` and
below-threshold missing rows `12/12`. No closed or inactive transition was
made. New rows `7/7` were verified with both `raw_json` and `raw_text`, and
duplicate `(source, source_job_id)` count remained `0`.

## Lifecycle Apply Command

Status: implemented. Do not run it against a database without explicit approval.

Command shape:

```powershell
corepack pnpm run db:lifecycle:jobs:apply -- --report tmp/<source>_lifecycle_dry_run.json
```

The local command requires `DATABASE_URL`. If the local environment still does
not expose it, use the Supabase plugin SQL path only after approval and preserve
the same checks:

- report schema must be `job_lifecycle_dry_run_v1`
- `generatedAt` must be present
- partial reports are rejected
- bucket counts must match decision arrays
- unknown decision or skipped reasons are rejected
- current DB rows are re-read before mutation
- missing rows, duplicate rows, status drift, or `missingCount` drift fail
- source decisions run in a transaction
- every mutation must update exactly one row

Mutation behavior:

- observed rows: set/keep `active`, refresh `lastSeenAt`, set
  `classifierMeta.lifecycle.missingCount=0`
- source-visible closed candidates: set `closed`, set `closedAt`, set
  `missingCount=0`
- inactive candidates: set `inactive`, write the threshold-reaching
  `missingCount`
- below-threshold missing rows: update only `classifierMeta.lifecycle`, not
  `status`
- existing `classifierMeta` classification/debug fields are preserved while the
  nested lifecycle metadata is updated
- below-threshold missing rows from the same crawl may be treated as already
  applied when `missingCount`, `lastDecision`, and crawl batch metadata already
  match the report. They must not be incremented a second time.

Approved lifecycle apply result on 2026-05-18:

| Check | Result |
| --- | ---: |
| active observation rows updated | 31 |
| missing rows already applied for same crawl | 2 |
| closed rows updated | 0 |
| inactive rows updated | 0 |
| duplicate `(source, source_job_id)` rows | 0 |
| KR `jobCategory=non_it` rows | 0 |

Final lifecycle readback:

| Source | Rows | Active | Closed | Inactive | `missingCount=0` | `missingCount=1` | Active report-marked |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `saramin` | 11 | 11 | 0 | 0 | 10 | 1 | 10 |
| `jobkorea` | 18 | 18 | 0 | 0 | 18 | 0 | 18 |
| `linkareer` | 4 | 4 | 0 | 0 | 3 | 1 | 3 |

The two below-threshold missing rows remain active:

- `saramin/53846395`: `missingCount=1`,
  `lastDecision=missing_threshold_not_met`,
  crawl batch `saramin-20260518T01161859249`
- `linkareer/321489`: `missingCount=1`,
  `lastDecision=missing_threshold_not_met`,
  crawl batch `linkareer-20260518T01204916025`

KR dry-run reports generated on 2026-05-18:

| Source | Existing snapshot | Dry-run report | Observed | Closed candidates | Inactive candidates | Skipped |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| `saramin` | `tmp/saramin_existing_lifecycle_snapshot.json` | `tmp/saramin_lifecycle_dry_run.json` | 10 | 0 | 0 | 1 |
| `jobkorea` | `tmp/jobkorea_existing_lifecycle_snapshot.json` | `tmp/jobkorea_lifecycle_dry_run.json` | 18 | 0 | 0 | 0 |
| `linkareer` | `tmp/linkareer_existing_lifecycle_snapshot.json` | `tmp/linkareer_lifecycle_dry_run.json` | 3 | 0 | 0 | 1 |

Skipped details:

- `saramin/53846395`: `missing_threshold_not_met`, next missing count `1`.
- `linkareer/321489`: `missing_threshold_not_met`, next missing count `1`.

Supabase readback after report generation still showed all KR rows active:
`saramin=11`, `jobkorea=18`, `linkareer=4`.

## Post-Write Verification

After each approved write, run read-only checks:

```sql
select source, count(*)::int as count
from public.job_postings
where source in ('saramin', 'jobkorea', 'linkareer')
group by source
order by source;

select count(*)::int as total_rows
from public.job_postings;

select source, source_job_id, count(*)::int as duplicate_count
from public.job_postings
where source in ('saramin', 'jobkorea', 'linkareer')
group by source, source_job_id
having count(*) > 1;
```

Expected after all three approved imports:

| Source | Expected rows |
| --- | ---: |
| `saramin` | 11 |
| `jobkorea` | 18 |
| `linkareer` | 4 |

Expected total `job_postings`: `37`.

## Security Note

Status: resolved on 2026-05-18 through Supabase plugin migration
`restrict_prisma_migrations_rls`.

Applied remediation:

```sql
REVOKE ALL PRIVILEGES ON TABLE public._prisma_migrations
FROM anon, authenticated, PUBLIC;

ALTER TABLE public._prisma_migrations ENABLE ROW LEVEL SECURITY;
```

Verification:

| Check | Result |
| --- | --- |
| `_prisma_migrations` RLS | enabled |
| `_prisma_migrations` force RLS | disabled |
| `_prisma_migrations` anon/auth/PUBLIC grants | none |
| `_prisma_migrations` policies | 0 |
| Prisma migration rows preserved | 5 |

No public policy is created intentionally. With RLS enabled and no anon/auth
table grants, public Data API access is denied while service/direct database
maintenance paths remain available.
