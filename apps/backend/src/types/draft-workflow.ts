import type { AiExecutionMeta } from "./ai-routing.js";

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

export type DraftTarget = {
  company: string;
  role: string;
  questionText: string;
  charLimit?: number;
  charCountRule: "with_spaces" | "without_spaces" | "unknown";
  jobPostingText: string;
  blindRecruitment: boolean;
  writingStyle?: string;
};

export type DraftExperienceInput = {
  portfolioText?: string;
  manualExperienceText?: string;
  additionalContext?: string;
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
  outline: Array<{
    paragraphId: string;
    purpose: string;
    plannedClaims: string[];
    targetChars?: number;
  }>;
};

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

export type DraftWorkflowPlanRequest = {
  aiSelection: import("./ai-routing.js").AiSelection;
  target: DraftTarget;
  experienceInput: DraftExperienceInput;
};

export type DraftWorkflowDraftRequest = {
  aiSelection: import("./ai-routing.js").AiSelection;
  target: DraftTarget;
  experienceInput: DraftExperienceInput;
  plan: DraftWorkflowPlan;
  gapAnswers?: GapAnswer[];
  confirmedOutline?: DraftWorkflowPlan["outline"];
};

export type DraftWorkflowReviseRequest = {
  aiSelection: import("./ai-routing.js").AiSelection;
  target: DraftTarget;
  plan: DraftWorkflowPlan;
  draft: DraftWorkflowDraft;
  revisionRequest: string;
  reviewIssueTypes?: string[];
};
