# Work Sessions

## 2026-05-19
### KR Manual Scheduler Skeleton And SQL Artifacts

- `jobs:operational:manual-run` 기반 다음 slice를 시작해 manual scheduler skeleton과 SQL artifact generator를 추가
- 새 CLI:
  - `jobs:operational:sql-artifacts`: `job_batch_v1`에서 import apply SQL, `job_lifecycle_dry_run_v1`에서 lifecycle apply SQL 생성
  - `jobs:operational:scheduler`: manual-run plan에서 비파괴 단계만 추린 `job_operational_scheduler_v1` 출력
- `job_operational_pipeline_v1` 및 `job_operational_manual_run_v1`에 `import_sql_artifact`, `lifecycle_sql_artifact` 단계를 추가
- SQL artifact 안전장치:
  - artifact-only, 자동 DB write 없음
  - import SQL은 duplicate payload/sourceJobId guard와 `first_seen_at` conflict 보존 포함
  - lifecycle SQL은 partial report 거부, duplicate target/status/missingCount drift check, advisory lock, exact update-count check 포함
- 운영 계획 문서와 KR preflight runbook에 새 command shape와 단계 순서를 반영
- 검증:
  - RED: 신규 SQL artifact/scheduler 모듈 부재 및 기존 pipeline/manual-run stage mismatch 확인
  - `corepack pnpm --filter @neet2work/backend test -- src/scripts/jobOperationalSqlArtifacts.test.ts src/scripts/jobOperationalScheduler.test.ts src/scripts/jobOperationalPipeline.test.ts src/scripts/jobOperationalManualRun.test.ts` 통과: 11 files, 62 tests
  - `.\apps\backend\node_modules\.bin\tsc.CMD --noEmit -p apps\backend\tsconfig.json` 통과
  - `corepack pnpm --filter @neet2work/backend lint` 통과
  - `corepack pnpm run jobs:operational:scheduler` 통과
  - `corepack pnpm run jobs:operational:plan -- --source saramin` 통과
  - `corepack pnpm run jobs:operational:manual-run -- --source saramin` 통과
  - `corepack pnpm run jobs:operational:sql-artifacts -- --batch tmp/saramin_batch_review.json --output-dir tmp/job-operational-sql` 통과
  - `corepack pnpm run jobs:operational:sql-artifacts -- --lifecycle-report tmp/saramin_lifecycle_dry_run.json --output-dir tmp/job-operational-sql` 통과

### KR Architecture Close-Out Goal

- 사용자 `/set goal` 기준 반영:
  - JP 작업 전까지 KR은 과도하게 세부 완성하지 않고 운영 아키텍처 우선으로 마감
  - `collect -> import dry-run -> SQL artifact -> lifecycle plan -> lifecycle SQL artifact -> verification` 흐름이 재현되면 JP 전환 가능
- `job_operational_scheduler_v1` 출력에 `architectureCloseout` 계약 추가:
  - 3개 KR source 비파괴 scheduler plan
  - 3개 KR source import/lifecycle SQL artifact 생성
  - runbook의 JP handoff 및 deferred KR details 문서화
  - cron/background scheduling, automatic Supabase apply, exhaustive closed/inactive tuning은 backlog로 분리
- KR 3-source SQL artifact shallow rehearsal:
  - `saramin`: import/lifecycle SQL artifact + manifest 생성
  - `jobkorea`: import/lifecycle SQL artifact + manifest 생성
  - `linkareer`: import/lifecycle SQL artifact + manifest 생성
  - 생성 위치: `tmp/job-operational-sql/`
- 운영 계획 문서와 KR preflight runbook에 `KR Architecture Close-Out Before JP` 기준 추가
- 검증:
  - RED: scheduler close-out contract 없음으로 `jobOperationalScheduler.test.ts` 실패 확인
  - `corepack pnpm --filter @neet2work/backend test -- src/scripts/jobOperationalScheduler.test.ts src/scripts/jobOperationalSqlArtifacts.test.ts src/scripts/jobOperationalPipeline.test.ts src/scripts/jobOperationalManualRun.test.ts` 통과: 11 files, 63 tests
  - `.\apps\backend\node_modules\.bin\tsc.CMD --noEmit -p apps\backend\tsconfig.json` 통과
  - `corepack pnpm --filter @neet2work/backend lint` 통과
  - `corepack pnpm run jobs:operational:scheduler` 통과
  - KR 3-source combined `jobs:operational:sql-artifacts -- --batch ... --lifecycle-report ...` 통과
  - `git diff --check` 통과

