# Work Sessions

## 2026-05-18

### KR Operational Batch Review Completion

- `saramin`, `jobkorea`, `linkareer` 3개 KR source를 공유 DB write 직전 dry-run 검수 상태까지 끌어올림
- 공통 `run_source.py` batch 모드는 최대 50개 후보를 스캔하되 `sourceCap=20`까지만 산출하고, detail 일시 실패는 warning으로 누적한 뒤 다음 후보로 진행하게 수정
- 5회 연속 detail 실패 또는 strict IT 필터 후 0건이면 해당 source review를 실패 처리하도록 runner guard를 추가
- `AI`, `ML`, `Data` 짧은 skill 키워드는 사이트 공통 UI/추천 문구에 오염되지 않게 3개 KR collector 모두 명시 문맥 기반으로 보수화
- category/career 분류에서 `2026년` 연도 오판, 물리보안, 범용 `개발`/`분석`/`엔지니어`, 영문 단어 내부 `ai` 매칭 false positive를 회귀 테스트와 함께 보정
- `linkareer`는 계약상 허용된 `/list/intern`을 기본 검수 경로로 조정; `/list/recruit`는 strict IT 필터 후 0건이라 기본 batch 경로에서 제외
- 산출물:
  - `tmp/saramin_batch_review.json`: 10건, warnings/errors 0
  - `tmp/jobkorea_batch_review.json`: 18건, warnings/errors 0
  - `tmp/linkareer_batch_review.json`: 3건, warnings/errors 0
- 각 산출물은 `job_batch_v1`, `mode=batch`, `sourceCap=20`, duplicate `sourceJobId` 없음, `jobCategory=non_it` 없음 조건을 통과
- 실제 DB/Supabase write는 수행하지 않았고, `db:import:jobs --dry-run`만 실행
- 검증:
  - `python -m unittest scripts/job_crawler/test_contract.py scripts/job_crawler/test_runner.py scripts/job_crawler/test_saramin.py scripts/job_crawler/test_jobkorea.py scripts/job_crawler/test_linkareer.py` 통과, 20 tests
  - `python -B -m py_compile` 동등 검증을 PowerShell-expanded file list로 실행해 통과
  - `corepack pnpm --filter @neet2work/backend test -- src/scripts/jobCrawlerImportCheck.test.ts src/scripts/importJobPostingsPayload.test.ts` 통과, 24 tests
  - `.\apps\backend\node_modules\.bin\tsc.CMD --noEmit -p apps\backend\tsconfig.json` 통과
  - `corepack pnpm --filter @neet2work/backend lint` 통과
  - 3개 KR review artifact 각각 `corepack pnpm run db:import:jobs --dry-run` 통과
  - `corepack pnpm run crawl:matrix:check` 통과, 7 sources
  - `git diff --check` 통과
- 오류 기록:
  - time: `2026-05-18T10:25:47.5268486+09:00`
  - location: `corepack pnpm --filter @neet2work/backend test -- src/scripts/jobCrawlerImportCheck.test.ts src/scripts/importJobPostingsPayload.test.ts`
  - summary: 첫 vitest 실행이 `apps/backend/node_modules/.vite-temp` 임시 config write `EPERM`으로 실패
  - details: 동일 명령을 sandbox 승격으로 재실행했고 테스트 24개가 통과
  - status: resolved

### KR Shared DB Write Preflight

- `/goal` 요청을 실제 도구 호출 대신 다음 작업 목표로 해석하고, KR batch shared DB write preflight를 승인 게이트 기준으로 진행
- Supabase `neet2work` project는 `ACTIVE_HEALTHY`, `job_postings` 7건, `resume_analyses` 0건 상태를 read-only로 확인
- KR review artifact 31건 기준 overlap은 `jobkorea/49157411` 1건이며, 승인 후 실제 import impact는 신규 30건 + 업데이트 1건으로 계산
- 공유 DB에는 `20260515080000_job_posting_operational_lifecycle` migration이 아직 적용되지 않아 `status`, `job_category`, `career_stage` 등 현재 import 코드가 쓰는 lifecycle 컬럼이 없음
- 실제 import는 migration deploy 전에는 실패하므로 `docs/runbooks/KR_BATCH_DB_WRITE_PREFLIGHT.md`에 차단 조건, 승인 순서, expected delta, post-write SQL 검증을 고정
- Supabase advisory로 `public._prisma_migrations` RLS disabled 경고를 확인했고, 이번 preflight에서는 변경하지 않고 별도 검토 항목으로 기록
- 검증:
  - `corepack pnpm run worklog:prepare` 통과
  - 3개 KR review artifact 각각 `corepack pnpm run db:import:jobs --dry-run` 재통과
  - Supabase read-only query로 migration list/source counts/candidate overlap 확인
  - `git diff --check` 통과
