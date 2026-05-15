# Operational Job Collection Scope Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the current 1-sample-per-source crawler proof into a bounded operational collection flow for active job postings.

**Architecture:** Keep the existing split: Python collectors fetch and parse public HTML into standard JSON, TypeScript validates/imports that JSON, and Prisma writes to PostgreSQL/Supabase. Collection stays limited to `GREEN` sources and does not use browser automation, login, captcha bypass, proxy, stealth, or undocumented internal APIs.

**Tech Stack:** Python stdlib HTTP/HTML parsing, TypeScript `tsx`, Prisma 7, PostgreSQL/Supabase, existing `corepack pnpm` workspace scripts.

---

## Non-Negotiable Collection Boundaries

- Collect from public HTML pages only.
- Do not use browser automation, headless browsers, login/captcha bypass, proxy/stealth behavior, or undocumented/internal API endpoints.
- If a source requires JavaScript rendering, login, captcha, or an undocumented endpoint to retrieve usable postings, downgrade that source to `YELLOW` and remove it from operational batch collection.
- Python collectors may fetch and parse public HTTP/HTML only.
- Python collectors must produce JSON artifacts only and must never write to PostgreSQL/Supabase.
- TypeScript/Prisma remains the only DB import boundary.
- Raw/internal fields including `rawText`, `rawJson`, and `companyInfo` must never appear in public API DTOs or front-end job list types.

## Scope Decision

This plan changes the collection target from "one sample row per source" to "bounded active postings per source."

### Keep

- Only collect from verified `GREEN` sources.
- Exclude closed, expired, or ended postings.
- Keep Python collectors JSON-only and DB-write-free.
- Keep TypeScript/Prisma as the only DB import boundary.
- Preserve mock/demo stability when live collection fails.

### Change

- Limit the first operational collection scope to IT postings.
- Treat non-IT postings as future expansion candidates, not current import targets.
- Prioritize entry-level, intern, junior, and career-unspecified postings.
- Include regular career postings too.
- Keep senior/lead/manager postings, but cap them lower than early-career postings.
- Treat source/category caps as product-quality controls, not just crawler safety controls.

### Do Not Do Yet

- Do not implement code in this planning slice.
- Do not remove current sample JSON artifacts.
- Do not schedule background crawling yet.
- Do not collect all postings from any source without a cap.
- Do not add browser automation for collection.

## Target Collection Policy

### Source Eligibility

Use only current `GREEN` sources:

| Source | Country | Initial Role |
| --- | --- | --- |
| `saramin` | KR | Korea IT job collection |
| `jobkorea` | KR | Korea IT job collection |
| `linkareer` | KR | Korea IT intern/junior/public recruitment collection |
| `mynavi_tenshoku` | JP | Japan IT/Web/Game collection |
| `daijob` | JP | Japan/global IT bilingual collection |
| `careercross` | JP | Japan/global IT bilingual collection |
| `green_japan` | JP | Japan startup/IT/Web collection |

`YELLOW` and `RED` sources remain evidence-only until re-reviewed.

Operational rollout is narrower than the sample matrix:

- Keep sample-mode matrix coverage for all 7 current `GREEN` sources.
- Do not run all 7 sources as the first operational DB-write batch.
- First operational DB-write review batch should use at most 3 sources: `saramin`, `jobkorea`, and `linkareer`.
- Add JP/global sources only after the KR first batch has clean category/career mix, stable IDs, and acceptable source drift behavior.

### Source Collection Contract

Before batch collection, each `GREEN` source must have a source contract recorded in the crawler docs or evidence notes.

For each source, document:

