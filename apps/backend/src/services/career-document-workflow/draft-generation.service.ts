import type {
  CareerDocumentAnalysis,
  CareerDocumentDraft,
  CareerDocumentQuestion,
  CareerDocumentWorkflowTarget,
  CareerEvidenceVaultItem
} from "../../types/career-document-workflow.js";
import { inferIntent, requiredSlotsForIntent } from "./document-analysis.service.js";
import { collectFilledEvidenceSlots } from "./evidence-slot-policy.js";

const SELF_INTRO_ONE_PAGE_CHAR_LIMIT = 900;
const SELF_INTRO_MAX_CHAR_LIMIT = 1200;

export class DraftGenerationService {
  generate(input: {
    documentAnalyses: CareerDocumentAnalysis[];
    evidenceVault: CareerEvidenceVaultItem[];
    target: CareerDocumentWorkflowTarget;
  }): CareerDocumentDraft[] {
    const questions = collectTemplateQuestions(input.documentAnalyses, input.target);
    const allowedEvidence = input.evidenceVault.filter((item) => item.allowedInDraft && !item.needsUserConfirmation);
    const filledSlots = collectFilledEvidenceSlots(input.evidenceVault, input.target);
    const hasExistingSelfIntro = input.documentAnalyses.some(
      (analysis) => analysis.classification === "existing_self_intro"
    );

    if (input.target.role?.trim()) {
      filledSlots.add("target_role");
    }

    return questions.map((question) => {
      const normalizedQuestion = normalizeQuestionCharLimit(question);
      const missingSlots = normalizedQuestion.requiredSlots.filter((slot) => !filledSlots.has(slot));
      const selectedEvidence = selectEvidenceForQuestion(allowedEvidence, normalizedQuestion);

      if (missingSlots.length > 0) {
        const provisionalDraftText =
          selectedEvidence.length > 0
            ? fitToLimit(
                buildProvisionalDraftText({
                  question: normalizedQuestion,
                  evidence: selectedEvidence,
                  target: input.target
                }),
                normalizedQuestion.charLimit,
                normalizedQuestion.charCountRule
              )
            : undefined;

        return {
          questionId: normalizedQuestion.questionId,
          questionText: normalizedQuestion.text,
          charLimit: normalizedQuestion.charLimit,
          charCountRule: normalizedQuestion.charCountRule,
          status: "needs_more_evidence",
          draftText: provisionalDraftText,
          charCount: provisionalDraftText
            ? {
                withSpaces: provisionalDraftText.length,
                withoutSpaces: provisionalDraftText.replace(/\s/g, "").length,
                limit: normalizedQuestion.charLimit
              }
            : undefined,
          usedEvidenceSourceIds: Array.from(new Set(selectedEvidence.map((item) => item.sourceId))),
          usedEvidenceFacts: selectedEvidence.map((item) => item.fact),
          missingEvidence: missingSlots.map(slotLabel),
          risks: unique([
            ...buildDraftRisks(selectedEvidence),
            "근거가 부족한 항목은 가초안에서 단정하지 않고 보완 질문으로 남겼습니다."
          ])
        } satisfies CareerDocumentDraft;
      }

      const draftText = fitToLimit(
        buildDraftText({
          question: normalizedQuestion,
          evidence: selectedEvidence,
          target: input.target
        }),
        normalizedQuestion.charLimit,
        normalizedQuestion.charCountRule
      );

      return {
        questionId: normalizedQuestion.questionId,
        questionText: normalizedQuestion.text,
        charLimit: normalizedQuestion.charLimit,
        charCountRule: normalizedQuestion.charCountRule,
        status: "drafted",
        draftText,
        charCount: {
          withSpaces: draftText.length,
          withoutSpaces: draftText.replace(/\s/g, "").length,
          limit: normalizedQuestion.charLimit
        },
        usedEvidenceSourceIds: Array.from(new Set(selectedEvidence.map((item) => item.sourceId))),
        usedEvidenceFacts: selectedEvidence.map((item) => item.fact),
        missingEvidence: missingSlots.map(slotLabel),
        risks: unique([
          ...buildDraftRisks(selectedEvidence),
          ...(missingSlots.length > 0 ? ["1차 초안은 확인된 근거만으로 작성했으며, 부족한 부분은 이어지는 질문 답변으로 보완해야 합니다."] : []),
          ...(hasExistingSelfIntro ? ["기존 자소서는 문장 복사가 아니라 구성과 문체 참고로만 사용해야 합니다."] : [])
        ])
      } satisfies CareerDocumentDraft;
    });
  }
}

function collectTemplateQuestions(documentAnalyses: CareerDocumentAnalysis[], target: CareerDocumentWorkflowTarget) {
  const questions = documentAnalyses.flatMap((analysis) => analysis.template?.questions ?? []);

  if (questions.length > 0) {
    return questions.map(normalizeQuestionCharLimit);
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
    ].map(normalizeQuestionCharLimit);
  }

  return [
    {
      questionId: "default-q1",
      text: "지원 직무와 관련된 프로젝트 경험을 구체적으로 작성해 주세요.",
      charLimit: target.charLimit,
      charCountRule: "unknown" as const,
      intent: "role_competency",
      requiredSlots: requiredSlotsForIntent("role_competency"),
      writingRules: []
    } satisfies CareerDocumentQuestion
  ].map(normalizeQuestionCharLimit);
}

function normalizeQuestionCharLimit(question: CareerDocumentQuestion): CareerDocumentQuestion {
  return {
    ...question,
    charLimit: clampSelfIntroCharLimit(question.charLimit)
  };
}

