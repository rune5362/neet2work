# Neet2Work Agent Project Brief

Last updated: 2026-05-20

This document is a handoff brief for any new agent working in this repository.
Use it to understand what Neet2Work is, what direction the project is taking,
and which boundaries must not be crossed.

## One-Line Summary

Neet2Work, also called `일했음 청년`, is a mock-first career consulting app
that combines public HTML job-posting collector/ETL work with resume and
self-introduction analysis so users can compare a job posting against their
own writing and get fit scores, gaps, and rewrite guidance.

## Problem

Neet2Work helps users move from "NEET / 쉬었음 청년" toward "work / 일하는
청년" by making job-posting interpretation and self-introduction improvement
more concrete.

The product focuses on three practical problems:

- Users need a quick way to compare their self-introduction with a real job
  posting.
- Users need structured feedback: fit score, strengths, weaknesses, missing
  keywords, rewrite guides, and suggested sentences.
- The team needs a stable final-project demo that still works when external
  AI APIs, databases, object storage, or live job sources are unavailable.

## Current Product Experience

The current frontend demo flow is simple:

1. Load a list of job postings.
2. Let the user select one job posting.
3. Let the user enter self-introduction text.
4. Call the backend analysis endpoint.
5. Show the analysis result panel with score and writing guidance.

If `AI_API_KEY` is missing, the backend returns deterministic mock analysis.
If the database is missing or unavailable, job listing APIs can fall back to
local sample JSON or in-memory sample jobs. This fallback behavior is not a
temporary accident; it is part of the project contract.

## Core Direction

The project direction is to keep the mock-first demo path stable while adding
real data and real AI integration behind clear boundaries.

The main direction points are:

- Keep the app usable without real DB, R2, or AI credentials.
- Keep frontend access routed through the backend API, not direct Supabase or
  database calls.
- Treat the current job collection system as public HTTP + HTML parsing
  collector/ETL, not as RPA.
- Keep Python collectors JSON-only and DB-write-free.
- Keep TypeScript/Prisma as the import and database-write boundary.
- Keep production-like database mutations approval-gated.
- Keep internal crawl fields out of public API responses.
- Expand collection scope only from evidence-backed `GREEN` sources.

## Architecture Overview

| Layer | Current Role | Main Tech |
| --- | --- | --- |
| Frontend | Job selection, self-introduction input, analysis result display | React 19, Vite 7, TypeScript |
| Backend API | Job APIs, analysis API, fallback orchestration, public DTO boundary | Express 5, TypeScript, Zod |
| Analysis | Mock-first analyzer now; AI path can be wired later | `AI_API_KEY` gated service path |
| Database | Optional runtime source for job postings and analysis persistence work | PostgreSQL/Supabase/RDS, Prisma 7 |
| Collector/ETL | Public job-source sampling and operational collection artifacts | Python HTTP/HTML collectors |
| Import Boundary | Validate JSON artifacts and apply DB writes when approved | TypeScript, Prisma |
| Storage | Optional future file/object storage path | Cloudflare R2 or local fallback |

The current collection path is deliberately split:

1. Python collectors fetch public pages and parse HTML.
2. Collectors produce normalized JSON artifacts.
3. TypeScript validates the JSON import contract.
4. Prisma writes to PostgreSQL only in explicit import/apply flows.

Collectors must not insert, update, or delete database rows directly.

## Runtime Contract

The demo path must remain stable even when external systems are absent.

| Dependency | Expected Behavior When Missing |
| --- | --- |
| AI API key | Use mock analyzer and return `mode: "mock"` |
| Database URL / DB availability | Use local sample JSON or in-memory fallback for demo job data |
| R2/storage config | Use local/no-op storage behavior where relevant |
| Live job sites | Do not break frontend/backend demo; record source evidence or blocker |

Do not turn optional external services into required demo dependencies unless
the user explicitly changes the product contract.

## Data Flow

### Demo Job And Analysis Flow

```txt
React frontend
  -> Express backend API
  -> Prisma/PostgreSQL when configured
  -> local JSON or in-memory fallback when DB is missing
  -> analysis service
  -> AI path if configured, mock analyzer otherwise
  -> frontend result panel
```

### Job Collection And Import Flow

```txt
Public job source
  -> Python HTTP/HTML collector
  -> normalized JSON artifact
  -> TypeScript import validator
  -> dry-run import check
  -> approval-gated DB write
  -> public API allowlisted DTO
```

The standard operational batch shape uses:

- `schemaVersion: "job_batch_v1"`
- `source`
- `mode: "sample" | "batch"`
- `crawlBatchId`
- `collectedAt`
- `sourceCap`
- `postings`
- `warnings`
- `errors`

Operational imports dedupe by `(source, sourceJobId)`.

## Job Collection Policy

Allowed collection path:

- Public HTTP requests.
- Public HTML parsing.
- Bounded sample JSON artifacts.
- Dry-run import validation.
- Evidence-based source classification.

Not allowed as the default collection path:

- Login-dependent collection.
- CAPTCHA bypass.
- Proxy or stealth behavior.
- Browser automation as the collector path.
- Undocumented/internal API reliance.
- Official-API-application-required sources as first-class crawler targets.
- Python collector DB writes.
- Full raw HTML archival.

Limits and lifecycle rules:

- Default sample limit is `1`.
- Hard sample limit is `5` unless policy changes explicitly.
- Multi-detail collection needs delay.
- Explicit closed/expired postings need visible source evidence.
- Missing postings are not deleted immediately.
- Repeated absence may become `inactive` only through lifecycle rules.
- `rawText`, `rawJson`, `companyInfo`, classifier metadata, crawl batch
  internals, and lifecycle internals stay out of public API DTOs.

