import { randomUUID } from "node:crypto";
import type {
  CareerCompletionMap,
  CareerDocumentType,
  CareerEvidenceVaultItem,
  CareerNextQuestion,
  CareerSourceType,
  CareerTemplateAnalysis,
  CareerTemplateQuestion,
  CareerWorkflowAnswerQuestionRequest,
  CareerWorkflowAnswerQuestionResponse,
  CareerWorkflowSession,
  CareerWorkflowSessionRequest,
  CareerWorkflowSourceInput,
  CareerWorkflowSourceSummary,
  CareerWorkflowTarget
} from "../../types/career-workflow.js";

type NormalizedSource = CareerWorkflowSourceInput & {
  sourceId: string;
  sourceType: CareerSourceType;
  label: string;
  text: string;
};

const KNOWN_SKILLS = [
  "React",
  "Node.js",
  "Express",
  "PostgreSQL",
  "Prisma",
  "REST API",
  "TypeScript",
  "JavaScript",
  "Git",
  "Docker",
  "AWS",
  "Next.js",
  "Vue",
  "Spring",
  "Java",
  "Python"
];

const DOCUMENT_REQUIRED_SLOTS: Record<CareerDocumentType, string[]> = {
  resume: ["target_role", "project_name", "user_role", "actions", "skills", "result"],
  specified_cover_letter: [
    "target_role",
    "project_name",
    "problem_context",
    "user_role",
    "actions",
    "result",
    "role_fit"
  ],
  freeform_cover_letter: ["target_role", "core_strength", "project_name", "actions", "result", "role_fit"],
  career_description: ["project_name", "user_role", "skills", "actions", "result", "contribution"],
  portfolio_intro: ["project_name", "problem_context", "actions", "skills", "result"],
  unknown: ["target_role", "project_name", "user_role", "actions", "result"]
};

const SLOT_PRIORITY = [
  "target_role",
  "user_role",
  "project_name",
  "problem_context",
  "actions",
  "result",
  "role_fit",
  "skills",
  "contribution",
  "core_strength"
];

const SLOT_SECTION_LABELS: Record<string, string> = {
  target_role: "지원 직무",
  project_name: "프로젝트 소개",
  problem_context: "문제 상황",
  user_role: "본인 역할",
  actions: "해결 과정",
  result: "성과",
  role_fit: "직무 연결",
  skills: "기술 스택",
  contribution: "기여도",
  core_strength: "핵심 강점"
};

const SLOT_QUESTIONS: Record<string, string> = {
  target_role: "지원하려는 직무는 백엔드, 프론트엔드, 풀스택 중 어디에 가까워?",
  project_name: "문서에 가장 먼저 쓸 프로젝트나 경험 이름은 뭐야?",
  problem_context: "그 경험에서 처음 마주한 문제나 상황은 뭐였어?",
  user_role: "그 프로젝트에서 네가 직접 맡은 범위는 어디까지였어?",
  actions: "문제를 해결하려고 어떤 순서로 확인하고 실행했어?",
  result: "해결 후 결과나 달라진 점은 뭐였어?",
  role_fit: "이 경험이 지원 직무와 어떻게 이어진다고 봐?",
  skills: "실제로 사용한 기술 스택을 구체적으로 적어줘.",
  contribution: "팀 결과에서 네 기여를 어떻게 설명할 수 있어?",
  core_strength: "이 경험으로 보여주고 싶은 가장 강한 역량은 뭐야?"
};

const SLOT_WHY: Record<string, string> = {
  target_role: "문서의 방향을 정하려면 먼저 어느 직무 기준으로 경험을 해석할지 정해야 해.",
  project_name: "현재 문서에 넣을 대표 소재가 명확하지 않아.",
  problem_context: "문제 상황이 있어야 행동과 결과가 단순 작업 나열로 보이지 않아.",
  user_role: "GitHub나 자료만으로는 본인이 직접 한 일을 확정할 수 없어.",
  actions: "현재 근거에는 무엇을 했는지는 있어도 판단 순서와 실행 과정이 부족해.",
  result: "결과가 없으면 문서가 경험 설명에서 멈춰.",
  role_fit: "지원 직무와의 연결이 있어야 자기소개서 문항에 직접 답할 수 있어.",
  skills: "이력서와 경력기술서는 기술을 행동과 함께 보여줘야 해.",
  contribution: "경력기술서는 팀 산출물 안에서 본인 기여 범위가 분명해야 해.",
  core_strength: "자유 형식 문서는 먼저 중심 강점을 정해야 구조가 흔들리지 않아."
};

