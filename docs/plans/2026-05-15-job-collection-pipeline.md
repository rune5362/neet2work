# Job Collection Pipeline Execution Plan

Date: 2026-05-15
Workspace: `C:\lsh\git\neet2work`

## 목표

한국 채용 사이트부터 일본 채용 사이트까지 각 수집 가능성을 검증하고,
검증된 사이트만 표준화된 최종 수집 스크립트에 포함한다.

완료 기준은 "모든 후보 사이트에 스크립트를 억지로 만드는 것"이 아니라:

- `GREEN` 사이트는 1건 샘플 수집 + 표준 JSON 생성 + dry-run import 통과
- `YELLOW` / `RED` 사이트는 증거 문서와 제외/보류 사유 고정
- 최종 matrix check는 `GREEN` 사이트만 실행

## Repo Reality

- 패키지 매니저는 `pnpm@11.1.1`이고 명령은 `corepack pnpm` 기준이다.
- 현재 Python 수집기는 `scripts/job_crawler/`에 있다.
- 현재 공통 파일은 `models.py`, `http_client.py`다.
- 현재 기준 수집기는 `scripts/job_crawler/saramin.py`다.
- DB 경계는 `apps/backend/prisma/importJobPostings.ts`다.
- 현재 runner는 `apps/backend/src/scripts/saraminImportCheck.ts`다.
- 공개 API 경계는 `apps/backend/src/services/job.service.ts`다.
- 표준 스키마 문서는
  `docs/research/job-sites/JOB_POSTING_COLLECTION_SCHEMA.md`다.
- source status/evidence는 새 파일을 repo 루트나 `scripts/` 아래 만들지 않고
  `docs/research/job-sites/evidence/`에 둔다.

## Non-Negotiable Gates

- 수집 방식은 공개 `HTTP request + HTML parsing`만 허용한다.
- 로그인, captcha, proxy, stealth, bot 우회, browser automation 수집은 금지한다.
- undocumented internal API가 유일한 안정 경로면 `GREEN`이 될 수 없다.
- Python collector는 DB에 직접 쓰지 않는다.
- collector는 JSON만 만들고, import는 TypeScript dry-run으로 검증한다.
- 기본 limit은 `1`, 최대 limit은 `5`다.
- 2건 이상 상세 요청은 delay가 있어야 한다.
- `rawText`, `rawJson`, `companyInfo`는 public API와 frontend public type에 노출하지 않는다.
- 일본/global 필드 때문에 schema migration을 바로 만들지 않는다. 실제 샘플이 현재 필드로 담기 어렵다는 증거가 먼저 필요하다.
- 한국 후보 전체를 `GREEN collector` 또는 `YELLOW/RED evidence`로 정리한 뒤 일본 후보로 넘어간다.

## Operational Batch Follow-up

2026-05-15 이후 운영 수집으로 확장할 때는 이 1건 sample 계획이 아니라
`docs/plans/2026-05-15-operational-job-collection-scope.md`와
`docs/research/job-sites/OPERATIONAL_SOURCE_CONTRACTS.md`를 함께 따른다.

운영 batch 대상은 현재 evidence와 collector가 모두 통과한 `GREEN` source만이다:

- `saramin`
- `jobkorea`
- `linkareer`
- `mynavi_tenshoku`
- `daijob`
- `careercross`
- `green_japan`

`catch`, `doda`, `rikunabi_next`, `jobplanet`, `indeed_kr` 등은 현재 운영 batch 대상이 아니며,
재검토 전에는 evidence-only 또는 제외 상태를 유지한다.

## Status Rules

| Status | 의미 | 처리 |
| --- | --- | --- |
| `GREEN` | 공개 HTTP + 정적 HTML로 list/detail 또는 list-first 표준 JSON 생성 가능 | collector 구현, sample JSON 저장, dry-run import, check script 포함 |
| `YELLOW` | 일부 데이터는 가능하지만 불안정/불완전/법무 리스크/필드 편차가 큼 | evidence만 저장, 최종 script 제외, 후순위 재검토 |
| `RED` | login/captcha/JS-only/internal API/명시적 금지/공개 필드 부족 | evidence 저장, collector 금지, 최종 script 제외 |

