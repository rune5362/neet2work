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

### Linkareer 구조 반영 및 이력서/프로필 품질 보강

- 범위: Linkareer IT 합격 자소서 검색 결과를 원문 저장 없이 구조 패턴만 확인하고, AI 자소서 결과의 이력서/프로필 품질 문제를 보완했다.
- 변경: `self-intro-style-guide`에 Linkareer IT 검색 목록 기반 구조 규칙을 추가했다. IT 문항은 기술 나열이 아니라 프로젝트 문제 해결, 협업, 서비스 기여, 향후 기여 의도를 분리해 쓰도록 했다.
- 이력서: GitHub 프로필 공개 저장소 수, 메타데이터 확인, 우선 분석 같은 분석 로그가 이력서 본문에 들어가지 않도록 필터링하고, `[기본 정보]`, `[기술 스택]`, `[요약]`, `[프로젝트 경험]` 섹션으로 저장되게 바꿨다.
- 프로필: 선택 프로필에 기술스택이 비어 있고 GitHub/포트폴리오에서 스택이 확인되면 `profileSkillSuggestions`를 내려주고, 프론트에서 `프로필 기술스택 저장` 버튼으로 기존 인적사항을 유지한 채 병합 저장하도록 했다.
- 문장 품질: 규칙 기반 자소서 초안에서 `설계했습니다.을`, `CSS을` 같은 조사 오류가 나오지 않도록 완성 문장과 기술스택 문장을 분리 처리했다.
- 데이터 검증: `test@example.com` 계정의 `임시 프로필 - 기술스택 없음`에 GitHub 기반 기술스택 `TypeScript, JavaScript, CSS, HTML, Python, React, Vite, Node.js, Tailwind CSS`를 반영했고, 기존 자기소개서/이력서 문서를 최신 패키지로 업데이트했다.
- Verification: Linkareer IT 검색 결과 확인, 로컬 API 프로필/문서 재조회, `corepack pnpm --filter backend test -- career-document-workflow.service.test.ts`, `corepack pnpm --filter frontend test -- AIDraftChatBuilder.test.tsx`, `corepack pnpm --filter backend build`, `corepack pnpm --filter frontend build`, `git diff --check` 통과.

### Codex 초안 invalid_output Fallback 방지

- 범위: 문답 후 AI 자소서 초안 생성이 `Fallback (잘못된 출력)`으로 떨어지는 경로를 점검했다.
- 변경: Codex/Gemini provider 파서가 `draft`/`revise` 작업에서 JSON 객체 없이 순수 본문만 반환한 경우 `{ draftText }`로 살려 보내도록 했다. `career-document-workflow`는 정식 스키마를 먼저 통과시키고, 실패한 경우에만 `draftText` 중심 응답을 글자수, 문서 포맷, 리뷰 리포트 기본값으로 보정해 AI 초안으로 유지한다.
- 테스트: `provider-utils.test.ts`를 추가하고, Codex의 `draftText` 전용 응답이 fallback으로 표시되지 않는 회귀 테스트를 추가했다.
- 앱/로컬 검증: 로컬 API에서 `test@example.com` 계정으로 Codex 수동 provider 문서 세션을 새로 생성해 `providerId: codex_bridge`, `usedFallback: false`, `state: DRAFT_READY`를 확인했다. 기존 앱 브라우저 화면은 이전에 생성된 fallback 결과라 새 요청 기준 검증과 구분했다.
- Verification: `corepack pnpm --filter backend test -- provider-utils.test.ts career-document-workflow.service.test.ts`, `corepack pnpm --filter backend build`, `git diff --check` 통과. Vitest 실행 중 기존 `TimeoutNaNWarning`은 계속 출력된다.

### 최종 자기소개서 생성 테스트