function clampSelfIntroCharLimit(limit: number | undefined) {
  if (!limit || !Number.isFinite(limit)) {
    return SELF_INTRO_ONE_PAGE_CHAR_LIMIT;
  }

  return Math.min(SELF_INTRO_MAX_CHAR_LIMIT, Math.max(200, Math.round(limit)));
}

function selectEvidenceForQuestion(
  evidenceVault: CareerEvidenceVaultItem[],
  question: CareerDocumentQuestion
) {
  const slotMatches = evidenceVault.filter((item) =>
    item.targetSlots.some((slot) => question.requiredSlots.includes(slot))
  );
  const nonTemplate = slotMatches.filter((item) => item.sourceType !== "self_intro_template");
  const selectedWithoutUserInstructions = nonTemplate.filter((item) => item.sourceType !== "user_input");
  const selected = selectedWithoutUserInstructions.length > 0
    ? selectedWithoutUserInstructions
    : nonTemplate.length > 0
      ? nonTemplate
      : slotMatches;

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
  const roleText = simplifyFact(role);
  const projectText = project ? simplifyFact(project) : "확인된 프로젝트 경험";
  const userRoleText = userRole ? simplifyFact(userRole) : "";
  const problemText = problem ? simplifyFact(problem) : "";
  const actionsText = actions ? simplifyFact(actions) : "";
  const technicalChoiceText = technicalChoice ? simplifyFact(technicalChoice) : "";
  const resultText = result ? simplifyFact(result) : "";
  const learningText = learning ? simplifyFact(learning) : "";
  const companyFitText = companyFit ? simplifyFact(companyFit) : "";
  const opening =
    input.question.intent === "company_fit"
      ? `${stylePrefix}${roleText} 지원 동기는 ${companyFitText || "확인된 직무 연결 근거"}에서 출발합니다.`
      : `${stylePrefix}${roleText}에 필요한 실무 역량은 ${projectText} 경험에서 확인할 수 있습니다.`;
  const sentences = [
    opening,
    userRoleText ? buildRoleSentence(userRoleText) : undefined,
    problemText ? `출발점은 ${problemText}였습니다.` : undefined,
    actionsText && actionsText !== userRoleText ? buildActionSentence(actionsText) : undefined,
    technicalChoiceText ? `기술적으로는 ${technicalChoiceText}를 활용했습니다.` : undefined,
    resultText ? buildResultSentence(resultText) : undefined,
    learningText ? buildLearningSentence(learningText) : undefined,
    companyFit && input.question.intent !== "company_fit"
      ? `따라서 이 경험은 ${companyFitText} 측면에서 지원 직무와 연결됩니다.`
      : undefined
  ].filter(Boolean);

  return sentences.join(" ");
}

function buildProvisionalDraftText(input: {
  question: CareerDocumentQuestion;
  evidence: CareerEvidenceVaultItem[];
  target: CareerDocumentWorkflowTarget;
}) {
  return buildDraftText(input).replace("을 중심으로 답변하겠습니다.", "을 중심으로 정리하겠습니다.");
}

function findFactBySlot(evidence: CareerEvidenceVaultItem[], slot: string) {
  return evidence.find((item) => item.targetSlots.includes(slot))?.fact;
}

function simplifyFact(fact: string) {
  return fact
    .replace(/^선택 프로필 .+? 기술스택:\s*/i, "")
    .replace(/^선택 프로필 .+? 희망 직무:\s*/i, "")
    .replace(/^선택 프로필 .+? 요약:\s*/i, "")
    .replace(/^선택 프로필 .+? 프로젝트:\s*/i, "")
    .replace(/^선택 프로필 .+? 프로젝트명:\s*/i, "")
    .replace(/^선택 프로필 .+? 프로젝트 역할:\s*/i, "")
    .replace(/^선택 프로필 .+? 프로젝트 성과:\s*/i, "")
    .replace(/^(사용자 입력|기존 자소서|참고자료|채용공고|GitHub 저장소 [^:]+ (?:설명|README 요약|사용 언어|최근 업데이트)|GitHub 프로필 소개)\s*:\s*/i, "")
    .replace(/^GitHub 저장소 ([^ ]+) 메타데이터가 확인됐습니다\.$/, "$1 저장소")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
}

function buildResultSentence(resultText: string) {
  if (/[.!?。]$/.test(resultText) || /다$/.test(resultText)) {
    return `확인 가능한 결과로 ${ensureSentence(resultText)}`;
  }

  return `확인 가능한 결과는 ${resultText}입니다.`;
}

function buildRoleSentence(roleText: string) {
  if (looksLikeSentence(roleText)) {
    return `이 프로젝트에서 저는 ${ensureSentence(roleText)}`;
  }

  return `이 프로젝트에서 저는 ${roleText} 역할을 맡았습니다.`;
}

function buildActionSentence(actionText: string) {
  if (looksLikeSentence(actionText)) {
    return `이를 해결하기 위해 ${ensureSentence(actionText)}`;
  }

  return `이를 해결하기 위해 ${actionText} 과정을 실행했습니다.`;
}

function buildLearningSentence(learningText: string) {
  if (looksLikeSentence(learningText)) {
    return `이 과정에서 ${ensureSentence(learningText)}`;
  }

  return `이 과정에서 ${learningText}을 배웠습니다.`;
}

function looksLikeSentence(text: string) {
  return /[.!?。]$/.test(text) || /(다|습니다|했다|했습니다)$/.test(text);
}

function ensureSentence(text: string) {
  return /[.!?。]$/.test(text) ? text : `${text}.`;
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
