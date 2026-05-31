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