| Field | Required Decision |
| --- | --- |
| `source` | Canonical source key used in DB/import JSON |
| Public list URL pattern | Public HTML listing page used for discovery |
| Public detail URL pattern | Public HTML detail page used for parsing |
| `sourceJobId` extraction | Stable ID rule; use canonical URL hash only if explicitly approved |
| Active-list evidence | Why postings discovered from this page can be treated as active candidates |
| Closed-signal rules | Source-specific closed/expired text or page patterns |
| Pagination rule | Maximum pages and stop conditions |
| Required parsed fields | Minimum fields needed for import eligibility |
| Optional parsed fields | Fields allowed to be missing without failing the posting |
| Request delay | Per-detail delay and max request count |
| Downgrade triggers | Login, captcha, JS-only rendering, HTTP failure spike, selector drift, or internal API dependence |

A source remains `GREEN` only while the contract can be satisfied through public HTTP + HTML parsing.

### Posting Status Rule

Collect only postings that appear active.

Closed signals:

- Korean: `마감`, `접수마감`, `채용마감`, `지원마감`, `종료`, `접수종료`
- Japanese: `募集終了`, `掲載終了`, `受付終了`, `応募終了`
- English: `closed`, `expired`, `no longer accepting`, `ended`

Active/ambiguous signals:

- `상시채용`, `채용시까지`, `수시채용`
- `随時`, `通年`, `ongoing`
- Missing deadline with visible apply URL or active listing page

Rule:

- Explicit closed signal: skip or mark `closed`.
- Explicit active signal: collect.
- Ambiguous but visible on active list page: collect as `active` with raw `deadlineText`.
- Previously collected but not seen in a later crawl: do not delete immediately.

### Posting Lifecycle State Machine

Operational import should use the following lifecycle rules:

| Observation | Import behavior |
| --- | --- |
| Posting is collected from an active list and has no explicit closed signal | Create/update as `active`; update `lastSeenAt` |
| Posting has explicit active signal | Create/update as `active`; update `lastSeenAt` |
| Posting has explicit closed signal and already exists in DB | Mark as `closed`; set `closedAt` if empty |
| Posting has explicit closed signal and is not in DB | Skip import unless collecting closure evidence for diagnostics |
| Posting is not seen in one successful source crawl | Do not change status |
| Posting is not seen after the agreed missing threshold | Mark as `inactive`, not `closed` |
| Source crawl fails or is partial | Do not mark missing postings inactive or closed |

Initial missing threshold:

- Mark as `inactive` only after `3` successful source crawls where the posting is absent.
- Closed postings require explicit source-visible closed evidence.
- Missing postings should never be deleted by import.

### Career Stage Rule

Normalize each posting into a future `careerStage` value:

| Value | Meaning | Priority |
| --- | --- | --- |
| `intern` | internship, trainee, 체험형/채용연계 인턴 | High |
| `entry` | 신입, 新卒, graduate, no prior experience | High |
| `junior` | 주니어, 1-3 years, early career | High |
| `career_unspecified` | 경력무관, experience welcome, no clear years | High |
| `mid` | 3-7 years or normal career posting | Medium |
| `senior` | 7+ years, senior specialist | Low |
| `lead_manager` | lead, manager, PM lead, 팀장, 관리자 | Low |
| `unknown` | cannot classify from public fields | Medium until reviewed |

Initial target mix:

| Career Group | Target Share | Notes |
| --- | --- | --- |
| `intern`, `entry`, `junior`, `career_unspecified` | 60% | Main Neet2Work target |
| `mid`, `unknown` | 30% | Useful for broader career consulting |
| `senior`, `lead_manager` | 10% | Keep some, avoid dominating recommendations |

### Career Stage Classification Evidence

Each classification should be deterministic and conservative.

- Classify from public fields only: title, career/experience text, deadline text, visible tags, and visible description snippets.
- Prefer explicit source text over inferred title keywords.
- Return `unknown` when evidence is weak or conflicting.
- Record classifier evidence internally when practical, but do not expose it through public API.
- Do not force the 60/30/10 mix if the source does not contain enough qualifying postings.
- Early-career priority means "fill early-career buckets first," not "misclassify ambiguous postings as early-career."

