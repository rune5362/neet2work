# Work Sessions

오늘 작업 상세 기록 원장이다.
지난 날짜 기록은 `docs/work-log/archive/`에 보관한다.

## 2026-06-10

### origin/sub-main 현재 브랜치 병합

- 범위: 현재 브랜치 `daegyune/page/home`에 `origin/sub-main` 최신 내용(`87e91ac`)을 가져와 병합했다.
- 변경: AI config/provider parser/workflow/type 충돌을 양쪽 기능 보존 방식으로 해결하고, work log는 `worklog:prepare`로 2026-06-09 기록을 archive한 뒤 오늘 기록 파일을 준비했다.
- 병합 내용: Oracle 배포/릴레이/공고 수집 timer 변경, AI 문서 workflow의 첨부 양식 분석/template section/evidence slot/draftText 보정 변경을 현재 브랜치의 Agy CLI 및 발표자료 작업과 합쳤다.
- 충돌 해결: `ai-config.ts`는 Agy CLI 검증과 Codex relay 설정을 모두 유지했고, `provider-utils.ts`는 strict JSON parser와 draft/revise plain text fallback을 모두 유지했다. backend/frontend `career-document-workflow` 타입에는 template section 타입과 기존 분석 설명을 함께 남겼다.
- 추가 정리: `AIDraftChatBuilder.test.tsx`의 Agy CLI provider 테스트가 현재 UI 라벨(`초안 작성 시작`)과 통합 문서 세션 API(`/api/career-workflow/document-session`)를 검증하도록 갱신했다.
- Verification: `corepack pnpm --filter @neet2work/backend test -- provider-utils.test.ts career-document-workflow.service.test.ts`, `corepack pnpm --filter @neet2work/frontend test -- AIDraftChatBuilder.test.tsx`, `corepack pnpm --filter @neet2work/backend build`, `corepack pnpm --filter @neet2work/frontend build` 통과.

### README 최신 변경 반영

- 범위: `origin/sub-main` 병합 후 최신 AI 문서 workflow, Codex Bridge relay, Agy CLI, Oracle job crawler timer, 환경변수/API 계약을 `README.md`에 반영했다.
- 변경: `/api/career-workflow/document-session` 중심 흐름, evidence vault/template section/gap question/document package 설명, `AI_PROVIDER_ORDER=codex_bridge,gemini,local,agy_cli,fallback`, Codex relay env와 Oracle demo 원복 명령, relay/timer/API 표를 갱신했다. README 말미에는 Codex, Gemini/Gemma, Agy CLI, Product Design, Creative Production, presentation-skill, Playwright, Figma work-log, 문서/수집 자동화 도구 설명을 간소하게 추가했다.
- Verification: `git diff --check -- README.md` 통과, README 내 오래된 Codex 전체 `/api` 우회 문구와 이전 provider order 잔재가 없는지 `rg`로 확인했다.

### work-log 파일 분류 정리

- 범위: `docs/work-log` 루트에 작업자/에이전트별 산출물처럼 남아 있던 별도 병합 기록 md를 표준 세션 로그 구조로 정리했다.
- 변경: `merge-origin-sub-main-into-daegyune-page-home-2026-06-10.md`의 주요 병합 내용, 충돌 해결, 검증 기록을 `WORK_SESSIONS.md`의 2026-06-10 섹션에 흡수하고 루트의 별도 md 파일을 제거했다.
- Verification: `corepack pnpm run worklog:prepare`로 현재 날짜 준비 상태 확인, `docs/work-log` 루트 md 파일이 `FIGMA_WORK_LOG_RULES.md`, `WORK_LOG.md`, `WORK_SESSIONS.md`만 남는지 확인.