### JP Operational Architecture Start

- KR close-out 이후 JP 작업을 시작
- 첫 JP source는 `mynavi_tenshoku`로 고정하고, DB write 없는 plan-only architecture부터 착수
- `apps/backend/src/scripts/jobOperationalJpPlan.ts` 추가:
  - output schema: `job_operational_jp_plan_v1`
  - default source: `mynavi_tenshoku`
  - optional GREEN JP sources: `green_japan`, `daijob`, `careercross`
  - held sources: `doda`, `rikunabi_next`
  - 기존 `job_operational_pipeline_v1` stages를 재사용
- `jobOperationalPipeline` source scope를 KR 3개에서 current operational GREEN 7개로 확장
- KR manual-run/scheduler는 `saramin`, `jobkorea`, `linkareer`만 받도록 타입 경계를 분리
- scripts:
  - `jobs:operational:jp-plan` 추가
- 문서:
  - 운영 계획 문서에 `Phase 15: JP Architecture Start` 추가
- 검증:
  - RED: `jobOperationalJpPlan.ts` module missing으로 신규 test 실패 확인
  - `corepack pnpm --filter @neet2work/backend test -- src/scripts/jobOperationalJpPlan.test.ts src/scripts/jobOperationalPipeline.test.ts src/scripts/jobOperationalManualRun.test.ts src/scripts/jobOperationalScheduler.test.ts` 통과: 12 files, 68 tests
  - `.\apps\backend\node_modules\.bin\tsc.CMD --noEmit -p apps\backend\tsconfig.json` 통과
  - `corepack pnpm --filter @neet2work/backend lint` 통과
  - `corepack pnpm run jobs:operational:jp-plan` 통과
  - `corepack pnpm run crawl:mynavi:check` 통과: dry-run 1 posting, source `mynavi_tenshoku`
  - `git diff --check` 통과

### JP Architecture Close-Out Goal

- 사용자 `/set goal` 기준 반영:
  - JP 마무리를 목표로 설정
  - DB write 없이 JP GREEN source 전체를 plan/check 수준에서 닫는 것을 완료 기준으로 삼음
- `jobs:operational:jp-plan`에 `--all` 추가:
  - `mynavi_tenshoku`
  - `green_japan`
  - `daijob`
  - `careercross`
- `job_operational_jp_plan_v1` 출력에 `architectureCloseout` 계약 추가:
  - all-source plan일 때 `ready_for_manual_db_review`
  - `doda`, `rikunabi_next`는 held source 유지
  - JP import/lifecycle DB write는 승인 게이트 유지
- 운영 계획 문서에 `Phase 16: JP Architecture Close-Out` 추가
- 검증:
  - RED: `--all` 및 `architectureCloseout` 없음으로 신규 test 실패 확인
  - `corepack pnpm --filter @neet2work/backend test -- src/scripts/jobOperationalJpPlan.test.ts src/scripts/jobOperationalPipeline.test.ts src/scripts/jobOperationalManualRun.test.ts src/scripts/jobOperationalScheduler.test.ts` 통과: 12 files, 71 tests
  - `.\apps\backend\node_modules\.bin\tsc.CMD --noEmit -p apps\backend\tsconfig.json` 통과
  - `corepack pnpm --filter @neet2work/backend lint` 통과
  - `corepack pnpm run jobs:operational:jp-plan -- --all` 통과: JP GREEN 4개 source, `nextSources: []`, `architectureCloseout.status=ready_for_manual_db_review`
  - `corepack pnpm run crawl:mynavi:check` 통과: dry-run 1 posting
  - `corepack pnpm run crawl:green:check` 통과: dry-run 1 posting
  - `corepack pnpm run crawl:daijob:check` 통과: dry-run 0 posting, import check passed
  - `corepack pnpm run crawl:careercross:check` 통과: dry-run 1 posting
  - `git diff --check` 통과

### Daijob JP Check Follow-Up

- JP close-out 후 남은 `daijob` 0건 sample risk를 확인
- 원인:
  - 기존 Daijob 기본 list URL이 광범위한 글로벌 공고 목록이라 첫 후보가 비IT travel/real estate 공고로 잡힐 수 있음
  - classifier가 영어 단독 `Network`를 IT 근거로 보면서 일부 real estate 공고가 false-positive 될 수 있음
