import type {
  CareerDocumentAnalysis,
  CareerDocumentQuestion,
  CareerDocumentWorkflowTarget,
  CareerEvidenceVaultItem,
  CareerGapAnswer,
  CareerGapQuestion,
  CareerGithubAnalysis,
  CareerPortfolioAnalysis
} from "../../types/career-document-workflow.js";
import { inferIntent, requiredSlotsForIntent } from "./document-analysis.service.js";
import { collectFilledEvidenceSlots } from "./evidence-slot-policy.js";

const SLOT_PRIORITY = [
  "github_context",
  "portfolio_context",
  "target_role",
  "project_name",
  "user_role",
  "problem_context",
  "actions",
  "technical_choice",
  "result",
  "learning",
  "company_fit"
];

const SLOT_LABELS: Record<string, string> = {
  github_context: "GitHub 프로젝트 설명",
  portfolio_context: "포트폴리오 프로젝트 설명",
  target_role: "지원 직무",
  project_name: "프로젝트 이름과 목적",
  user_role: "본인 역할",
  problem_context: "문제 상황",
  actions: "해결 행동",
  technical_choice: "기술 선택 이유",
  result: "성과와 피드백",
  learning: "배운 점",
  company_fit: "회사/직무 연결"
};

export class GapInterviewService {
  build(input: {
    documentAnalyses: CareerDocumentAnalysis[];
    githubAnalyses: CareerGithubAnalysis[];
    portfolioAnalyses: CareerPortfolioAnalysis[];
    evidenceVault: CareerEvidenceVaultItem[];
    target: CareerDocumentWorkflowTarget;
    answers?: CareerGapAnswer[];
  }): CareerGapQuestion[] {
    const templateQuestions = collectTemplateQuestions(input.documentAnalyses, input.target);
    const requiredSlots = collectRequiredSlots(templateQuestions, input.target);
    const answeredIds = new Set((input.answers ?? []).map((answer) => answer.questionId));
    const filledSlots = collectFilledEvidenceSlots(input.evidenceVault, input.target);

    if (input.target.role?.trim()) {
      filledSlots.add("target_role");
    }

    const needsGithubFallbackQuestion =
      input.githubAnalyses.some((analysis) => analysis.status === "unavailable") &&
      !input.githubAnalyses.some((analysis) => analysis.facts.length > 0);
    if (needsGithubFallbackQuestion) {
      requiredSlots.add("github_context");
    }
    const needsPortfolioFallbackQuestion =
      input.portfolioAnalyses.some((analysis) => analysis.status === "unavailable") &&
      !input.portfolioAnalyses.some((analysis) => analysis.facts.length > 0);
    if (needsPortfolioFallbackQuestion) {
      requiredSlots.add("portfolio_context");
    }

    return Array.from(requiredSlots)
      .filter((slot) => !filledSlots.has(slot))
      .map((slot) => buildQuestion(slot, templateQuestions, input))
      .filter((question) => !answeredIds.has(question.questionId))
      .sort((left, right) => left.priority - right.priority)
      .slice(0, 6);
  }
}

function collectTemplateQuestions(documentAnalyses: CareerDocumentAnalysis[], target: CareerDocumentWorkflowTarget) {
  const questions = documentAnalyses.flatMap((analysis) => analysis.template?.questions ?? []);

  if (questions.length > 0) {
    return questions;
  }

  const targetQuestions = collectTargetQuestions(target);
  if (targetQuestions.length > 0) {
    return targetQuestions;
  }

  return [
    {
      questionId: "default-q1",
      text: "지원 직무와 관련된 프로젝트 경험을 구체적으로 작성해 주세요.",
      charCountRule: "unknown" as const,
      intent: "role_competency",
      requiredSlots: requiredSlotsForIntent("role_competency"),
      writingRules: []
    } satisfies CareerDocumentQuestion
  ];
}

function collectTargetQuestions(target: CareerDocumentWorkflowTarget) {
  if (!target.questionText?.trim()) {
    return [];
  }

  const intent = inferIntent(target.questionText);

  return [
    {
      questionId: "selected-format-q1",
      text: target.questionText.trim(),
      charLimit: target.charLimit,
      charCountRule: target.charCountRule ?? "unknown",
      intent,
      requiredSlots: requiredSlotsForIntent(intent),
      writingRules: target.formatLabel ? [`선택 형식: ${target.formatLabel}`] : []
    } satisfies CareerDocumentQuestion
  ];
}

