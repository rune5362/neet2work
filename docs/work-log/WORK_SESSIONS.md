# Work Sessions

오늘 작업 상세 기록 원장이다.
지난 날짜 기록은 `docs/work-log/archive/`에 보관한다.

## 2026-06-01

### draft-workflow 자소서 실사용 문제 패치

- `/api/draft-workflow` 계약에 요구사항 우선 `materialStore`, 문서 출력 포맷(`UTF-8`, `Malgun Gothic`/맑은 고딕), 기존 초안 반복 방지 입력을 추가했다.
- fallback plan/draft가 첨부 요구사항을 최우선 재료로 분리하고, 지원동기 문항에서 회사 근거가 부족하면 보완 질문을 만들도록 수정했다.
- draft 검증에 첨부 요구사항 우선 반영, 글자 수 메타데이터 일치, 깨진 문자/비정상 공백, 내부 용어 노출 차단을 추가했다.
- 프론트는 요구사항처럼 보이는 첨부 파일을 경험 근거가 아닌 `target.requirementSourceText`로 보내고, 보완 질문을 한 번에 하나씩 표시하도록 바꿨다.
- 5번 반복 표현 이슈는 구조 문제가 아니라 최종 다듬기 문제로 고정하고, draft/revise 프롬프트에 근거와 주장 구조는 유지한 채 반복 표현만 줄이는 규칙을 추가했다.
- 검증: backend draft-workflow/AI router 관련 30건, frontend AIDraftChatBuilder 45건 통과. frontend build 통과. backend 전체 build는 `DATABASE_URL` 부재로 `prisma generate`에서 중단되어 `tsc --noEmit`으로 타입 검증을 대체했다.
- 실제 자소서 피드백을 반영해 글쓰기 로직의 최종 다듬기 규칙을 보강했다. 긴 기술 설명 문장 분리, 구현 동사 반복 완화, `저는` 같은 문장 시작 반복 방지를 draft/revise 프롬프트에 추가하고, plan 단계에서 반복 위험어를 `avoidRepeating`에 기록하도록 명시했다.
- 검증: `corepack pnpm --filter @neet2work/backend exec tsc --noEmit`, `corepack pnpm --filter @neet2work/backend exec vitest run src/services/draft-workflow` 통과. 샌드박스 기본 실행에서는 Vitest/esbuild `spawn EPERM`이 발생해 승인 경로로 재실행했다.

### `sungho`와 `origin/daegyune/page/home` 머지 충돌 범위 점검

- `git fetch origin` 뒤 `sungho`에서 `git merge --no-commit --no-ff origin/daegyune/page/home`를 시도해 실제 충돌 범위를 확인했다.
- 총 25개 파일에서 충돌이 났고, 프론트 6개(`App.tsx`, `api/client.ts`, `HomeTopNav.tsx`, `Jobs.tsx`, `styles.css`, `types/job.ts`), 백엔드 9개, 문서/루트 메타 7개, 크롤러 스크립트 3개로 퍼져 있었다.
- 프론트 핵심은 라우팅/페이지/상단 내비/API 계약 충돌이다. `HomeTopNav.tsx`와 `Jobs.tsx`는 add/add, `App.tsx`, `api/client.ts`, `styles.css`, `types/job.ts`는 내용 충돌로 확인했다.
- 확인 후 `git merge --abort`로 머지 상태를 정리했고, 최종 `git status --short --branch` 기준 워크트리는 다시 깨끗한 `sungho...origin/sungho` 상태다.

### merge 전용 worktree 브랜치 재현과 파일별 충돌 분해

- 현재 `sungho` 작업트리에 로컬 변경이 있어 그대로 브랜치를 전환하지 않고, `C:\lsh\git\neet2work-merge-daegyune-page-home`에 `sungho-merge-daegyune-page-home` worktree 브랜치를 새로 만들었다.
- 해당 worktree에서 `git merge --no-commit --no-ff origin/daegyune/page/home`를 다시 실행해 충돌을 재현했고, 충돌 상태는 유지한 채 파일별 `ours/theirs` 차이를 분석했다.
- 충돌은 동일하게 25개였고, `AA`는 양쪽이 같은 경로 파일을 새로 만든 경우, `UU`는 공통 기반 파일을 각자 수정한 경우로 분류했다.
- 메인 `sungho` 작업트리는 건드리지 않았고, 실제 충돌 정리 작업은 merge 전용 worktree에서만 이어가면 된다.

### merge 전용 브랜치 실제 충돌 해소 1차 정리