- 오류 기록:
  - time: `2026-05-18T10:39:01.6119839+09:00`
  - location: Supabase read-only preflight query against `public.job_postings.status`
  - summary: 공유 DB에 `status` 컬럼이 없어 lifecycle 상태별 count 쿼리가 실패
  - details: 로컬 migration `20260515080000_job_posting_operational_lifecycle`가 공유 DB에 아직 적용되지 않은 것으로 확인
  - status: blocked real import until migration deploy approval

### Supabase Plugin Lifecycle Migration Sync

- 사용자 승인에 따라 Prisma CLI 대신 Supabase plugin-only 경로로 `20260515080000_job_posting_operational_lifecycle` migration을 공유 DB에 적용
- 로컬 migration SQL SHA256이 기존 `_prisma_migrations.checksum` 패턴과 일치함을 확인하고, checksum `24c5226a7a900d6271676ce1423c04069f5197d85b1ce176aa4db72c44c330ab`로 history row를 수동 동기화
- 한 트랜잭션에서 advisory lock, `JobPostingStatus` enum 생성, `job_postings` lifecycle 컬럼 8개 추가, 인덱스 3개 추가, `_prisma_migrations` row insert를 수행
- 적용 후 Supabase read-only 검증에서 matching migration row 1, enum 존재, lifecycle column count 8, lifecycle index count 3, 기존 7 row `active` default를 확인
- 실제 KR 공고 import는 수행하지 않았고, `job_postings` 총 row는 7건 유지
- 검증:
  - `tmp/saramin_batch_review.json` dry-run import 통과, 10건
  - `tmp/jobkorea_batch_review.json` dry-run import 통과, 18건
  - `tmp/linkareer_batch_review.json` dry-run import 통과, 3건
  - Python crawler unittest 20 tests 통과
  - Python crawler py_compile 통과
  - Backend targeted Vitest 24 tests 통과
  - Backend `tsc --noEmit` 통과
  - Backend lint 통과
  - Supabase read-only row/duplicate check: total 7, missing `source_job_id` 0, duplicate `(source, source_job_id)` 0
- 오류 기록:
  - time: `2026-05-18T11:40:58.7327888+09:00`
  - location: `corepack pnpm run crawl:matrix:check` and `corepack pnpm run crawl:green:check`
  - summary: `green_japan` public sample fetch timed out twice during final matrix verification
  - details: KR artifact dry-runs and the first 6 matrix sources passed; failure occurred in external Green Japan HTTP read, not in Supabase migration or KR import contract
  - status: unresolved external source timeout; real KR import was still separately approval-gated at this checkpoint

### KR Approved Shared DB Import

- 사용자 승인 후 `saramin`, `jobkorea`, `linkareer` KR review artifact를 공유 Supabase DB에 실제 import
- 사용자가 Supabase plugin 기반 작업을 요청했고 로컬 `DATABASE_URL`이 없어 Prisma CLI importer 대신 Supabase plugin SQL로 importer semantics를 재현
- source별 write impact:
  - `saramin`: 10건 신규, 최종 11건
  - `jobkorea`: 17건 신규 + `jobkorea/49157411` 1건 업데이트, 최종 18건
  - `linkareer`: 3건 신규, 최종 4건
- 최종 공유 DB 검증:
  - `job_postings` total rows: 37
  - KR source counts: `saramin=11`, `jobkorea=18`, `linkareer=4`
  - KR active counts: `saramin=11`, `jobkorea=18`, `linkareer=4`
  - expected imported KR source IDs present: 31
  - missing expected IDs: 0
  - duplicate `(source, source_job_id)` keys: 0
  - rows without `source_job_id`: 0
  - KR non-active rows: 0
  - KR `jobCategory=non_it` rows: 0
