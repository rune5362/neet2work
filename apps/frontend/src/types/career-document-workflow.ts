import type { AiExecutionMeta, AiSelection } from "./draft-workflow";

export type CareerDocumentClassification =
  | "self_intro_template"
  | "existing_self_intro"
  | "job_posting"
  | "reference_material";

export type CareerDocumentSessionState =
  | "COLLECTING_MATERIALS"
  | "EVIDENCE_ANALYZED"
  | "INTERVIEW_REQUIRED"
  | "DRAFT_READY";

export type PrivacyRiskLevel = "none" | "low" | "medium" | "high";
export type EvidenceConfidence = "high" | "medium" | "low";

export type CareerEvidenceSourceType =
  | "attached_document"
  | "self_intro_template"
  | "existing_self_intro"
  | "job_posting"
  | "reference_material"
  | "user_input"
  | "github_profile"
  | "github_repo_metadata"
  | "github_readme"
  | "portfolio_page"
  | "interview_answer";

export type CareerDocumentQuestion = {
  questionId: string;
  text: string;
  charLimit?: number;
  charCountRule: "with_spaces" | "without_spaces" | "unknown";
  intent: string;
  requiredSlots: string[];
  writingRules: string[];
};

export type CareerDocumentAnalysis = {
  sourceId: string;
  fileName: string;
  mimeType?: string;
  classification: CareerDocumentClassification;
  classificationReason: string;
  extractedText: string;
  template?: {
    questions: CareerDocumentQuestion[];
    writingRules: string[];
    submissionFormat?: string;
  };
  summary: string;
};

export type CareerGithubAnalysis = {
  sourceId: string;
  url: string;
  status: "fetched" | "unavailable";
  owner?: string;
  repo?: string;
  repositories: Array<{
    fullName: string;
    description?: string;
    primaryLanguage?: string;
    languages: string[];
    updatedAt?: string;
    readmeExcerpt?: string;
  }>;
  facts: Array<{
    sourceId: string;
    sourceType: "github_profile" | "github_repo_metadata" | "github_readme";
    fact: string;
  }>;
  fallbackMessage?: string;
};

export type CareerPortfolioAnalysis = {
  sourceId: string;
  url: string;
  status: "fetched" | "unavailable";
  title?: string;
  excerpt?: string;
  detectedSkills: string[];
  facts: Array<{
    sourceId: string;
    sourceType: "portfolio_page";
    fact: string;
  }>;
  fallbackMessage?: string;
};

export type CareerEvidenceVaultItem = {
  evidenceId: string;
  sourceId: string;
  sourceType: CareerEvidenceSourceType;
  fact: string;
  confidence: EvidenceConfidence;
  allowedInDraft: boolean;
  privacyRisk: PrivacyRiskLevel;
  needsUserConfirmation: boolean;
  targetSlots: string[];
};

export type CareerGapQuestion = {
  questionId: string;
  slot: string;
  question: string;
  whyAsking: string;
  priority: number;
  targetQuestionIds: string[];
  answer?: string;
};

export type CareerDocumentDraft = {
  questionId: string;
  questionText: string;
  charLimit?: number;
  charCountRule: "with_spaces" | "without_spaces" | "unknown";
  status: "drafted" | "needs_more_evidence";
  draftText?: string;
  charCount?: {
    withSpaces: number;
    withoutSpaces: number;
    limit?: number;
  };
  usedEvidenceSourceIds: string[];
  usedEvidenceFacts: string[];
  missingEvidence: string[];
  risks: string[];
};

export type CareerDocumentWorkflowTarget = {
  company?: string;
  role?: string;
  jobPostingText?: string;
  writingStyle?: string;
  formatLabel?: string;
  questionText?: string;
  charLimit?: number;
  charCountRule?: "with_spaces" | "without_spaces" | "unknown";
};

export type CareerDocumentAttachmentInput = {
  sourceId?: string;
  fileName: string;
  mimeType?: string;
  text: string;
};

export type CareerDocumentWorkflowSessionRequest = {
  message: string;
  attachments?: CareerDocumentAttachmentInput[];
  target?: CareerDocumentWorkflowTarget;
  aiSelection?: AiSelection;
};

export type CareerDocumentWorkflowAnswerRequest = {
  session: CareerDocumentWorkflowSession;
  questionId: string;
  answer: string;
  aiSelection?: AiSelection;
};

export type CareerDocumentWorkflowSession = {
  sessionId: string;
  state: CareerDocumentSessionState;
  target: CareerDocumentWorkflowTarget;
  stages: Array<{
    id: "material_collection" | "evidence_analysis" | "gap_interview" | "section_drafts";
    label: string;
    status: "pending" | "active" | "complete" | "blocked";
  }>;
  documentAnalyses: CareerDocumentAnalysis[];
  githubAnalyses: CareerGithubAnalysis[];
  portfolioAnalyses: CareerPortfolioAnalysis[];
  evidenceVault: CareerEvidenceVaultItem[];
  interview: {
    questions: CareerGapQuestion[];
    answers: Array<{
      questionId: string;
      slot?: string;
      answer: string;
    }>;
  };
  drafts: CareerDocumentDraft[];
  aiMeta?: AiExecutionMeta;
  missingEvidence: string[];
  risks: string[];
};

export function careerDocumentClassificationLabel(classification: CareerDocumentClassification) {
  const labels: Record<CareerDocumentClassification, string> = {
    self_intro_template: "자소서 양식",
    existing_self_intro: "기존 자소서",
    job_posting: "채용공고",
    reference_material: "기타 참고자료"
  };
  return labels[classification];
}