- 사용자 합의 기준으로 `sungho-merge-daegyune-page-home` worktree에서 충돌을 직접 해소했다. `schema.prisma`는 분리 Prisma 구조(`schema.prisma` + `models/*.prisma`)를 따르고, importer는 우리 버전 유지, soft delete 패턴은 신규 backend 구조에 맞췄다.
- 프론트는 `Jobs.tsx`와 AI draft 화면은 우리 쪽을 유지하고, 라우팅과 계정/문서/알림 페이지는 대균 브랜치 쪽을 합쳤다. `styles.css`는 theirs 기반에 ours의 Jobs/AI draft 보강 블록을 덧붙이는 방식으로 정리했다.
- 검증: frontend는 merge worktree에서 build 통과. backend는 더미 `DATABASE_URL`로 Prisma client 생성까지 확인했고, 이후 `tsc --noEmit` 기준 남은 오류는 `mammoth`, `pdf-parse` 미설치 2건뿐이었다.
- 남은 확인 포인트는 merge worktree에 backend 의존성을 실제 설치한 뒤 backend 타입체크/빌드를 다시 돌리는 것이다. 메인 `sungho` 작업트리는 계속 별도 상태로 유지했다.

### 2026-05-31 작업기록 Figma 반영

- `docs/work-log/archive/2026-05-31/WORK_LOG.md`의 Figma Summary가 비어 있어 전날 상세 기록 기준 4개 한국어 bullet로 보강했다.
- Google Docs 자소서 재작성 실행, `codex_bridge`/JSONL 파서 보강, 결과 반영 확인 중심으로 outcome-level 요약만 남겼다.
- 검증: `corepack pnpm run worklog:prepare`, `corepack pnpm run worklog:export -- --date=2026-05-31`, `corepack pnpm run figma:apply-log -- --date=2026-05-31 --timeout-ms=60000` 실행 결과 `Figma WORK_LOG appended.` 확인.

### merge worktree 의존성 설치 및 backend 재검증

- 사용자 승인 후 메인 workspace에서 `corepack pnpm install --frozen-lockfile`를 다시 실행했고, 결과는 `Already up to date`였다.
- merge worktree 기준 backend 신규 의존성 `mammoth@1.12.0`, `pdf-parse@2.4.5`가 실제 `node_modules/.pnpm`에 존재함을 확인했다.
- 검증은 merge worktree `apps/backend`에서 더미 `DATABASE_URL`을 주고 `.\node_modules\.bin\tsc.cmd --noEmit`, `corepack pnpm run build`를 승인 경로로 재실행해 통과시켰다. 기본 sandbox에선 Prisma generated client unlink 권한 제한 때문에 build가 막혀 승인 경로가 필요했다.

### merge 충돌 정리 HTML 문서 작성

- `docs/MERGE_CONFLICT_REPORT_DAEGYUNE_PAGE_HOME.html` 파일을 새로 만들고, `sungho`와 `origin/daegyune/page/home` 병합에서 실제로 충돌 난 25개 파일을 카테고리별로 정리했다.
- 문서에는 충돌 타입(`AA`, `UU`), 왜 충돌이 났는지, 최종 해결 방식(우리 쪽 유지, 대균 쪽 유지, 둘 다 합침, 수동 병합)을 표로 넣었다.
- 검증은 파일 생성 확인과 핵심 문자열(`title`, 기준 브랜치명, `styles.css` 항목) 점검까지 수행했다. 브라우저 렌더링 확인은 이번 턴에 따로 하지 않았다.

### merge worktree 코드리뷰 피드백 검증

- `sungho-merge-daegyune-page-home` worktree 기준으로 외부 리뷰 5건을 실제 코드와 테스트로 검증했다.
- 인증 없는 `candidateKey` 기반 소유권 판단, 무조건 켜진 `trust proxy`, 비개발 HTTP를 막는 HTTPS 가드, draft-workflow validation 정규식 lint 오류, `job.service` 테스트 기대값 drift를 모두 코드 기준으로 확인했다.
- 검증: `corepack pnpm --filter @neet2work/backend lint` 실패 원인이 `apps/backend/src/services/draft-workflow/validation.ts`의 `no-control-regex` 1건임을 확인했다. `corepack pnpm --filter @neet2work/backend test`는 승인 경로로 재실행해 실제 실패가 `src/server.test.ts` 9건, `src/services/job.service.test.ts` 2건임을 확인했다.

### merge worktree 리뷰 지적 패치 및 전체 재검증