- `first_seen_at`은 conflict 시 보존하고 `last_seen_at`, lifecycle/category/classifier 필드는 artifact 기준으로 반영
- `jobkorea`, `linkareer`의 normalized/user-facing 필드와 lifecycle/classifier 필드는 반영됐지만, plugin payload 크기 문제로 `raw_text`, `raw_json`, `company_info` backfill은 이번 pass에서 보류
- 오류 기록:
  - time: `2026-05-18T12:08:00+09:00`
  - location: Supabase plugin SQL trace backfill for `jobkorea`
  - summary: `company_info/raw_json` 보강용 base64 payload가 조각 손상으로 `invalid base64 end sequence` 오류를 반환
  - details: 핵심 import 트랜잭션 이후 별도 보강 쿼리에서 실패했으며, 최종 count/source/dedupe/status 검증은 정상 통과
  - status: deferred raw trace backfill; not blocking normalized KR import

### KR Import Gap Closure

- `scripts/job_crawler/http_client.py`에 transient timeout retry를 추가하고 `scripts/job_crawler/test_http_client.py` regression test를 추가
- Supabase plugin SQL로 `jobkorea`, `linkareer` shared DB rows의 `raw_text`, `raw_json`, `company_info` null gap을 normalized DB snapshot trace로 backfill
- Supabase plugin migration `restrict_prisma_migrations_rls`로 `public._prisma_migrations`의 anon/auth/PUBLIC grant를 revoke하고 RLS를 enable
- 운영 문서에 plugin-only DB operation standard, raw trace backfill 방식, `_prisma_migrations` RLS remediation 결과를 반영
- 최종 Supabase 검증:
  - `job_postings` total rows: 37
  - KR source counts: `saramin=11`, `jobkorea=18`, `linkareer=4`
  - KR duplicate `(source, source_job_id)` groups: 0
  - KR rows without `source_job_id`: 0
  - KR `jobCategory=non_it` rows: 0
  - `jobkorea` trace fields: `raw_json=18`, `raw_text=18`, `company_info=18`
  - `linkareer` trace fields: `raw_json=4`, `raw_text=4`, `company_info=4`
  - `_prisma_migrations` RLS enabled, anon/auth/PUBLIC grant count 0, policy count 0
- 검증:
  - `corepack pnpm run worklog:prepare` 통과
  - Python crawler unittest 21 tests 통과
  - Python crawler py_compile 통과
  - Backend targeted Vitest command 통과, 5 files / 24 tests
  - Backend `tsc --noEmit` 통과
  - Backend lint 통과
  - `corepack pnpm run crawl:green:check` 통과
  - `corepack pnpm run crawl:matrix:check` 통과, 7 sources
  - 3개 KR review artifact 각각 `corepack pnpm run db:import:jobs --dry-run` 재통과
- 오류 기록:
  - time: `2026-05-18T12:53:35+09:00`
  - location: `corepack pnpm --filter @neet2work/backend test -- src/scripts/jobCrawlerImportCheck.test.ts src/scripts/importJobPostingsPayload.test.ts`
  - summary: 첫 vitest 실행이 `apps/backend/node_modules/.vite-temp` 임시 config write `EPERM`으로 실패
  - details: 동일 명령을 sandbox 승격으로 재실행했고 5 files / 24 tests가 통과
  - status: resolved

### KR Lifecycle Transition Dry-Run

- KR import 다음 작업으로 DB-write-free lifecycle transition dry-run planner를 추가
- `apps/backend/src/scripts/jobLifecycleDryRun.ts`는 `job_batch_v1` artifact와 existing source snapshot JSON을 받아 `job_lifecycle_dry_run_v1` report를 생성
- report는 `activeObservations`, `closedCandidates`, `inactiveCandidates`, `skipped`를 분리하고 실제 DB update는 수행하지 않음
- `closed` 후보는 현재 posting `status=closed`와 source-visible closed evidence가 같이 있을 때만 생성
- `inactive` 후보는 absent active row의 next missing count가 threshold에 도달할 때만 생성하며 기본 threshold는 3
- partial crawl 보호를 적용: non-batch mode, batch errors, timeout/failure/skip/drift warnings, existing rows가 있는데 0 postings인 crawl은 absent row 상태 변경 후보를 만들지 않음
- root/backend package script 추가:
  - `corepack pnpm run db:lifecycle:jobs:dry-run -- --batch tmp/<source>_batch_review.json --existing tmp/<source>_existing_lifecycle_snapshot.json --inactive-threshold 3`
