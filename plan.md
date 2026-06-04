# `/ai-analysis` AI 자소서 워크플로우 구현 계획

## Summary

Cursor Composer 2.5는 이 문서를 기준으로 구현한다.

목표는 `/ai-analysis`를 하드코딩 초안 화면에서 **AI 라우팅 가능한 자소서 작성 워크플로우**로 바꾸는 것이다. 실제 AI provider는 여러 경로를 지원한다.

- `codex_bridge`: 로컬 Codex 로그인 세션을 쓰는 자체 bridge
- `gemini`: Gemini API
- `local`: 로컬 AI 서버
- `fallback`: 현재 하드코딩된 시연용 응답

핵심은 `자소서 타입 추천`이 아니라 `문항별 경험 매칭 + claim ledger + 증거 잠금 초안 + 한국 자소서 검수`다.

기존 하드코딩 응답은 삭제하지 않는다. 모든 AI provider가 오프라인이거나 선택 모델이 할당량 초과, timeout, invalid output 등으로 실패하면 **fallback**으로 사용한다. 단, fallback은 실제 AI 응답처럼 보이면 안 되고 UI에 명확히 표시한다.

이번 범위에서 제외한다.

- 이미지 OCR
- PDF/DOCX 자동 파싱
- 포트폴리오 링크 크롤링
- 합격 자소서 샘플 분석
- 마이페이지 저장
- 다문항 자기소개서 패키지 생성

## AI Routing Contract

backend에 provider router를 추가한다. frontend는 provider token, API key, Codex token을 직접 다루지 않는다.

Provider 타입:

```ts
type AiProviderId = "codex_bridge" | "gemini" | "local" | "fallback";

type AiProviderStatus = {
  providerId: AiProviderId;
  label: string;
  online: boolean;
  configured: boolean;
  quotaExceeded: boolean;
  latencyMs?: number;
  reason?: string;
  models: Array<{
    modelId: string;
    label: string;
    online: boolean;
    quotaExceeded: boolean;
    recommended?: boolean;
  }>;
};

type AiRoutingMode = "auto" | "manual";

type AiSelection = {
  mode: AiRoutingMode;
  providerId?: AiProviderId;
  modelId?: string;
};

type AiExecutionMeta = {
  providerId: AiProviderId;
  modelId: string;
  routingMode: AiRoutingMode;
  usedFallback: boolean;
  fallbackReason?:
    | "offline"
    | "quota_exceeded"
    | "timeout"
    | "invalid_output"
    | "provider_error"
    | "all_providers_unavailable";
};
```

Routing 정책:

- 기본 선택은 `auto`.
- `auto`는 `codex_bridge -> gemini -> local -> fallback` 순서로 시도한다.
- `manual`은 사용자가 선택한 provider/model을 먼저 시도한다.
- manual 선택 provider가 offline, quota exceeded, timeout, invalid output이면 `fallback`으로 떨어진다.
- manual 실패 시 다른 유료/온라인 provider로 자동 우회하지 않는다.
- fallback 사용 시 응답에 `aiMeta.usedFallback=true`와 `fallbackReason`을 반드시 포함한다.
- frontend는 `aiMeta`로 `Codex`, `Gemini`, `Local`, `Fallback` 배지를 표시한다.

## Environment Contract

`.env.example`에 추가한다.

```txt
# AI Routing
AI_ROUTING_DEFAULT=auto
AI_PROVIDER_ORDER=codex_bridge,gemini,local,fallback
AI_PROVIDER_TIMEOUT_MS=180000

# Codex Bridge
CODEX_BRIDGE_ENABLED=false
CODEX_BRIDGE_COMMAND=
CODEX_BRIDGE_HOME=
CODEX_BRIDGE_MODEL=
CODEX_BRIDGE_REASONING_EFFORT=

# Gemini
GEMINI_ENABLED=false
GEMINI_API_KEY=
GEMINI_MODEL=
GEMINI_TIMEOUT_MS=120000

# Local AI
LOCAL_AI_ENABLED=false
LOCAL_AI_BASE_URL=http://localhost:11434
LOCAL_AI_MODEL=
LOCAL_AI_TIMEOUT_MS=120000
LOCAL_AI_PROTOCOL=ollama
```

보안 원칙:

