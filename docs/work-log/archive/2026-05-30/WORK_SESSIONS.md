# Work Sessions

## 2026-05-30

### AI 자소서 작성 워크플로우 GPT Pro 확장 리뷰

- Neet2Work `/ai-analysis`의 최종 목표를 `경험 인벤토리 기반 자소서 작성 파이프라인`으로 정리하고, GPT 5.5 Pro 확장 모드에 외부 리뷰를 요청했다.
- 확인한 리뷰 환경: Chrome extension backend, ChatGPT 모델 `5.5`, `Pro`, `Pro 생각 강도: 확장`, 입력 컨트롤 `Pro 확장 모드`.
- 리뷰 결론을 `docs/plans/2026-05-30-ai-draft-workflow-gpt-pro-review.md`에 정리했다.
- 핵심 반영 방향: 자소서 타입 추천을 중심에 두지 않고, 문항별 경험 매칭, claim ledger, 증거 잠금, NCS/블라인드 검수, 한국 자소서 리뷰 루브릭을 중심으로 MVP 1 범위를 재정의한다.

### Cursor Composer용 plan.md 재작성

- Cursor Composer 2.5가 바로 구현할 수 있도록 루트 `plan.md`를 기존 UI 피드백 계획에서 AI provider routing 기반 자소서 워크플로우 구현 계획으로 전체 교체했다.
- 계획에 `codex_bridge`, `gemini`, `local`, `fallback` provider와 자동/수동 라우팅, online/offline/quota 상태 표시, fallback 유지 정책을 명시했다.
- 기존 하드코딩 응답은 삭제하지 않고 모든 provider 실패 시 demo continuity용 fallback으로 유지하되, UI에서 fallback임을 명확히 표시하도록 범위를 고정했다.

### AI draft workflow 1차 구현 (plan.md 슬라이스)

- `.env.example`에 AI routing, Codex Bridge, Gemini, Local AI env contract를 추가했다.
- backend에 `AiRouter`, 4개 provider(`codex_bridge`, `gemini`, `local`, `fallback`), draft workflow types/Zod schema/service/route를 추가했다.
- `GET /api/draft-workflow/providers`, `POST /plan`, `POST /draft`, `POST /revise`를 `server.ts`에 마운트했다.
- `HardcodedFallbackProvider`에 기존 `AIDraftChatBuilder` 데모 초안/가이드를 옮겨 provider 전부 offline이어도 시연이 가능하게 했다.
- frontend `AIDraftChatBuilder`를 `/api/analyze` 대신 draft workflow API(plan → draft) 경로로 전환하고 provider 선택 UI, fallback badge, 경험 카드/개요/검수 리포트 렌더를 연결했다.
- `docs/API_CONTRACT.md`에 draft workflow API와 fallback 정책을 추가했다.
- 검증: `corepack pnpm --filter @neet2work/backend exec vitest run src/services/draft-workflow/draft-workflow.service.test.ts src/services/ai/ai-router.test.ts`, `corepack pnpm --filter @neet2work/frontend exec vitest run src/pages/AIDraftChatBuilder.test.tsx` 통과.

### AI draft workflow 2차 슬라이스 (단계형 UX + claim 검증)

- plan/draft를 한 번에 호출하던 흐름을 `문항 분석 시작` → `개요 확인 및 초안 생성` 2단계로 분리했다.
- 사이드 패널에 문항/글자수/공고 텍스트/블라인드 목표 입력 UI를 추가했다.
- plan 결과에 gap question 선택지+직접 입력, claim ledger 요약, 개요 확인 버튼을 연결했다.
- draft 결과에 evidence mapping, 수정 요청(`POST /revise`) 패널을 추가했다.
- backend `assertDraftRespectsClaimLedger`로 `allowedInDraft=false` claim이 초안에 포함되면 422를 반환하도록 했다.
- fallback draft는 gap answer를 본문에 반영하도록 확장했다.
- 검증: backend draft-workflow/validation 테스트 12건, frontend AIDraftChatBuilder 테스트 37건 통과.

### AI draft workflow plan.md Test Plan 마무리

- backend provider status 테스트(`ai-providers.status.test.ts`) 추가: all disabled, Codex unavailable, Gemini missing key/quota, Local offline, fallback available.
- backend router 테스트 보강: all providers offline → fallback, invalid JSON → fallback, fallback draft envelope 필드 검증.
- backend route 테스트(`draft-workflow.route.test.ts`) 추가: 400 필수 입력, plan/draft envelope 필드.
- backend service 테스트: disallowed claim 포함 draft → 422.
- frontend Test Plan 커버리지 6건 추가: provider 상태 표시, auto/manual routing, quota fallback badge, 단계별 렌더, fallback 구분 UI.
- frontend build TypeScript narrowing 오류 5건 수정(`AIDraftChatBuilder.tsx`).
- 검증: draft-workflow 관련 backend 27건, frontend AIDraftChatBuilder 43건 통과, backend/frontend build 통과, `worklog:export` 통과.

### AI draft workflow 코드리뷰 후속 수정

