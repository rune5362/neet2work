# Work Sessions

오늘 작업 상세 기록 원장이다.
지난 날짜 기록은 `docs/work-log/archive/`에 보관한다.

## 2026-06-10

### origin/sub-main 현재 브랜치 병합

- 범위: 현재 브랜치 `daegyune/page/home`에 `origin/sub-main` 최신 내용(`87e91ac`)을 가져와 병합했다.
- 변경: AI config/provider parser/workflow/type 충돌을 양쪽 기능 보존 방식으로 해결하고, work log는 `worklog:prepare`로 2026-06-09 기록을 archive한 뒤 오늘 기록 파일을 준비했다. 병합 상세 기록은 `docs/work-log/merge-origin-sub-main-into-daegyune-page-home-2026-06-10.md`에 별도 저장했다.
- Verification: `corepack pnpm --filter @neet2work/backend test -- provider-utils.test.ts career-document-workflow.service.test.ts`, `corepack pnpm --filter @neet2work/frontend test -- AIDraftChatBuilder.test.tsx`, `corepack pnpm --filter @neet2work/backend build`, `corepack pnpm --filter @neet2work/frontend build` 통과.

### README 최신 변경 반영

- 범위: `origin/sub-main` 병합 후 최신 AI 문서 workflow, Codex Bridge relay, Agy CLI, Oracle job crawler timer, 환경변수/API 계약을 `README.md`에 반영했다.
- 변경: `/api/career-workflow/document-session` 중심 흐름, evidence vault/template section/gap question/document package 설명, `AI_PROVIDER_ORDER=codex_bridge,gemini,local,agy_cli,fallback`, Codex relay env와 Oracle demo 원복 명령, relay/timer/API 표를 갱신했다. README 말미에는 Codex, Gemini/Gemma, Agy CLI, Product Design, Creative Production, presentation-skill, Playwright, Figma work-log, 문서/수집 자동화 도구 설명을 간소하게 추가했다.
- Verification: `git diff --check -- README.md` 통과, README 내 오래된 Codex 전체 `/api` 우회 문구와 이전 provider order 잔재가 없는지 `rg`로 확인했다.
