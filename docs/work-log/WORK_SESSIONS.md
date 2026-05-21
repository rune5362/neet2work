# Work Sessions

오늘 작업 상세 기록 원장이다.
지난 날짜 기록은 `docs/work-log/archive/`에 보관한다.

## 2026-05-20

### Agent project brief

- Scope: Created `docs/AGENT_PROJECT_BRIEF.md` so a new agent can understand
  Neet2Work's product purpose, mock-first contract, architecture boundaries,
  collector/ETL policy, API surface, current source status, and verification
  commands.
- Chrome/GPT evidence: Chrome backend was confirmed as `Chrome` with type
  `extension`; ChatGPT model menu showed `model-switcher-gpt-5-5-pro` checked
  with `Pro • 확장`, and the composer showed `Pro 확장 모드`.
- Reconciliation: Used GPT output as secondary structure only, then reconciled
  wording against `README.md`, `docs/API_CONTRACT.md`, the job collection plans,
  and current frontend/backend source files.
- Verification: Ran `git diff --check -- docs\AGENT_PROJECT_BRIEF.md`,
  `git diff --check`, `corepack pnpm run worklog:prepare`, and
  `corepack pnpm run worklog:export`.

### Crawler Matrix Evidence Report

- Added latest-only matrix evidence output for crawler/import checks:
  - CLI default report path: `tmp/job-crawler-matrix/latest.json`
  - `--output <path>` override for explicit report destinations
  - report schema includes `generatedAt`, pass/fail summary, and per-source results
- Kept the report lightweight by overwriting one `latest.json` instead of accumulating timestamped files.
- Verification:
  - verified RED first: missing `--output` parsing and missing report file failed the new tests
  - `corepack pnpm --filter @neet2work/backend run test -- src/scripts/jobCrawlerMatrixCheck.test.ts` passed: 14 files, 86 tests
  - `corepack pnpm --filter @neet2work/backend run lint` passed
  - `corepack pnpm --filter @neet2work/backend run build` passed after sandbox-escalated rerun; initial sandbox run failed only on `dist/` write permission

### Sungho Frontend Integration Branch

- Created `sungho` from `playground`.
- Applied only `apps/frontend` changes from `origin/daegyune/page/home` to avoid pulling unrelated backend, docs, and work-log deletions from that branch.
- Verification:
  - `git fetch origin playground daegyune/page/home` passed after sandbox-escalated rerun; initial run failed on `.git/FETCH_HEAD` permission.
  - `corepack pnpm --filter @neet2work/frontend build` passed after sandbox-escalated rerun; initial run failed on `apps/frontend/node_modules/.tmp/tsconfig.app.tsbuildinfo` write permission.
  - `corepack pnpm --filter @neet2work/frontend lint` passed.

### Jobs Frontend API Prep

- Prepared `/jobs` for backend/database integration by replacing the standalone hardcoded card flow with `getJobs()` and `/api/jobs/facets` based data loading.
- Kept the mock-first demo path stable by showing local demo jobs when the backend is unavailable.
- Added query support for `q`, `source`, `country`, `language`, and `limit` in the frontend API client.
- Verification:
  - `corepack pnpm --filter @neet2work/frontend lint` passed.
  - `corepack pnpm --filter @neet2work/frontend build` passed after sandbox-escalated rerun; initial run failed on `apps/frontend/node_modules/.tmp/tsconfig.app.tsbuildinfo` write permission.
  - In-app browser `/jobs` check passed with 6 fallback cards and no console errors.

### DB/API Team Handoff Contract

- Added `docs/DB_API_TEAM_HANDOFF.md` as the teammate-facing contract for using separate personal PostgreSQL DBs with the same Prisma schema, seed data, environment variable names, and backend API boundary.
- Updated `docs/API_CONTRACT.md` to remove Supabase-only wording, describe the DB path as backend API -> Prisma/pg -> personal PostgreSQL DB, and clarify empty connected DB behavior plus mock AI/local storage status.
- Updated `README.md`, `CONTRIBUTING.md`, setup docs, and `apps/backend/prisma/README.md` to use the unified Corepack/pnpm stack, teammate `db:deploy` flow, actual migration order, PostgreSQL 17/`pg_trgm`/RLS prerequisites, and `(source, sourceJobId)` import dedupe contract.
- Hardened backend contract behavior after subagent review:
  - redacted sensitive error logs before server logging
  - exported `createApp()` for route-level contract tests without starting a listener on import
  - returned empty job lists/facets when a connected DB has no active rows
  - kept analysis and health status honestly mock/local until real AI/R2 paths are wired
  - rejected import canonical keys with surrounding whitespace
- Added tests for server route envelopes, redaction, import key validation, connected-empty DB behavior, health capability status, and a frontend smoke test so root `check` has a frontend test file.
- Verification:
  - subagent setup review found npm/pnpm drift, DB privilege prerequisites, import dedupe doc drift; all fixed.
  - subagent API/security review found log redaction, connected-empty fallback drift, canonical key normalization, health status, and route-test gaps; fixed and tested.
  - final subagent review found missing jobs HTTP contract tests; added route-level coverage for list, empty list, facets, detail, and 404.
  - `git diff --check` passed.
  - `corepack pnpm --filter @neet2work/backend run test -- src/server.test.ts src/services/job.service.test.ts` passed: 16 files, 98 tests.
  - `corepack pnpm run check` passed after sandbox-escalated rerun: frontend 1 test, backend 16 files/98 tests, frontend build, backend build.
  - `corepack pnpm run check` initially failed because frontend had no test files; added `apps/frontend/src/App.test.tsx` and reran successfully.
  - `corepack pnpm --filter @neet2work/backend run db:deploy -- --help` was not a valid non-mutating help check because pnpm forwarded `--help` to `prisma migrate deploy` as an argument and Prisma tried to initialize the datasource; no successful DB write was performed.