## Phase Order

### Phase 0: Contract Freeze

- [ ] `git status --short`로 기존 dirty scope 확인
- [ ] `docs/research/job-sites/JOB_POSTING_COLLECTION_SCHEMA.md` 기준 필드 고정
- [ ] `scripts/job_crawler/saramin.py`를 canonical baseline으로 고정
- [ ] Python collector는 JSON-only, DB-write-free임을 확인
- [ ] `apps/backend/prisma/importJobPostings.ts`가 import boundary임을 확인
- [ ] `apps/backend/src/services/job.service.ts`가 `rawText`, `rawJson`, `companyInfo`를 public response에서 제외하는지 확인
- [ ] mock fallback 경로를 건드리지 않는다고 고정

### Phase 1: Saramin Baseline Verification

- [ ] `corepack pnpm run crawl:saramin:check`
- [ ] `python -m py_compile scripts/job_crawler/*.py`
- [ ] `corepack pnpm --filter @neet2work/backend test`
- [ ] `corepack pnpm --filter @neet2work/backend lint`
- [ ] `.\apps\backend\node_modules\.bin\tsc.CMD --noEmit -p apps\backend\tsconfig.json`
- [ ] 실패가 외부 사이트/network 때문이면 code change 대신 evidence에 blocker 기록

### Phase 2: Probe Evidence Template

Create:

- `docs/research/job-sites/evidence/README.md`

Every source evidence file must include:

- source key
- probe date
- list URL checked
- detail URL checked if available
- HTTP status and final URL
- public HTML list fields observed
- public HTML detail fields observed
- blocker signals: login, captcha, JS-only, internal API, official API, explicit scraping prohibition
- robots/terms/path risk note when visible from public pages
- `sourceJobId` strategy
- normalized required fields observed
- final status: `GREEN`, `YELLOW`, or `RED`
- next action

### Phase 3: JobKorea Probe, Then Conditional Collector

- [ ] Create `docs/research/job-sites/evidence/jobkorea_2026-05-15.md`
- [ ] Decide `GREEN` / `YELLOW` / `RED`
- [ ] Create `scripts/job_crawler/jobkorea.py` only if `GREEN`
- [ ] Create `docs/research/job-sites/jobkorea_sample_2026-05-15.json` only if `GREEN`
- [ ] Run dry-run import for the sample

JobKorea can be list-first only if list fields are enough for a useful
`JobPosting` and detail fetch fragility is documented in `rawJson`.

### Phase 4: Small Shared Runner Only After Two GREEN Sources

Do not add a framework first. If `saramin` and `jobkorea` both pass:

- [ ] Create `apps/backend/src/scripts/jobCrawlerImportCheck.ts`
- [ ] Create `apps/backend/src/scripts/jobCrawlerImportCheck.test.ts`
- [ ] Keep `crawl:saramin:check` compatible
- [ ] Add `crawl:jobkorea:check`

The runner only builds and runs:

1. Python collector to JSON
2. TypeScript dry-run import

It must not write to DB.

### Phase 5: Finish Korean Candidates

Probe order:

1. `catch`
2. `linkareer`
3. `jobplanet`
4. `indeed_kr`

For each source:

- [ ] Create `docs/research/job-sites/evidence/<source>_2026-05-15.md`
- [ ] Decide status before creating collector
- [ ] Create `scripts/job_crawler/<source>.py` only if `GREEN`
- [ ] Create sample JSON only if `GREEN`
- [ ] Add root check script only if `GREEN`

Special rules:

- `linkareer`: category guard required; activity/contest-only items must not be normalized as normal jobs.
- `jobplanet`: evidence-only unless public list/detail path proves stable.
- `indeed_kr`: auxiliary only even if `GREEN`; small sample, no bulk default.

### Phase 5 Execution Checkpoint: Korean Candidates

