# Work Sessions

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

### sub-main 병합 충돌 해결

- 범위: `sub-main` 로컬 1커밋과 `origin/sub-main` 원격 2커밋 병합 중 발생한 AI 자소서 workflow/frontend/work-log 충돌을 해결했다.
- 원인: 로컬은 채팅 입력 기반 1페이지 자소서 흐름을 추가했고, 원격은 `needs_more_evidence` 가초안, 전용 답변칸, 문서 저장/제출 준비도, 2026-06-07 로그 archive 정리를 같은 파일들에 반영해 충돌했다.
- 해결: 백엔드는 900자 기본/1200자 상한과 `needs_more_evidence` 가초안 생성을 병합했다. 프론트는 전용 답변칸을 유지하면서 채팅 입력 답변/수정 fallback을 살렸다. 현재 로그는 2026-06-08 기준으로 유지하고 로컬 03:48 기록은 2026-06-07 archive에 보존했다.
- Verification: `corepack pnpm --filter backend test -- career-document-workflow.service.test.ts provider-utils.test.ts`, `corepack pnpm --filter frontend test -- AIDraftChatBuilder.test.tsx`, `corepack pnpm run lint`, `corepack pnpm run build`, `git diff --check` 통과. Vitest의 기존 `TimeoutNaNWarning`은 계속 출력된다.

### AI 자소서 문답칸 저장 중 상태 보강

- 범위: 보완 질문 카드의 전용 `답변` textarea로 답변을 저장한 뒤 AI 반영 대기 시간이 길 때 사용자가 같은 질문을 다시 편집할 수 있어 보이는 UX를 보강했다.
- 변경: 답변 저장 요청 중에는 질문 카드 상태가 `답변 반영 중`으로 바뀌고, 전용 textarea와 버튼이 잠기며 버튼 문구가 `반영 중`으로 표시되도록 했다.
- 앱 브라우저 검증: `/ai-analysis`와 `/health` 로컬 서버는 정상 응답했다. 미로그인 상태에서는 `초안 작성 시작` 후 인증 토큰이 없어 `자료 분석 요청에 실패했습니다`가 발생하는 것을 확인했다. 임시 E2E 계정 생성은 지속 DB write라 명시 승인 전 진행하지 않았다.
- Verification: `corepack pnpm --filter frontend test -- AIDraftChatBuilder.test.tsx`, `corepack pnpm --filter frontend build`, `git diff --check` 통과. 테스트/build의 샌드박스 실행은 기존 Windows `esbuild spawn EPERM`으로 실패해 승인된 로컬 권한으로 재실행했다.

### AI 자소서 문답 반복 최종 브라우저 검증

- 범위: 사용자의 승인 후 임시 E2E 계정을 생성해 AI 자소서 화면의 `가초안 생성 -> 보완 질문 답변 -> 가초안 갱신 -> 반복 -> 완성본` 흐름을 앱 브라우저에서 끝까지 검증했다.
- 앱 브라우저 검증: `/login`에서 임시 계정으로 로그인 후 `/ai-analysis`에서 대략적인 자기소개서 요청을 보냈다. Codex provider로 최초 질문이 표시되고, 이후 모든 보완 질문을 일반 채팅창이 아니라 질문 카드의 전용 `답변` textarea에 입력한 뒤 `답변 저장`으로 제출했다. 각 저장 직후 일반 채팅창은 비어 있고 안내 메시지와 `답변 반영 중` 잠금 상태가 표시됐다.
- 결과: 여러 차례 가초안이 갱신된 뒤 전용 답변칸이 사라지고 카드가 `완성본 준비 완료`로 바뀌었다. 최종 화면은 `Codex · AI`, `완료`, 제출 준비도 `100%`, `남은 필수 보완 질문이 없습니다`를 표시했다. 문서함 저장/다운로드 버튼은 누르지 않았다.
- Verification: 브라우저 콘솔 error 0건, `corepack pnpm --filter frontend test -- AIDraftChatBuilder.test.tsx`, `corepack pnpm --filter frontend build`, `git diff --check`, `git diff --cached --check` 통과. 테스트/build는 기존 Windows `esbuild spawn EPERM` 때문에 승인된 로컬 권한으로 실행했다.

### AI 자소서 보완 질문 기준 강화

- 범위: `https://github.com/r2gul4r` 분석 요청 후 `photoEditer` 역할 확인 질문 하나만 나온 것처럼 보이고, 제출 준비도/ATS 기준까지 계속 묻지 않는 원인을 점검했다.
- 원인: GitHub/채용공고 같은 맥락 자료가 `actions`, `technical_choice`, `result`, `company_fit` 같은 사용자 고유 근거 슬롯을 채운 것으로 계산됐다. 그래서 사용자가 `전부 내가 했어`처럼 역할만 넓게 확인해도 남은 보완 질문이 과도하게 줄어들었다.
- 변경: `evidence-slot-policy`를 추가해 사용자 고유 슬롯은 `user_input`, `profile_context`, `interview_answer`처럼 사용자가 확인한 근거로만 채워지게 했다. GitHub/공고는 프로젝트/기술 맥락으로는 쓰되 본인 행동, 기술 선택 이유, 성과, 지원동기 근거를 대신 채우지 못한다.
- UI: 보완 질문 메시지의 `하나만 확인할게` 문구를 없애고, 남은 질문 수가 있으면 `남은 보완 질문 N개 중 다음 질문`으로 표시한다. 질문 카드도 `다음 질문 (N개 남음)` 또는 `마지막 질문`을 보여준다.
- 앱 브라우저: 기존 진행 중 세션은 HMR 중간 에러 상태가 남아 있어 리로드가 필요했고, 리로드 후 `/ai-analysis?jobId=jobkorea-48853600` 화면이 정상 렌더링되는 것을 확인했다. 리로드 때문에 이전 채팅 상태는 초기화됐다.
- Verification: `corepack pnpm --filter backend test -- career-document-workflow.service.test.ts`, `corepack pnpm --filter backend build`, `corepack pnpm --filter frontend test -- AIDraftChatBuilder.test.tsx`, `corepack pnpm --filter frontend build` 통과. 샌드박스의 기존 Windows `esbuild spawn EPERM`과 Prisma binary 네트워크 제한은 승인된 로컬 권한으로 재실행했다.

