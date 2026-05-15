# Work Sessions

오늘 작업 상세 기록 원장이다.
지난 날짜 기록은 `docs/work-log/archive/`에 보관한다.

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