### Job Category Rule

Restrict the first operational collection to IT. Normalize each posting into an IT-focused `jobCategory` value:

| Value | Examples |
| --- | --- |
| `software_engineering` | backend, frontend, full-stack, app, game, server, API |
| `data_ai` | data analyst, ML, AI service, BI |
| `it_infrastructure_security` | DevOps, cloud, SRE, system/network, security |
| `qa_testing` | QA engineer, test automation, software tester |
| `product_planning` | IT service planning, PM, PO, platform/business planning |
| `product_design` | UX/UI, product design for web/app/platform |
| `technical_support` | IT helpdesk, technical support, support engineer, SaaS CS |
| `solution_consulting` | solution sales, cloud/SI/ERP consultant, technical sales |
| `other_it` | IT context is visible, but function is not classifiable |
| `non_it` | excluded from the current operational import |

Do not use geography as a job category. Represent Japan/global/bilingual context separately through existing or future fields such as `country`, `source`, `language`, `languageRequirementText`, or `isBilingualRole`.

Excluded for the first operational scope:

- general admin, HR, accounting, retail, logistics, hospitality, manufacturing, legal, healthcare, and general office jobs
- general sales, CS, marketing, content, or planning roles with no visible software/platform/IT product context
- language-only or Japan/global roles without a software/platform/IT product context

Initial category caps should prevent one category from flooding the DB:

- Per source: 50 active postings maximum in the first operational run.
- Per category per source: 12 active postings maximum.
- Per career group per source: early-career 35, mid/unknown 12, senior/lead 3.

These caps can increase after one successful run and manual review.

### Cap Enforcement Order

For each source batch:

1. Parse active listing candidates.
2. Drop explicit closed/expired postings.
3. Classify career stage and job category.
4. Drop `non_it` postings from the current operational payload.
5. Fill early-career buckets first up to the per-source cap.
6. Fill mid/unknown buckets second.
7. Fill senior/lead buckets last.
8. Enforce per-category caps throughout.
9. Stop when source cap, page cap, request cap, or drift/failure stop condition is reached.

Caps are best-effort quality controls. Do not backfill weak, stale, closed, or misclassified postings simply to hit a target share.

## Data Model Plan

The current schema can store collected postings, but operational collection needs lifecycle fields.

### Add Before Operational Batch Import

Modify `apps/backend/prisma/schema.prisma` in a future implementation slice:

| Field | Type | Purpose |
| --- | --- | --- |
| `status` | enum/string | `active`, `closed`, `inactive`, `unknown` |
| `firstSeenAt` | DateTime | first time this source posting entered DB |
| `lastSeenAt` | DateTime | latest crawl that still saw this posting |
| `closedAt` | DateTime? | time we detected closure |
| `jobCategory` | string | normalized product category |
| `careerStage` | string | normalized career stage |
| `crawlBatchId` | string? | trace a row to a collection run |
| `classifierMeta` | Json? | optional internal classification evidence/confidence |

Keep existing fields:

- `deadlineText` remains the source-facing deadline text.
- `source + sourceJobId` remains the dedupe key.
- `rawText` and `rawJson` remain internal trace fields only.

Schema decisions to freeze before code:

- `status` should be constrained to `active`, `closed`, `inactive`, or `unknown`.
- `sourceJobId` should be required for operational imports. If a source cannot expose a stable ID, that source must be explicitly approved for canonical URL hash fallback or downgraded.
- Operational import should dedupe by `(source, sourceJobId)`, not by generated DB `id`.
- `crawlBatchId` and classifier evidence are internal trace fields and must not be public DTO fields.

### Internal vs Public Field Boundary

The DB may retain internal trace fields, but public API and front-end job list types must use an explicit allowlist.

Internal-only fields:

- `rawText`
- `rawJson`
- `companyInfo`
- `crawlBatchId`
- source parsing diagnostics
- classifier evidence/debug fields, if added

