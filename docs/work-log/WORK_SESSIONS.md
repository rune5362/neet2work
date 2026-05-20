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

### Frontend Backend API Wiring

- Connected `/jobs` to the existing backend `GET /api/jobs` endpoint, keeping a local sample fallback when the API is unavailable.
- Connected `/ai-analysis` to `POST /api/analyze`, saved the response in session storage, and rendered the selected job plus analysis result on `/ai-analysis/details`.
- Started local frontend and backend dev servers and verified the flow in the Codex in-app browser.
- Verification:
  - `corepack pnpm --filter @neet2work/frontend lint` passed.
  - `corepack pnpm --filter @neet2work/frontend build` passed after sandbox-escalated rerun; initial run failed only on `node_modules/.tmp` write permission.
  - Browser checked `/jobs` rendering real backend job data and `/ai-analysis` submission navigating to `/ai-analysis/details` with match score and selected job shown.