export class CareerWorkflowService {
  createSession(request: CareerWorkflowSessionRequest): CareerWorkflowSession {
    const target = request.target ?? {};
    const normalizedSources = this.normalizeSources(request.sources ?? []);
    const documentTypeResult = this.routeDocumentType(request.documentType, normalizedSources, target);
    const sources = normalizedSources.map((source) => this.summarizeSource(source));
    const templateAnalysis = this.analyzeTemplate(normalizedSources, target, documentTypeResult.documentType);
    const evidenceVault = this.buildEvidenceVault(normalizedSources, target);
    const completion = this.buildCompletion({
      documentType: documentTypeResult.documentType,
      target,
      evidenceVault,
      templateAnalysis,
      answeredQuestions: []
    });
    const nextQuestion = this.buildNextQuestion(documentTypeResult.documentType, completion);

    return {
      sessionId: randomUUID(),
      state: nextQuestion ? "QUESTION_READY" : "READY_TO_GENERATE",
      documentType: documentTypeResult.documentType,
      documentTypeReason: documentTypeResult.reason,
      target,
      sources,
      templateAnalysis,
      evidenceVault,
      completion,
      answeredQuestions: [],
      nextQuestion
    };
  }

  getNextQuestion(session: CareerWorkflowSession): CareerNextQuestion | undefined {
    return session.nextQuestion ?? this.buildNextQuestion(session.documentType, session.completion);
  }

  answerQuestion(request: CareerWorkflowAnswerQuestionRequest): CareerWorkflowAnswerQuestionResponse {
    const existingQuestion =
      request.session.nextQuestion?.questionId === request.questionId
        ? request.session.nextQuestion
        : this.buildQuestionFromId(request.session.documentType, request.questionId);
    const targetSlot = existingQuestion?.targetSlot ?? request.questionId.replace(/^q-/, "");
    const sourceId = `answer-${request.questionId}`;
    const acceptedEvidence: CareerEvidenceVaultItem = {
      evidenceId: `ev-${randomUUID()}`,
      sourceType: "experience_text",
      sourceId,
      claim: request.answer.trim(),
      evidenceText: request.answer.trim(),
      confidence: "high",
      status: "user_provided",
      confirmedByUser: true,
      usableForResume: true,
      usableForCoverLetter: true,
      usableForCareerDescription: true,
      blindRisk: hasBlindRisk(request.answer),
      privacyRisk: hasPrivacyRisk(request.answer),
      targetSlots: [targetSlot]
    };
    const answeredQuestions = [
      ...request.session.answeredQuestions.filter((item) => item.questionId !== request.questionId),
      {
        questionId: request.questionId,
        targetSlot,
        answer: request.answer.trim()
      }
    ];
    const evidenceVault = [
      ...request.session.evidenceVault.filter((item) => item.sourceId !== sourceId),
      acceptedEvidence
    ];
    const completion = this.buildCompletion({
      documentType: request.session.documentType,
      target: request.session.target,
      evidenceVault,
      templateAnalysis: request.session.templateAnalysis,
      answeredQuestions
    });
    const nextQuestion = this.buildNextQuestion(request.session.documentType, completion);
    const session: CareerWorkflowSession = {
      ...request.session,
      state: nextQuestion ? "ANSWER_RECORDED" : "READY_TO_GENERATE",
      evidenceVault,
      completion,
      answeredQuestions,
      nextQuestion
    };

    return {
      session,
      acceptedEvidence,
      nextQuestion
    };
  }

  private normalizeSources(sources: CareerWorkflowSourceInput[]): NormalizedSource[] {
    if (sources.length === 0) {
      return [
        {
          sourceId: "source-empty",
          sourceType: "empty",
          label: "자료 없음",
          text: ""
        }
      ];
    }

    return sources.map((source, index) => {
      const text = [source.text, source.url].filter(Boolean).join("\n").trim();
      const sourceType = source.sourceType ?? detectSourceType(source, text);
      return {
        ...source,
        sourceId: source.sourceId?.trim() || `source-${index + 1}`,
        sourceType,
        label: source.label?.trim() || source.fileName?.trim() || defaultSourceLabel(sourceType),
        text
      };
    });
  }