Current execution result as of 2026-05-15:

| Source | Status | Artifact decision | Verification |
| --- | --- | --- | --- |
| `saramin` | `GREEN` | keep existing collector and migrate root check to shared runner | `corepack pnpm run crawl:saramin:check` passed after external HTTP access was allowed |
| `jobkorea` | `GREEN` | add `scripts/job_crawler/jobkorea.py`, one sample JSON, and `crawl:jobkorea:check` | sample dry-run import and root check passed |
| `catch` | `YELLOW` | evidence only; no collector | `scripts/job_crawler/catch.py` intentionally absent |
| `linkareer` | `GREEN` | add category-guarded `scripts/job_crawler/linkareer.py`, one sample JSON, and `crawl:linkareer:check` | sample dry-run import, category guard, limit guard, and root check passed |
| `jobplanet` | `RED` | evidence only; no collector | current public list/detail HTTP paths returned `403`; `scripts/job_crawler/jobplanet.py` intentionally absent |
| `indeed_kr` | `RED` | evidence only; no collector | current desktop list, mobile list, and detail sample returned `403`; `scripts/job_crawler/indeed_kr.py` intentionally absent |

Korean matrix rule for later phases:

- Include only `saramin`, `jobkorea`, and `linkareer` in the first final matrix.
- Exclude `catch`, `jobplanet`, and `indeed_kr` from final scripts until fresh
  evidence upgrades them.
- Do not create Korean schema migrations from this slice.
- Move to Japanese field-gap review only after this checkpoint remains true in
  `package.json`, `scripts/job_crawler/`, and `docs/research/job-sites/evidence/`.

### Phase 6: Japanese Field Gap Review

Before any Japanese collector:

- [ ] Update `docs/research/job-sites/JAPAN_JOB_SITE_COLLECTION_AUDIT.md`
- [ ] Compare Japanese fields against current schema
- [ ] Use `salaryText`, `rawJson`, `companyInfo`, `country`, `language`, `employmentType` before proposing migration
- [ ] Do not edit Prisma schema unless user approves after sample evidence

### Phase 7: Japanese Probes And Conditional Collectors

Probe order:

1. `mynavi_tenshoku`
2. `doda`
3. `rikunabi_next`
4. `daijob`
5. `careercross`
6. `green_japan`

For each source:

- [ ] Create `docs/research/job-sites/evidence/<source>_2026-05-15.md`
- [ ] Decide status before creating collector
- [ ] Create `scripts/job_crawler/<source>.py` only if `GREEN`
- [ ] Create sample JSON only if `GREEN`
- [ ] Run dry-run import only if sample exists

Japanese acceptance:

- `country` is `JP`
- `language` is `ja` or `en`
- UTF-8 Japanese text is preserved
- ambiguous source-specific fields stay in `rawJson` or `companyInfo`
- no schema migration during first proof

### Phase 7 Execution Checkpoint: Japanese Candidates

Current execution result as of 2026-05-15:

| Source | Status | Artifact decision | Verification |
| --- | --- | --- | --- |
| `mynavi_tenshoku` | `GREEN` | add `scripts/job_crawler/mynavi_tenshoku.py`, one JP/ja sample JSON, and `crawl:mynavi:check` | sample dry-run import and root check passed |
| `doda` | `YELLOW` | evidence only; no collector | current public GET requests timed out and detail HEAD reset; `scripts/job_crawler/doda.py` intentionally absent |
| `rikunabi_next` | `RED` | evidence only; no collector | checked detail redirects through session cleanup to a Next.js shell with no static job text; `scripts/job_crawler/rikunabi_next.py` intentionally absent |
| `daijob` | `GREEN` | add `scripts/job_crawler/daijob.py`, one JP/en sample JSON, and `crawl:daijob:check` | sample dry-run import and root check passed |
| `careercross` | `GREEN` | add `scripts/job_crawler/careercross.py`, one JP/en sample JSON, and `crawl:careercross:check` | sample dry-run import and root check passed |
| `green_japan` | `GREEN` | add `scripts/job_crawler/green_japan.py`, one JP/ja sample JSON, and `crawl:green:check` | sample dry-run import and root check passed |

