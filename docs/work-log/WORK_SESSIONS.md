# Work Sessions

오늘 작업 상세 기록 원장이다.
지난 날짜 기록은 `docs/work-log/archive/`에 보관한다.

## 2026-06-08

### 로컬 실행 환경 검증

- 범위: README, 루트/app package script, `.env.example`, Windows setup 문서를 기준으로 현재 PC 실행 가능 여부를 검증했다.
- 환경: Node.js `v24.14.1`, Corepack `0.34.6`, pnpm `11.1.1`; Node는 README 권장 `24.14.0`과 패치 버전만 다르고 package engine 범위에는 맞다.
- 확인: `corepack pnpm run check` 실제 PC 권한에서 통과. Frontend 3개 test file 105 tests, backend 30개 test file 242 tests 통과, frontend/backend build 통과, Prisma Client 생성 확인.
- 런타임 smoke: 임시 `corepack pnpm run dev` 실행 후 backend `/health`, `/api/jobs?limit=1`, `/api/draft-workflow/providers`, frontend Vite HTML 응답을 확인하고 프로세스를 종료했다. `/health`는 database `connected`, ai `mock`, storage `local`로 응답했다.
- AI 경로: `corepack pnpm run codex:bridge:smoke` 통과. Codex app-server stdio 연결과 ChatGPT Pro 계정 상태가 확인됐다.
- 주의: `.env`는 `.env.example` 대비 `AI_API_KEY`, `AI_MODEL`, `AI_RATE_LIMIT_MAX_REQUESTS`, `AI_RATE_LIMIT_WINDOW_SECONDS`, `TRUST_PROXY` 키가 빠져 있다. 현재 코드는 해당 값에 기본값/fallback이 있어 실행은 정상이다.

### `.env.example` 변수 목록 동기화

- 범위: 비밀값을 복사하지 않고 `.env`의 변수 이름 목록만 기준으로 `.env.example`을 동기화했다.
- 변경: `.env`에 없는 `AI_API_KEY`, `AI_MODEL`, `AI_RATE_LIMIT_MAX_REQUESTS`, `AI_RATE_LIMIT_WINDOW_SECONDS`, `TRUST_PROXY` 항목과 전용 설명을 `.env.example`에서 제거했다.
- Verification: `.env`와 `.env.example`의 변수 키가 각각 56개로 일치하고, `git diff --check -- .env.example`를 통과했다.

### 보안 취약점 스캔 및 수정

- 범위: backend 인증/세션, candidate-owned route, portfolio/job crawler 외부 fetch, Figma work-log bridge, frontend 공고 링크, SQL artifact 생성, npm advisory를 점검했다.
- 변경: 보호 route 인증 적용, active user DB 재확인, production HTTPS 기본 요구, production `TRUST_PROXY=true` 차단, SSRF/DNS-rebinding 차단, Figma bridge origin allowlist, unsafe URL 렌더링 차단, SQL artifact token 검증, `vitest` 및 transitive advisory 패치 버전 반영.
- Verification: `corepack pnpm audit --recursive`, `corepack pnpm run lint`, `corepack pnpm run test`, `corepack pnpm run build`, `python -B -m unittest discover -s scripts\job_crawler`, `node --check scripts\serve-figma-work-log.mjs`, `git diff --check` 통과.
- 산출물: `C:\Users\pc07-00\AppData\Local\Temp\codex-security-scans\neet2work\f8a5671_20260608T101005+09-00\report.md`.

### AI 자소서 가초안 반복 흐름 개선

- 범위: `career-document-workflow` 문서 세션과 `AIDraftChatBuilder` 화면에서 자소서 작성 흐름을 조정했다.
- 변경: 근거가 일부라도 있으면 `needs_more_evidence` 상태에서도 증거 기반 가초안을 생성하고, 보완 질문 답변 후 같은 세션에서 가초안/초안을 갱신하도록 했다. 세션 응답에 `completion` 게이트를 추가해 가초안과 제출 준비 상태를 분리했다.
- UI: 질문이 남아 있어도 가초안 결과 카드와 제출 준비도를 표시하고, `가초안`, `보완 필요`, `완성본` 상태 문구를 구분했다.
- Verification: `corepack pnpm --filter backend test -- career-document-workflow.service.test.ts`, `corepack pnpm --filter frontend test -- AIDraftChatBuilder.test.tsx`, `corepack pnpm run build` 통과.