- 조치:
  - Daijob 기본 list URL을 공개 IT industry 필터로 제한:
    `Software Vendor(119)`, `IT - Other(122)`, `IT Consulting(124)`
  - 영어 classifier에서 단독 `network`를 제거하고 `network engineer`, `networking`, `tcp/ip`, `ip-based`처럼 더 구체적인 근거만 사용
  - `scripts/job_crawler/test_daijob.py` 추가
  - source contract와 crawler README에 Daijob IT-filtered list 기준 반영
- 검증:
  - RED: Daijob default list URL과 real estate/Network false-positive 테스트 실패 확인
  - `python -m unittest discover -s scripts/job_crawler -p "test*.py"` 통과: 22 tests
  - `Get-ChildItem scripts/job_crawler -Filter *.py | ForEach-Object { python -B -m py_compile $_.FullName }` 통과
  - `corepack pnpm run crawl:daijob:check` 통과: dry-run 1 posting, `sourceJobId=1526753`, Cloud/SaaS Sales Engineer
  - `corepack pnpm run crawl:matrix:check` 통과: 7 sources checked
  - `git diff --check` 통과

### JP DB Import Preflight

- JP 4개 source 실제 import 전 승인용 preflight를 수행
- 실제 DB write는 하지 않음
- batch review artifacts 생성:
  - `tmp/mynavi_tenshoku_batch_review.json`: 20 rows
  - `tmp/green_japan_batch_review.json`: 15 rows
  - `tmp/daijob_batch_review.json`: 15 rows
  - `tmp/careercross_batch_review.json`: 3 rows
- 각 artifact는 warnings/errors 0건이며 dry-run import 통과
- import SQL artifacts 생성:
  - `tmp/job-operational-sql/mynavi_tenshoku_import_apply.sql`
  - `tmp/job-operational-sql/green_japan_import_apply.sql`
  - `tmp/job-operational-sql/daijob_import_apply.sql`
  - `tmp/job-operational-sql/careercross_import_apply.sql`
- Supabase read-only overlap 확인:
  - 현재 `job_postings` total rows: 44
  - JP rows without `source_job_id`: 0
  - JP `job_category=non_it`: 0
  - JP duplicate `(source, source_job_id)` keys: 0
  - existing overlap: `mynavi_tenshoku` 1, `green_japan` 1, `daijob` 0, `careercross` 0
  - expected write impact: 51 new rows, 2 updates, expected total 95 rows
- 신규 runbook:
  - `docs/runbooks/JP_BATCH_DB_WRITE_PREFLIGHT.md`
- 운영 계획 문서에 `Phase 17: JP DB Import Preflight` 추가
- 검증:
  - `corepack pnpm run db:import:jobs --dry-run ../../tmp/<source>_batch_review.json` 4개 source 통과
  - `corepack pnpm run jobs:operational:sql-artifacts -- --batch tmp/<source>_batch_review.json --output-dir tmp/job-operational-sql` 4개 source 통과
  - Supabase plugin read-only SQL count/overlap query 통과

### JP DB Import Apply Attempt

- 사용자 승인 후 Supabase plugin SQL 경로로 JP import apply 착수
- MCP payload 안정성을 위해 `tmp/job-operational-sql/*_import_apply_mcp*.sql`
  compact/chunk SQL을 생성
  - 새 insert의 `raw_text`, `raw_json`, `company_info`는 이번 compact 경로에서 제외
  - canonical full SQL artifacts는 raw trace backfill 용도로 유지
- 적용/검증 완료:
  - `careercross`: batch 3건 적용, source rows 4, `non_it=0`
  - `daijob`: batch 15건 적용, source rows 16, `non_it=0`
- 부분 적용:
  - `green_japan`: chunk01~chunk05 성공
  - `green_japan` chunk06은 Supabase MCP transport deserialize error로 commit 여부 미확인
  - chunk07~chunk08 및 `mynavi_tenshoku`는 미적용
- 중단 사유:
  - chunk06 이후 `select 1`도 Supabase MCP transport deserialize/upstream error로 실패
  - blind write continuation 방지를 위해 DB write 중단
- 재개 포인트:
  - Supabase MCP 복구 후 `green_japan` chunk06 source ids
    `10904-301763`, `11118-317495` commit 여부를 read-only로 확인
  - chunk06 미반영이면 corrected chunk06부터, 반영이면 chunk07부터 재개

### JP DB Import Apply Completion