  private routeDocumentType(
    requestedType: CareerDocumentType | undefined,
    sources: NormalizedSource[],
    target: CareerWorkflowTarget
  ): { documentType: CareerDocumentType; reason: string } {
    if (requestedType && requestedType !== "unknown") {
      return {
        documentType: requestedType,
        reason: "사용자가 문서 유형을 직접 선택했습니다."
      };
    }

    if (sources.some((source) => source.sourceType === "blank_cover_letter_template") || looksLikeQuestion(target.questionText)) {
      return {
        documentType: "specified_cover_letter",
        reason: "빈 자소서 양식 또는 지원 문항이 감지됐습니다."
      };
    }

    if (sources.some((source) => source.sourceType === "resume")) {
      return {
        documentType: "resume",
        reason: "이력서 자료가 감지됐습니다."
      };
    }

    if (sources.some((source) => source.sourceType === "career_description")) {
      return {
        documentType: "career_description",
        reason: "경력기술서 자료가 감지됐습니다."
      };
    }

    if (sources.some((source) => source.sourceType === "portfolio")) {
      return {
        documentType: "portfolio_intro",
        reason: "포트폴리오 자료가 감지됐습니다."
      };
    }

    return {
      documentType: "freeform_cover_letter",
      reason: "명확한 양식이 없어 자유 형식 자기소개서 흐름으로 시작합니다."
    };
  }

  private summarizeSource(source: NormalizedSource): CareerWorkflowSourceSummary {
    const extractedSignals = extractSignals(source);
    return {
      sourceId: source.sourceId,
      sourceType: source.sourceType,
      label: source.label,
      extractedSignals,
      requiresUserConfirmation: source.sourceType === "github_url" || source.sourceType === "portfolio"
    };
  }

  private analyzeTemplate(
    sources: NormalizedSource[],
    target: CareerWorkflowTarget,
    documentType: CareerDocumentType
  ): CareerTemplateAnalysis {
    const templateTexts = [
      ...sources
        .filter((source) => source.sourceType === "blank_cover_letter_template")
        .map((source) => source.text),
      target.questionText ?? ""
    ].filter((text) => looksLikeQuestion(text));
    const questions = templateTexts.flatMap((text, index) => extractTemplateQuestions(text, index, documentType));

    return {
      detected: questions.length > 0,
      questions
    };
  }

  private buildEvidenceVault(
    sources: NormalizedSource[],
    target: CareerWorkflowTarget
  ): CareerEvidenceVaultItem[] {
    return sources.flatMap((source) => {
      if (source.sourceType === "empty") {
        return [];
      }

      const evidenceText = source.text.trim();
      const targetSlots = detectFilledSlots(evidenceText, target);
      const documentSource =
        source.sourceType === "blank_cover_letter_template" ||
        source.sourceType === "job_posting" ||
        source.sourceType === "reference_pattern";
      const userProvided =
        source.sourceType === "experience_text" ||
        source.sourceType === "project_text" ||
        source.sourceType === "github_url";

      return [
        {
          evidenceId: `ev-${source.sourceId}`,
          sourceType: source.sourceType,
          sourceId: source.sourceId,
          claim: buildClaim(source),
          evidenceText,
          confidence: userProvided ? "high" : "medium",
          status: userProvided ? "user_provided" : "extracted",
          confirmedByUser: userProvided,
          usableForResume: !documentSource && source.sourceType !== "github_url",
          usableForCoverLetter: !documentSource && source.sourceType !== "github_url",
          usableForCareerDescription: !documentSource && source.sourceType !== "github_url",
          blindRisk: hasBlindRisk(evidenceText),
          privacyRisk: hasPrivacyRisk(evidenceText),
          targetSlots
        } satisfies CareerEvidenceVaultItem
      ];
    });
  }

  private buildCompletion(input: {
    documentType: CareerDocumentType;
    target: CareerWorkflowTarget;
    evidenceVault: CareerEvidenceVaultItem[];
    templateAnalysis: CareerTemplateAnalysis;
    answeredQuestions: Array<{ targetSlot: string }>;
  }): CareerCompletionMap {
    const requiredSlots = unique([
      ...DOCUMENT_REQUIRED_SLOTS[input.documentType],
      ...input.templateAnalysis.questions.flatMap((question) => question.requiredSlots)
    ]);
    const evidenceSlots = input.evidenceVault
      .filter((item) => item.status !== "unsupported" && item.status !== "inferred")
      .flatMap((item) => item.targetSlots);
    const targetSlots = input.target.role?.trim() ? ["target_role"] : [];
    const answeredSlots = input.answeredQuestions.map((answer) => answer.targetSlot);
    const filledSlots = unique([...evidenceSlots, ...targetSlots, ...answeredSlots]).filter((slot) =>
      requiredSlots.includes(slot)
    );
    const missingSlots = requiredSlots.filter((slot) => !filledSlots.includes(slot));
    const progress = requiredSlots.length === 0 ? 100 : Math.round((filledSlots.length / requiredSlots.length) * 100);

    return {
      requiredSlots,
      filledSlots,
      missingSlots,
      progress
    };
  }