- `sungho-merge-daegyune-page-home` worktree에서 리뷰 지적사항 기준으로 인증, 프록시, HTTPS 가드, 테스트 정합성 패치를 마무리했다.
- backend는 후보자 라이브러리 라우트가 `Authorization` 기반으로만 동작하도록 바꾸고, `trust proxy`를 환경값으로 해석하도록 조정했으며, HTTPS 강제는 `REQUIRE_HTTPS=true`일 때만 적용되게 정리했다.
- frontend는 문서 세트 상세의 프로필 섹션을 `수정했을 때만 저장`하도록 바꿔 전체 저장 직후 프로필 제목 검증에 걸리던 문제를 고쳤다.
- 추가로 draft-workflow validation의 control regex를 제거해 backend lint를 복구했고, soft delete 반영 후 어긋난 `job.service`/`server` 테스트 기대값도 현재 구현과 맞췄다.
- 검증: `corepack pnpm --filter @neet2work/frontend lint`, `corepack pnpm --filter @neet2work/frontend test`, `corepack pnpm --filter @neet2work/frontend build`, `corepack pnpm --filter @neet2work/backend lint`, `corepack pnpm --filter @neet2work/backend test`, `$env:DATABASE_URL='postgresql://neet2work:neet2work@localhost:5432/neet2work?schema=public'; corepack pnpm --filter @neet2work/backend run build` 전부 통과했다.

### merge 충돌 정리 HTML 최신화

- `docs/MERGE_CONFLICT_REPORT_DAEGYUNE_PAGE_HOME.html`에 리뷰 대응 이후 상태를 반영했다.
- hero 문구와 상태 chip을 현재 브랜치 상태에 맞게 바꾸고, `merge 후 추가 패치`, `지금 상태`, 최신 `최종 검증` 블록을 추가했다.
- 검증: HTML 본문에서 `merge 후 추가 패치`, `지금 상태`, `frontend lint/test/build`, `backend 테스트는 187개` 문자열이 들어간 것을 다시 확인했다.

### merge worktree에 HTML 리포트 동기화

- 최신화한 `docs/MERGE_CONFLICT_REPORT_DAEGYUNE_PAGE_HOME.html`을 `sungho-merge-daegyune-page-home` worktree의 `docs/`에도 같은 내용으로 복사했다.
- 검증: 메인 repo와 merge worktree의 HTML 파일 SHA256 해시가 동일함을 확인했다.

### merge 브랜치 commit 및 원격 push

- `sungho-merge-daegyune-page-home` worktree에서 merge 상태를 `merge: integrate daegyune/page/home into merge branch` commit으로 마무리했다.
- 이어서 `git push -u origin sungho-merge-daegyune-page-home`를 실행해 원격 브랜치를 새로 만들고 tracking을 연결했다.
- 검증: merge worktree `git status --short --branch`가 `sungho-merge-daegyune-page-home...origin/sungho-merge-daegyune-page-home` clean 상태로 돌아온 것을 확인했다.

### merge 로컬 브랜치 / worktree 정리

- 사용자 요청으로 로컬 `sungho-merge-daegyune-page-home` 브랜치와 merge worktree 정리를 진행했다.
- `git worktree remove`로 git worktree 등록은 제거했고, 로컬 브랜치는 `git branch -d sungho-merge-daegyune-page-home`로 삭제했다. 원격 `origin/sungho-merge-daegyune-page-home`는 유지했다.
- 물리 경로 `C:\lsh\git\neet2work-merge-daegyune-page-home`는 Windows 파일 잠금 때문에 루트 폴더 삭제가 막혀 내부 파일만 모두 비웠고, 최종적으로 빈 디렉터리 껍데기만 남았다.
- 검증: `git worktree list --porcelain`에 메인 worktree만 남아 있고, `git branch --list sungho-merge-daegyune-page-home` 결과가 비어 있는 것을 확인했다.

### merge 빈 worktree 폴더 재삭제 시도

- 남은 `C:\lsh\git\neet2work-merge-daegyune-page-home` 빈 폴더를 다시 삭제하려고 `openfiles` 확인, 직접 삭제, rename 후 삭제까지 재시도했다.
- 결과는 폴더 내부 항목 수 0개까지는 확인했지만, 루트 폴더 자체는 다른 프로세스가 사용 중이라 rename/remove가 계속 막혔다.
- 검증: `Get-ChildItem -Force ... | Measure-Object` 기준으로 내부 항목 수가 0임을 확인했다.