- Supabase plugin readback으로 KR shared DB current status는 전부 active임을 확인:
  - `saramin=11`, `jobkorea=18`, `linkareer=4`
- 검증:
  - TDD red: 신규 test가 `Cannot find module './jobLifecycleDryRun.js'`로 실패
  - TDD green: lifecycle dry-run tests 통과
  - Parser regression red/green: pnpm literal `--` 처리 테스트 추가 후 통과
  - Path regression red/green: backend cwd에서 root-relative `tmp/...` 경로 fallback 테스트 추가 후 통과
  - Backend Vitest 6 files / 30 tests 통과
  - `corepack pnpm run db:lifecycle:jobs:dry-run -- --batch tmp/linkareer_batch_review.json --existing docs/research/job-sites/linkareer_sample_2026-05-15.json --inactive-threshold 3` 통과
  - Backend `tsc --noEmit` 통과
  - Backend lint 통과
  - `corepack pnpm run crawl:matrix:check` 통과, 7 sources
  - `git diff --check` 통과
- 오류 기록:
  - time: `2026-05-18T13:08:31+09:00`
  - location: `corepack pnpm run db:lifecycle:jobs:dry-run -- --batch tmp/linkareer_batch_review.json ...`
  - summary: root script가 pnpm literal `--`를 backend script로 전달해 parser가 실패
  - details: parser에서 standalone `--`를 무시하도록 regression test와 구현을 추가
  - status: resolved
- 오류 기록:
  - time: `2026-05-18T13:09:54+09:00`
  - location: same lifecycle dry-run CLI smoke
  - summary: pnpm filter 실행 cwd가 `apps/backend`라 root-relative `tmp/...` path를 찾지 못함
  - details: input/output path resolution이 backend cwd 후보를 먼저 보고, 없으면 repo root 기준으로 fallback하도록 수정
  - status: resolved

### KR Lifecycle Dry-Run Reports

- Supabase plugin read-only query로 KR shared DB active snapshot을 source별로 확인하고 existing lifecycle snapshot artifact를 생성
  - `tmp/saramin_existing_lifecycle_snapshot.json`: 11 rows
  - `tmp/jobkorea_existing_lifecycle_snapshot.json`: 18 rows
  - `tmp/linkareer_existing_lifecycle_snapshot.json`: 4 rows
- `job_batch_v1` review artifact와 existing snapshot을 조합해 lifecycle dry-run report 3개 생성
  - `tmp/saramin_lifecycle_dry_run.json`
  - `tmp/jobkorea_lifecycle_dry_run.json`
  - `tmp/linkareer_lifecycle_dry_run.json`
- Report summary:
  - `saramin`: observed 10, closed candidates 0, inactive candidates 0, skipped 1
  - `jobkorea`: observed 18, closed candidates 0, inactive candidates 0, skipped 0
  - `linkareer`: observed 3, closed candidates 0, inactive candidates 0, skipped 1
- Skipped rows:
  - `saramin/53846395`: `missing_threshold_not_met`, next missing count 1
  - `linkareer/321489`: `missing_threshold_not_met`, next missing count 1
- Supabase plugin readback after report generation still showed all KR rows active:
  - `saramin=11`, `jobkorea=18`, `linkareer=4`
- 검증:
  - 3개 lifecycle dry-run CLI command 통과
  - 3개 report JSON summary readback 통과
  - 3개 KR review artifact 각각 `db:import:jobs --dry-run` 통과
  - Supabase plugin read-only status count 확인
- 오류 기록:
  - time: `2026-05-18T13:20:00+09:00`
  - location: `corepack pnpm run db:import:jobs --dry-run ../../tmp/jobkorea_batch_review.json`
  - summary: sandbox에서 Corepack이 `%LOCALAPPDATA%\\node\\corepack\\v1` temp folder 생성 중 `EPERM` 발생
  - details: 동일 dry-run 명령을 sandbox 승격으로 재실행했고 `jobkorea` 18 postings dry-run 통과
  - status: resolved

