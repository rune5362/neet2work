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
