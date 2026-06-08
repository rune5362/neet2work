import type {
  CareerDocumentAnalysis,
  CareerDocumentAttachmentInput,
  CareerDocumentClassification,
  CareerDocumentQuestion
} from "../../types/career-document-workflow.js";

const QUESTION_MARKERS = [
  /지원\s*동기/,
  /직무\s*역량/,
  /입사\s*후\s*포부/,
  /성장\s*과정/,
  /협업|팀워크|갈등/,
  /문제\s*해결|개선|도전/,
  /경험을\s*(?:구체적으로\s*)?(?:작성|서술|기술|설명)/,
  /작성\s*(?:해\s*)?(?:주세요|주십시오|하시오)/,
  /문항|항목|질문/
];

const WRITING_RULE_MARKERS = [
  /글자\s*수|자\s*(?:이내|내외|제한)|byte|바이트/i,
  /공백\s*(?:포함|제외)/,
  /소\s*제\s*목|두괄식|STAR|문단/,
  /블라인드|학교명|나이|성별|사진|출신|개인정보|언급\s*금지/,
  /제출\s*(?:형식|파일|방법)|PDF|DOCX|텍스트|plain text/i
];

const PROJECT_REFERENCE_MARKERS = [
  /README/i,
  /프로젝트\s*소개|서비스\s*소개|주요\s*기능/,
  /기술\s*스택|Tech\s*Stack|Architecture|아키텍처/i,
  /저장소|repository|repo/i,
  /설치|실행|개발\s*환경|폴더\s*구조/,
  /API|DB|R2|Mock[- ]?first|MVP/i,
  /workflow|워크플로우/i
];

export class DocumentAnalysisService {
  analyze(attachments: CareerDocumentAttachmentInput[] = []): CareerDocumentAnalysis[] {
    return attachments.map((attachment, index) => {
      const sourceId = attachment.sourceId?.trim() || `attachment-${index + 1}`;
      const extractedText = normalizeText(attachment.text);
      const classification = classifyDocument(attachment.fileName, extractedText);
      const questions =
        classification === "self_intro_template"
          ? extractTemplateQuestions(extractedText, sourceId)
          : [];
      const writingRules =
        classification === "self_intro_template"
          ? extractWritingRules(extractedText)
          : [];

      return {
        sourceId,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        classification,
        classificationReason: explainClassification(classification),
        extractedText,
        template:
          classification === "self_intro_template"
            ? {
                questions,
                writingRules,
                submissionFormat: inferSubmissionFormat(extractedText)
              }
            : undefined,
        summary: summarizeDocument(extractedText, classification, questions.length)
      };
    });
  }
}

function normalizeText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function classifyDocument(fileName: string, text: string): CareerDocumentClassification {
  const lowerFileName = fileName.toLowerCase();
  const questionScore = QUESTION_MARKERS.filter((marker) => marker.test(text)).length;
  const ruleScore = WRITING_RULE_MARKERS.filter((marker) => marker.test(text)).length;
  const projectReferenceScore = PROJECT_REFERENCE_MARKERS.filter((marker) => marker.test(text)).length;
  const explicitTemplateFileName = isExplicitTemplateFileName(lowerFileName);

  if (/채용|공고|job[-_ ]?posting|recruit/i.test(lowerFileName) || /담당\s*업무|자격\s*요건|우대\s*사항|전형\s*절차/.test(text)) {
    return "job_posting";
  }

  if (explicitTemplateFileName) {
    return "self_intro_template";
  }

  if (isReadmeLikeFile(lowerFileName) || projectReferenceScore >= 3) {
    return "reference_material";
  }

  if (questionScore >= 2 || (questionScore >= 1 && ruleScore >= 1)) {
    return "self_intro_template";
  }

  if (/자소서|자기소개서|cover[-_ ]?letter/i.test(lowerFileName) || /저는|제가|지원하게\s*된|입사\s*후/.test(text)) {
    return "existing_self_intro";
  }

  return "reference_material";
}

function isExplicitTemplateFileName(lowerFileName: string) {
  return (
    /문항/.test(lowerFileName) ||
    /(?:자소서|자기소개서|self[-_ ]?intro|cover[-_ ]?letter).*(?:양식|폼|template)/i.test(lowerFileName) ||
    /(?:양식|폼|template).*(?:자소서|자기소개서|self[-_ ]?intro|cover[-_ ]?letter)/i.test(lowerFileName)
  );
}

function isReadmeLikeFile(lowerFileName: string) {
  const baseName = lowerFileName.split(/[\\/]/).pop() ?? lowerFileName;
  return /^readme(?:\.[a-z0-9]+)?$/i.test(baseName) || /(^|[-_.\s])readme([-_.\s]|$)/i.test(baseName);
}