Japanese matrix rule so far:

- Include `mynavi_tenshoku`, `daijob`, `careercross`, and `green_japan` in the
  final matrix script.
- Exclude `doda` and `rikunabi_next` from final scripts until fresh evidence
  upgrades them.
- Do not create a schema migration unless a later sample proves the current
  `salaryText`, `rawJson`, or `companyInfo` mapping is insufficient.

### Phase 8: Final Matrix Script

After enough `GREEN` sources exist:

- [ ] Create `apps/backend/src/scripts/jobCrawlerMatrixCheck.ts`
- [ ] Create `apps/backend/src/scripts/jobCrawlerMatrixCheck.test.ts`
- [ ] Add `crawl:matrix:check`
- [ ] Matrix includes only `GREEN` sources
- [ ] Matrix excludes `KOREC`, `YELLOW`, and `RED` sources
- [ ] Matrix stops on failure unless `--continue-on-fail` is explicitly passed

### Phase 8 Execution Checkpoint: Final Matrix

Current execution result as of 2026-05-15:

- `apps/backend/src/scripts/jobCrawlerMatrixCheck.ts` created.
- `apps/backend/src/scripts/jobCrawlerMatrixCheck.test.ts` created.
- `crawl:matrix:check` added to root `package.json`.
- Matrix sources:
  - `saramin`
  - `jobkorea`
  - `linkareer`
  - `mynavi_tenshoku`
  - `daijob`
  - `careercross`
  - `green_japan`
- Matrix exclusions:
  - `catch`
  - `jobplanet`
  - `indeed_kr`
  - `KOREC`
  - `doda`
  - `rikunabi_next`
- `--continue-on-fail` is supported; default behavior stops on the first
  failed source.
- Verification: `corepack pnpm run crawl:matrix:check` passed for all 7 GREEN
  sources.

## Per-Site Acceptance Rules

| Source | Probe requirement | Collector acceptance | Downgrade/drop trigger |
| --- | --- | --- | --- |
| `saramin` | existing collector and check still work | baseline JSON and dry-run pass | current public fetch consistently fails; document blocker |
| `jobkorea` | public list HTML has title/company/location/deadline/source ID | list-first JSON acceptable; detail status in `rawJson` if detail weak | detail/list requires login, JS-only, or fields too weak |
| `catch` | public list/detail has job/company fields | company/job enrichment fields mapped conservatively | external-only/image-only/detail unavailable |
| `linkareer` | category-limited job/intern pages are separable | only job-like items normalized | activity/contest/education cannot be reliably separated |
| `jobplanet` | public ID path and detail fields are stable | skills/tasks/requirements captured when public | public list ID path unstable or login-dependent |
| `indeed_kr` | tiny sample works without captcha | auxiliary collector only, no bulk default | captcha, bot wall, duplicate/external source instability |
| `mynavi_tenshoku` | IT/job detail public HTML works | JP/ja sample dry-run passes | detail blocked or only dynamic data visible |
| `doda` | `-tab__jd/` style detail path works | salary/employment text preserved as raw text | unstable detail/cache failure prevents sample |
| `rikunabi_next` | real public cards and details are reachable | no invented data from filters only | filters visible but real public postings unstable |
| `daijob` | public detail exposes language/visa/global fields | global flags stored in `rawJson`/`companyInfo` | external/internal path required |
| `careercross` | public detail exposes language/salary/visa fields | language and recruiter/direct hint preserved | login block or recruiter data impossible to separate |
| `green_japan` | public IT/Web details expose role/skills | tech keywords and role text captured | required fields behind login/member prompt |

## Final Execution Checklist

### Write Set

Allowed:

- `scripts/job_crawler/**`
- `apps/backend/src/scripts/**`
- `apps/backend/package.json`
- `package.json`
- `docs/research/job-sites/**`
- `docs/plans/**`
- `docs/work-log/WORK_SESSIONS.md`
- `docs/work-log/WORK_LOG.md`

