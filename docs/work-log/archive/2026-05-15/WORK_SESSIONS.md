# Work Sessions

## 2026-05-15

### Job Collection Pipeline Planning

- 한국 사이트부터 일본 사이트까지 수집 가능성 검증과 표준화 파이프라인 확보를 목표로 `planning-brief.md`를 생성
- repo 현실 기준으로 `docs/plans/2026-05-15-job-collection-pipeline.md`에 단계별 실행 계획, write set, acceptance check, rollback risk, verification command를 고정
- 초기에는 `@chrome`/ChatGPT 자동화 도구가 일반 MCP 목록에 노출되지 않는 것으로 판단해 GPT-5.5 Pro 검토 프롬프트를 `planning-brief.md`에 보존
- 검증: 계획 문서 금지어 scan, `git diff --check`, `corepack pnpm run worklog:prepare`, `corepack pnpm run worklog:export` 통과
- `chrome@openai-bundled`의 신뢰된 marketplace browser-client로 Chrome extension backend 연결을 재확인하고 ChatGPT에 계획 검토 프롬프트 제출
- GPT 검토 결과를 `docs/plans/2026-05-15-job-collection-pipeline-gpt-review.md`에 정리하고, 기존 계획을 후보 큐/`GREEN-YELLOW-RED` probe 우선 방식으로 보정
- 사용자 요청에 따라 ChatGPT `Pro` 모드로 같은 검토를 재실행했고, 모델 메뉴에서 `다시 시도하기 • 5.5 Pro` 확인
- Pro 재검토 결과를 반영해 새 사이트 추가 전 Phase 0 계약 고정, Saramin baseline 검증, public API raw field 누출 확인을 계획에 추가
- `docs/runbooks/CHROME_GPT_REVIEW_RULES.md`를 추가하고, `AGENTS.md`에서 `@chrome`/ChatGPT/GPT Pro 검토 시에만 해당 runbook을 읽도록 조건부 규칙 추가
- pnpm 11 마이그레이션 이후 남아 있던 `AGENTS.md`의 `npm.cmd` 실행 예시를 `corepack pnpm` 기준으로 교정
- 사용자 요청에 따라 job collection 계획을 재작성하고 `planning-brief.md`를 현재 repo/pnpm 기준으로 갱신
- `chrome@openai-bundled` extension backend에서 ChatGPT `최신 • 5.5` / `Pro • 확장` 체크를 확인한 뒤 계획 검토를 재요청
- GPT 응답을 `docs/plans/2026-05-15-job-collection-pipeline-gpt-review.md`에 repo 현실 기준으로 수용/수정/거절 정리
- 최종 실행 체크리스트를 `docs/plans/2026-05-15-job-collection-pipeline.md`에 write set, acceptance check, rollback risk, verification command까지 고정

### Job Collection Pipeline Sliced Execution

- 사용자 지시에 따라 큰 계획을 한 번에 실행하지 않고 site/probe/collector/matrix 단위로 `작업 -> 검증` 루프를 반복
- Phase 0/1에서 Saramin baseline, public raw-field boundary, backend test/lint/tsc, Python compile을 재검증하고 Windows `tsc.CMD` 명령을 계획 문서에 고정
- evidence template을 `docs/research/job-sites/evidence/README.md`로 추가하고 모든 후보를 `GREEN/YELLOW/RED` 기준으로 분류
- 한국 후보 결과:
  - `GREEN`: `saramin`, `jobkorea`, `linkareer`
  - `YELLOW`: `catch`
  - `RED`: `jobplanet`, `indeed_kr`
- 일본 후보 전 field-gap review를 `docs/research/job-sites/JAPAN_JOB_SITE_COLLECTION_AUDIT.md`에 추가하고 KOREC는 내부 API/로그인 근거 때문에 이번 collector 순서에서 제외
- 일본 후보 결과:
  - `GREEN`: `mynavi_tenshoku`, `daijob`, `careercross`, `green_japan`
  - `YELLOW`: `doda`
  - `RED`: `rikunabi_next`
- GREEN 소스별 collector, sample JSON, root check script를 추가:
  - `scripts/job_crawler/jobkorea.py`
  - `scripts/job_crawler/linkareer.py`
  - `scripts/job_crawler/mynavi_tenshoku.py`
  - `scripts/job_crawler/daijob.py`
  - `scripts/job_crawler/careercross.py`
  - `scripts/job_crawler/green_japan.py`
- 공통 runner를 `apps/backend/src/scripts/jobCrawlerImportCheck.ts`로 확장하고 `apps/backend/src/scripts/jobCrawlerMatrixCheck.ts`를 추가해 GREEN 7개만 matrix check에 포함
- CareerCross에서 Python 기본 CA 경로 문제로 SSL 검증 실패가 발생해 원인을 `certifi` CA bundle 차이로 확인하고, 인증서 검증을 끄지 않는 방식으로 `scripts/job_crawler/http_client.py`를 보강
- 검증:
  - `git diff --check`
  - `python -m py_compile ...`
  - `.\apps\backend\node_modules\.bin\tsc.CMD --noEmit -p apps\backend\tsconfig.json`
  - `corepack pnpm --filter @neet2work/backend lint`
  - `corepack pnpm --filter @neet2work/backend test`
  - `corepack pnpm run crawl:matrix:check`