### AI 자소서 문서함 연동 검증

- 범위: 문서함 프로필/자기소개서/이력서 저장 JSON 구조를 분석하고, AI 자소서 생성 세션에서 저장용 문서 패키지를 함께 만들도록 연동했다.
- 변경: 문서 세션 요청/응답에 선택 프로필 컨텍스트와 `cover_letter`/`resume` 문서 패키지를 추가했다. 프론트에는 생성 결과에서 자소서와 이력서를 각각 문서함에 저장하는 버튼을 추가했고, 문서함은 이력서 문서 타입까지 표시/필터링하도록 확장했다.
- 앱 브라우저 검증: `test@example.com` 시연 계정으로 로그인해 `시연용 개발자 프로필`의 기본 인적사항은 유지하고 기술스택만 입력했다. AI 자소서 화면에서 해당 프로필을 선택하고 `https://github.com/r2gul4r` 기반 초안을 생성한 뒤, 자소서와 이력서를 문서함에 저장하고 상세 화면에서 기술스택/깃허브 근거가 반영되는지 확인했다.
- 주의: Codex provider는 앱 브라우저에서 31% 진행 상태에 머물러 최종 프론트 검증은 Fallback provider로 완료했다. 중간 반복 테스트로 저장된 예전 자소서/이력서 문서가 문서함에 남아 있다.
- Verification: 앱 브라우저 프론트 플로우 검증, `corepack pnpm --filter backend test -- career-document-workflow.service.test.ts`, `corepack pnpm --filter frontend test -- AIDraftChatBuilder.test.tsx`, `corepack pnpm --filter frontend build`, `corepack pnpm --filter backend build` 통과.

### Codex 자소서 생성 대기/저장 재검증

- 범위: AI 자소서 Codex provider가 31% 근처에서 멈춘 것처럼 보이던 현상, 공개 합격 자소서 레퍼런스 구조 규칙, 문서함 저장 흐름을 재검증했다.
- 변경: 자소서 생성 전용 AI 대기 시간을 5분으로 분리하고, Codex bridge turn timeout 기본값도 5분으로 맞췄다. 진행률 UI는 장시간 생성 중에도 단계별로 계속 전진하도록 조정했고, 요청 문장 안의 "보완 질문" 문구가 문항으로 오인되지 않게 질문 추론 조건을 좁혔다.
- 레퍼런스: 공개 자료 원문을 저장하지 않고 URL과 요약된 구조/평가 규칙만 `self-intro-style-guide`에 반영했다. `STAR`, 결과 중심, 질문 의도 우선, AI 문체 회피, 부족 근거 질문 규칙을 생성 프롬프트에 주입했다.
- 저장 UX: 자소서/이력서 저장 버튼은 한 문서 저장 중 다른 저장 요청이 겹치지 않도록 전체 저장 버튼을 잠근다.
- 앱 브라우저 검증: 기존 테스트 문서를 정리한 뒤 `임시 프로필 - 기술스택 없음`을 선택했다. Codex 생성은 첫 실측 176초, 두 번째 실측 88초에 `Codex · AI`로 완료됐고 5분 제한 전 Fallback 없이 끝났다. 문서함에는 자기소개서, 이력서, 기술스택 미입력 프로필 3개 항목이 남아 있으며 자소서/이력서 상세 본문을 확인했다.
- Verification: `corepack pnpm --filter backend test -- career-document-workflow.service.test.ts`, `corepack pnpm --filter frontend test -- AIDraftChatBuilder.test.tsx`, `corepack pnpm --filter backend build`, `corepack pnpm --filter frontend build` 통과.