- Supabase plugin 연결을 재확인:
  - `codex mcp get supabase`에서 server registration 확인
  - Supabase plugin `_execute_sql` `select 1` 성공
- `green_japan` 재개:
  - read-only 확인 결과 `green_japan` batch rows 12, chunk06 ids 0
  - chunk06 재실행 성공
  - chunk07 payload 중계 오류는 DB 실행 전 실패로 확인
  - 남은 3건은 1-row plugin payload로 적용
  - 검증: `green_japan` batch rows 15, repaired rows 3
- `mynavi_tenshoku` 적용:
  - 2-row plugin payload 10개로 20건 적용
  - 첫 chunk 재시도 중 `career_stage=excluded.crawl_batch_id` manual paste error가 tool reviewer에서 실행 전 거절됨
  - corrected chunk 이후 chunk01~chunk10 적용 완료
- 최종 Supabase read-only 검증:
  - `careercross`: expected 4, verified 4
  - `daijob`: expected 16, verified 16
  - `green_japan`: expected 15, verified 15
  - `mynavi_tenshoku`: expected 20, verified 20
  - JP duplicate `(source, source_job_id)` key groups: 0
  - JP `job_category=non_it`: 0
  - 전체 `job_postings`: 95
- 문서:
  - `docs/runbooks/JP_BATCH_DB_WRITE_PREFLIGHT.md`를 completion/verification 상태로 갱신
- 남은 일:
  - raw trace backfill은 필요 시 별도 작업
  - JP lifecycle dry-run/apply는 별도 승인 게이트 유지

### JP Lifecycle Dry-Run And SQL Artifacts

- 사용자 `/goal` 기준으로 JP 4개 source lifecycle snapshot/dry-run을 생성
- 생성 snapshot:
  - `tmp/mynavi_tenshoku_existing_lifecycle_snapshot.json`: 20 rows
  - `tmp/green_japan_existing_lifecycle_snapshot.json`: 15 rows
  - `tmp/daijob_existing_lifecycle_snapshot.json`: 16 rows
  - `tmp/careercross_existing_lifecycle_snapshot.json`: 4 rows
- dry-run reports:
  - `tmp/mynavi_tenshoku_lifecycle_dry_run.json`: observed 20, closed 0, inactive 0, skipped 0
  - `tmp/green_japan_lifecycle_dry_run.json`: observed 15, closed 0, inactive 0, skipped 0
  - `tmp/daijob_lifecycle_dry_run.json`: observed 15, closed 0, inactive 0, skipped 1
  - `tmp/careercross_lifecycle_dry_run.json`: observed 3, closed 0, inactive 0, skipped 1
- 후보 리뷰:
  - closed 후보는 0건
  - inactive 후보는 0건
  - `daijob` old sample `1463203`, `careercross` old sample `1592533`은 이번 batch에서 빠졌지만 missingCount 0 -> 1로 threshold 3 미만이라 `missing_threshold_not_met` skip이 합리적
- lifecycle SQL artifacts:
  - `tmp/job-operational-sql/mynavi_tenshoku_lifecycle_apply.sql`
  - `tmp/job-operational-sql/green_japan_lifecycle_apply.sql`
  - `tmp/job-operational-sql/daijob_lifecycle_apply.sql`
  - `tmp/job-operational-sql/careercross_lifecycle_apply.sql`
- 판단:
  - status 전환이 필요한 closed/inactive 후보가 없으므로 lifecycle apply는 이번 pass에서 필수 아님
  - apply 시 active rows lifecycle metadata reset 및 old sample 2건 missingCount 1 bookkeeping만 발생하므로 별도 승인 게이트 유지
- 검증:
  - `corepack pnpm run db:lifecycle:jobs:dry-run -- --batch tmp/<source>_batch_review.json --existing tmp/<source>_existing_lifecycle_snapshot.json --inactive-threshold 3 --output tmp/<source>_lifecycle_dry_run.json` 4개 source 통과
  - `corepack pnpm run jobs:operational:sql-artifacts -- --lifecycle-report tmp/<source>_lifecycle_dry_run.json --output-dir tmp/job-operational-sql` 4개 source 통과
  - lifecycle report summary check 통과
  - `docs/runbooks/JP_BATCH_DB_WRITE_PREFLIGHT.md`에 lifecycle dry-run 결과 반영

### Frontend Runtime Smoke

- Vite frontend and backend API were started locally for browser smoke testing:
  - backend: `http://localhost:3000`
  - frontend: `http://localhost:5173`