### 포트폴리오 발표용 PPT 제작

- 범위: 코드 수정 없이 Product Design 관점으로 Neet2Work 프로젝트 흐름을 분석하고, 로컬 프론트 화면을 캡처해 포트폴리오 발표용 12장 PPT를 제작했다.
- 구성: 홈/페이지 투어/제품 루프/채용공고/공고 상세/AI 자소서 화면/AI 작성 단계 1-3/문서함/아키텍처/마무리 순서로 구성했다. 특히 AI 자소서 파트는 자료 우선순위 고정, 부족 근거 질문, `/plan`-`/draft`-검수-`/revise` workflow를 중점 설명하도록 배치했다.
- 산출물: `outputs/019ea6c4-3930-75a3-8065-72f5e2398669/presentations/neet2work-portfolio-ppt/output/neet2work-portfolio-presentation.pptx`
- 실행/캡처: 기존 `corepack pnpm run dev`는 Windows `concurrently`/Vite `spawn EPERM`으로 실패해, backend는 개별 dev 서버, frontend는 기존 `dist` 기반 정적 SPA 서버로 띄워 화면을 캡처했다. 캡처용 서버는 작업 후 포트 기준으로 정리했다.
- Verification: artifact-tool runtime 확인, 12장 PPTX export, 12장 PNG preview/contact sheet 렌더, PPTX package check(12 slide XML, media 6개, empty media 0), layout quality check(error 0, compact text warning만 잔존) 완료.

### AI 자소서 보완 답변 채팅 입력 전환

- 범위: 보완 질문 카드에 별도 `답변` textarea와 `답변 저장` 버튼이 표시되어 사용자가 하단 채팅창으로 답변하기 어렵던 UX를 정리했다.
- 원인: 활성 보완 질문이 있으면 하단 composer 메시지를 `/api/career-workflow/document-session/answer`로 보내는 분기는 이미 있었지만, 질문 카드의 전용 입력칸이 같은 답변 경로를 가로막는 UI처럼 보였다.
- 변경: 보완 질문 카드는 질문 표시 전용으로 줄이고, 답변 입력은 하단 composer에서만 받도록 바꿨다. 활성 질문 중 placeholder는 `현재 질문에 답변하세요...`, 반영 중에는 `답변을 반영하는 중입니다...`로 바뀌며 composer와 전송 버튼이 잠긴다.
- 앱 브라우저 검증: 현재 `/ai-analysis?jobId=jobkorea-48853600` 탭을 새로고침 없이 DOM 확인했다. 진행 중 질문 상태는 이미 초기화되어 활성 질문 placeholder는 보이지 않았지만, 질문 카드 내부 textarea/버튼이 없는 상태를 확인했다.
- Verification: `corepack pnpm --filter frontend test -- AIDraftChatBuilder.test.tsx`, `corepack pnpm --filter frontend build`, `git diff --check`, `git diff --cached --check` 통과. `checklist-vibe` CLI와 `harness.config.json`은 없어 CLI gate는 생략했다. 테스트/build는 기존 Windows `esbuild spawn EPERM` 때문에 승인된 로컬 권한으로 실행했다.

### 포트폴리오 발표용 PPT 리뉴얼

- 범위: 기존 12장 PPT의 딱딱한 말투를 줄이고, Product Design/Creative Production 관점으로 디자인과 내용을 함께 정리한 15장 포트폴리오 발표용 PPT를 새로 제작했다.
- 구성: 1장은 제목, 15장은 Q&A로 고정했다. 전체 페이지 나열 대신 제품 문제, 핵심 루프, 작업 방식, 기술스택, 아키텍처, 채용공고/공고상세/AI 자소서 핵심 화면, AI 작성 로직, 남는 가치 순서로 재구성했다.
- 핵심 보강: Goalplz로 요청을 목표화하고, `AGENTS.md`의 mock-first/no secrets/source of truth/work-log 규칙을 확인한 작업 과정을 4장에 포함했다. AI 자소서 파트는 문항 요구사항 고정, material store, experience card, claim ledger, evidence map, gap question, `/plan`-`/draft`-`/revise` 흐름을 9-13장에 집중 배치했다.
- 산출물: `outputs/019ea6c4-3930-75a3-8065-72f5e2398669/presentations/neet2work-portfolio-renewal/output/neet2work-portfolio-renewal.pptx`
- Verification: artifact-tool export로 15장 PPTX 생성, 15장 PNG preview와 contact sheet 렌더, PPTX package check(15 slide XML, media 3개, empty media 0), layout quality check(error 0, accepted warning 23) 완료.