- `GEMINI_API_KEY`는 backend에서만 사용한다.
- frontend에 API key, Codex token, local provider credential을 노출하지 않는다.
- Codex OAuth/login token은 Neet2Work가 읽거나 저장하지 않는다.
- Codex 로그인은 사용자가 로컬 Codex CLI/앱에서 처리한다.

## Backend API

기존 `/api/analyze`는 삭제하지 않는다. 새 draft workflow는 별도 route로 만든다.

```txt
GET  /api/draft-workflow/providers
POST /api/draft-workflow/plan
POST /api/draft-workflow/draft
POST /api/draft-workflow/revise
```

### `GET /api/draft-workflow/providers`

provider별 online/offline/configured/quotaExceeded/model list를 반환한다.

frontend의 AI 선택 UI는 이 응답으로 상태를 표시한다.

### `POST /api/draft-workflow/plan`

역할:

- 문항 분석
- 경험 카드화
- claim ledger 생성
- 경험-문항 매칭
- 답변 전략 생성
- 부족 슬롯 질문 생성
- 개요 초안 생성

초안 본문은 아직 생성하지 않는다.

요청:

```ts
type DraftWorkflowPlanRequest = {
  aiSelection: AiSelection;
  target: DraftTarget;
  experienceInput: DraftExperienceInput;
};
```

응답:

```ts
type DraftWorkflowPlanResponse = {
  data: DraftWorkflowPlan;
};
```

### `POST /api/draft-workflow/draft`

역할:

- 사용자의 gap question 답변 반영
- 확정된 outline 기준으로 초안 생성
- evidence mapping 생성
- review report 생성
- revision options 생성

### `POST /api/draft-workflow/revise`

역할:

- 기존 draft, review issue, user revision request를 입력받아 수정본 생성
- Reviewer와 Rewriter를 분리한다.
- Reviewer는 문제를 찾고, Rewriter는 수정한다.

## Draft Workflow Types

핵심 상태:

```ts
type DraftWorkflowState =
  | "SESSION_CREATED"
  | "TARGET_CAPTURED"
  | "QUESTION_ANALYZED"
  | "EXPERIENCE_INTAKE_STARTED"
  | "EXPERIENCE_CARDS_READY"
  | "EXPERIENCE_MATCHED"
  | "STRATEGY_READY"
  | "GAP_INTERVIEWING"
  | "OUTLINE_READY"
  | "OUTLINE_CONFIRMED"
  | "DRAFT_GENERATED"
  | "REVIEW_COMPLETED"
  | "REVISION_REQUESTED"
  | "FINALIZED"
  | "INSUFFICIENT_EVIDENCE"
  | "COMPLIANCE_FLAGGED"
  | "USER_CONFIRMATION_REQUIRED"
  | "REFERENCE_RISK_FLAGGED";
```

입력:

```ts
type DraftTarget = {
  company: string;
  role: string;
  questionText: string;
  charLimit?: number;
  charCountRule: "with_spaces" | "without_spaces" | "unknown";
  jobPostingText: string;
  blindRecruitment: boolean;
};

type DraftExperienceInput = {
  portfolioText?: string;
  manualExperienceText?: string;
  additionalContext?: string;
};
```

경험 카드:

```ts
type EvidenceItem = {
  evidenceId: string;
  type: "user_statement" | "portfolio_text" | "job_posting" | "gap_answer" | "fallback_seed";
  content: string;
  confidence: "high" | "medium" | "low";
};

type Claim = {
  claimId: string;
  text: string;
  supportedBy: string[];
  confidence: "high" | "medium" | "low";
  allowedInDraft: boolean;
};

type ExperienceCard = {
  experienceId: string;
  source: "portfolio" | "manual" | "conversation" | "fallback";
  title: string;
  period?: string;
  context?: string;
  role?: string;
  problem?: string;
  actions: Array<{
    action: string;
    method?: string;
    rationale?: string;
  }>;
  tools: string[];
  outputs: string[];
  results: Array<{
    type: "number" | "output" | "feedback" | "learning";
    description: string;
    verified: boolean;
  }>;
  skills: string[];
  evidenceItems: EvidenceItem[];
  claimLedger: Claim[];
  missingSlots: string[];
  blindRiskFlags: string[];
  interviewDefensibility: "high" | "medium" | "low";
};
```

