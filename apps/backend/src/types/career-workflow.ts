export type CareerDocumentType =
  | "resume"
  | "specified_cover_letter"
  | "freeform_cover_letter"
  | "career_description"
  | "portfolio_intro"
  | "unknown";

export type CareerSourceType =
  | "empty"
  | "experience_text"
  | "blank_cover_letter_template"
  | "existing_cover_letter"
  | "resume"
  | "career_description"
  | "portfolio"
  | "github_url"
  | "job_posting"
  | "project_text"
  | "reference_pattern";

export type CareerEvidenceStatus =
  | "extracted"
  | "inferred"
  | "user_confirmed"
  | "user_provided"
  | "unsupported";

export type CareerWorkflowState =
  | "SESSION_CREATED"
  | "SOURCE_ROUTED"
  | "EVIDENCE_READY"
  | "QUESTION_READY"
  | "ANSWER_RECORDED"
  | "READY_TO_GENERATE";

export type CareerWorkflowTarget = {
  company?: string;
  role?: string;
  questionText?: string;
  jobPostingText?: string;
  charLimit?: number;
};

export type CareerWorkflowSourceInput = {
  sourceId?: string;
  sourceType?: CareerSourceType;
  label?: string;
  text?: string;
  url?: string;
  fileName?: string;
  mimeType?: string;
};

export type CareerWorkflowSourceSummary = {
  sourceId: string;
  sourceType: CareerSourceType;
  label: string;
  extractedSignals: string[];
  requiresUserConfirmation: boolean;
};

export type CareerEvidenceVaultItem = {
  evidenceId: string;
  sourceType: CareerSourceType;
  sourceId: string;
  claim: string;
  evidenceText: string;
  confidence: "high" | "medium" | "low";
  status: CareerEvidenceStatus;
  confirmedByUser: boolean;
  usableForResume: boolean;
  usableForCoverLetter: boolean;
  usableForCareerDescription: boolean;
  blindRisk: boolean;
  privacyRisk: boolean;
  targetSlots: string[];
};

export type CareerTemplateQuestion = {
  questionId: string;
  text: string;
  charLimit?: number;
  intent: string;
  requiredSlots: string[];
  missingSlots: string[];
};

export type CareerTemplateAnalysis = {
  detected: boolean;
  questions: CareerTemplateQuestion[];
};

export type CareerCompletionMap = {
  requiredSlots: string[];
  filledSlots: string[];
  missingSlots: string[];
  progress: number;
};

export type CareerNextQuestion = {
  questionId: string;
  question: string;
  whyAsking: string;
  targetDocument: CareerDocumentType;
  targetSection: string;
  expectedAnswerType: "short_text" | "long_text" | "choice" | "number" | "date_range";
  priority: number;
  canSkip: boolean;
  targetSlot: string;
};

export type CareerAnsweredQuestion = {
  questionId: string;
  targetSlot: string;
  answer: string;
};

export type CareerWorkflowSession = {
  sessionId: string;
  state: CareerWorkflowState;
  documentType: CareerDocumentType;
  documentTypeReason: string;
  target: CareerWorkflowTarget;
  sources: CareerWorkflowSourceSummary[];
  templateAnalysis: CareerTemplateAnalysis;
  evidenceVault: CareerEvidenceVaultItem[];
  completion: CareerCompletionMap;
  answeredQuestions: CareerAnsweredQuestion[];
  nextQuestion?: CareerNextQuestion;
};

export type CareerWorkflowSessionRequest = {
  documentType?: CareerDocumentType;
  target?: CareerWorkflowTarget;
  sources?: CareerWorkflowSourceInput[];
};

export type CareerWorkflowNextQuestionRequest = {
  session: CareerWorkflowSession;
};

export type CareerWorkflowAnswerQuestionRequest = {
  session: CareerWorkflowSession;
  questionId: string;
  answer: string;
};

export type CareerWorkflowAnswerQuestionResponse = {
  session: CareerWorkflowSession;
  acceptedEvidence: CareerEvidenceVaultItem;
  nextQuestion?: CareerNextQuestion;
};