  private buildNextQuestion(
    documentType: CareerDocumentType,
    completion: CareerCompletionMap
  ): CareerNextQuestion | undefined {
    const targetSlot =
      SLOT_PRIORITY.find((slot) => completion.missingSlots.includes(slot)) ?? completion.missingSlots[0];

    if (!targetSlot) {
      return undefined;
    }

    return buildQuestion(documentType, targetSlot);
  }

  private buildQuestionFromId(
    documentType: CareerDocumentType,
    questionId: string
  ): CareerNextQuestion | undefined {
    const targetSlot = questionId.replace(/^q-/, "");
    if (!targetSlot || !SLOT_QUESTIONS[targetSlot]) {
      return undefined;
    }

    return buildQuestion(documentType, targetSlot);
  }
}

function buildQuestion(documentType: CareerDocumentType, targetSlot: string): CareerNextQuestion {
  return {
    questionId: `q-${targetSlot}`,
    question: SLOT_QUESTIONS[targetSlot] ?? "이 문서를 완성하는 데 필요한 정보를 더 알려줘.",
    whyAsking: SLOT_WHY[targetSlot] ?? "현재 문서에 필요한 근거가 부족해.",
    targetDocument: documentType,
    targetSection: SLOT_SECTION_LABELS[targetSlot] ?? targetSlot,
    expectedAnswerType: targetSlot === "result" ? "long_text" : "short_text",
    priority: SLOT_PRIORITY.indexOf(targetSlot) >= 0 ? SLOT_PRIORITY.indexOf(targetSlot) + 1 : SLOT_PRIORITY.length + 1,
    canSkip: targetSlot !== "user_role" && targetSlot !== "target_role",
    targetSlot
  };
}

function detectSourceType(source: CareerWorkflowSourceInput, text: string): CareerSourceType {
  const fileName = source.fileName?.toLowerCase() ?? "";
  const value = `${text}\n${source.url ?? ""}`.toLowerCase();

  if (!value.trim()) {
    return "empty";
  }

  if (/github\.com/.test(value)) {
    return "github_url";
  }

  if (/이력서|resume/.test(fileName) || /학력|경력|기술\s*스택|보유\s*기술/.test(text)) {
    return "resume";
  }

  if (/경력기술서|직무기술서/.test(fileName) || /담당\s*업무|주요\s*업무|기여도/.test(text)) {
    return "career_description";
  }

  if (/포트폴리오|portfolio/.test(fileName) || /프로젝트\s*소개|배포\s*링크/.test(text)) {
    return "portfolio";
  }

  if (/자격요건|우대사항|담당업무|채용공고/.test(text)) {
    return "job_posting";
  }

  if (looksLikeQuestion(text)) {
    return "blank_cover_letter_template";
  }

  if (/프로젝트|mvp|api|db|react|node|postgres/i.test(text)) {
    return "project_text";
  }

  return "experience_text";
}

function defaultSourceLabel(sourceType: CareerSourceType) {
  const labels: Record<CareerSourceType, string> = {
    empty: "자료 없음",
    experience_text: "경험 텍스트",
    blank_cover_letter_template: "빈 자소서 양식",
    existing_cover_letter: "기존 자소서",
    resume: "이력서",
    career_description: "경력기술서",
    portfolio: "포트폴리오",
    github_url: "GitHub URL",
    job_posting: "채용공고",
    project_text: "프로젝트 설명",
    reference_pattern: "레퍼런스 패턴"
  };
  return labels[sourceType];
}

function extractSignals(source: NormalizedSource) {
  const signals = new Set<string>();
  const text = source.text;

  for (const skill of KNOWN_SKILLS) {
    if (new RegExp(escapeRegExp(skill), "i").test(text)) {
      signals.add(skill);
    }
  }

  if (source.sourceType === "github_url") {
    signals.add("GitHub 자료 확인 필요");
  }

  const templateQuestions = extractTemplateQuestions(text, 0, "specified_cover_letter");
  if (templateQuestions.length > 0) {
    signals.add(`문항 ${templateQuestions.length}개`);
  }

  const charLimit = extractCharLimit(text);
  if (charLimit) {
    signals.add(`${charLimit}자 제한`);
  }

  if (/프로젝트|mvp/i.test(text)) {
    signals.add("프로젝트 경험");
  }

  return Array.from(signals);
}