- 범위: 로컬 시연 계정의 문서함을 비우고 Codex provider로 최종 자기소개서 생성 흐름을 반복 검증했다.
- 데이터 정리: 기존 이력서 1개와 자기소개서 1개를 삭제해 문서 조회 count 0을 확인했다.
- 생성 검증: `임시 프로필 - 기술스택 없음` 프로필과 Neet2Work/GitHub 근거를 사용해 `career-document-workflow` 세션을 생성했고, 최종 결과가 `DRAFT_READY`, `submission_ready`, `providerId: codex_bridge`, `usedFallback: false`로 완료되는지 확인했다.
- 저장/화면 확인: 최종 자기소개서 1개만 문서함에 저장했고, 앱 브라우저에서 `/documents/cmq4vyj2c0000d4tiqduxohrq` 상세 화면을 새로고침해 제목과 본문 표시를 확인했다. 저장 본문에는 `Fallback`, `잘못된 출력`, `claimLedger`, `evidenceMap`, `materialStore` 같은 내부/오류 라벨이 없음을 확인했다.

### 실무형/직무역량 중심 자소서 양식 고정

- 범위: 첨부 DOCX의 `Self-introduction (자기소개서)` 파트를 기준으로 AI 자소서 기본 양식을 재구성했다.
- 변경: AI 자소서 화면의 기본 자소서 형식을 `실무형/직무역량 중심 자소서 양식` 단일 옵션으로 고정하고, 자기소개/성장과정/성격소개/직무역량/지원동기 및 포부 5개 섹션 템플릿을 문서 세션 요청에 가상 첨부 양식으로 포함하도록 했다.
- 백엔드: 번호형 템플릿 파서가 서문 제목을 문항으로 오인하지 않고 섹션 첫 줄을 깔끔한 문항 제목으로 쓰도록 보강했다. 다중 섹션 자기소개서 저장 본문은 `문항 1.` 대신 실제 섹션 제목을 사용한다.
- 앱 브라우저 검증: `/ai-analysis` 새로고침 후 `자소서 형식` 영역에 `실무형/직무역량 중심 자소서 양식`과 `자기소개, 성장과정, 성격소개, 직무역량, 지원동기 및 포부 · 총 1200자 내외`가 표시되고 기존 단일 선택지들이 보이지 않음을 확인했다. 저장/전송 동작은 수행하지 않았다.
- Verification: `corepack pnpm --filter backend test -- career-document-workflow.service.test.ts provider-utils.test.ts`, `corepack pnpm --filter frontend test -- AIDraftChatBuilder.test.tsx`, `corepack pnpm --filter backend build`, `corepack pnpm --filter frontend build`, `git diff --check` 통과. Vitest 실행 중 기존 `TimeoutNaNWarning`은 계속 출력된다.

### AI 자소서 문답칸 UX 보강

- 범위: AI 자소서 화면에서 문서 세션 보완 질문이 뜬 뒤 사용자가 일반 채팅창이 아니라 전용 문답칸으로 답변하는 흐름을 보강했다.
- 변경: 보완 질문 카드에 `답변` textarea와 `답변 저장` 버튼을 추가하고, 답변 저장 즉시 `답변을 저장했어. 가초안에 반영하고 다음 질문을 계산하는 중이야.` 안내 메시지를 표시하도록 했다. 일반 채팅 입력값은 비워진 상태로 유지된다.
- 앱 브라우저 검증: `/ai-analysis`에서 대충 작성 요청을 보낸 뒤 Codex provider로 약 68초 후 가초안/보완 질문/전용 답변칸이 표시됐다. 답변 저장 직후 진행 메시지가 즉시 보이고, 약 104초 후 답변이 가초안에 반영되며 다음 질문으로 넘어가는 것을 확인했다. 두 번째 답변도 전용 문답칸으로 저장되어 약 44초 후 다음 질문으로 이동했다. 세 번째 답변은 저장 직후 안내까지 확인했으나 퇴근 전 중단되어 최종 반영 대기는 미완료다.
- Verification: `corepack pnpm --filter frontend test -- AIDraftChatBuilder.test.tsx` 통과. 샌드박스에서는 기존 Windows `esbuild spawn EPERM`으로 실패해 실제 로컬 권한으로 재실행했다.