Public job list fields may include only approved display/filter fields such as:

- `id`
- `source`
- `title`
- `company`
- `location`
- `careerLevel`
- `skills`
- `description`
- `sourceUrl`
- `deadlineText`
- `country`
- `language`
- `jobCategory`, if product decides to expose it
- `careerStage`, if product decides to expose it
- `status`, only if UI filtering/display is ready

Add a test or type-level check that fails if `rawText`, `rawJson`, or `companyInfo` appear in public job list responses.

### Avoid For Now

- Separate company table.
- Separate source table.
- Full raw HTML archive.
- Per-user personalization tables.
- Resume analysis persistence changes.

Those can come after operational collection is stable.

## Collection Flow Plan

### Batch JSON Contract

Each collector batch artifact should use a stable, versioned JSON envelope instead of an unversioned array.

Required batch-level fields:

| Field | Purpose |
| --- | --- |
| `schemaVersion` | Import contract version, for example `job_batch_v1` |
| `source` | Canonical source key |
| `mode` | `sample` or `batch` |
| `crawlBatchId` | Stable ID for tracing one run |
| `collectedAt` | ISO timestamp |
| `sourceCap` | Cap requested for this run |
| `postings` | Array of normalized posting objects |
| `warnings` | Non-fatal source/parser warnings |
| `errors` | Fatal or skipped-item diagnostics |

Required posting-level fields should follow the repo's current `CollectedJobPosting` naming:

| Field | Requirement |
| --- | --- |
| `id` | App row ID, derived from `{source}-{sourceJobId}` |
| `source` | Must match batch source |
| `sourceJobId` | Required stable source posting key |
| `sourceUrl` | Canonical public detail URL |
| `title` | Required |
| `company` | Required when visible |
| `location` | Raw visible location text when available |
| `careerLevel` | Raw source career/experience text |
| `status` | Future field: `active`, `closed`, `inactive`, or `unknown` |
| `deadlineText` | Raw visible deadline text when available |
| `careerStage` | Future normalized career-stage value |
| `jobCategory` | Future normalized job-function category value |

Import should reject or quarantine postings missing required identity fields. During migration from current array samples, sample-mode compatibility must be kept until all root checks are updated.

### Phase 1: Policy Freeze

**Files:**

- Modify: `docs/research/job-sites/JOB_POSTING_COLLECTION_SCHEMA.md`
- Modify: `scripts/job_crawler/README.md`
- Modify: `docs/plans/2026-05-15-job-collection-pipeline.md`

- [x] Add active-only collection rule.
- [x] Add source collection contract template and one contract stub per current `GREEN` source.
- [x] Add career-stage rule.
- [x] Add IT-only category rule.
- [x] Add source/category/career caps.
- [x] State that closed postings are skipped or marked closed, never blindly deleted.
- [x] State that operational imports dedupe by `(source, sourceJobId)`.
- [x] Verify docs only with `git diff --check`.

### Phase 2: Schema Lifecycle Fields

**Files:**

- Modify: `apps/backend/prisma/schema.prisma`
- Create: new Prisma migration under `apps/backend/prisma/migrations/`
- Modify: `apps/backend/src/types/job.ts`
- Modify: `apps/backend/prisma/importJobPostings.ts`
- Test: backend typecheck and import tests

- [x] Add lifecycle/category fields to Prisma schema.
- [x] Create a migration with nullable/default-safe fields.
- [x] Update collected job type definitions.
- [x] Decide whether `sourceJobId` becomes required for operational imports while preserving existing rows.
- [x] Keep public API response minimal unless the UI needs new fields.
- [x] Add an allowlisted public job DTO if raw/internal fields could otherwise leak.
- [x] Run Prisma validation and backend typecheck.
- [x] Do not alter `resume_analyses`.

### Phase 3: Normalization Helpers

**Files:**