- Verified backend endpoints:
  - `GET /health`: `ok=true`, `database=not_configured`, `ai=mock`, `storage=local`
  - `GET /api/jobs`: 3 sample jobs, first source `sample`
- Opened the app in the Codex in-app browser and confirmed:
  - page title `일했음 청년`
  - sample job cards render
  - browser console errors: 0
- Gap:
  - local `.env` has no `DATABASE_URL`, so the running app is currently frontend -> backend -> sample JSON, not frontend -> backend -> Supabase DB rows
  - Supabase plugin read re-check hit transport deserialize errors during this smoke pass

### Frontend Supabase DB Wiring

- User approved resetting the Supabase database password and filling local `.env`
- Chrome extension backend confirmed:
  - selected browser name: Chrome
  - selected browser type: extension
- Reset the Supabase database password through the Dashboard
- Added Supabase Session Pooler `DATABASE_URL` to local `.env`
  - `.env` remains gitignored
  - connection uses `sslmode=verify-full`
  - `sslmode=no-verify` was rejected and not stored
- Added public Supabase CA certificate:
  - `apps/backend/certs/prod-ca-2021.crt`
- Verification:
  - in-memory `pg` connection with Supabase CA: connected, `job_postings=95`
  - restarted backend on `http://localhost:3000`
  - `GET /health`: `database=connected`
  - `GET /api/jobs`: 50 DB rows, sources `careercross,daijob,green_japan,mynavi_tenshoku`
  - reloaded `http://localhost:5173` in the in-app browser and confirmed DB job cards render

### Split Database Env

- User requested separating the database URL and password for readability
- Added backend DB URL resolver:
  - `DATABASE_URL` may be passwordless
  - `DATABASE_PASSWORD` is injected only at runtime
  - full legacy `DATABASE_URL` remains supported
- Updated runtime, Prisma config, seed/import, and lifecycle apply paths to use the resolver
- Converted local `.env`:
  - `DATABASE_URL` no longer contains the password
  - `DATABASE_PASSWORD` holds the password separately
  - `sslmode=verify-full` remains enabled
- Verification:
  - `cmd /c ""node_modules\.bin\vitest.cmd" run src/database/connection.test.ts"` passed
  - `cmd /c ""node_modules\.bin\tsc.cmd" --noEmit"` passed
  - restarted backend and confirmed `GET /health` returns `database=connected`
  - `GET /api/jobs` returns 50 DB rows from JP sources
  - reloaded in-app browser and confirmed DB job cards still render

### API Contract Handoff

- Added `docs/API_CONTRACT.md` for teammate frontend handoff
- Documented current backend contract:
  - `GET /health`
  - `GET /api/jobs`
  - `POST /api/analyze`
- Captured current limitations:
  - no pagination
  - no search/filter params
  - no `GET /api/jobs/:id`
  - frontend should call backend via `VITE_API_BASE_URL`, not Supabase directly
- Verification:
  - `git diff --check -- docs/API_CONTRACT.md` passed
  - `GET /health`: `database=connected`, `ai=mock`, `storage=local`
  - `GET /api/jobs`: 50 rows, public fields only, no raw crawl/classifier fields
  - `POST /api/analyze`: mock analysis response returned

### Job Detail API

- Added teammate-frontend detail endpoint:
  - `GET /api/jobs/:id`
- Behavior:
  - returns the same public job field set as `GET /api/jobs`
  - returns `404` with `채용공고를 찾을 수 없습니다.` when no row matches
  - keeps sample fallback behavior when the database is not configured or unavailable
- Tests:
  - added `apps/backend/src/services/job.service.test.ts`
  - verified Red first: `getJobById is not a function`
  - verified Green after implementation
- Updated `docs/API_CONTRACT.md` with detail endpoint contract
- Verification:
  - `cmd /c ""node_modules\.bin\vitest.cmd" run src/services/job.service.test.ts src/database/connection.test.ts"` passed
  - `cmd /c ""node_modules\.bin\tsc.cmd" --noEmit"` passed
  - `git diff --check` passed for touched files
  - restarted backend and confirmed `GET /health` returns `database=connected`
  - `GET /api/jobs/:id` returned the selected DB row without raw crawl/classifier fields
  - missing id returned `404`

### Job List Search Filters

- Expanded `GET /api/jobs` for teammate frontend wiring:
  - `q`: case-insensitive search over title, company, description
  - `source`, `country`, `language`: exact filters
  - `limit`: validated integer 1-100, default 50
