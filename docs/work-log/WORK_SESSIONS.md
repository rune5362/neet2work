# Work Sessions

오늘 작업 상세 기록 원장이다.
지난 날짜 기록은 `docs/work-log/archive/`에 보관한다.

## 2026-05-22

### Worktree 작업일지 중앙화와 한국어 규칙 보강

- 문제:
  - linked worktree가 생긴 뒤 `process.cwd()` 기준으로 worklog 스크립트가 실행되면서 `neet2work-codex`, `neet2work-antigravity`, Codex app worktree마다 작업일지가 따로 생겼다.
  - 일부 worktree 작업기록이 영어로 작성되어 Figma/작업일지 형식과 맞지 않았다.
- 수정:
  - `scripts/work-log-paths.mjs`를 추가해 Git worktree 목록에서 대표 worktree를 찾고, 기본적으로 `sungho` worktree의 `docs/work-log`를 canonical 작업일지 루트로 사용하게 했다.
  - `scripts/prepare-work-log-day.mjs`와 `scripts/export-work-log.mjs`가 worktree 안에서 실행돼도 중앙 작업일지 루트를 보도록 수정했다.
  - Figma Summary bullet에 한국어가 없으면 `worklog:export`가 실패하도록 검증을 추가했다.
  - `AGENTS.md`와 `docs/work-log/FIGMA_WORK_LOG_RULES.md`에 작업기록은 한국어로 작성하고, linked worktree에서는 별도 로컬 로그를 만들지 말라는 규칙을 추가했다.
  - 같은 스크립트와 규칙 파일을 `neet2work-codex`, `neet2work-antigravity`, Codex app worktree에도 동기화했다.
  - `neet2work-codex`와 `neet2work-antigravity`에 흩어져 있던 2026-05-21 작업기록을 중앙 `docs/work-log/archive/2026-05-21/`로 회수하고 한국어로 정리했다.
- 검증:
  - `node --check scripts\work-log-paths.mjs`, `scripts\prepare-work-log-day.mjs`, `scripts\export-work-log.mjs` 통과.
  - `corepack pnpm run worklog:export` 통과.
  - `git diff --check` 통과.
  - `neet2work-codex`, `neet2work-antigravity`, Codex app worktree에서 `resolveCanonicalRepoRoot()`가 모두 `C:\lsh\git\neet2work`를 반환했다.
  - 세 worktree에서 `node scripts\export-work-log.mjs --json`이 모두 중앙 5/22 작업일지를 읽었다.

### 2026-05-21 회수 작업일지 요약 보강

- `docs/work-log/archive/2026-05-21/WORK_LOG.md`의 Figma Summary를 회수된 프론트 작업 중심으로 다시 정리했다.
- `docs/work-log/archive/2026-05-21/WORK_SESSIONS.md`의 영어 섹션을 한국어로 고치고, Codex/Antigravity worktree 회수분에 읽기 쉬운 요약 단락을 추가했다.
- 검증:
  - `node scripts\export-work-log.mjs --date=2026-05-21` 통과.
  - `node scripts\export-work-log.mjs --date=2026-05-22` 통과.
  - `git diff --check -- docs\work-log\archive\2026-05-21\WORK_LOG.md docs\work-log\archive\2026-05-21\WORK_SESSIONS.md docs\work-log\WORK_SESSIONS.md` 통과.

### Figma 작업일지 5/21 누락분 반영

- 2026-05-21 Figma Summary를 먼저 export하고 Figma `WORK_LOG`에 반영했다.
- 이어서 2026-05-22 Figma Summary도 같은 bridge를 통해 반영했다.
- 검증:
  - `corepack pnpm run worklog:prepare` 통과.
  - `node scripts\export-work-log.mjs --date=2026-05-21` 통과.
  - `node scripts\export-work-log.mjs --date=2026-05-22` 통과.
  - bridge health check가 HTTP 200을 반환했다.
  - `corepack pnpm run figma:apply-log -- --date=2026-05-21 --timeout-ms=60000` 완료: `Figma WORK_LOG appended`.
  - `corepack pnpm run figma:apply-log -- --date=2026-05-22 --timeout-ms=60000` 완료: `Figma WORK_LOG appended`.

### job_postings 백업

- 루트 `.env`의 `DATABASE_URL`과 `DATABASE_PASSWORD` 존재 여부만 확인하고 값은 출력하지 않았다.
- `public.job_postings` 전체 내용을 읽어 `tmp/db-backups/job_postings_2026-05-22_155217_KST.json`에 JSON 백업으로 저장했다.
- `tmp/`는 `.gitignore` 대상이라 백업 파일과 임시 export 스크립트는 커밋 대상이 아니다.
- 같은 JSON 백업을 기준으로 `docs/db-backups/job_postings_2026-05-22_155217_KST.sql`을 생성했다.
- SQL 백업은 Prisma migration 적용 후 재실행 가능한 `insert ... on conflict ("id") do update` 형식이다.
- 검증:
  - `node --check tmp\backup-job-postings.mjs` 통과.
  - `corepack pnpm --filter @neet2work/backend exec node ..\..\tmp\backup-job-postings.mjs` 실행 결과 `95`건 백업.
  - 백업 파일 메타데이터 확인: `table=public.job_postings`, `rowCount=95`, `columnCount=31`.
  - `node --check tmp\generate-job-postings-sql.mjs` 통과.
  - `node tmp\generate-job-postings-sql.mjs` 실행 결과 SQL에 `95`건 작성.
  - SQL 백업에서 `DATABASE_URL`, `DATABASE_PASSWORD`, `postgresql://`, 비밀번호/토큰 패턴이 검출되지 않음.