- 큰 계획 종료 후 코드 리뷰를 수행했고 blocking finding은 없음. 남은 리스크는 외부 사이트 selector/차단 drift이므로 matrix 실패 시 해당 소스를 `YELLOW`로 내리고 evidence를 갱신하는 방식으로 처리

### Selfdex Verification Closure

- `@selfdex` 다음 작업 후보를 기준으로 열린 job crawler pipeline 변경분을 새 기능 추가 없이 검증 마감
- `GREEN` collector 7개와 evidence 상태를 재확인했고 `YELLOW/RED` 소스에는 final collector가 없는 상태를 확인
- `corepack pnpm run crawl:matrix:check`로 `saramin`, `jobkorea`, `linkareer`, `mynavi_tenshoku`, `daijob`, `careercross`, `green_japan` 수집 + dry-run import 전부 통과 확인
- 각 collector의 `--limit 6` 거절을 실제 실행으로 확인해 최대 5건 guard가 살아 있음을 확인
- public API raw-field boundary는 `job.service.ts`의 Prisma `select`/`toJobPosting()` 경로에서 `rawText`, `rawJson`, `companyInfo`를 반환하지 않는 구조로 확인
- 검증:
  - `git diff --check`
  - `python -B -m py_compile ...`
  - `corepack pnpm --filter @neet2work/backend lint`
  - `corepack pnpm --filter @neet2work/backend test`
  - `.\apps\backend\node_modules\.bin\tsc.CMD --noEmit -p apps\backend\tsconfig.json`
  - `corepack pnpm run crawl:matrix:check`
  - crawler safety scan: browser automation/proxy/stealth 없음, Python collector DB write 없음
- 참고: backend test는 샌드박스에서 Vitest `.vite-temp` 쓰기 `EPERM`이 발생했지만, 같은 명령을 승인된 샌드박스 외부 실행으로 재시도해 4 files / 18 tests 통과

### Figma Work Log Condensing

- Figma-facing `WORK_LOG.md`가 상세 실행 로그처럼 길어져서 계획/분류/구현/검증 4줄 요약으로 축약
- 상세 검증 기록은 `WORK_SESSIONS.md`에 유지하고 Figma 텍스트에는 핵심 결과만 남김
- 이미 Figma에 올라간 이전 날짜도 짧게 보이도록 archive의 2026-05-13, 2026-05-14 `WORK_LOG.md` 요약을 각각 3~4줄로 축약
- `scripts/export-work-log.mjs`가 기본 `WORK_LOG.md`에 없는 날짜를 `docs/work-log/archive/<date>/WORK_LOG.md`에서 fallback으로 읽도록 보강
- Figma bridge/plugin runner로 2026-05-13, 2026-05-14, 2026-05-15 요약을 순차 반영했고 결과는 `5/13 replaced`, `5/14 replaced`, `5/15 appended`
- 2026-05-15 Figma 요약이 여전히 길어 보여서 결과 중심 2줄로 재축약
- 2줄 요약을 Figma에 재반영했고 결과는 `5/15 replaced`
- Figma 요약 재비대화를 막기 위해 `FIGMA_WORK_LOG_RULES.md`에 2줄 권장/3줄 hard limit/80자 제한을 명시
- `prepare-work-log-day.mjs`의 `WORK_LOG.md` 템플릿에 짧은 요약 안내 주석을 추가하고, `export-work-log.mjs`가 3줄/80자 초과 요약을 거절하도록 guard 추가
- 3줄로 줄인 2026-05-14 요약을 Figma에 재반영했고 결과는 `5/14 replaced`

### Supabase Sample Import Verification

- Supabase `neet2work` 프로젝트가 `ACTIVE_HEALTHY`이고 Prisma migrations 4개가 적용된 상태를 확인
- import 전 `job_postings`는 `sample` 3건, `saramin` 1건으로 총 4건임을 확인
- `jobkorea`, `linkareer`, `mynavi_tenshoku`, `daijob`, `careercross`, `green_japan` sample JSON 6개를 dry-run 검증 후 Supabase에 upsert
- import 후 `job_postings`는 총 10건이며 7개 GREEN source가 각각 1건씩 존재함을 확인
- backend public query와 같은 필드/정렬로 Supabase에서 10건 조회를 확인
- 제한: 로컬 `.env`와 현재 프로세스에 `DATABASE_URL`이 없어 `dev:backend` 기반 `/api/jobs` 실제 HTTP 검증은 아직 못 함