문항 매칭:

```ts
type FitAssessment = {
  questionId: string;
  experienceId: string;
  fitScore: number;
  recommendedUsage: "main" | "supporting" | "avoid";
  fitReasons: string[];
  risks: string[];
};
```

답변 전략:

```ts
type AnswerStrategy = {
  mainClaim: string;
  narrativePattern: "EvidenceSummary" | "STAR" | "Growth" | "CompanyFit" | "Collaboration";
  primaryExperienceId: string;
  questionBudget: number;
  neededQuestions: Array<{
    questionId: string;
    slot: string;
    priority: number;
    question: string;
    choices?: string[];
  }>;
};
```

Plan 응답:

```ts
type DraftWorkflowPlan = {
  mode: "ai" | "fallback";
  state: DraftWorkflowState;
  aiMeta: AiExecutionMeta;
  questionRubric: {
    intent: string;
    requiredEvidence: string[];
    mustAvoid: string[];
    blindRules: string[];
  };
  experienceCards: ExperienceCard[];
  fitAssessments: FitAssessment[];
  answerStrategy: AnswerStrategy;
  outline: Array<{
    paragraphId: string;
    purpose: string;
    plannedClaims: string[];
    targetChars?: number;
  }>;
};
```

Draft 응답:

```ts
type DraftWorkflowDraft = {
  mode: "ai" | "fallback";
  state: DraftWorkflowState;
  aiMeta: AiExecutionMeta;
  draftText: string;
  charCount: {
    withSpaces: number;
    withoutSpaces: number;
    limit?: number;
  };
  evidenceMap: Array<{
    textRangeLabel: string;
    claimIds: string[];
    experienceIds: string[];
  }>;
  reviewReport: {
    scores: {
      promptFit: number;
      jobFit: number;
      specificity: number;
      evidenceSafety: number;
      koreanReadability: number;
      aiLikenessRisk: number;
      blindRisk: number;
      interviewDefensibility: number;
    };
    issues: Array<{
      type: string;
      severity: "low" | "medium" | "high";
      message: string;
      suggestedQuestion?: string;
    }>;
    likelyInterviewQuestions: string[];
    sensitiveWarnings: string[];
  };
  revisionOptions: string[];
};
```

## Provider Implementations

### `CodexBridgeProvider`

- `CODEX_BRIDGE_ENABLED=true`일 때만 configured 후보가 된다.
- `CODEX_BRIDGE_COMMAND`는 비워두면 자동 탐색한다. 우선순위는 explicit env, `CODEX_CLI_PATH`, Windows `%LOCALAPPDATA%\OpenAI\Codex\bin\*\codex.exe`, PATH의 `codex` 순서다.
- `CODEX_BRIDGE_HOME`은 app-server child process의 `CODEX_HOME`으로 전달한다. 비워두면 사용자 홈의 `.codex`를 우선 사용하고, 없을 때만 기존 `CODEX_HOME`을 사용한다.
- 로컬 `codex app-server --listen stdio://`를 실행하고 JSON-RPC 2.0(JSONL)으로 통신한다.
- provider status는 `account/read`를 사용해 로컬 Codex의 기존 ChatGPT OAuth/API key 로그인 상태를 확인한다.
- 로컬 Codex가 이미 로그인되어 있으면 Neet2Work가 토큰을 직접 읽거나 저장하지 않고 app-server가 보유한 세션으로 자동 연결된다.
- 미로그인 진단/연결 시작은 app-server `account/login/start`를 사용한다. ChatGPT OAuth 응답은 `loginId`와 `authUrl`이며, 완료는 `account/login/completed` notification으로 확인한다.
- Neet2Work는 OAuth access token, refresh token, API key를 직접 읽거나 저장하지 않는다. 계정 캐시와 refresh는 Codex CLI/app-server에 위임한다.
- 미로그인 상태는 `online=false`, `reason="codex_not_logged_in"`으로 처리한다.
- turn 실행은 읽기 전용 sandbox와 `approvalPolicy: "never"`를 사용한다.
- 실행 흐름:

```txt
initialize -> initialized -> account/read -> thread/start -> turn/start -> turn/completed
initialize -> initialized -> account/read -> account/login/start -> account/login/completed -> account/read
```