- Kept mock-first fallback behavior:
  - DB rows are used when Supabase is configured
  - local sample jobs still support the same filters when DB is unavailable
- Updated `docs/API_CONTRACT.md` with the new query params and current limitations
- Verification:
  - verified Red first for fallback filtering/limit behavior
  - `cmd /c ""node_modules\.bin\vitest.cmd" run src/services/job.service.test.ts"` passed
  - `cmd /c ""node_modules\.bin\tsc.cmd" --noEmit"` passed
  - restarted backend and confirmed `GET /health` returns `database=connected`
  - live smoke passed for `limit`, `source`, `country/language`, positive `q`, empty `q`, and invalid `limit=abc` -> `400`
  - `git diff --check` passed

### Job Facets API

- Added filter metadata endpoint for teammate frontend wiring:
  - `GET /api/jobs/facets`
- Response shape:
  - `sources`: `{ value, count }[]`
  - `countries`: `{ value, count }[]`
  - `languages`: `{ value, count }[]`
  - `total`: total jobs included in facet counts
- Behavior:
  - uses Prisma `groupBy` against Supabase when DB is configured
  - falls back to local sample metadata when DB is unavailable
  - sorts options by count desc, then value asc
- Updated `docs/API_CONTRACT.md` with the facets endpoint contract
- Verification:
  - verified Red first: `getJobFacets is not a function`
  - `cmd /c ""node_modules\.bin\vitest.cmd" run src/services/job.service.test.ts"` passed
  - `cmd /c ""node_modules\.bin\tsc.cmd" --noEmit"` passed
  - restarted backend and confirmed `GET /health` returns `database=connected`
  - live `GET /api/jobs/facets` returned `total=95`, source/country/language facet arrays
  - `git diff --check` passed

### Review Fixes: Public Jobs And Work Log

- Fixed code review findings:
  - public jobs list, facets, and detail now expose only active lifecycle rows
  - DB query/schema drift is no longer hidden behind sample fallback
  - sample fallback remains only for unconfigured or unavailable DB cases
  - Figma work log export has valid 2026-05-19 bullets again
  - added reviewed migration artifact for active public job filters and trigram search indexes
- Updated `docs/API_CONTRACT.md` with active-only public API behavior and fallback policy
- Verification:
  - verified Red first for active-only DB query/facets/detail and non-fallback schema drift
  - `cmd /c ""node_modules\.bin\vitest.cmd" run src/services/job.service.test.ts"` passed
  - `cmd /c ""node_modules\.bin\vitest.cmd" run"` passed: 14 files, 83 tests
  - `cmd /c ""node_modules\.bin\tsc.cmd" --noEmit"` passed
  - `corepack pnpm --filter @neet2work/backend lint` passed
  - `cmd /c ""node_modules\.bin\prisma.cmd" validate"` passed
  - `python -m unittest discover -s scripts\job_crawler -p "test*.py"` passed: 22 tests
  - `corepack pnpm run worklog:export` passed
  - restarted backend and confirmed `GET /health` returns `database=connected`
  - live `GET /api/jobs?limit=3` returned 3 rows and `GET /api/jobs/facets` returned `total=95`
  - `git diff --check` passed

### Security Review P3 Log Redaction

- Fixed the P3 security review finding only:
  - kept the intentionally open local Figma bridge behavior unchanged
  - redacted credential-bearing URLs and password/token-like key-value pairs before DB fallback warnings are logged
  - added regression coverage that fails if `DATABASE_PASSWORD`-style values or URL passwords appear in the warning
- Verification:
  - `corepack pnpm --filter @neet2work/backend run test -- src/services/job.service.test.ts` passed: 14 files, 84 tests
  - `corepack pnpm --filter @neet2work/backend run lint` passed
  - `corepack pnpm --filter @neet2work/backend run build` passed after sandbox-escalated rerun; initial sandbox run failed only on `dist/` write permission

### Figma Work Log Sync

- Updated the 2026-05-19 Figma-facing summary with the security P3 redaction work.
- Synced today's work log to the Figma `WORK_LOG` text layer through the local bridge.
- Verification:
  - `corepack pnpm run worklog:export` showed the updated 6-bullet 5/19 summary
  - local bridge health check passed at `http://127.0.0.1:3927/health`
  - `corepack pnpm run figma:apply-log -- --bridge http://127.0.0.1:3927 --timeout-ms 30000` completed with `Figma WORK_LOG appended.`