function extractTemplateQuestions(
  text: string,
  sourceIndex: number,
  documentType: CareerDocumentType
): CareerTemplateQuestion[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 5);
  const questionLines = lines.filter((line) => looksLikeQuestion(line));
  const sourceLines = questionLines.length > 0 ? questionLines : looksLikeQuestion(text) ? [text.trim()] : [];

  return sourceLines.slice(0, 8).map((line, index) => {
    const intent = inferQuestionIntent(line);
    const requiredSlots = requiredSlotsForIntent(intent, documentType);
    return {
      questionId: `template-${sourceIndex + 1}-${index + 1}`,
      text: line,
      charLimit: extractCharLimit(line) ?? extractCharLimit(text),
      intent,
      requiredSlots,
      missingSlots: requiredSlots
    };
  });
}

function looksLikeQuestion(text?: string) {
  if (!text) {
    return false;
  }

  return /[?？]|작성|서술|기술|설명|지원동기|입사 후 포부|경험|문항|\d+\s*자\s*이내/.test(text);
}

function extractCharLimit(text: string) {
  const match = text.match(/(\d{2,4})\s*자\s*(?:이내|내외|제한)?/);
  return match ? Number(match[1]) : undefined;
}

function inferQuestionIntent(text: string) {
  if (/협업|팀|갈등|소통/.test(text)) {
    return "협업 경험";
  }
  if (/문제|해결|개선|오류|장애/.test(text)) {
    return "문제 해결";
  }
  if (/지원동기|입사|포부|회사/.test(text)) {
    return "지원 동기";
  }
  if (/직무|역량|프로젝트|경험/.test(text)) {
    return "직무 역량";
  }
  return "자기소개";
}

function requiredSlotsForIntent(intent: string, documentType: CareerDocumentType) {
  const base = DOCUMENT_REQUIRED_SLOTS[documentType] ?? DOCUMENT_REQUIRED_SLOTS.unknown;

  if (intent === "지원 동기") {
    return unique(["target_role", "role_fit", "core_strength"]);
  }

  if (intent === "협업 경험") {
    return unique(["project_name", "problem_context", "user_role", "actions", "result"]);
  }

  if (intent === "문제 해결") {
    return unique(["project_name", "problem_context", "actions", "result", "role_fit"]);
  }

  return base;
}

function detectFilledSlots(text: string, target: CareerWorkflowTarget) {
  const slots = new Set<string>();
  const value = text.toLowerCase();

  if (target.role?.trim() || /백엔드|프론트엔드|풀스택|개발자|engineer|developer/i.test(text)) {
    slots.add("target_role");
  }
  if (/프로젝트|서비스|시스템|앱|웹|mvp/i.test(text)) {
    slots.add("project_name");
  }
  if (/문제|오류|버그|이슈|불편|개선|장애/.test(text)) {
    slots.add("problem_context");
  }
  if (/맡|담당|역할|기여|직접|구현/.test(text)) {
    slots.add("user_role");
  }
  if (/구현|연동|수정|개선|분석|설계|확인|정리|개발/.test(text)) {
    slots.add("actions");
  }
  if (/완료|성과|결과|개선|기여|달성|해결|%|\d+\s*(명|개|건|일|주|개월)/.test(text)) {
    slots.add("result");
  }
  if (KNOWN_SKILLS.some((skill) => value.includes(skill.toLowerCase()))) {
    slots.add("skills");
  }
  if (target.jobPostingText?.trim() || /직무|공고|지원/.test(text)) {
    slots.add("role_fit");
  }

  return Array.from(slots);
}

function buildClaim(source: NormalizedSource) {
  if (source.sourceType === "github_url") {
    return "사용자가 GitHub URL을 제공했습니다. 본인 기여는 추가 확인이 필요합니다.";
  }

  if (source.sourceType === "blank_cover_letter_template") {
    return "빈 자소서 양식 또는 지원 문항이 제공됐습니다.";
  }

  if (source.sourceType === "job_posting") {
    return "채용공고 또는 직무 요구사항이 제공됐습니다.";
  }

  const summary = source.text.replace(/\s+/g, " ").trim().slice(0, 140);
  return summary ? `사용자 자료에서 추출한 경험: ${summary}` : "자료가 제공됐지만 추출 가능한 텍스트가 부족합니다.";
}

function hasPrivacyRisk(text: string) {
  return /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\d{2,3}-\d{3,4}-\d{4}|주민등록|생년월일/i.test(text);
}

function hasBlindRisk(text: string) {
  return /나이|성별|가족|출신|고향|학교명|사진|종교|결혼/.test(text);
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const careerWorkflowService = new CareerWorkflowService();