### Supabase Sample Seed Cleanup

- 사용자 요청에 따라 Supabase `job_postings`의 초기 데모 seed 3건(`job-001`, `job-002`, `job-003`)을 삭제
- 삭제 전 연결된 `resume_analyses`가 없음을 확인했고 삭제 결과는 `deleted_job_count=3`, `deleted_analysis_count=0`
- 삭제 후 `sample` source 잔여 건수는 0건이며, 남은 source는 `saramin`, `jobkorea`, `linkareer`, `mynavi_tenshoku`, `daijob`, `careercross`, `green_japan` 각 1건

### Operational Collection Scope Plan

- 사용자와 합의한 기준대로 운영 수집 범위를 `활성 공고`, `신입/주니어 우선`, `경력직 포함`, `IT 한정 금지`로 정리
- 코드 구현 없이 `docs/plans/2026-05-15-operational-job-collection-scope.md` 계획 문서만 추가
- 계획에는 active/closed 판정, career stage, job category, source/category/career caps, schema lifecycle field 후보, future verification 순서를 포함
- Chrome 확장 백엔드(`Chrome`, `extension`)에서 ChatGPT `Pro 확장 모드`로 계획을 재검토했고, source contract, batch JSON contract, lifecycle state machine, public DTO allowlist, `(source, sourceJobId)` dedupe 보강점을 계획에 반영
- GPT 제안 중 repo 필드명과 다른 `companyName`/`url`은 현재 계약인 `company`/`sourceUrl` 기준으로 조정했고, 구현/DB write/scheduler는 이번 계획 강화 범위에서 제외

### Operational Collection Implementation Slices

- 운영 수집 계획을 작은 slice로 구현: source contract 문서, lifecycle Prisma schema/migration, batch payload import, Python classification/batch helper, shared collector runner를 추가
- Import는 legacy array와 `job_batch_v1` envelope를 모두 받게 하고, 운영 payload는 `(source, sourceJobId)`로 upsert하며 raw/internal fields는 public job list select에서 제외
- Python collector는 계속 JSON-only로 유지하고 `run_source.py`가 기존 7개 GREEN collector 결과를 sample/batch envelope로 감싸도록 연결
- Chrome 확장 백엔드(`Chrome`, `extension`)에서 ChatGPT `Pro 확장 모드`로 README+계획 방향성 체크를 다시 받았고, "방향은 강하지만 scope control 필요" 결론에 따라 README의 RPA 표현을 collector/ETL로 정리하고 첫 운영 DB-write는 KR 3개 source 이하로 제한하는 계획을 반영
- 검증:
  - `python -m unittest scripts/job_crawler/test_contract.py scripts/job_crawler/test_runner.py`
  - `python -m py_compile scripts/job_crawler/contract.py scripts/job_crawler/models.py scripts/job_crawler/run_source.py scripts/job_crawler/test_contract.py scripts/job_crawler/test_runner.py`
  - `node node_modules/vitest/vitest.mjs run --configLoader runner --root apps/backend --config vitest.config.ts`
  - `.\apps\backend\node_modules\.bin\tsc.CMD --noEmit`
  - `DATABASE_URL` dummy + `.\node_modules\.bin\prisma.CMD validate`
  - `corepack pnpm --filter @neet2work/backend run lint`
  - `node node_modules\tsx\dist\cli.mjs apps/backend/src/scripts/jobCrawlerMatrixCheck.ts --continue-on-fail`
- 제한: 실제 Supabase/공유 DB write는 이번 작업에서 실행하지 않았고, closed/inactive lifecycle 자동 전환은 아직 다음 slice로 남김

### Operational Collection IT Scope Narrowing

- 사용자 수정 요청에 따라 1차 운영 수집 범위를 IT 공고로 축소
- IT 범위는 software engineering, data/AI, infrastructure/security, QA/testing, IT product planning/design, technical support, solution consulting으로 정의하고 일반 비IT 직군은 `non_it`로 제외
- `scripts/job_crawler/contract.py`의 category classifier와 cap 적용 경로가 non-IT를 batch payload에서 제외하도록 변경
- 운영 계획/스키마/source contract/README에서 "비IT 포함" 표현을 제거하고 "비IT는 추후 확장 후보"로 정리
- 검증:
  - `python -m unittest scripts/job_crawler/test_contract.py scripts/job_crawler/test_runner.py`
  - `python -m py_compile scripts/job_crawler/contract.py scripts/job_crawler/run_source.py scripts/job_crawler/test_contract.py scripts/job_crawler/test_runner.py`
  - `node node_modules\tsx\dist\cli.mjs apps/backend/src/scripts/jobCrawlerMatrixCheck.ts --continue-on-fail`
  - `git diff --check`
- 참고: matrix에서 `linkareer` 첫 샘플은 IT scope 필터 후 0건 batch가 되었고 dry-run import는 정상 통과