### KR Lifecycle Missing Count Supabase Sync

- 사용자가 Supabase DB를 개인 DB로 정정했고, dry-run-only 제한을 풀어 lifecycle missing count metadata를 Supabase에 동기화하도록 진행
- Supabase plugin SQL로 `classifier_meta.lifecycle` 업데이트를 실행
  - observed KR rows: `missingCount=0`
  - `saramin/53846395`: `missingCount=1`, `lastDecision=missing_threshold_not_met`
  - `linkareer/321489`: `missingCount=1`, `lastDecision=missing_threshold_not_met`
  - status 값은 변경하지 않음
- Supabase plugin 재인증 후 readback 검증 완료:
  - `jobkorea`: active 18, `missingCount=0` 18, threshold reached 0
  - `linkareer`: active 4, `missingCount=0` 3, `missingCount=1` 1, threshold reached 0
  - `saramin`: active 11, `missingCount=0` 10, `missingCount=1` 1, threshold reached 0
- 오류 기록:
  - time: `2026-05-18T13:27:00+09:00`
  - location: Supabase plugin verification query after lifecycle metadata sync
  - summary: sync SQL 실행 직후 검증 query에서 Supabase plugin이 `UNAUTHORIZED`, 이후 tool reload 후 `Unknown tool: supabase_execute_sql` 반환
  - details: 사용자가 Supabase connector에 다시 로그인한 뒤 plugin SQL readback을 재실행했고 expected missing count/status를 확인
  - status: resolved

### GPT 5.5 Pro Lifecycle Direction Review

- 사용자 요청에 따라 Chrome plugin으로 ChatGPT `5.5 Pro 확장` 방향성 리뷰를 1회 수행
- Chrome backend evidence:
  - selected browser name: `Chrome`
  - selected browser type: `extension`
- ChatGPT model evidence:
  - model menu: `최신 • 5.5`
  - checked item: `Pro • 확장`
  - composer button: `Pro 확장 모드`
- Prompt source:
  - KR import 완료 상태
  - lifecycle dry-run report 생성 상태
  - Supabase `classifier_meta.lifecycle.missingCount` sync 완료 상태
  - 다음 작업 후보 `db:lifecycle:jobs:apply --report ...`
- Review verdict:
  - apply command가 scheduler/manual automation 및 JP 확장보다 먼저라는 판단은 맞음
  - 핵심 리스크는 collection breadth가 아니라 lifecycle decision을 DB 상태로 안전하게 반영하는 경로
- Accepted reconciliation:
  - apply 전에 report completeness validation 추가
  - apply 직전 DB snapshot consistency check 추가
  - source 단위 transaction 필수
  - `closed`는 source-visible closed evidence가 있을 때만 허용
  - unknown bucket/reason, update count mismatch, partial report는 fail
  - `classifier_meta.lifecycle` 포함 internal metadata는 public API 노출 금지 유지

### KR Operational Pipeline Skeleton

- lifecycle apply 안전장치 구현 전에 전체 운영 흐름 구조를 먼저 고정
- 추가:
  - `apps/backend/src/scripts/jobOperationalPipeline.ts`
  - `apps/backend/src/scripts/jobOperationalPipeline.test.ts`
  - root/backend `jobs:operational:plan` script
- Plan-only schema: `job_operational_pipeline_v1`
- 지원 source는 현재 KR 운영 범위인 `saramin`, `jobkorea`, `linkareer`로 제한
- 고정 stage:
  - `collect_batch`
  - `import_dry_run`
  - `import_apply`
  - `lifecycle_snapshot`
  - `lifecycle_plan`
  - `lifecycle_apply`
- Supabase 연동은 `lifecycle_snapshot`의 `supabase_plugin` read 단계로 명시
- DB mutation stage인 `import_apply`, `lifecycle_apply`는 `requiresApproval=true`
- `lifecycle_apply`는 아직 future stub으로 남김
- 문서 갱신:
  - `docs/plans/2026-05-15-operational-job-collection-scope.md`
  - `docs/runbooks/KR_BATCH_DB_WRITE_PREFLIGHT.md`