- `CODEX_BRIDGE_MODEL`이 있으면 `thread/start`/`turn/start`의 `model`로 전달한다.
- `CODEX_BRIDGE_REASONING_EFFORT`가 있으면 `turn/start`의 `effort`로 전달한다.
- streamed `agentMessage` item에서 최종 assistant output만 추출한다.
- 최종 output은 JSON이어야 하며 Zod schema를 통과해야 한다.

### `GeminiProvider`

- `GEMINI_ENABLED=true`와 `GEMINI_API_KEY`가 있을 때 configured 후보가 된다.
- `GEMINI_MODEL`은 필수로 둔다. 비어 있으면 configured=false로 표시한다.
- SDK 의존성은 추가하지 말고 `fetch` 기반 HTTP 호출로 구현한다.
- quota/rate limit 응답은 `quotaExceeded=true`로 provider status에 반영한다.
- API key는 backend env에서만 읽는다.

### `LocalAiProvider`

- `LOCAL_AI_ENABLED=true`와 `LOCAL_AI_BASE_URL`이 있을 때 configured 후보가 된다.
- `LOCAL_AI_PROTOCOL` 기본값은 `ollama`.
- MVP에서는 다음 둘 중 하나를 지원한다.
  - `ollama`: `/api/generate`
  - `openai_compatible`: `/v1/chat/completions`
- local provider 실패는 router 정책에 따라 fallback으로 이동한다.
- local provider도 JSON-only output schema를 통과해야 한다.

### `HardcodedFallbackProvider`

- 항상 사용 가능하다.
- 현재 `AIDraftChatBuilder`에 있는 하드코딩 초안/후속 질문/결과 가이드를 backend fallback shape로 옮긴다.
- fallback 응답도 `DraftWorkflowPlan` 또는 `DraftWorkflowDraft` shape를 맞춘다.
- fallback은 실제 AI처럼 보이지 않게 `aiMeta.usedFallback=true`와 UI badge를 강제한다.

## Prompt Contracts

모든 AI provider는 자유문이 아니라 JSON만 반환해야 한다.

`plan` prompt 역할:

```txt
Question & Rubric Analyzer
Experience Card v2 Normalizer
Experience-Question Matcher
Answer Strategist
Socratic Gap Filler
Outline Generator
```

`draft` prompt 역할:

```txt
Evidence-Locked Draft Writer
Evidence Reviewer
Prompt Fit Reviewer
Job Fit Reviewer
Korean Style Reviewer
Blind/PII Reviewer
Interview Defense Reviewer
```

공통 금지 규칙:

- 사용자가 말하지 않은 수치, 성과, 역할 생성 금지
- `allowedInDraft=false` claim 사용 금지
- 블라인드 채용일 때 학교명, 나이, 생년월일, 성별, 출신지역, 가족관계 등 노출 금지
- 부족한 정보는 지어내지 말고 review issue나 suggested question으로 돌려보내기
- fallback 응답도 같은 shape를 최대한 따른다.

## Frontend `/ai-analysis`

AI 선택 UI를 추가한다.

- 기본값은 `자동`.
- provider/model 선택 영역에 `온라인`, `오프라인`, `할당량 초과`, `fallback` 상태를 표시한다.
- 사용자가 특정 provider/model을 선택하면 manual mode로 전환한다.
- 선택한 provider/model이 quota exceeded/offline/timeout이면 fallback 결과와 사유를 표시한다.
- 모든 provider가 offline이어도 현재 hardcoded fallback으로 시연은 가능해야 한다.
- fallback 결과가 실제 AI 결과처럼 보이지 않게 한다.

화면 흐름:

1. 목표 입력
   - 회사, 직무, 문항, 글자 수, 공고 텍스트, 블라인드 여부
2. AI 선택
   - 자동 / Codex Bridge / Gemini / Local AI / Fallback
3. 경험 입력
   - 포트폴리오/경험 텍스트 붙여넣기
   - 작업물 없는 경험 직접 입력
4. 문항 분석 시작
   - `/api/draft-workflow/plan`
5. 경험 카드 보드
   - claim ledger 요약, missing slots, blind risk 표시
6. 부족 슬롯 질문
   - 선택형 + 직접 입력
7. 개요 미리보기
   - 문단 목적, planned claims 표시
8. 초안 생성
   - `/api/draft-workflow/draft`