### jobs 페이지 Antigravity 변경 선별 병합

- `neet2work-antigravity` 작업트리의 `/jobs` 화면 변경 중 jobs 전용 범위만 현재 `codex/frontend-ui` 작업트리에 반영했다.
- 수정:
  - `apps/frontend/src/pages/Jobs.tsx`를 확장 mock 공고, 검색/필터, 활성 필터 칩, 로딩/에러 상태, 상세 drawer, AI 분석 링크가 있는 화면으로 교체했다.
  - `apps/frontend/src/styles.css`에는 jobs 카드, 필터, 스켈레톤, 빈 상태, drawer, 반응형 스타일만 추가했다.
  - Antigravity의 홈/AI 분석/채팅 빌더 관련 변경은 병합하지 않았다.
- 검증:
  - `corepack pnpm --filter @neet2work/frontend lint` 통과.
  - `corepack pnpm --filter @neet2work/frontend build` 통과.
  - `corepack pnpm --filter @neet2work/frontend test`는 테스트 파일이 없어 `No test files found`로 종료됐다.
  - `http://127.0.0.1:5174/jobs` HTTP 200 확인.
  - Playwright Chrome 채널로 `/jobs` 렌더링 스크린샷을 저장했고, 초기 카드 7개, `Python` 검색 후 2개, 상세 drawer 표시를 확인했다.

### jobs 페이지 리뷰 주석 반영

- 브라우저 주석 3건을 반영해 jobs 화면의 액션 링크와 필터 구성을 정리했다.
- 수정:
  - 카드의 `상세 보기` 액션은 파란 버튼 박스를 제거하고 파란 텍스트 링크처럼 보이게 조정했다.
  - drawer 하단 `원문 공고 열기`는 테두리 박스를 제거하고 텍스트 옆에 SVG 외부 링크 아이콘만 표시하게 했다.
  - 필터바에서 사용자 의사결정 기준으로 약한 `수집처` 필터를 제거하고 `직무` 필터를 추가했다. 수집처는 공고 출처 메타정보로 카드와 상세 drawer에만 남겼다.
- 검증:
  - `corepack pnpm --filter @neet2work/frontend lint` 통과.
  - `corepack pnpm --filter @neet2work/frontend build` 통과.
  - Playwright Chrome 채널로 필터 옵션이 `직무/국가/언어/경력/근무형태` 순서인지 확인했다.
  - `상세 보기`의 배경과 테두리가 제거되고 파란 텍스트만 남은 것을 computed style로 확인했다.
  - `원문 공고 열기`의 배경과 테두리가 제거되고 SVG 아이콘 1개가 붙은 것을 확인했다.
  - `직무=개발` 필터 적용 후 카드 2개가 남는 것을 확인했다.

### jobs drawer 원문 공고 버튼 크기 복구

- 브라우저 주석에 따라 drawer 하단 `원문 공고 열기` 버튼이 텍스트 링크 크기로 줄어든 문제를 수정했다.
- 수정:
  - `drawerOriginalLink`를 원래 버튼형 크기와 레이아웃으로 되돌려 `이 공고로 AI 분석하기` 버튼과 같은 48px 높이를 유지하게 했다.
  - 외부 링크 아이콘은 `24x24` viewBox의 inline SVG로 교체했다.
- 검증:
  - `corepack pnpm --filter @neet2work/frontend lint` 통과.
  - `corepack pnpm --filter @neet2work/frontend build` 통과.
  - Playwright Chrome 채널로 `원문 공고 열기` 버튼이 `height=48`, `min-height=48px`, `border=1px`, `svgCount=1`, `viewBox=0 0 24 24`인지 확인했다.

### jobs 프론트 변경 원본 브랜치 반영

- Codex 작업트리 `codex/frontend-ui`의 jobs 프론트 변경을 원본 체크아웃 `C:\lsh\git\neet2work`의 `sungho` 브랜치 작업트리로 가져왔다.
- 수정:
  - `apps/frontend/src/pages/Jobs.tsx`를 현재 작업트리 버전으로 반영했다.
  - `apps/frontend/src/styles.css`를 현재 작업트리 버전으로 반영했다.
  - 프론트 외 `AGENTS.md`, work-log 스크립트, 디자인 문서 변경은 가져오지 않았다.
- 검증:
  - 원본 체크아웃 기준 `apps/frontend` 변경 파일이 위 2개뿐인지 확인했다.
  - `corepack pnpm --filter @neet2work/frontend lint` 통과.
  - `corepack pnpm --filter @neet2work/frontend build` 통과.
