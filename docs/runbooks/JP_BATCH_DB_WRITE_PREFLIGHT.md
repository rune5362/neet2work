# JP Batch DB Write Preflight

Date: 2026-05-19

이 runbook은 JP 4개 source batch artifact를 공유 DB에 실제 import하기 전
승인 게이트와 read-only 검증 결과를 고정한다.

## Goal

- 대상 source: `mynavi_tenshoku`, `green_japan`, `daijob`, `careercross`
- 대상 artifact:
  - `tmp/mynavi_tenshoku_batch_review.json`
  - `tmp/green_japan_batch_review.json`
  - `tmp/daijob_batch_review.json`
  - `tmp/careercross_batch_review.json`
- 실제 DB write 전까지 허용되는 작업:
  - artifact schema/dry-run 검증
  - Supabase read-only count/overlap 확인
  - import SQL artifact 생성
  - 승인용 expected delta 계산
- 명시 승인 전 금지:
  - `db:import:jobs`에서 `--dry-run` 제거
  - generated SQL artifact 실행
  - Supabase SQL mutation
  - lifecycle apply
  - scheduler/background automation

## Artifact Result

All four JP artifacts were generated through the public HTTP/HTML collectors
with `mode=batch`, `limit=50`, `sourceCap=20`, and no DB writes.

| Source | Artifact | Rows | Warnings | Errors | Dry-run import |
| --- | --- | ---: | ---: | ---: | --- |
| `mynavi_tenshoku` | `tmp/mynavi_tenshoku_batch_review.json` | 20 | 0 | 0 | passed |
| `green_japan` | `tmp/green_japan_batch_review.json` | 15 | 0 | 0 | passed |
| `daijob` | `tmp/daijob_batch_review.json` | 15 | 0 | 0 | passed |
| `careercross` | `tmp/careercross_batch_review.json` | 3 | 0 | 0 | passed |

Total JP artifact rows: `53`.

## Category And Career Mix

Category mix:

| Source | `data_ai` | `it_infrastructure_security` | `other_it` | `product_design` | `product_planning` | `software_engineering` |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `mynavi_tenshoku` | 4 | 1 | 10 | 1 | 4 | 0 |
| `green_japan` | 5 | 1 | 6 | 0 | 1 | 2 |
| `daijob` | 4 | 4 | 1 | 0 | 0 | 6 |
| `careercross` | 2 | 0 | 1 | 0 | 0 | 0 |

Career-stage mix:

| Source | `entry` | `career_unspecified` | `mid` | `senior` | `lead_manager` | `unknown` |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `mynavi_tenshoku` | 20 | 0 | 0 | 0 | 0 | 0 |
| `green_japan` | 2 | 1 | 12 | 0 | 0 | 0 |
| `daijob` | 2 | 0 | 0 | 1 | 2 | 10 |
| `careercross` | 1 | 0 | 0 | 0 | 2 | 0 |

Notes:

- No artifact contains `jobCategory=non_it`.
- No artifact contains duplicate `sourceJobId` values within the same source.
- `daijob` now starts from public IT industry filters:
  `Software Vendor(119)`, `IT - Other(122)`, and `IT Consulting(124)`.
- `careercross` currently yields only 3 IT-scope rows from the first reviewed
  batch window. Treat this as low yield, not a blocker.

## SQL Artifacts

Generated import SQL artifacts:

| Source | SQL artifact | Manifest |
| --- | --- | --- |
| `mynavi_tenshoku` | `tmp/job-operational-sql/mynavi_tenshoku_import_apply.sql` | `tmp/job-operational-sql/mynavi_tenshoku_sql_artifacts_manifest.json` |
| `green_japan` | `tmp/job-operational-sql/green_japan_import_apply.sql` | `tmp/job-operational-sql/green_japan_sql_artifacts_manifest.json` |
| `daijob` | `tmp/job-operational-sql/daijob_import_apply.sql` | `tmp/job-operational-sql/daijob_sql_artifacts_manifest.json` |
| `careercross` | `tmp/job-operational-sql/careercross_import_apply.sql` | `tmp/job-operational-sql/careercross_sql_artifacts_manifest.json` |

Execution policy: artifact-only. These files must not be executed without a
separate explicit DB write approval.

## Supabase Read-Only Pre-Import State

Supabase project:

- name: `neet2work`
- project ref: `lqwggtuxgbhotnqqvtxz`
- region: `ap-northeast-1`

Read-only check result before JP import approval:

