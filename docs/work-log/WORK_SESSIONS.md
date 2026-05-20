# Work Sessions

오늘 작업 상세 기록 원장이다.
지난 날짜 기록은 `docs/work-log/archive/`에 보관한다.

## 2026-05-20

### Agent project brief

- Scope: Created `docs/AGENT_PROJECT_BRIEF.md` so a new agent can understand
  Neet2Work's product purpose, mock-first contract, architecture boundaries,
  collector/ETL policy, API surface, current source status, and verification
  commands.
- Chrome/GPT evidence: Chrome backend was confirmed as `Chrome` with type
  `extension`; ChatGPT model menu showed `model-switcher-gpt-5-5-pro` checked
  with `Pro • 확장`, and the composer showed `Pro 확장 모드`.
- Reconciliation: Used GPT output as secondary structure only, then reconciled
  wording against `README.md`, `docs/API_CONTRACT.md`, the job collection plans,
  and current frontend/backend source files.
- Verification: Ran `git diff --check -- docs\AGENT_PROJECT_BRIEF.md`,
  `git diff --check`, `corepack pnpm run worklog:prepare`, and
  `corepack pnpm run worklog:export`.