- Codex Bridge provider가 사용자 prompt를 command argument로 넘기지 않고 stdin(`codex exec ... -`)으로 전달하도록 수정했다.
- Codex provider 상태 확인을 모델 호출이 아닌 `codex login status` 기반 probe로 변경했다.
- Gemini ping 실패 시 quota 외 오류도 offline으로 표시하도록 provider status 판정을 수정했다.
- `POST /api/draft-workflow/revise` 요청에 plan을 포함시키고, 수정 결과에도 claim ledger 검증을 적용했다.
- 관련 backend/frontend 타입, API contract, revise 호출부를 갱신하고 lint 미사용 변수 3건을 정리했다.
- 검증: `corepack pnpm run lint`, backend test 156건, frontend test 58건, frontend build 통과, backend `tsc` 통과. 전체 `corepack pnpm run build`는 backend `prisma generate` 단계에서 `DATABASE_URL` 미설정으로 중단됐다.

### AI draft workflow 전체 리뷰 후속 패치

- 실제 AI provider용 operation별 prompt builder를 추가해 plan/draft/revise마다 JSON schema, evidence lock, 소크라테스식 보완 질문, 글자 수/문체 규칙을 명시했다.
- Gemini/Codex Bridge/Local AI provider가 단순 payload JSON 대신 새 workflow prompt를 사용하도록 변경했다.
- AI provider 출력이 Zod schema를 만족하지 못하면 `invalid_output` fallback으로 복구하는 경로를 `AiRouter`/`DraftWorkflowService`에 추가했다.
- draft/revise 결과 검증을 claim exact-match에서 evidenceMap claim/experience 정합성 및 charLimit 검증까지 확장했다.
- fallback draft/revise도 charLimit을 넘지 않도록 잘라내고, `manual` routing에는 providerId를 요구하도록 schema를 강화했다.
- frontend plan payload에 선택 문체(`writingStyle`)를 포함하고, PDF/DOC/DOCX 첨부는 추출 API를 먼저 시도한 뒤 실패 시 본문 미포함 상태로 남기도록 연결했다.
- 검증: `corepack pnpm run lint`, backend test 159건, frontend test 58건, backend `tsc`, frontend build, `git diff --check` 통과.

### AI draft workflow 파일 첨부 범위 정리

- 자소서 워크플로우 첨부 입력을 이미지 제외, 파일 전용(`TXT/MD/DOCX/PDF`)으로 고정했다.
- backend `resume-extract`에 `mammoth` 기반 DOCX 추출과 `pdf-parse` 기반 PDF text layer 추출을 추가하고, 이미지와 legacy `DOC`는 명시적으로 400 처리하도록 했다.
- frontend 파일 선택 accept와 첨부 판정을 `.txt,.md,.pdf,.docx`로 정리하고, PDF/DOCX는 추출 API를 거쳐 plan payload에 포함되도록 테스트를 보강했다.
- README와 `docs/API_CONTRACT.md`에 AI provider routing, fallback demo, document parsing 기술스택과 파일 지원 범위를 반영했다.
- 검증: `corepack pnpm run lint`, backend `tsc`, backend test 161건, frontend test 58건, frontend build, `git diff --check` 통과.

### Root README AI workflow 종합 문서화

- 루트 README에 AI 자기소개서 작성 workflow 섹션을 추가해 입력, 첨부 문서 추출, 소크라테스식 보완 질문, 개요, 초안, 자기검수, 수정 흐름을 한 번에 설명했다.
- 첨부 파일 지원 범위(`TXT/MD/DOCX/PDF`), 이미지 기반 파일 제외 정책, 작업물 없는 경험의 직접 입력 처리 방식을 README에 명시했다.
- AI provider auto/manual routing, online/offline/quota 표시, fallback demo 유지 정책, draft workflow API와 환경변수 예시를 README에 보강했다.
- 검증: `git diff --check` 통과.

### Root README 이미지 기반 확장 후보 제거

- README의 향후 확장 목록에서 이미지 기반 첨부 분석 문구를 제거하고, 첨부 정책을 파일 텍스트 추출 범위로만 정리했다.
- API contract의 PDF 설명도 text layer가 없는 이미지 기반 PDF는 unsupported로 명시했다.
- 검증: `git diff --check` 통과.

### AI draft workflow 실제 파일 E2E 검증

- Desktop 실제 샘플 파일 `5.국기용개발자 입사지원서장려금기재 양식.docx`, `25년도 국기샘플입사지원서(풀스택).pdf`로 추출 service와 HTTP API를 검증했다.
- DOCX는 4,101자, PDF는 11,831자 텍스트가 추출됐고, `/api/draft-workflow/plan`은 fallback provider로 경험 카드 1개와 개요 3개를 생성했다.
- 로컬 backend/frontend dev 서버를 띄운 뒤 Chrome headless UI E2E로 `/ai-analysis` 실제 파일 업로드, `/api/resume/extract` 2건, 문항 분석 결과 렌더를 확인했다.
- 이미지 우회 업로드는 input accept `.txt,.md,.pdf,.docx`, `지원하지 않는 파일` chip, 추출 API 호출 0건으로 확인했다.
- 검증 후 dev 서버 프로세스를 정리했다.

### B2B 자소서 코칭 상품성 GPT Pro 리뷰

- Chrome extension backend로 ChatGPT `5.5` / `Pro 확장 모드`를 확인하고, Neet2Work 자소서 로직의 B2B 상품성/판매전략 리뷰를 요청했다.
- 외부 리뷰 결론은 `Conditional Yes`: "AI 자소서 생성기"가 아니라 "근거 잠금형 공고 기반 자소서 코칭 엔진"으로 교육기관/부트캠프 대상 유료 파일럿부터 팔라는 방향이다.
- 리뷰 결과와 repo reconciliation을 `docs/plans/2026-05-31-b2b-ai-cover-letter-gpt-pro-review.md`에 저장했다.