- 검증:
  - TDD RED: `jobOperationalPipeline.js` module missing 확인
  - `corepack pnpm --filter @neet2work/backend test -- src/scripts/jobOperationalPipeline.test.ts` 통과
  - `corepack pnpm run jobs:operational:plan -- --source saramin` 통과
  - `.\apps\backend\node_modules\.bin\tsc.CMD --noEmit -p apps\backend\tsconfig.json` 통과
  - `corepack pnpm --filter @neet2work/backend lint` 통과
  - `git diff --check` 통과

### Supabase Plugin Operating Rule

- 사용자 요청에 따라 `AGENTS.md`에 Supabase 운영 경로 규칙 추가
- 반영 내용:
  - Supabase plugin/connector를 project DB read 및 승인된 write의 기본 경로로 사용
  - local `DATABASE_URL` 부재만으로 승인된 Supabase 작업을 block하지 않음
  - configured Supabase project DB를 사용자 project DB로 취급하고 근거 없이 shared DB라고 부르지 않음
  - 같은 세션에서 concrete scope로 plugin 사용이 승인된 경우, 그 scope 내부의 plugin 사용은 반복 질문하지 않음
  - 단, 새로운/확장된 persistent DB mutation, migration, destructive change, production write는 별도 승인 필요
- 검증:
  - `git diff --check -- AGENTS.md` 통과

### KR Lifecycle Apply Supabase Execution

- 사용자 승인에 따라 `DATABASE_URL` 없이 Supabase plugin SQL path로 KR lifecycle apply 실행
- Preflight readback:
  - project: `neet2work`, ref `lqwggtuxgbhotnqqvtxz`, status `ACTIVE_HEALTHY`
  - `jobkorea`: 18 active, `missingCount=0` 18
  - `linkareer`: 4 active, `missingCount=0` 3, `missingCount=1` 1
  - `saramin`: 11 active, `missingCount=0` 10, `missingCount=1` 1
  - duplicate `(source, source_job_id)`: 0
- 첫 apply SQL은 transaction 안에서 drift check가 실패해 rollback됨
  - location: Supabase plugin lifecycle apply transaction
  - summary: stale local snapshot/report는 missing rows의 `previousMissingCount=0`을 기대했지만 DB는 이전 수동 sync로 이미 `missingCount=1`
  - details: `saramin/53846395`, `linkareer/321489`가 같은 crawlBatchId로 이미 below-threshold missing 처리되어 있었음
  - status: resolved by adding same-crawl idempotency handling
- 코드 보강:
  - `jobLifecycleApply`에 same-crawl below-threshold missing row idempotency 추가
  - regression test 추가: 같은 crawl의 missing row가 이미 적용된 경우 update하지 않고 `alreadyApplied`로 집계
- Supabase plugin transaction apply 결과:
  - active observation rows updated: 31
  - same-crawl missing rows already applied: 2
  - closed rows updated: 0
  - inactive rows updated: 0
- Final readback:
  - `jobkorea`: rows 18, active 18, closed 0, inactive 0, report-marked 18
  - `linkareer`: rows 4, active 4, closed 0, inactive 0, `missingCount=1` 1, report-marked 3
  - `saramin`: rows 11, active 11, closed 0, inactive 0, `missingCount=1` 1, report-marked 10
  - duplicate rows: 0
  - KR `jobCategory=non_it`: 0
- 실제 status 변화는 없음; 이번 apply는 active observation lifecycle metadata/`lastSeenAt` refresh와 same-crawl missing no-op 검증이 목적

### KR Manual Operational Run Plan

- scheduler 전 단계로 KR 수동 운영 1회차 전체 순서를 plan-only CLI로 고정
- 추가:
  - `apps/backend/src/scripts/jobOperationalManualRun.ts`
  - `apps/backend/src/scripts/jobOperationalManualRun.test.ts`
  - root/backend `jobs:operational:manual-run` script
- Output schema: `job_operational_manual_run_v1`
- 기본 source: `saramin`, `jobkorea`, `linkareer`
- `--source <source>` 필터로 source별 rerun 가능
- 고정 단계:
  - `collect_batch`
  - `import_dry_run`
  - `import_apply_approval`
  - `import_apply`
  - `lifecycle_snapshot`
  - `lifecycle_plan`
  - `lifecycle_apply_approval`
  - `lifecycle_apply`
  - `post_apply_verification`
