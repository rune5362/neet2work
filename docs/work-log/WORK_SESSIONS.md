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
