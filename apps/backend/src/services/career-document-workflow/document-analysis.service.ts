import type {
  CareerDocumentAnalysis,
  CareerDocumentAttachmentInput,
  CareerDocumentClassification,
  CareerDocumentQuestion,
  CareerDocumentTemplateSection,
  CareerDocumentTemplateSectionKind
} from "../../types/career-document-workflow.js";

const QUESTION_MARKERS = [
  /자기\s*소개/,
  /성격\s*소개/,
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

const TEMPLATE_SECTION_LABELS: Record<CareerDocumentTemplateSectionKind, string> = {
  resume: "이력서",
  self_intro: "자기소개서",
  skills: "기술스택",
  portfolio: "포트폴리오",
  common_rules: "공통 작성 규칙"
};

export class DocumentAnalysisService {
  analyze(attachments: CareerDocumentAttachmentInput[] = []): CareerDocumentAnalysis[] {
    return attachments.map((attachment, index) => {
      const sourceId = attachment.sourceId?.trim() || `attachment-${index + 1}`;
      const extractedText = normalizeText(attachment.text);
      const classification = classifyDocument(attachment.fileName, extractedText);
      const sections =
        classification === "self_intro_template"
          ? extractTemplateSections(extractedText, sourceId)
          : [];
      const layoutRules =
        classification === "self_intro_template"
          ? extractLayoutRules(extractedText)
          : [];
      const questions =
        classification === "self_intro_template"
          ? extractTemplateQuestions(extractedText, sourceId, [
              ...layoutRules,
              ...buildTemplateSectionRules(sections)
            ])
          : [];
      const writingRules =
        classification === "self_intro_template"
          ? unique([
              ...extractWritingRules(extractedText),
              ...layoutRules,
              ...buildTemplateSectionRules(sections)
            ])
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
                layoutRules,
                sections,
                submissionFormat: inferSubmissionFormat(extractedText)
              }
            : undefined,
        summary: summarizeDocument(extractedText, classification, questions.length, sections)
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

function summarizeDocument(
  text: string,
  classification: CareerDocumentClassification,
  questionCount: number,
  sections: CareerDocumentTemplateSection[] = []
) {
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
  const sectionSummary = sections.length > 0
    ? `감지 섹션: ${unique(sections.map((section) => TEMPLATE_SECTION_LABELS[section.kind])).join(", ")}.`
    : "";

  return [prefix, sectionSummary, firstLine?.slice(0, 100)].filter(Boolean).join(" ");
}

export function extractTemplateQuestions(
  text: string,
  sourceId = "template",
  globalWritingRules: string[] = []
): CareerDocumentQuestion[] {
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
      writingRules: unique([...extractWritingRules(block), ...globalWritingRules])
    };
  });
}

function extractTemplateSections(text: string, sourceId: string): CareerDocumentTemplateSection[] {
  const sections: CareerDocumentTemplateSection[] = [];
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  let current: CareerDocumentTemplateSection | null = null;

  const flushCurrent = () => {
    const sectionToFlush = current;
    if (sectionToFlush && !sections.some((section) => section.kind === sectionToFlush.kind && section.title === sectionToFlush.title)) {
      sections.push({
        ...sectionToFlush,
        requirements: unique(sectionToFlush.requirements).slice(0, 8)
      });
    }
    current = null;
  };

  for (const line of lines) {
    const title = cleanupSectionTitle(line);
    const kind = inferTemplateSectionKind(title);

    if (kind && looksLikeSectionHeading(line, title)) {
      flushCurrent();
      current = {
        sectionId: `${sourceId}-section-${sections.length + 1}`,
        kind,
        title,
        order: sections.length,
        requirements: []
      };
      continue;
    }

    if (current) {
      const requirement = cleanupRequirementLine(line);
      if (requirement && requirement !== current.title) {
        current.requirements.push(requirement);
      }
    }
  }

  flushCurrent();

  const detectedKinds = new Set(sections.map((section) => section.kind));
  for (const kind of inferTemplateSectionKindsFromText(text)) {
    if (!detectedKinds.has(kind)) {
      sections.push({
        sectionId: `${sourceId}-section-${sections.length + 1}`,
        kind,
        title: TEMPLATE_SECTION_LABELS[kind],
        order: sections.length,
        requirements: collectKindRequirements(text, kind)
      });
    }
  }

  return sections.slice(0, 20);
}

function extractLayoutRules(text: string) {
  const rules: string[] = [
    "1페이지 목표는 글자를 빽빽하게 채우는 것이 아니라, 첨부 양식의 표/칸/항목이 자연스럽게 차는 시각적 밀도를 맞추는 것입니다."
  ];

  if (/표|셀|칸|레이아웃|layout|DOCX|Word|워드/i.test(text)) {
    rules.push("첨부 문서에 표, 칸, 좌측 라벨, 항목 순서가 있으면 그 구조와 순서를 우선하고 각 칸에는 소제목 1줄과 적정 문단을 배치합니다.");
  }

  if (/1\s*페이지|한\s*페이지|one[- ]?page|1\s*page|페이지\s*목표/i.test(text)) {
    rules.push("한 페이지 분량은 빈칸이 과하게 남지 않고 2페이지로 밀리지 않는 균형을 뜻하며, 과밀한 장문으로 채우지 않습니다.");
  }

  if (/소\s*제\s*목|헤드라인|제목/.test(text)) {
    rules.push("항목별 소제목 또는 헤드라인 요구가 있으면 본문 첫 줄에 짧은 제목을 두고 이어서 근거 기반 본문을 작성합니다.");
  }

  return unique(rules);
}

function buildTemplateSectionRules(sections: CareerDocumentTemplateSection[]) {
  return sections.map((section) => {
    const requirements = section.requirements.length > 0
      ? ` 요구사항: ${section.requirements.join(" / ")}`
      : "";
    return `첨부 복합 양식 섹션: ${TEMPLATE_SECTION_LABELS[section.kind]} "${section.title}"를 별도 작성 대상으로 보고 채웁니다.${requirements}`;
  });
}

function splitQuestionBlocks(text: string) {
  const normalized = text.replace(/\n(?=\s*(?:\d+|[Qq])[).:-])\s*/g, "\n@@QUESTION@@");
  const splitByMarker = normalized
    .split(/@@QUESTION@@/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 5);

  if (splitByMarker.length > 1) {
    const numberedBlocks = splitByMarker.filter((part) => /^\s*(?:(?:문항|항목|질문)\s*)?\d{1,2}\s*[).:-]/i.test(part));
    return numberedBlocks.length > 0 ? numberedBlocks : splitByMarker;
  }

  return text
    .split(/\n{1,2}/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 5);
}

