/**
 * 커리어 workflow가 입력 자료를 어떤 문서 작성 목적에 맞출지 나타냅니다.
 */
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

/**
 * 커리어 문서가 맞춰야 할 회사, 직무, 문항, 채용공고 맥락입니다.
 */
export type CareerWorkflowTarget = {
  company?: string;
  role?: string;
  questionText?: string;
  jobPostingText?: string;
  charLimit?: number;
};

/**
 * 사용자가 업로드하거나 붙여 넣은 원본 자료입니다.
 */
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

/**
 * 문서 작성에 사용할 수 있는 주장과 그 출처, 사용 가능 조건입니다.
 */
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

/**
 * 근거가 부족한 slot을 채우기 위해 UI가 사용자에게 묻는 다음 질문입니다.
 */
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

/**
 * 자료 분석부터 보완 질문까지의 커리어 문서 준비 세션입니다.
 */
export type CareerWorkflowSession = {
  sessionId: string;
  state:
    | "SESSION_CREATED"
    | "SOURCE_ROUTED"
    | "EVIDENCE_READY"
    | "QUESTION_READY"
    | "ANSWER_RECORDED"
    | "READY_TO_GENERATE";
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

/**
 * `/api/career-workflow/session` 요청 payload입니다.
 */
export type CareerWorkflowSessionRequest = {
  documentType?: CareerDocumentType;
  target?: CareerWorkflowTarget;
  sources?: CareerWorkflowSourceInput[];
};

/**
 * 문서 유형 id를 화면 표시용 라벨로 변환합니다.
 */
export function careerDocumentTypeLabel(documentType: CareerDocumentType) {
  const labels: Record<CareerDocumentType, string> = {
    resume: "이력서",
    specified_cover_letter: "지정 문항 자소서",
    freeform_cover_letter: "자유 형식 자소서",
    career_description: "경력기술서",
    portfolio_intro: "포트폴리오 소개",
    unknown: "문서 유형 미정"
  };
  return labels[documentType];
}