- Create: `scripts/job_crawler/contract.py`
- Test: `scripts/job_crawler` Python compile check
- Later optional test file if Python test harness is added

- [ ] Add `classify_status(text, deadline_text, list_context)`.
- [x] Add `classify_career_stage(career_text, title, description)`.
- [x] Add `classify_job_category(title, skills, description)`.
- [x] Keep the helper deterministic and source-agnostic.
- [x] Return `unknown` instead of guessing too aggressively.
- [x] Keep classifier evidence internal-only, either in `rawJson` or the future internal classifier metadata field.

### Phase 4: Collector Mode Split

**Files:**

- Create: `scripts/job_crawler/run_source.py`
- Modify: `apps/backend/src/scripts/jobCrawlerImportCheck.ts`

- [x] Keep current sample checks stable.
- [x] Add future `sample` mode: default 1, maximum 5.
- [x] Add future `batch` mode: source cap 50 for first run.
- [x] Enforce delay for multi-detail collection.
- [ ] Stop collection when closed-signal density or HTTP failures spike.
- [x] Validate batch JSON shape before handing it to import dry-run.
- [x] Generate JSON only; never write DB from Python.

### Phase 5: Import Semantics

**Files:**

- Modify: `apps/backend/prisma/importJobPostings.ts`
- Test: import dry-run and backend tests

- [x] Upsert active postings by the unique `(source, sourceJobId)` key, not by generated DB `id`.
- [x] Reject or quarantine postings with missing/unstable `sourceJobId`.
- [x] Validate batch `schemaVersion` before import.
- [x] Validate that every posting source matches the batch source.
- [x] Set `firstSeenAt` only on create.
- [x] Update `lastSeenAt` only for successful active observations.
- [x] Set `status=active` for collected active postings.
- [ ] Mark explicitly closed postings as `closed` only when source-visible closure evidence exists.
- [ ] Mark absent postings `inactive` only after the agreed missing threshold and only after successful source crawls.
- [x] Do not delete postings during import.
- [x] Keep `rawText`, `rawJson`, and `companyInfo` internal-only.
- [x] Keep `--dry-run` as the required first check.

### Phase 6: Review Run

**Files:**

- Output: `tmp/<source>_batch_check.json`
- Output: source evidence notes only when behavior changes

- [ ] Run one source at a time.
- [ ] Start with 20 postings per source, not 50.
- [ ] First operational DB-write review uses at most 3 KR sources, not all 7 sample-matrix sources.
- [ ] Manually inspect category/career mix.
- [ ] Raise to 50 only after the source output looks clean.
- [ ] If a source drifts, downgrade to `YELLOW` and remove it from batch matrix.

## Verification Plan

Use this order when implementing later:

1. `git status --short`
2. `python -B -m py_compile scripts/job_crawler/*.py`
3. `corepack pnpm run crawl:matrix:check`
4. `corepack pnpm --filter @neet2work/backend test`
5. `corepack pnpm --filter @neet2work/backend lint`
6. `.\apps\backend\node_modules\.bin\tsc.CMD --noEmit -p apps\backend\tsconfig.json`
7. `corepack pnpm run db:import:jobs --dry-run <batch-json>`
8. Validate collector JSON against the batch schema before dry-run import.
9. Verify import uses `(source, sourceJobId)` dedupe.
10. Verify public API/job list DTO excludes `rawText`, `rawJson`, and `companyInfo`.
11. Verify sample mode still emits one bounded sample per source.
12. Verify batch mode does not exceed source/category/career caps.
13. Verify failed or partial source crawls do not mark existing jobs closed/inactive.
14. Verify explicit closed postings are not shown as active.
15. Supabase count/source/category check only after user approves a real DB write.

## First Operational Defaults

Use these values for the first real batch unless the user changes them:

| Setting | Value |
| --- | --- |
| per-source batch limit | 20 for review, then 50 |
| detail delay | 1-3 seconds |
| schedule | manual only at first |
| delete missing postings | no |
| close explicit ended postings | yes |
| collect IT only | yes |
| early-career priority | yes |
| career postings included | yes |

