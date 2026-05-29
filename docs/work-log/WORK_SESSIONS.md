# Work Sessions

오늘 작업 상세 기록 원장이다.
지난 날짜 기록은 `docs/work-log/archive/`에 보관한다.

## 2026-05-29

### pnpm 캐시 ignore 정리
- 루트 [.gitignore](C:/Users/pc07-00/.codex/worktrees/c499/neet2work/.gitignore)에 .pnpm-store/ 추가
- 확인: git check-ignore -v .pnpm-store\\v11\\index.db .pnpm-store\\cache-marker, git diff --check -- .gitignore`r

### 원본 루트 pnpm 캐시 ignore 정리
- 원본 루트 [C:\lsh\git\neet2work\.gitignore](C:/lsh/git/neet2work/.gitignore)에 `.pnpm-store/` 추가
- 확인: `git check-ignore -v .pnpm-store\\v11\\index.db .pnpm-store\\cache-marker`, `git diff --check -- .gitignore`

