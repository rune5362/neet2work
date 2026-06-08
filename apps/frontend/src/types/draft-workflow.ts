import type { CandidateProfileJson } from "./profile";

export type AiProviderId = "codex_bridge" | "gemini" | "local" | "agy_cli" | "fallback";

export type AiRoutingMode = "auto" | "manual";

export type FallbackReason =
  | "offline"
  | "quota_exceeded"
  | "timeout"
  | "invalid_output"
  | "provider_error"
  | "all_providers_unavailable";

/**
 * draft workflow provider 선택 UI에 표시할 provider/모델 상태입니다.
 */
export type AiProviderStatus = {
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

/**
 * Codex bridge provider의 브라우저 로그인 진행 상태입니다.
 */
export type CodexBridgeLoginStatus = {
  loginId: string | null;
  status: "pending" | "succeeded" | "failed" | "expired";
  error: string | null;
  account: {
    type?: string;
    email?: string;
    planType?: string;
  } | null;
  login: {
    type: string;
    loginId: string;
    authUrl: string | null;
    verificationUrl: string | null;
    userCode: string | null;
  } | null;
  expiresAt: string | null;
};

/**
 * 사용자가 선택한 AI routing 방식과 provider/model override입니다.
 */
export type AiSelection = {
  mode: AiRoutingMode;
  providerId?: AiProviderId;
  modelId?: string;
};

/**
 * 실제 AI 실행에 사용된 provider와 fallback 여부를 설명하는 메타데이터입니다.
 */
export type AiExecutionMeta = {
  providerId: AiProviderId;
  modelId: string;
  routingMode: AiRoutingMode;
  usedFallback: boolean;
  fallbackReason?: FallbackReason;
};

/**
 * 자기소개서 작성 workflow가 UI와 backend 사이에서 공유하는 진행 상태입니다.
 */
export type DraftWorkflowState =
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

/**
 * AI가 답해야 할 자기소개서 문항과 채용 맥락입니다.
 *
 * @remarks
 * `blindRecruitment`와 `charCountRule`은 초안 검증과 문체 제약에 직접 사용됩니다.
 */
export type DraftTarget = {
  company: string;
  role: string;
  questionText: string;
  charLimit?: number;
  charCountRule: "with_spaces" | "without_spaces" | "unknown";
  jobPostingText: string;
  blindRecruitment: boolean;
  writingStyle?: string;
  sectionName?: string;
  requirementSourceText?: string;
  previousDraftText?: string;
};

/**
 * 초안 생성에 사용할 사용자 경험 자료 묶음입니다.
 *
 * @remarks
 * 프로필 컨텍스트, 직접 입력, 포트폴리오, 참고 자소서를 같은 workflow 입력으로 합칩니다.
 */
export type DraftExperienceInput = {
  portfolioText?: string;
  manualExperienceText?: string;
  additionalContext?: string;
  referenceSelfIntroText?: string;
  profileContexts?: DraftProfileContext[];
};

/**
 * draft workflow가 참조하는 지원 프로필 snapshot입니다.
 */
export type DraftProfileContext = {
  profileId: string;
  title: string;
  schemaVersion: number;
  profileJson: CandidateProfileJson;
  profileText?: string;
  targetRole?: string | null;
  targetCompany?: string | null;
  desiredRoles: string[];
  skills: string[];
};

export type MaterialRequirementSource =
  | "attached_document"
  | "job_posting"
  | "user_input"
  | "reference"
  | "fallback";

export type MaterialPriority = "critical" | "high" | "medium" | "low";

export type DocumentFormatting = {
  encoding: "UTF-8";
  fontFamily: "Malgun Gothic";
  fontDisplayName: "맑은 고딕";
  lineSpacing: "normal";
  normalizeWhitespace: true;
  forbidMojibake: true;
};

/**
 * AI 계획 단계가 추출한 요구사항, 경험, 문단별 근거 저장소입니다.
 */
export type MaterialStore = {
  requirements: Array<{
    requirementId: string;
    source: MaterialRequirementSource;
    text: string;
    priority: MaterialPriority;
    appliesTo: string[];
  }>;
  referenceRules: string[];
  profile: {
    coreStrengths: string[];
    tone: string;
    privateConstraints: string[];
  };
  experiences: Array<{
    experienceId: string;
    facts: string[];
    skills: string[];
    usableSections: string[];
    privateConstraints: string[];
    sourceEvidenceIds: string[];
  }>;
  sectionPlan: Array<{
    sectionName: string;
    mainClaim: string;
    evidenceIds: string[];
    avoidRepeating: string[];
  }>;
  outputRules: DocumentFormatting;
};

export type EvidenceItem = {
  evidenceId: string;
  type: "user_statement" | "portfolio_text" | "job_posting" | "gap_answer" | "fallback_seed";
  content: string;
  confidence: "high" | "medium" | "low";
};

export type Claim = {
  claimId: string;
  text: string;
  supportedBy: string[];
  confidence: "high" | "medium" | "low";
  allowedInDraft: boolean;
};

/**
 * 초안에 사용할 수 있는 경험 단위와 그 경험을 뒷받침하는 근거 ledger입니다.
 */
export type ExperienceCard = {
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

export type FitAssessment = {
  questionId: string;
  experienceId: string;
  fitScore: number;
  recommendedUsage: "main" | "supporting" | "avoid";
  fitReasons: string[];
  risks: string[];
};

export type AnswerStrategy = {
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

/**
 * 문항 분석 후 초안 작성 전에 UI가 검토하고 확정할 수 있는 계획 결과입니다.
 */
export type DraftWorkflowPlan = {
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
  materialStore: MaterialStore;
  outline: Array<{
    paragraphId: string;
    purpose: string;
    plannedClaims: string[];
    targetChars?: number;
  }>;
};

/**
 * 생성 또는 수정된 자기소개서 초안과 근거 검토 리포트입니다.
 */
export type DraftWorkflowDraft = {
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
  documentFormatting: DocumentFormatting;
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

export type GapAnswer = {
  questionId: string;
  answer: string;
};

/**
 * `/api/draft-workflow/plan` 요청 payload입니다.
 */
export type DraftWorkflowPlanRequest = {
  aiSelection: AiSelection;
  target: DraftTarget;
  experienceInput: DraftExperienceInput;
};

/**
 * `/api/draft-workflow/draft` 요청 payload입니다.
 */
export type DraftWorkflowDraftRequest = {
  aiSelection: AiSelection;
  target: DraftTarget;
  experienceInput: DraftExperienceInput;
  plan: DraftWorkflowPlan;
  gapAnswers?: GapAnswer[];
  confirmedOutline?: DraftWorkflowPlan["outline"];
};

/**
 * `/api/draft-workflow/revise` 요청 payload입니다.
 */
export type DraftWorkflowReviseRequest = {
  aiSelection: AiSelection;
  target: DraftTarget;
  plan: DraftWorkflowPlan;
  draft: DraftWorkflowDraft;
  revisionRequest: string;
  reviewIssueTypes?: string[];
};

/**
 * provider id를 UI badge에 표시할 짧은 이름으로 변환합니다.
 */
export function providerBadgeLabel(providerId: AiProviderId) {
  switch (providerId) {
    case "codex_bridge":
      return "Codex";
    case "gemini":
      return "Gemini";
    case "local":
      return "Local";
    case "agy_cli":
      return "Agy CLI";
    case "fallback":
      return "Fallback";
  }
}

/**
 * fallback 사유를 사용자에게 보여줄 한국어 라벨로 변환합니다.
 */
export function fallbackReasonLabel(reason?: FallbackReason) {
  switch (reason) {
    case "offline":
      return "오프라인";
    case "quota_exceeded":
      return "할당량 초과";
    case "timeout":
      return "시간 초과";
    case "invalid_output":
      return "잘못된 출력";
    case "provider_error":
      return "Provider 오류";
    case "all_providers_unavailable":
      return "사용 가능한 AI 없음";
    default:
      return undefined;
  }
}