function explainClassification(classification: CareerDocumentClassification) {
  switch (classification) {
    case "self_intro_template":
      return "문항, 작성 조건, 글자수 제한 신호가 감지됐습니다.";
    case "existing_self_intro":
      return "완성된 자기소개서 문장 또는 기존 작성본 신호가 감지됐습니다.";
    case "job_posting":
      return "담당 업무, 자격 요건, 우대 사항 등 채용공고 신호가 감지됐습니다.";
    case "reference_material":
      return "양식이나 공고로 확정하기 어려운 참고자료로 분류했습니다.";
  }
}

function summarizeDocument(text: string, classification: CareerDocumentClassification, questionCount: number) {
  const firstLine = text
    .split(/\n+/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  const prefix =
    classification === "self_intro_template" && questionCount > 0
      ? `문항 ${questionCount}개를 추출했습니다.`
      : classification === "existing_self_intro"
        ? "기존 자기소개서의 구성과 문체를 참고합니다."
      : "텍스트를 추출했습니다.";

  return [prefix, firstLine?.slice(0, 100)].filter(Boolean).join(" ");
}

export function extractTemplateQuestions(text: string, sourceId = "template"): CareerDocumentQuestion[] {
  const blocks = splitQuestionBlocks(text);
  const candidates = blocks.filter((block) => looksLikeQuestion(block));
  const questionBlocks = candidates.length > 0 ? candidates : looksLikeQuestion(text) ? [text] : [];

  return questionBlocks.slice(0, 10).map((block, index) => {
    const cleanText = cleanupQuestionText(block);
    const intent = inferIntent(cleanText);
    return {
      questionId: `${sourceId}-q${index + 1}`,
      text: cleanText,
      charLimit: extractCharLimit(block) ?? extractCharLimit(text),
      charCountRule: inferCharCountRule(block) ?? inferCharCountRule(text) ?? "unknown",
      intent,
      requiredSlots: requiredSlotsForIntent(intent),
      writingRules: extractWritingRules(block)
    };
  });
}

function splitQuestionBlocks(text: string) {
  const normalized = text.replace(/\n(?=\s*(?:\d+|[Qq])[).:-])\s*/g, "\n@@QUESTION@@");
  const splitByMarker = normalized
    .split(/@@QUESTION@@/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 5);

  if (splitByMarker.length > 1) {
    return splitByMarker;
  }

  return text
    .split(/\n{1,2}/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 5);
}

function cleanupQuestionText(text: string) {
  return text
    .replace(/^\s*(?:문항|항목|질문|Q)?\s*\d{0,2}\s*[).:-]?\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeQuestion(text: string) {
  return QUESTION_MARKERS.some((marker) => marker.test(text)) || /[?？]/.test(text);
}

function extractCharLimit(text: string) {
  const match = text.match(/(\d{2,4})\s*(?:자|글자|byte|바이트)\s*(?:이내|내외|제한)?/i);
  if (!match) {
    return undefined;
  }

  const value = Number(match[1]);
  return Number.isFinite(value) ? value : undefined;
}

function inferCharCountRule(text: string) {
  if (/공백\s*제외/.test(text)) {
    return "without_spaces" as const;
  }

  if (/공백\s*포함/.test(text)) {
    return "with_spaces" as const;
  }

  return undefined;
}

export function inferIntent(text: string) {
  if (/지원\s*동기|입사\s*후|포부|회사/.test(text)) {
    return "company_fit";
  }
  if (/협업|팀워크|갈등|소통/.test(text)) {
    return "collaboration";
  }
  if (/문제|해결|개선|오류|장애|도전/.test(text)) {
    return "problem_solving";
  }
  if (/직무|역량|프로젝트|경험|기술/.test(text)) {
    return "role_competency";
  }
  return "self_intro";
}

export function requiredSlotsForIntent(intent: string) {
  switch (intent) {
    case "company_fit":
      return ["target_role", "company_fit", "user_role", "learning"];
    case "collaboration":
      return ["project_name", "problem_context", "user_role", "actions", "result", "learning"];
    case "problem_solving":
      return ["project_name", "problem_context", "user_role", "actions", "technical_choice", "result"];
    case "role_competency":
      return ["target_role", "project_name", "user_role", "actions", "technical_choice", "result"];
    default:
      return ["target_role", "project_name", "user_role", "actions", "learning"];
  }
}

function extractWritingRules(text: string) {
  return text
    .split(/\n+|(?<=[.!?。！？])\s+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && WRITING_RULE_MARKERS.some((marker) => marker.test(line)))
    .slice(0, 12);
}

function inferSubmissionFormat(text: string) {
  if (/PDF/i.test(text)) {
    return "PDF";
  }
  if (/DOCX|Word|워드/i.test(text)) {
    return "DOCX";
  }
  if (/TXT|텍스트|plain text/i.test(text)) {
    return "TEXT";
  }
  return undefined;
}

export const documentAnalysisService = new DocumentAnalysisService();