function collectRequiredSlots(
  questions: CareerDocumentQuestion[],
  target: CareerDocumentWorkflowTarget
) {
  const slots = new Set(questions.flatMap((question) => question.requiredSlots));

  if (!target.role?.trim()) {
    slots.add("target_role");
  }

  return slots;
}

function buildQuestion(
  slot: string,
  templateQuestions: CareerDocumentQuestion[],
  input: {
    documentAnalyses: CareerDocumentAnalysis[];
    githubAnalyses: CareerGithubAnalysis[];
    portfolioAnalyses: CareerPortfolioAnalysis[];
    target: CareerDocumentWorkflowTarget;
  }
): CareerGapQuestion {
  const targetQuestionIds = templateQuestions
    .filter((question) => question.requiredSlots.includes(slot))
    .map((question) => question.questionId);
  const priority = SLOT_PRIORITY.indexOf(slot) >= 0 ? SLOT_PRIORITY.indexOf(slot) + 1 : SLOT_PRIORITY.length + 1;
  const label = SLOT_LABELS[slot] ?? slot;

  return {
    questionId: `gap-${slot}`,
    slot,
    question: buildDynamicQuestion(slot, label, templateQuestions, input),
    whyAsking: buildDynamicWhy(slot, label, input),
    priority,
    targetQuestionIds: targetQuestionIds.length > 0 ? targetQuestionIds : templateQuestions.map((question) => question.questionId)
  };
}

function buildDynamicQuestion(
  slot: string,
  label: string,
  templateQuestions: CareerDocumentQuestion[],
  input: {
    githubAnalyses: CareerGithubAnalysis[];
    portfolioAnalyses: CareerPortfolioAnalysis[];
    target: CareerDocumentWorkflowTarget;
  }
) {
  const roleText = input.target.role?.trim() ? `${input.target.role.trim()} 기준으로 ` : "";
  const anchor = templateQuestions.find((question) => question.requiredSlots.includes(slot))?.text ?? input.target.questionText;
  const anchorText = anchor ? `「${compact(anchor, 80)}」 문항에 넣을 수 있게 ` : "";

  if (slot === "github_context") {
    const urls = input.githubAnalyses.map((analysis) => analysis.url).join(", ");
    return `${roleText}${anchorText}GitHub 프로젝트의 목적, 사용 기술, 네가 직접 맡은 일을 알려줘.${urls ? ` 확인 대상: ${urls}` : ""}`;
  }

  if (slot === "portfolio_context") {
    const urls = input.portfolioAnalyses.map((analysis) => analysis.url).join(", ");
    return `${roleText}${anchorText}포트폴리오 프로젝트의 핵심 기능, 기술스택, 본인 기여를 알려줘.${urls ? ` 확인 대상: ${urls}` : ""}`;
  }

  if (slot === "target_role") {
    return `${anchorText}어떤 지원 직무나 직무군 기준으로 맞추면 돼?`;
  }

  return `${roleText}${anchorText}${label} 근거가 아직 부족해. 실제 사실만 한두 문장으로 알려줘.`;
}

function buildDynamicWhy(
  slot: string,
  label: string,
  input: {
    githubAnalyses: CareerGithubAnalysis[];
    portfolioAnalyses: CareerPortfolioAnalysis[];
    target: CareerDocumentWorkflowTarget;
  }
) {
  if (slot === "github_context") {
    const githubFallbackMessage = input.githubAnalyses.find((analysis) => analysis.status === "unavailable")?.fallbackMessage;
    return githubFallbackMessage ?? "GitHub 저장소를 직접 확인하지 못해서 프로젝트 설명을 사용자에게 확인해야 해.";
  }

  if (slot === "portfolio_context") {
    return "포트폴리오 링크를 읽지 못했거나 본인 기여가 분리되지 않으면 초안 근거로 바로 쓰기 어려워.";
  }

  if (slot === "user_role" && (input.githubAnalyses.length > 0 || input.portfolioAnalyses.length > 0)) {
    return "링크와 첨부 자료는 결과물을 보여주지만 네가 직접 한 범위는 사용자 확인이 필요해.";
  }

  if (slot === "company_fit" && (input.target.company?.trim() || input.target.jobPostingText?.trim())) {
    return "회사와 공고 요구사항에 맞추려면 연결 근거가 꾸며낸 말이 아니어야 해.";
  }

  return `${label}이 확인돼야 문항을 근거 기반으로 작성할 수 있어.`;
}

function compact(text: string, limit: number) {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length > limit ? `${normalized.slice(0, limit).trimEnd()}...` : normalized;
}

export const gapInterviewService = new GapInterviewService();