- Supabase plugin 단계는 `supabase_sql` step으로 명시하고, 실제 실행하지 않음
- DB mutation 단계는 approval-gated 유지
- runbook/운영 계획 문서에 manual run entrypoint와 단계 설명 추가
- 검증:
  - TDD RED: `jobOperationalManualRun.js` module missing 확인
  - `corepack pnpm --filter @neet2work/backend test -- src/scripts/jobOperationalManualRun.test.ts` 통과: 9 files, 50 tests
  - `corepack pnpm run jobs:operational:manual-run -- --source saramin` 통과
  - `corepack pnpm run jobs:operational:manual-run` 통과
  - `.\apps\backend\node_modules\.bin\tsc.CMD --noEmit -p apps\backend\tsconfig.json` 통과
  - `corepack pnpm --filter @neet2work/backend lint` 통과
  - `git diff --check` 통과

### KR Lifecycle Apply Command

- lifecycle dry-run report를 DB lifecycle 상태에 반영하는 approval-gated apply command 구현
- 추가:
  - `apps/backend/src/scripts/jobLifecycleApply.ts`
  - `apps/backend/src/scripts/jobLifecycleApply.test.ts`
  - root/backend `db:lifecycle:jobs:apply` script
- 변경:
  - `jobLifecycleDryRun` report에 `generatedAt` 추가
  - operational pipeline의 `lifecycle_apply` stage를 `implemented`로 전환
  - 운영 계획 문서와 KR preflight runbook에 apply safety checks 기록
- 적용 안전장치:
  - partial report 즉시 거부
  - bucket count와 decision array count 불일치 거부
  - unknown decision/skipped reason 거부
  - DB row missing/duplicate/status drift/`missingCount` drift 거부
  - source transaction 적용
  - 각 mutation update count가 `1`이 아니면 실패
- Mutation policy:
  - observed row는 `active` 유지 및 `missingCount=0`
  - source-visible closed candidate만 `closed`
  - threshold reached absent row만 `inactive`
  - below-threshold missing row는 status 변경 없이 lifecycle metadata만 갱신
  - 기존 `classifierMeta` 분류/디버그 필드는 보존하고 nested lifecycle metadata만 merge
- 현재 KR lifecycle dry-run report 3개를 `generatedAt` 포함 형식으로 재생성
  - `saramin`: active 10, closed 0, inactive 0, skipped 1
  - `jobkorea`: active 18, closed 0, inactive 0, skipped 0
  - `linkareer`: active 3, closed 0, inactive 0, skipped 1
- 실제 DB write는 실행하지 않음
- 검증:
  - TDD RED: `jobLifecycleApply.js` module missing 및 pipeline `stub` 상태 mismatch 확인
  - TDD RED: 기존 `classifierMeta` 보존 regression test 실패 확인 후 merge 방식으로 수정
  - `corepack pnpm --filter @neet2work/backend test -- src/scripts/jobLifecycleApply.test.ts src/scripts/jobOperationalPipeline.test.ts src/scripts/jobLifecycleDryRun.test.ts` 통과: 8 files, 43 tests
  - `corepack pnpm run jobs:operational:plan -- --source saramin` 통과
  - KR 3개 lifecycle dry-run report 재생성 통과
  - `.\apps\backend\node_modules\.bin\tsc.CMD --noEmit -p apps\backend\tsconfig.json` 통과
  - `corepack pnpm --filter @neet2work/backend lint` 통과
  - `git diff --check` 통과

### KR Manual Operational Run Rehearsal

- KR 3개 source batch artifact 재생성:
  - `saramin`: postings 7, warnings 0, errors 0, non_it 0, duplicate sourceJobId 0
  - `jobkorea`: postings 17, warnings 0, errors 0, non_it 0, duplicate sourceJobId 0
  - `linkareer`: postings 4, warnings 0, errors 0, non_it 0, duplicate sourceJobId 0
- `apps/backend` 기준 import dry-run 통과:
  - `../../tmp/saramin_batch_review.json`: 7 postings
  - `../../tmp/jobkorea_batch_review.json`: 17 postings
  - `../../tmp/linkareer_batch_review.json`: 4 postings
- Supabase plugin SQL로 개인 DB import delta 적용:
  - 신규 row 7건 insert/upsert
  - `saramin` 5, `jobkorea` 1, `linkareer` 1
  - 신규 7건 모두 `raw_json`/`raw_text` 존재 확인