Guarded:

- `apps/backend/prisma/schema.prisma`
- `apps/backend/prisma/migrations/**`
- `apps/backend/src/services/job.service.ts`
- `apps/backend/src/types/job.ts`
- `apps/frontend/src/types/job.ts`
- `apps/frontend/**`

Forbidden:

- `.env`
- `.env.*`
- `node_modules/**`
- `dist/**`
- `apps/backend/src/generated/prisma/**`

### Acceptance Checks

- Existing Saramin baseline passes or has a documented external blocker.
- Every candidate has an evidence file before collector implementation.
- No `YELLOW` or `RED` source has a final collector script.
- Every `GREEN` source has:
  - collector script
  - 1-sample JSON
  - dry-run import result
  - root or matrix check path
- Korean candidates are fully classified before Japanese candidates begin.
- Japanese field-gap decision is written before Japanese collectors.
- Matrix includes only `GREEN` sources.
- Mock fallback remains untouched.
- Public API raw-field boundary remains closed.

### Rollback Risks

| Risk | Trigger | Rollback |
| --- | --- | --- |
| selector drift | source sample fails after site HTML changes | remove from matrix, downgrade to `YELLOW`, keep evidence |
| anti-bot/legal risk | login, captcha, explicit scraping prohibition, internal API dependence | stop implementation, mark `RED` |
| over-abstraction | runner/framework grows before repeated need is proven | revert shared runner work, keep per-source scripts |
| malformed JSON | dry-run import fails | fix source adapter or downgrade source |
| limit/delay safety break | collector allows >5 or no delay for multi-detail | fix before any source can be accepted |
| public raw-field leak | `rawText`, `rawJson`, `companyInfo` appear in public response | revert service/type change immediately |
| schema pressure | Japanese fields do not fit current contract | document gap and pause for schema decision |
| demo regression | mock fallback changes or breaks | revert non-collector changes first |

### Verification Commands

Baseline:

```bash
git status --short
corepack pnpm run crawl:saramin:check
python -m py_compile scripts/job_crawler/*.py
corepack pnpm --filter @neet2work/backend test
corepack pnpm --filter @neet2work/backend lint
.\apps\backend\node_modules\.bin\tsc.CMD --noEmit -p apps\backend\tsconfig.json
rg -n "rawText|rawJson|companyInfo" apps/backend/src apps/frontend/src
git diff --check
```

Python crawler safety scan:

```bash
rg -n "selenium|puppeteer|playwright|proxy|captcha|stealth|browser" scripts/job_crawler
rg -n "prisma|database|db\\." scripts/job_crawler
```

Expected: no matches that introduce browser automation, bypass behavior, or DB
write paths in Python collectors.

Per source:

```bash
python scripts/job_crawler/<source>.py --limit 1 --output docs/research/job-sites/<source>_sample_2026-05-15.json
corepack pnpm --filter @neet2work/backend run db:import:jobs --dry-run ../../docs/research/job-sites/<source>_sample_2026-05-15.json
python scripts/job_crawler/<source>.py --limit 6
```

Expected: sample dry-run passes, and `--limit 6` fails clearly or refuses to
collect more than 5.

Korean phase:

```bash
corepack pnpm run crawl:saramin:check
corepack pnpm run crawl:jobkorea:check
corepack pnpm run crawl:catch:check
corepack pnpm run crawl:linkareer:check
```

Run only commands for sources classified `GREEN`.

Final:

```bash
corepack pnpm run crawl:matrix:check
python -m py_compile scripts/job_crawler/*.py
corepack pnpm --filter @neet2work/backend test
corepack pnpm --filter @neet2work/backend lint
.\apps\backend\node_modules\.bin\tsc.CMD --noEmit -p apps\backend\tsconfig.json
corepack pnpm run worklog:export
git diff --check
```

Use `corepack pnpm run check` only after source-specific checks are stable
enough for a full frontend/backend validation run.