### Frontend Branch Restore

- Restored `apps/frontend` from the teammate branch snapshot fetched from `origin/daegyune/page/home` (`FETCH_HEAD`) after the user approved replacing the frontend.
- Used a git archive extraction fallback because sandbox escalation rejected `git restore`; `apps/frontend` now has no diff against `FETCH_HEAD`.
- Verification:
  - `corepack pnpm --filter @neet2work/frontend lint` passed.
  - `corepack pnpm --filter @neet2work/frontend build` passed after sandbox-escalated rerun; initial run failed on a Vite temp config EPERM.
  - In-app browser `/jobs` reload passed with the teammate branch UI visible and no console errors.

### Frontend UI vs DB Review

- Added `docs/FRONTEND_UI_DB_REVIEW.md` with a UI/UX-only review of the current frontend against the backend API contract and connected job database.
- Covered Home, Jobs, AI Analysis entry, AI Analysis details, navigation, footer, and cross-cutting loading/empty/error/fallback states.
- Used current API evidence from `/health`, `/api/jobs?limit=100`, and `/api/jobs/facets`; active job data was 95 rows across 7 sources, KR/JP countries, and ko/ja/en languages.
- Verification:
  - Rendered `/#home`, `/jobs`, `/ai-analysis`, and `/ai-analysis/details` in the in-app browser with no console errors.
  - `git diff --check -- docs\FRONTEND_UI_DB_REVIEW.md` passed.

### Frontend Agent UI Task Brief

- Added `docs/FRONTEND_AGENT_UI_TASKS.md` as a frontend-agent-facing UI task list, excluding backend work, data-fetching completion, and hardcoding-removal instructions.
- Focused the brief on what the frontend should add visually: jobs filters, result header, metadata cards, detail drawer/page, selected-job analysis context, resume input states, analysis result sections, and unsupported-action cleanup.
- Verification:
  - `git diff --check -- docs\FRONTEND_AGENT_UI_TASKS.md` passed.

### Codex App Worktree Setup

- Confirmed the Codex app-created worktree at `C:\Users\pc07-00\.codex\worktrees\79ef\neet2work`.
- Installed workspace dependencies in that worktree with `corepack pnpm install`.
- Left secrets alone: no `.env` values were read or copied into the worktree.
- Verification:
  - `git worktree list --porcelain` showed the app worktree registered at commit `4036684`.
  - `corepack pnpm --filter @neet2work/frontend build` passed in the app worktree.

### Codex Worktree Name Reset

- Removed the stale `C:\lsh\git\neet2work-codex` folder after confirming it was no longer registered as a Git worktree and had no `.env` file.
- Deleted the local `codex/frontend-ui` branch so the Codex app can recreate the same worktree and branch names cleanly.
- Verification:
  - `git worktree list --porcelain` now shows only `sungho` and `antigravity/frontend-ui`.
  - `Test-Path C:\lsh\git\neet2work-codex` returned `False`.
  - No local or remote `codex/*` branches were listed.

### Frontend Agent UI Brief Narrowing

- Rewrote `docs/FRONTEND_AGENT_UI_TASKS.md` to focus only on frontend UI changes inside `apps/frontend`.
- Removed broader DB/API/data-connection framing and kept concrete screen tasks for Jobs, Job Detail, AI Analysis, Home, Navigation, and Footer.
- Verification:
  - `git diff --check -- docs\FRONTEND_AGENT_UI_TASKS.md` passed.

### Figma Work Log Sync

- Updated `docs/work-log/WORK_LOG.md` with a concise 2026-05-20 Figma-facing summary from the detailed session notes.
- Fixed the Figma work log plugin so it switches to the target text node's page before selecting and scrolling to `WORK_LOG`.
- Synced the 5/20 work log through the local Figma bridge; the retry reported `Figma WORK_LOG was already up to date` after the first attempt had inserted the text but failed during selection focus.
- Replaced the Figma-facing 5/20 summary with Korean bullets after the English summary proved mismatched with the requested handoff format.
- Verification:
  - `corepack pnpm run worklog:prepare` passed.
  - `corepack pnpm run worklog:export` passed.
  - `corepack pnpm run figma:check` passed for file `파이널 프로젝트`, node `성호`, and text layer `WORK_LOG`.
  - `node --check tools\figma-work-log-plugin\code.js` passed.
  - `git diff --check -- docs\work-log\WORK_LOG.md tools\figma-work-log-plugin\code.js` passed.
  - `corepack pnpm run figma:apply-log -- --timeout-ms 60000` completed with `Figma WORK_LOG was already up to date`.
  - `corepack pnpm run figma:apply-log -- --timeout-ms 60000` completed with `Figma WORK_LOG replaced` after the Korean summary update.
