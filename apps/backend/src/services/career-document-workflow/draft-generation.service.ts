import type {
  CareerDocumentAnalysis,
  CareerDocumentDraft,
  CareerDocumentQuestion,
  CareerDocumentWorkflowTarget,
  CareerEvidenceVaultItem
} from "../../types/career-document-workflow.js";
import { inferIntent, requiredSlotsForIntent } from "./document-analysis.service.js";

export class DraftGenerationService {
  generate(input: {
    documentAnalyses: CareerDocumentAnalysis[];
    evidenceVault: CareerEvidenceVaultItem[];
    target: CareerDocumentWorkflowTarget;
  }): CareerDocumentDraft[] {
    const questions = collectTemplateQuestions(input.documentAnalyses, input.target);
    const allowedEvidence = input.evidenceVault.filter((item) => item.allowedInDraft);
    const filledSlots = new Set(allowedEvidence.flatMap((item) => item.targetSlots));
    const hasExistingSelfIntro = input.documentAnalyses.some(
      (analysis) => analysis.classification === "existing_self_intro"
    );

    if (input.target.role?.trim()) {
      filledSlots.add("target_role");
    }
    if (input.target.company?.trim() || input.target.jobPostingText?.trim()) {
      filledSlots.add("company_fit");
    }

    return questions.map((question) => {
      const missingSlots = question.requiredSlots.filter((slot) => !filledSlots.has(slot));
      if (missingSlots.length > 0) {
        return {
          questionId: question.questionId,
          questionText: question.text,
          charLimit: question.charLimit,
          charCountRule: question.charCountRule,
          status: "needs_more_evidence",
          usedEvidenceSourceIds: [],
          usedEvidenceFacts: [],
          missingEvidence: missingSlots.map(slotLabel),
          risks: ["근거가 부족한 문항은 초안 대신 보완 질문을 먼저 남겼습니다."]
        } satisfies CareerDocumentDraft;
      }

      const selectedEvidence = selectEvidenceForQuestion(allowedEvidence, question);
      const draftText = fitToLimit(
        buildDraftText({
          question,
          evidence: selectedEvidence,
          target: input.target
        }),
        question.charLimit,
        question.charCountRule
      );

      return {
        questionId: question.questionId,
        questionText: question.text,
        charLimit: question.charLimit,
        charCountRule: question.charCountRule,
        status: "drafted",
        draftText,
        charCount: {
          withSpaces: draftText.length,
          withoutSpaces: draftText.replace(/\s/g, "").length,
          limit: question.charLimit
        },
        usedEvidenceSourceIds: Array.from(new Set(selectedEvidence.map((item) => item.sourceId))),
        usedEvidenceFacts: selectedEvidence.map((item) => item.fact),
        missingEvidence: [],
        risks: unique([
          ...buildDraftRisks(selectedEvidence),
          ...(hasExistingSelfIntro ? ["기존 자소서는 문장 복사가 아니라 구성과 문체 참고로만 사용해야 합니다."] : [])
        ])
      } satisfies CareerDocumentDraft;
    });
  }
}