9. 초안/검수/수정
   - evidence mapping
   - review issue
   - 예상 면접 질문
   - revision options

현재 `resumeText -> /api/analyze -> suggestedSentences` 흐름은 새 draft workflow의 주 경로에서 제거한다. 기존 `/api/analyze`는 legacy 분석 API로 유지한다.

## Implementation Order

1. `plan.md`를 이 계획으로 전체 교체한다.
2. `.env.example`에 AI routing, Codex, Gemini, Local AI 설정을 추가한다.
3. backend에 provider 공통 interface와 provider status 타입을 추가한다.
4. backend에 `CodexBridgeProvider`, `GeminiProvider`, `LocalAiProvider`, `HardcodedFallbackProvider`를 추가한다.
5. backend에 `AiRouter`를 추가한다.
   - auto/manual routing
   - quota/offline/timeout 처리
   - fallback 처리
   - `aiMeta` 생성
6. backend에 draft workflow type, Zod schema, service, route를 추가한다.
7. frontend API client에 provider status와 draft workflow 호출 함수를 추가한다.
8. `AIDraftChatBuilder`를 provider 선택 + workflow 상태 중심으로 개편한다.
9. 기존 `/api/analyze` 경로는 유지하되 새 draft workflow와 섞지 않는다.
10. `docs/API_CONTRACT.md`에 새 API와 fallback 정책을 추가한다.
11. 작업 후 `docs/work-log/WORK_SESSIONS.md`, `docs/work-log/WORK_LOG.md`에 한국어 작업 기록을 남긴다.

## Test Plan

Backend:

- provider status
  - all disabled
  - Codex enabled but unavailable
  - Gemini enabled but missing key/model
  - Gemini quota exceeded
  - Local AI offline
  - fallback available
- router
  - auto mode에서 provider order대로 시도
  - manual mode에서 선택 provider 실패 시 fallback으로 이동
  - selected model quota exceeded 시 fallback
  - all providers offline 시 hardcoded fallback
  - invalid AI JSON이면 fallback 또는 explicit invalid output 처리
- draft workflow
  - 필수 입력 누락 시 400
  - plan 응답이 `experienceCards`, `fitAssessments`, `answerStrategy`, `outline`, `aiMeta` 포함
  - draft 응답이 `draftText`, `evidenceMap`, `reviewReport`, `revisionOptions`, `aiMeta` 포함
  - fallback 응답도 같은 envelope 반환
  - `allowedInDraft=false` claim이 draft에 쓰이면 validation 실패

Frontend:

- AI 선택 UI에 online/offline/quota/fallback 상태가 보인다.
- 기본값은 자동 라우팅이다.
- 특정 provider/model 선택 시 manual mode가 된다.
- provider offline 또는 quota exceeded 시 fallback badge와 fallback reason이 표시된다.
- 모든 provider offline이어도 hardcoded fallback으로 시연은 가능하다.
- fallback 결과가 실제 AI 결과처럼 보이지 않는다.
- 경험 카드, 부족 슬롯 질문, 개요, 초안, 검수 리포트가 순서대로 렌더된다.

Commands:

```txt
corepack pnpm --filter @neet2work/backend test
corepack pnpm --filter @neet2work/frontend test -- src/pages/AIDraftChatBuilder.test.tsx
corepack pnpm --filter @neet2work/backend build
corepack pnpm --filter @neet2work/frontend build
corepack pnpm run worklog:export
```

## Assumptions

- Codex는 로컬 로그인 세션을 사용하는 자체 bridge provider다.
- Gemini는 backend API key provider다.
- Local AI는 backend에서 접근하는 로컬 HTTP provider다.
- fallback은 현재 하드코딩된 시연용 응답을 유지한 것이다.
- fallback은 실패 숨김용이 아니라 demo continuity용이다. UI에 반드시 표시한다.
- manual 선택 provider가 실패하면 다른 유료 provider로 자동 우회하지 않고 fallback으로 간다.
- auto mode만 provider order에 따라 여러 provider를 시도한다.
- 기존 `/api/analyze`는 삭제하지 않는다.
- OCR, PDF/DOCX 자동 파싱, 링크 크롤링, 합격 자소서 샘플 분석, 마이페이지 저장, 다문항 생성은 이번 범위가 아니다.