| Check | Result |
| --- | ---: |
| `job_postings` total rows | 44 |
| JP rows without `source_job_id` | 0 |
| JP rows with `job_category=non_it` | 0 |
| duplicate JP `(source, source_job_id)` keys | 0 |
| expected new rows if import eventually runs | 51 |
| expected updated rows if import eventually runs | 2 |
| expected total `job_postings` after import | 95 |

Source-level expected delta:

| Source | Current rows | Artifact rows | Existing overlap | Expected new rows | Expected final source rows |
| --- | ---: | ---: | ---: | ---: | ---: |
| `mynavi_tenshoku` | 1 | 20 | 1 | 19 | 20 |
| `green_japan` | 1 | 15 | 1 | 14 | 15 |
| `daijob` | 1 | 15 | 0 | 15 | 16 |
| `careercross` | 1 | 3 | 0 | 3 | 4 |

Existing overlaps:

| Source | `sourceJobId` | Current status | Note |
| --- | --- | --- | --- |
| `mynavi_tenshoku` | `256670-1-107-1` | `active` | expected update |
| `green_japan` | `11130-315985` | `active` | expected update |

Existing `daijob` and `careercross` sample rows do not overlap the new batch
artifacts, so they remain as existing rows unless a future cleanup is approved.

## Required Approval Sequence

1. Confirm artifact set:
   - `tmp/mynavi_tenshoku_batch_review.json`
   - `tmp/green_japan_batch_review.json`
   - `tmp/daijob_batch_review.json`
   - `tmp/careercross_batch_review.json`
2. Confirm expected write impact:
   - 51 new rows
   - 2 updates
   - total `job_postings` expected to become 95
3. Re-run all four dry-run imports.
4. Explicitly approve real import without `--dry-run`.
5. Import one source first unless the user explicitly approves all 4 at once.
6. Verify counts and overlap after each source import.

## Commands

Dry-run checks are allowed before real import:

```powershell
corepack pnpm run db:import:jobs --dry-run ../../tmp/mynavi_tenshoku_batch_review.json
corepack pnpm run db:import:jobs --dry-run ../../tmp/green_japan_batch_review.json
corepack pnpm run db:import:jobs --dry-run ../../tmp/daijob_batch_review.json
corepack pnpm run db:import:jobs --dry-run ../../tmp/careercross_batch_review.json
```

The canonical local command path after approval is:

```powershell
corepack pnpm run db:import:jobs -- ../../tmp/mynavi_tenshoku_batch_review.json
corepack pnpm run db:import:jobs -- ../../tmp/green_japan_batch_review.json
corepack pnpm run db:import:jobs -- ../../tmp/daijob_batch_review.json
corepack pnpm run db:import:jobs -- ../../tmp/careercross_batch_review.json
```

The local commands require `DATABASE_URL`. If unavailable, use the Supabase
plugin SQL path only after explicit approval, using the generated SQL artifacts
above and the same post-write verification checks.

## Post-Write Verification

After each approved write, run read-only checks:

```sql
select source, count(*)::int as count
from public.job_postings
where source in ('mynavi_tenshoku', 'green_japan', 'daijob', 'careercross')
group by source
order by source;

select count(*)::int as total_rows
from public.job_postings;

select source, source_job_id, count(*)::int as duplicate_count
from public.job_postings
where source in ('mynavi_tenshoku', 'green_japan', 'daijob', 'careercross')
group by source, source_job_id
having count(*) > 1;

select source, count(*)::int as non_it_rows
from public.job_postings
where source in ('mynavi_tenshoku', 'green_japan', 'daijob', 'careercross')
  and job_category = 'non_it'
group by source;
```

Expected after all four approved imports:

| Source | Expected rows |
| --- | ---: |
| `mynavi_tenshoku` | 20 |
| `green_japan` | 15 |
| `daijob` | 16 |
| `careercross` | 4 |

Expected total `job_postings`: `95`.

## Approved Import Attempt - 2026-05-19

The user approved the JP import apply on 2026-05-19. The import used the
Supabase plugin SQL path because the local `DATABASE_URL` path was not used in
this session.

Because the full generated SQL artifacts are too large for reliable MCP
payload handling, an MCP-specific compact SQL path was generated under
`tmp/job-operational-sql/*_import_apply_mcp*.sql`. This path writes the
operational posting columns and classifier metadata, but intentionally does not
write `raw_text`, `raw_json`, or `company_info` for newly inserted rows. The
canonical full SQL artifacts remain in `tmp/job-operational-sql/*_import_apply.sql`
for later raw-trace backfill if needed.

Applied and verified:

