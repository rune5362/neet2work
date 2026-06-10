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

/**
 * 생성 결과가 제출 가능한 수준인지 판단하기 위한 완료 상태입니다.
 */
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

/**
 * 문서 저장 API로 넘길 수 있도록 정규화된 생성 문서 패키지입니다.
 */
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

export type CareerProfileSkillSuggestion = {
  profileId: string;
  title: string;
  skills: string[];
  source: "github" | "portfolio" | "mixed";
  reason: string;
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

export type CareerDocumentTemplateSectionKind =
  | "resume"
  | "self_intro"
  | "skills"
  | "portfolio"
  | "common_rules";

export type CareerDocumentTemplateSection = {
  sectionId: string;
  kind: CareerDocumentTemplateSectionKind;
  title: string;
  order: number;
  requirements: string[];
};

/**
 * 첨부 자료를 분류하고 문항, 작성 규칙, 추출 텍스트로 정리한 결과입니다.
 */
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
    layoutRules: string[];
    sections: CareerDocumentTemplateSection[];
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

/**
 * 여러 자료 출처에서 모은 사실과 초안 사용 가능 여부를 담는 근거 항목입니다.
 */
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

/**
 * 초안 작성 전에 사용자의 확인이나 추가 설명이 필요한 질문입니다.
 */
export type CareerGapQuestion = {
  questionId: string;
  slot: string;
  question: string;
  whyAsking: string;
  priority: number;
  targetQuestionIds: string[];
  answer?: string;
};

/**
 * 문항별 초안과 사용 근거, 누락 근거, 위험 신호를 함께 담은 결과입니다.
 */
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

/**
 * 통합 커리어 문서 workflow가 생성물을 맞출 목표 맥락입니다.
 */
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

/**
 * `/api/career-workflow/document-session` 요청 payload입니다.
 */
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

/**
 * `/api/career-workflow/document-session/answer` 요청 payload입니다.
 */
export type CareerDocumentWorkflowAnswerRequest = {
  session: CareerDocumentWorkflowSession;
  questionId: string;
  answer: string;
  aiSelection?: AiSelection;
};

/**
 * 자료 분석, 질문, 초안, 저장 패키지를 모두 포함하는 통합 작성 세션입니다.
 */
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
  profileSkillSuggestions: CareerProfileSkillSuggestion[];
  aiMeta?: AiExecutionMeta;
  missingEvidence: string[];
  risks: string[];
};
