import type { AiExecutionMeta, AiSelection } from "./ai-routing.js";
import type { DraftProfileContext } from "./draft-workflow.js";

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

export type CareerWorkflowStageId =
  | "material_collection"
  | "evidence_analysis"
  | "gap_interview"
  | "section_drafts";

export type CareerWorkflowStageStatus = "pending" | "active" | "complete" | "blocked";

export type PrivacyRiskLevel = "none" | "low" | "medium" | "high";

export type EvidenceConfidence = "high" | "medium" | "low";

export type CareerDocumentCompletionStatus = "provisional" | "submission_ready";

export type CareerDocumentCompletionGateId =
  | "draft_available"
  | "required_questions_answered"
  | "missing_evidence_resolved"
  | "evidence_locked";

export type CareerDocumentCompletion = {
  status: CareerDocumentCompletionStatus;
  score: number;
  summary: string;
  gates: Array<{
    id: CareerDocumentCompletionGateId;
    label: string;
    passed: boolean;
    detail: string;
  }>;
};

export type CareerDocumentPackage = {
  documentType: "cover_letter" | "resume";
  title: string;
  content: string;
  profileId?: string | null;
  jobId?: string | null;
  contentJson: {
    schemaVersion: 1;
    source: {
      workflow: "career-document-workflow";
      sessionId: string;
      state: CareerDocumentSessionState;
      generatedAt: string;
      completionStatus: CareerDocumentCompletionStatus;
    };
    target: CareerDocumentWorkflowTarget;
    profileSnapshot?: {
      profileId: string;
      title: string;
      targetRole?: string | null;
      desiredRoles: string[];
      skills: string[];
      profileText?: string;
    };
    sections: Array<{
      sectionId: string;
      title: string;
      body: string;
      usedEvidenceFacts: string[];
      missingEvidence: string[];
      risks: string[];
    }>;
    evidence: {
      usedFacts: string[];
      missingEvidence: string[];
      risks: string[];
    };
    formatting: {
      charCountRule: "with_spaces" | "without_spaces" | "unknown";
      withSpaces: number;
      withoutSpaces: number;
      limit?: number;
    };
  };
};

export type CareerEvidenceSourceType =
  | "attached_document"
  | "self_intro_template"
  | "existing_self_intro"
  | "job_posting"
  | "reference_material"
  | "user_input"
  | "profile_context"
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

export type CareerGithubAnalysisStatus = "fetched" | "unavailable";

export type CareerGithubFact = {
  sourceId: string;
  sourceType: "github_profile" | "github_repo_metadata" | "github_readme";
  fact: string;
};

export type CareerGithubRepositorySummary = {
  fullName: string;
  description?: string;
  primaryLanguage?: string;
  languages: string[];
  updatedAt?: string;
  readmeExcerpt?: string;
};

export type CareerGithubAnalysis = {
  sourceId: string;
  url: string;
  status: CareerGithubAnalysisStatus;
  owner?: string;
  repo?: string;
  repositories: CareerGithubRepositorySummary[];
  facts: CareerGithubFact[];
  fallbackMessage?: string;
};

export type CareerPortfolioAnalysisStatus = "fetched" | "unavailable";

export type CareerPortfolioFact = {
  sourceId: string;
  sourceType: "portfolio_page";
  fact: string;
};

export type CareerPortfolioAnalysis = {
  sourceId: string;
  url: string;
  status: CareerPortfolioAnalysisStatus;
  title?: string;
  excerpt?: string;
  detectedSkills: string[];
  facts: CareerPortfolioFact[];
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
  jobId?: string;
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
  profileContexts?: DraftProfileContext[];
  aiSelection?: AiSelection;
};

export type CareerGapAnswer = {
  questionId: string;
  slot?: string;
  answer: string;
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
    id: CareerWorkflowStageId;
    label: string;
    status: CareerWorkflowStageStatus;
  }>;
  documentAnalyses: CareerDocumentAnalysis[];
  githubAnalyses: CareerGithubAnalysis[];
  portfolioAnalyses: CareerPortfolioAnalysis[];
  evidenceVault: CareerEvidenceVaultItem[];
  profileContexts: DraftProfileContext[];
  interview: {
    questions: CareerGapQuestion[];
    answers: CareerGapAnswer[];
  };
  drafts: CareerDocumentDraft[];
  completion: CareerDocumentCompletion;
  documentPackages: CareerDocumentPackage[];
  aiMeta?: AiExecutionMeta;
  missingEvidence: string[];
  risks: string[];
};