## API Contract Summary

Frontend should call the backend through `VITE_API_BASE_URL`.

| Endpoint | Purpose |
| --- | --- |
| `GET /health` | Runtime dependency status: database, AI, storage |
| `GET /api/jobs` | Active public job list with optional `q`, `source`, `country`, `language`, `limit` |
| `GET /api/jobs/facets` | Filter metadata for source, country, language |
| `GET /api/jobs/:id` | One active public job by internal id |
| `POST /api/analyze` | Analyze `resumeText` against `jobId` |

Analysis responses include:

- `jobId`
- `matchScore`
- `strengths`
- `weaknesses`
- `missingKeywords`
- `rewriteGuides`
- `suggestedSentences`
- `mode`

Public job responses must stay allowlisted. Do not expose raw crawl payloads or
internal lifecycle/debug fields through frontend-facing APIs.

## Current Implementation And Operation Status

Implemented product path:

- React demo app with job selection, self-introduction input, and analysis
  result panel.
- Express API for health, jobs, facets, job detail, and analysis.
- Mock analyzer fallback when AI is not configured.
- Job API fallback to sample data when DB is unavailable or not configured.
- Prisma-backed job storage/import path for configured environments.

Current source status from project docs:

| Status | Sources |
| --- | --- |
| `GREEN` sample matrix | `saramin`, `jobkorea`, `linkareer`, `mynavi_tenshoku`, `daijob`, `careercross`, `green_japan` |
| Held / evidence-only examples | `catch`, `doda` |
| Excluded under current evidence | `jobplanet`, `indeed_kr`, `rikunabi_next` |
| Explicit first-set exclusion | `KOREC` due to JS/internal API/login-modal dependency |

Operational planning focus:

- Korea first: `saramin`, `jobkorea`, `linkareer`.
- Japan architecture path: `mynavi_tenshoku`, `green_japan`, `daijob`,
  `careercross`.
- JP DB writes remain approval-gated.
- Scheduler and automated DB mutation remain guarded work, not the default
  behavior.

## Future Direction

Near-term work should preserve the current contracts while improving real data
quality and operational safety:

- Keep mock-first behavior tested.
- Keep `docs/API_CONTRACT.md` aligned with backend/frontend code.
- Continue source evidence before changing collector status.
- Expand operational collection only from verified `GREEN` sources.
- Keep first operational scope IT-focused.
- Prioritize intern, entry, junior, and career-unspecified roles.
- Keep source/category/career caps as quality controls.
- Keep lifecycle apply strict: no deletion, no closure without visible source
  evidence, no writes without approval.
- Add real AI behavior only behind the existing fallback-safe service boundary.

## Agent Working Rules

When a new agent works in this repo:

- Read the relevant source-of-truth docs before changing behavior.
- Preserve the mock-first demo path.
- Do not describe the current collector system as RPA.
- Do not add browser automation to collection unless the user explicitly
  changes the collection policy.
- Do not read, print, or commit `.env` values.
- Do not expose raw/internal crawl fields through public APIs.
- Do not make direct DB writes from Python collectors.
- Do not run real DB mutations, migrations against shared/persistent DBs, or
  Supabase writes without explicit approval.
- Prefer dry-run import checks before any apply path.
- Keep changes surgical and tied to the user request.

## Verification Commands

Use the smallest relevant verification set for the change.

General repo checks:

```powershell
git status --short
corepack pnpm run lint
corepack pnpm run test
corepack pnpm run build
```

Collector/import checks:

```powershell
python -B -m py_compile scripts/job_crawler/*.py
corepack pnpm run crawl:matrix:check
corepack pnpm run db:import:jobs --dry-run <json>
```

Operational planning checks:

```powershell
corepack pnpm run jobs:operational:plan
corepack pnpm run jobs:operational:manual-run
corepack pnpm run jobs:operational:jp-plan -- --all
```

Work-log/export check:

```powershell
corepack pnpm run worklog:export
```

For public/private API boundary checks, search for forbidden public exposure:

```powershell
rg -n "rawText|rawJson|companyInfo|classifierMeta|crawlBatchId" apps/backend/src apps/frontend/src
```

Finding these terms is not automatically wrong, but they must not appear in
public DTO selections or frontend public job types unless the product contract
has explicitly changed.

## Source Of Truth

Start with these files:

| File | Purpose |
| --- | --- |
| `README.md` | Product scope, stack, setup, high-level architecture |
| `docs/API_CONTRACT.md` | Backend/frontend API contract |
| `AGENTS.md` | Repository behavior and safety rules |
| `docs/plans/2026-05-15-job-collection-pipeline.md` | Sample collector matrix plan and source status |
| `docs/plans/2026-05-15-operational-job-collection-scope.md` | Operational collection, lifecycle, and approval-gated write plan |
| `docs/research/job-sites/JOB_POSTING_COLLECTION_SCHEMA.md` | Standard collected job schema |
| `docs/research/job-sites/OPERATIONAL_SOURCE_CONTRACTS.md` | Source-specific operational contracts |
| `docs/research/job-sites/evidence/` | Source evidence and downgrade/hold decisions |
| `docs/work-log/WORK_SESSIONS.md` | Detailed session history |
| `docs/work-log/WORK_LOG.md` | Short Figma-facing work log summaries |

Repo files and these source-of-truth documents outrank external model advice.
Use model reviews only as secondary critique, then reconcile them against the
actual code, docs, and verification commands.