| Source | Result |
| --- | --- |
| `careercross` | Applied 3 batch rows; verified source rows `4`, batch rows `3`, `non_it=0`. |
| `daijob` | Applied 15 batch rows; verified source rows `16`, batch rows `15`, `non_it=0`. |
| `green_japan` | Applied 15 batch rows. `chunk01` through `chunk05` succeeded before the MCP interruption; after reconnect, read-only verification showed `chunk06` had not committed, then the remaining 3 rows were applied with 1-row plugin payloads. Verified source rows `15`, batch rows `15`, `non_it=0`. |
| `mynavi_tenshoku` | Applied 20 batch rows with 2-row plugin payloads. Verified source rows `20`, batch rows `20`, `non_it=0`. |

Operational notes:

- The first compact `careercross` attempt failed before commit because
  `updated_at` was missing from the generated compact insert. A read-only check
  confirmed no `careercross` batch rows were written, then the MCP SQL was
  regenerated with both `created_at` and `updated_at`.
- A later single-line SQL no-op was caught because a leading `--` comment
  swallowed the whole command. The comment was removed before the successful
  `careercross` apply.
- A manual paste error in `green_japan` `chunk03` was rejected before execution
  by the tool reviewer. The corrected chunk was then applied successfully.
- After `green_japan` `chunk06`, even `select 1` failed through the Supabase
  MCP with a transport deserialize/upstream disconnect error. DB writes were
  stopped to avoid blind continuation.
- Supabase MCP was reconnected through the Codex app/plugin path. The CLI
  server registration was also repaired under the approved global config scope,
  but the final DB writes used the Supabase plugin `_execute_sql` path.
- A manual paste error in the first `mynavi_tenshoku` 2-row retry was rejected
  before execution by the tool reviewer. The corrected chunk was then applied.

## Final Verification - 2026-05-19

Read-only Supabase checks after the approved apply:

| Source | Expected rows | Verified rows | Duplicate key groups | `non_it` rows |
| --- | ---: | ---: | ---: | ---: |
| `mynavi_tenshoku` | 20 | 20 | 0 | 0 |
| `green_japan` | 15 | 15 | 0 | 0 |
| `daijob` | 16 | 16 | 0 | 0 |
| `careercross` | 4 | 4 | 0 | 0 |

Verified total `job_postings`: `95`.

## Lifecycle Dry-Run - 2026-05-19

The JP lifecycle snapshot and dry-run pass was generated after the approved
import apply. This pass did not write to the database.

Generated snapshot inputs:

| Source | Existing snapshot rows | Snapshot |
| --- | ---: | --- |
| `mynavi_tenshoku` | 20 | `tmp/mynavi_tenshoku_existing_lifecycle_snapshot.json` |
| `green_japan` | 15 | `tmp/green_japan_existing_lifecycle_snapshot.json` |
| `daijob` | 16 | `tmp/daijob_existing_lifecycle_snapshot.json` |
| `careercross` | 4 | `tmp/careercross_existing_lifecycle_snapshot.json` |

Generated dry-run reports:

| Source | Observed | Closed candidates | Inactive candidates | Skipped | Review |
| --- | ---: | ---: | ---: | ---: | --- |
| `mynavi_tenshoku` | 20 | 0 | 0 | 0 | All current batch rows remain active. |
| `green_japan` | 15 | 0 | 0 | 0 | All current batch rows remain active. |
| `daijob` | 15 | 0 | 0 | 1 | Existing sample row `1463203` is missing once, below inactive threshold 3. |
| `careercross` | 3 | 0 | 0 | 1 | Existing sample row `1592533` is missing once, below inactive threshold 3. |

Generated lifecycle SQL artifacts:

| Source | Lifecycle SQL artifact |
| --- | --- |
| `mynavi_tenshoku` | `tmp/job-operational-sql/mynavi_tenshoku_lifecycle_apply.sql` |
| `green_japan` | `tmp/job-operational-sql/green_japan_lifecycle_apply.sql` |
| `daijob` | `tmp/job-operational-sql/daijob_lifecycle_apply.sql` |
| `careercross` | `tmp/job-operational-sql/careercross_lifecycle_apply.sql` |

Review outcome: no source-visible closed signals and no inactive-threshold
hits were found. Lifecycle apply is not required for status changes. If the
project wants lifecycle metadata bookkeeping, the generated apply SQL would
reset observed rows to `missingCount=0` and increment the two old sample rows
to `missingCount=1`; that remains a separate approval-gated DB mutation.

## Remaining Work

- Backfill `raw_text`, `raw_json`, and `company_info` from canonical full SQL or
  JSON artifacts if raw trace is required.
- JP lifecycle apply remains a separate approval-gated mutation and is optional
  for this pass because there are no closed or inactive candidates.
- `careercross` may need a later source-specific review if 3-row yield is too
  low for product needs.
