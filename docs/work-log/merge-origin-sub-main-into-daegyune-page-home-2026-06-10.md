# origin/sub-main merge 기록

- 날짜: 2026-06-10
- 대상 브랜치: `daegyune/page/home`
- 병합 원본: `origin/sub-main`
- 병합 전 HEAD: `ec38339`
- 병합한 원격 HEAD: `87e91ac`

## 병합 내용

- `origin/sub-main`의 Oracle 배포/릴레이/공고 수집 timer 변경을 현재 브랜치로 가져왔다.
- AI 문서 workflow의 첨부 양식 분석, template section, evidence slot, draft/plain text provider 응답 보정 변경을 현재 브랜치의 Agy CLI 및 발표자료 작업과 합쳤다.
- `docs/work-log`는 2026-06-09 기록을 archive로 이동하고 2026-06-10 현재 작업 로그를 준비했다.

## 충돌 해결

- `apps/backend/src/config/ai-config.ts`: Agy CLI sandbox/SSH validation과 Codex Bridge remote relay config를 모두 보존했다. timeout parsing은 기존 `parsePositiveInteger` 경로를 유지했다.
- `apps/backend/src/services/ai/provider-utils.ts`: strict JSON parser와 `draft`/`revise` plain text fallback parser를 모두 유지했다.
- `apps/backend/src/services/ai/provider-utils.test.ts`: 두 parser 계약을 모두 검증하도록 테스트를 합쳤다.
- `apps/backend/src/services/career-document-workflow/career-document-workflow.service.ts`: workflow 주석과 900/1200자 자기소개서 제한 보정 로직을 모두 유지했다.
- `apps/backend/src/types/career-document-workflow.ts`, `apps/frontend/src/types/career-document-workflow.ts`: template section 타입을 추가하고 기존 분석 결과 설명 주석을 유지했다.
- `docs/work-log/WORK_SESSIONS.md`, `docs/work-log/archive/2026-06-08/WORK_SESSIONS.md`: 양쪽 세션 기록을 삭제 없이 보존하고 충돌 표식만 제거했다.

## 추가 정리

- `AIDraftChatBuilder.test.tsx`의 Agy CLI provider 테스트가 현재 UI 라벨(`초안 작성 시작`)과 통합 문서 세션 API(`/api/career-workflow/document-session`)를 검증하도록 갱신했다.

## 검증

- `corepack pnpm --filter @neet2work/backend test -- provider-utils.test.ts career-document-workflow.service.test.ts`: 통과
- `corepack pnpm --filter @neet2work/frontend test -- AIDraftChatBuilder.test.tsx`: 통과
- `corepack pnpm --filter @neet2work/backend build`: 통과
- `corepack pnpm --filter @neet2work/frontend build`: 통과