- import 후 snapshot refresh 및 lifecycle dry-run 재생성:
  - `saramin`: existing 16, activeObservations 7, skipped missing-threshold 9, closed 0, inactive 0
  - `jobkorea`: existing 19, activeObservations 17, skipped missing-threshold 2, closed 0, inactive 0
  - `linkareer`: existing 5, activeObservations 4, skipped missing-threshold 1, closed 0, inactive 0
- Supabase plugin SQL로 lifecycle apply 적용:
  - active observation update 28/28
  - missing threshold-not-met update 12/12
  - closed/inactive update 0
- Final DB readback:
  - `jobkorea`: rows 19, active 19, closed 0, inactive 0, non_it 0, missingCount 0/1/2 = 17/2/0, lifecycle-marked 19
  - `linkareer`: rows 5, active 5, closed 0, inactive 0, non_it 0, missingCount 0/1/2 = 4/0/1, lifecycle-marked 5
  - `saramin`: rows 16, active 16, closed 0, inactive 0, non_it 0, missingCount 0/1/2 = 7/8/1, lifecycle-marked 16
  - duplicate source/sourceJobId rows: 0
- 로컬 snapshot 3개를 lifecycle apply 이후 missingCount 상태로 갱신
- Notes:
  - 첫 import dry-run은 repo root에서 상대경로 `tmp/...`로 실행해 backend cwd 기준 ENOENT가 났고, `apps/backend` cwd + `../../tmp/...`로 재실행해 해결
  - 첫 Supabase SQL payload는 base64 조립 오류로 reject되어 DB mutation 없이 실패했고, source 단위 payload로 쪼개 재실행해 성공
- 검증:
  - `corepack pnpm --filter @neet2work/backend test -- src/scripts/jobOperationalManualRun.test.ts src/scripts/jobOperationalPipeline.test.ts src/scripts/jobLifecycleApply.test.ts src/scripts/jobLifecycleDryRun.test.ts src/scripts/jobCrawlerImportCheck.test.ts src/scripts/importJobPostingsPayload.test.ts` 통과: 9 files, 50 tests
  - `corepack pnpm run jobs:operational:manual-run` 통과
  - `.\apps\backend\node_modules\.bin\tsc.CMD --noEmit -p apps\backend\tsconfig.json` 통과
  - `corepack pnpm --filter @neet2work/backend lint` 통과
  - `python -m unittest scripts/job_crawler/test_contract.py scripts/job_crawler/test_runner.py scripts/job_crawler/test_saramin.py scripts/job_crawler/test_jobkorea.py scripts/job_crawler/test_linkareer.py` 통과: 20 tests
  - `python -B -m py_compile <scripts/job_crawler/*.py>` 통과
  - `corepack pnpm run crawl:matrix:check` 통과: 7 sources
  - `git diff --check` 통과

### Figma Work Log Summary

- `docs/work-log/WORK_LOG.md`의 2026-05-18 Figma Summary를 오늘 결과 중심으로 요약
- 포함 내용:
  - KR batch/import/lifecycle 수동 운영 리허설 완료
  - Supabase 검증 결과: 중복 0, `non_it` 0, 전 row active
  - 내일 작업: KR scheduler skeleton과 SQL artifact 생성기 착수
- 후속 보정:
  - 2026-05-19 사용자 피드백에 따라 3줄 고정 제한을 제거
  - 2026-05-18 Figma Summary를 7 bullet로 확장
- 내일 할 일 상세:
  - `jobs:operational:manual-run` plan을 기준으로 scheduler 실행 단위 설계
  - `collect -> import dry-run -> SQL artifact 생성 -> lifecycle snapshot/dry-run -> lifecycle SQL artifact -> verification` 흐름 고정
  - 첫 버전은 자동 DB write 없이 plan, SQL artifact, 검증 결과까지만 생성
  - 승인 모드에서만 Supabase plugin apply를 수행하도록 gate 유지
- Figma sync:
  - `corepack pnpm run worklog:export` 통과
  - local bridge `http://localhost:3927` 실행 후 `corepack pnpm run figma:apply-log -- --timeout-ms 30000` 통과
  - result: `Figma WORK_LOG appended.`
