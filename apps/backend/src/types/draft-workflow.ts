import type { AiExecutionMeta } from "./ai-routing.js";
import type { CandidateProfileJson } from "./profile.js";

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
  aiSelection: import("./ai-routing.js").AiSelection;
  target: DraftTarget;
  experienceInput: DraftExperienceInput;
};

/**
 * `/api/draft-workflow/draft` 요청 payload입니다.
 */
export type DraftWorkflowDraftRequest = {
  aiSelection: import("./ai-routing.js").AiSelection;
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
  aiSelection: import("./ai-routing.js").AiSelection;
  target: DraftTarget;
  plan: DraftWorkflowPlan;
  draft: DraftWorkflowDraft;
  revisionRequest: string;
  reviewIssueTypes?: string[];
};