function cleanupQuestionText(text: string) {
  const firstLine = text
    .split(/\n+/)
    .map((line) => line.trim())
    .find((line) => line.length > 0) ?? text;

  return firstLine
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

function cleanupSectionTitle(line: string) {
  return line
    .replace(/^\s*(?:[#>*-]+|\[)/, "")
    .replace(/\]\s*$/, "")
    .replace(/^\s*(?:문항|항목|질문|Q)?\s*\d{0,2}\s*[).:-]?\s*/i, "")
    .replace(/[:：]\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeSectionHeading(line: string, title: string) {
  if (title.length < 2 || title.length > 80) {
    return false;
  }

  return (
    /^\s*(?:#{1,4}|\[|(?:\d{1,2}|[A-Za-z])\s*[).:-])/.test(line) ||
    /[:：]\s*$/.test(line) ||
    /^[가-힣A-Za-z ()/_-]{2,40}$/.test(title)
  );
}

function cleanupRequirementLine(line: string) {
  const cleaned = line
    .replace(/^\s*(?:[-*•]|\d{1,2}[).])\s*/, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.length >= 3 ? cleaned : "";
}

function inferTemplateSectionKind(text: string): CareerDocumentTemplateSectionKind | null {
  if (/공통|작성\s*규칙|유의\s*사항|주의\s*사항|제출\s*(?:형식|방법|규칙)/i.test(text)) {
    return "common_rules";
  }
  if (/기술\s*스택|보유\s*기술|개발\s*환경|skills?|tech\s*stack/i.test(text)) {
    return "skills";
  }
  if (/포트폴리오|프로젝트\s*(?:카드|목록|소개|경험)|portfolio|project\s*(?:card|summary)/i.test(text)) {
    return "portfolio";
  }
  if (/이력서|경력\s*사항|학력|자격증|희망\s*직무|resume|cv/i.test(text)) {
    return "resume";
  }
  if (/자기\s*소개서|자소서|self[- ]?introduction|자기\s*소개|성장\s*과정|성격\s*소개|직무\s*역량|지원\s*동기|입사\s*후|포부/i.test(text)) {
    return "self_intro";
  }
  return null;
}

function inferTemplateSectionKindsFromText(text: string) {
  const kinds: CareerDocumentTemplateSectionKind[] = [];
  const signals: Array<[CareerDocumentTemplateSectionKind, RegExp]> = [
    ["resume", /이력서|경력\s*사항|학력|자격증|희망\s*직무|resume|cv/i],
    ["self_intro", /자기\s*소개서|자소서|self[- ]?introduction|자기\s*소개|성장\s*과정|성격\s*소개|직무\s*역량|지원\s*동기|포부/i],
    ["skills", /기술\s*스택|보유\s*기술|개발\s*환경|skills?|tech\s*stack/i],
    ["portfolio", /포트폴리오|프로젝트\s*(?:카드|목록|소개)|portfolio|project\s*(?:card|summary)/i],
    ["common_rules", /공통|작성\s*규칙|유의\s*사항|제출\s*(?:형식|방법|규칙)/i]
  ];

  for (const [kind, pattern] of signals) {
    if (pattern.test(text)) {
      kinds.push(kind);
    }
  }

  return kinds;
}

function collectKindRequirements(text: string, kind: CareerDocumentTemplateSectionKind) {
  const markers: Record<CareerDocumentTemplateSectionKind, RegExp> = {
    resume: /이력서|경력|학력|자격증|희망\s*직무|resume|cv/i,
    self_intro: /자기\s*소개|성장\s*과정|성격\s*소개|직무\s*역량|지원\s*동기|포부|자소서/i,
    skills: /기술|스택|skill|tech/i,
    portfolio: /포트폴리오|프로젝트|portfolio|project/i,
    common_rules: /공통|작성\s*규칙|유의|제출|페이지|분량|문단|소\s*제\s*목/i
  };

  return text
    .split(/\n+/)
    .map((line) => cleanupRequirementLine(line))
    .filter((line) => line.length > 0 && markers[kind].test(line))
    .slice(0, 6);
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

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter((value) => value.length > 0)));
}

export const documentAnalysisService = new DocumentAnalysisService();