## Open Decisions Before Code

- Whether the first real DB write should import 20 postings from one source first, then expand to the 3-source KR review batch.
- Whether `jobCategory` and `careerStage` should be visible in the frontend immediately.
- Whether `status` should be public in the job list API or kept internal until UI filtering exists.
- Whether Supabase seed/sample rows should remain removed permanently or be restored only in local dev seeds.
- Whether `sourceJobId` should become non-null at the Prisma/schema level now or remain nullable with import-level rejection for operational batches.
- Whether canonical URL hash fallback is ever allowed for a source without stable public IDs.
- Whether the missing-posting threshold starts at `3` successful source crawls or needs source-specific values.

## Completion Criteria For Future Implementation

- Every operational `GREEN` source has a documented source collection contract.
- Sample mode still passes for all 7 `GREEN` sources.
- Batch JSON artifacts have a schema version and pass validation before import.
- Batch mode produces bounded active postings only.
- Import dedupes by `(source, sourceJobId)`.
- Closed postings are excluded or marked closed, not shown as active.
- Missing postings are marked `inactive` only after the agreed threshold.
- Only IT categories appear in operational output; `non_it` candidates are excluded.
- Early-career postings dominate but career postings are present.
- `jobCategory` represents job function only, not geography/source/language context.
- Public job list API and front-end types exclude `rawText`, `rawJson`, and `companyInfo`.
- Source drift, captcha, login requirement, JS-only rendering, or undocumented API dependence downgrades the source out of operational collection.
- Prisma import can dry-run the batch JSON.
- Real DB write is performed only after explicit approval.

## GPT Review Evidence And Reconciliation

Chrome/ChatGPT review was used to strengthen this plan, then reconciled against repo guardrails instead of copied directly.

Evidence:

- Chrome backend: `Chrome`, type `extension`
- ChatGPT model UI: menu showed `5.5` family options and `Pro • 확장`; composer showed `Pro 확장 모드`
- Pro submode: `확장`
- Prompt source: this plan file, pasted as a ChatGPT markdown attachment plus a short review instruction
- Output summary: GPT flagged source-contract gaps, underspecified batch JSON/import contract, loose lifecycle semantics, classification/cap bias risk, and public/private DTO leakage risk

Reconciliation decisions:

- Accepted: source collection contract, lifecycle state machine, batch JSON envelope, public DTO allowlist, cap enforcement order, conservative classification evidence, and `(source, sourceJobId)` import dedupe.
- Adapted: GPT suggested `companyName` and `url`; this plan keeps repo field names `company` and `sourceUrl`.
- Adapted: GPT suggested `global_japan` removal from job category; this plan keeps Japan/global context in `country`, `source`, `language`, or future language/bilingual fields instead.
- Rejected/held: no code implementation, no DB write, no scheduler, and no collection beyond public HTTP + HTML parsing in this planning slice.

## GPT 5.5 Pro Direction Check

Direction check was run after implementation had started to confirm project/product scope.

Evidence:

- Date: 2026-05-15
- Chrome backend: `Chrome`, type `extension`
- ChatGPT UI: `Pro 확장 모드`
- Repo context sent: README plus operational collection plan summary
- Output verdict: strong direction, but scope control is the main risk.

Accepted:

- Keep mock-first stability.
- Keep Python JSON-only collectors and the TypeScript/Prisma import boundary.
- Keep active-posting caps and conservative classification evidence.
- Keep IT-only collection while prioritizing intern/entry/junior/career-unspecified postings.
- Describe the collection system as public HTML collector/ETL, not RPA, unless a future browser automation flow actually drives UI interactions.

Adapted:

- Sample matrix may cover all 7 `GREEN` sources.
- First operational DB-write rollout should use at most 3 KR sources before adding JP/global sources.