function collectTemplateQuestions(documentAnalyses: CareerDocumentAnalysis[], target: CareerDocumentWorkflowTarget) {
  const questions = documentAnalyses.flatMap((analysis) => analysis.template?.questions ?? []);

  if (questions.length > 0) {
    return questions;
  }

  if (target.questionText?.trim()) {
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

function selectEvidenceForQuestion(
  evidenceVault: CareerEvidenceVaultItem[],
  question: CareerDocumentQuestion
) {
  const slotMatches = evidenceVault.filter((item) =>
    item.targetSlots.some((slot) => question.requiredSlots.includes(slot))
  );
  const nonTemplate = slotMatches.filter((item) => item.sourceType !== "self_intro_template");
  const selected = nonTemplate.length > 0 ? nonTemplate : slotMatches;

  return selected.slice(0, 8);
}

function buildDraftText(input: {
  question: CareerDocumentQuestion;
  evidence: CareerEvidenceVaultItem[];
  target: CareerDocumentWorkflowTarget;
}) {
  const role = input.target.role?.trim() || findFactBySlot(input.evidence, "target_role") || "지원 직무";
  const project = findFactBySlot(input.evidence, "project_name");
  const userRole = findFactBySlot(input.evidence, "user_role");
  const problem = findFactBySlot(input.evidence, "problem_context");
  const actions = findFactBySlot(input.evidence, "actions");
  const technicalChoice = findFactBySlot(input.evidence, "technical_choice");
  const result = findFactBySlot(input.evidence, "result");
  const learning = findFactBySlot(input.evidence, "learning");
  const companyFit = findFactBySlot(input.evidence, "company_fit");
  const stylePrefix = input.target.formatLabel ? `${input.target.formatLabel} 형식으로 ` : "";
  const opening =
    input.question.intent === "company_fit"
      ? `${stylePrefix}${role} 지원 동기는 ${companyFit ? simplifyFact(companyFit) : "확인된 직무 연결 근거"}에서 출발합니다.`
      : `${stylePrefix}${role}에 맞춰 ${project ? simplifyFact(project) : "확인된 프로젝트 경험"}을 중심으로 답변하겠습니다.`;
  const sentences = [
    opening,
    userRole ? `이 경험에서 제가 직접 맡은 범위는 ${simplifyFact(userRole)}입니다.` : undefined,
    problem ? `출발점은 ${simplifyFact(problem)}였습니다.` : undefined,
    actions ? `이를 해결하기 위해 ${simplifyFact(actions)} 과정을 실행했습니다.` : undefined,
    technicalChoice ? `기술과 구조는 ${simplifyFact(technicalChoice)} 근거로 선택했습니다.` : undefined,
    result ? `확인 가능한 결과는 ${simplifyFact(result)}입니다.` : undefined,
    learning ? `이 과정에서 ${simplifyFact(learning)}을 배웠습니다.` : undefined,
    companyFit && input.question.intent !== "company_fit"
      ? `따라서 이 경험은 ${simplifyFact(companyFit)} 측면에서 지원 직무와 연결됩니다.`
      : undefined
  ].filter(Boolean);

  return sentences.join(" ");
}

function findFactBySlot(evidence: CareerEvidenceVaultItem[], slot: string) {
  return evidence.find((item) => item.targetSlots.includes(slot))?.fact;
}

function simplifyFact(fact: string) {
  return fact
    .replace(/^(사용자 입력|기존 자소서|참고자료|채용공고|GitHub 저장소 [^:]+ (?:설명|README 요약|사용 언어|최근 업데이트)|GitHub 프로필 소개)\s*:\s*/i, "")
    .replace(/^GitHub 저장소 ([^ ]+) 메타데이터가 확인됐습니다\.$/, "$1 저장소")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
}

function fitToLimit(text: string, limit: number | undefined, charCountRule: CareerDocumentQuestion["charCountRule"]) {
  if (!limit) {
    return text;
  }

  const count = charCountRule === "without_spaces" ? text.replace(/\s/g, "").length : text.length;
  if (count <= limit) {
    return text;
  }

  if (charCountRule !== "without_spaces") {
    return `${text.slice(0, Math.max(0, limit - 3)).trimEnd()}...`;
  }

  let visible = "";
  let nonSpaceCount = 0;
  for (const char of text) {
    if (!/\s/.test(char)) {
      nonSpaceCount += 1;
    }
    if (nonSpaceCount > Math.max(0, limit - 3)) {
      break;
    }
    visible += char;
  }

  return `${visible.trimEnd()}...`;
}

function buildDraftRisks(evidence: CareerEvidenceVaultItem[]) {
  const risks = new Set<string>();

  if (evidence.some((item) => item.confidence === "medium")) {
    risks.add("일부 근거는 첨부 문서나 GitHub에서 추출한 중간 신뢰도 근거입니다.");
  }
  if (evidence.some((item) => item.needsUserConfirmation)) {
    risks.add("본인 역할, 성과, 의도는 면접 전에 사용자 확인이 필요합니다.");
  }
  if (evidence.some((item) => item.privacyRisk !== "none")) {
    risks.add("블라인드 채용 또는 개인정보 노출 가능성이 있는 표현은 다시 확인해야 합니다.");
  }

  return Array.from(risks);
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function slotLabel(slot: string) {
  const labels: Record<string, string> = {
    github_context: "GitHub README 또는 프로젝트 설명",
    target_role: "지원 직무",
    project_name: "프로젝트 이름과 목적",
    user_role: "본인 역할",
    problem_context: "문제 상황",
    actions: "해결 과정",
    technical_choice: "기술 선택 이유",
    result: "성과와 피드백",
    learning: "배운 점",
    company_fit: "회사/직무 연결 근거"
  };

  return labels[slot] ?? slot;
}

export const draftGenerationService = new DraftGenerationService();
