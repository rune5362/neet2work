import type {
  CareerDocumentAnalysis,
  CareerDocumentWorkflowTarget,
  CareerEvidenceSourceType,
  CareerEvidenceVaultItem,
  CareerGapAnswer,
  CareerGithubAnalysis,
  CareerPortfolioAnalysis,
  EvidenceConfidence,
  PrivacyRiskLevel
} from "../../types/career-document-workflow.js";

const URL_PATTERN = /https?:\/\/[^\s)>\]]+/gi;
const COMMAND_WORD_PATTERN = /(?:분석|초안|작성|써줘|써\s*줘|맞춰|부탁|해주세요|해\s*주세요)/g;

export class EvidenceVaultService {
  build(input: {
    message: string;
    target: CareerDocumentWorkflowTarget;
    documentAnalyses: CareerDocumentAnalysis[];
    githubAnalyses: CareerGithubAnalysis[];
    portfolioAnalyses: CareerPortfolioAnalysis[];
    answers?: CareerGapAnswer[];
  }): CareerEvidenceVaultItem[] {
    const items: CareerEvidenceVaultItem[] = [];
    const userMessageFact = normalizeUserMessageFact(input.message);

    if (userMessageFact) {
      items.push(
        createEvidence({
          index: items.length,
          sourceId: "user-message",
          sourceType: "user_input",
          fact: userMessageFact,
          confidence: "high",
          allowedInDraft: true,
          needsUserConfirmation: false,
          target: input.target
        })
      );
    }

    if (input.target.jobPostingText?.trim()) {
      items.push(
        createEvidence({
          index: items.length,
          sourceId: "target-job-posting",
          sourceType: "job_posting",
          fact: summarizeFact("채용공고", input.target.jobPostingText),
          confidence: "medium",
          allowedInDraft: true,
          needsUserConfirmation: false,
          target: input.target
        })
      );
    }

    for (const analysis of input.documentAnalyses) {
      items.push(...this.documentEvidence(analysis, input.target, items.length));
    }

    for (const analysis of input.githubAnalyses) {
      for (const fact of analysis.facts) {
        items.push(
          createEvidence({
            index: items.length,
            sourceId: fact.sourceId,
            sourceType: fact.sourceType,
            fact: fact.fact,
            confidence: "medium",
            allowedInDraft: true,
            needsUserConfirmation: githubFactNeedsUserConfirmation(fact.sourceType),
            target: input.target
          })
        );
      }
    }

    for (const analysis of input.portfolioAnalyses) {
      for (const fact of analysis.facts) {
        items.push(
          createEvidence({
            index: items.length,
            sourceId: fact.sourceId,
            sourceType: fact.sourceType,
            fact: fact.fact,
            confidence: "medium",
            allowedInDraft: true,
            needsUserConfirmation: portfolioFactNeedsUserConfirmation(fact.fact),
            target: input.target
          })
        );
      }
    }

    for (const answer of input.answers ?? []) {
      items.push(
        createEvidence({
          index: items.length,
          sourceId: `answer-${answer.questionId}`,
          sourceType: "interview_answer",
          fact: answer.answer.trim(),
          confidence: "high",
          allowedInDraft: true,
          needsUserConfirmation: false,
          target: input.target,
          extraSlots: answer.slot ? [answer.slot] : undefined
        })
      );
    }

    return items.filter((item) => item.privacyRisk !== "high" || !item.allowedInDraft);
  }

  private documentEvidence(
    analysis: CareerDocumentAnalysis,
    target: CareerDocumentWorkflowTarget,
    startIndex: number
  ): CareerEvidenceVaultItem[] {
    const items: CareerEvidenceVaultItem[] = [];
    const baseIndex = () => startIndex + items.length;

    if (analysis.classification === "self_intro_template") {
      for (const question of analysis.template?.questions ?? []) {
        items.push(
          createEvidence({
            index: baseIndex(),
            sourceId: analysis.sourceId,
            sourceType: "self_intro_template",
            fact: `자소서 문항: ${question.text}`,
            confidence: "medium",
            allowedInDraft: true,
            needsUserConfirmation: false,
            target,
            targetSlotsOverride: []
          })
        );
      }

      for (const rule of analysis.template?.writingRules ?? []) {
        items.push(
          createEvidence({
            index: baseIndex(),
            sourceId: analysis.sourceId,
            sourceType: "self_intro_template",
            fact: `작성 규칙: ${rule}`,
            confidence: "medium",
          allowedInDraft: true,
          needsUserConfirmation: false,
          target,
          targetSlotsOverride: []
        })
      );
      }

      return items;
    }

    if (analysis.classification === "job_posting") {
      return [
        createEvidence({
          index: startIndex,
          sourceId: analysis.sourceId,
          sourceType: "job_posting",
          fact: summarizeFact("채용공고", analysis.extractedText),
          confidence: "medium",
          allowedInDraft: true,
          needsUserConfirmation: false,
          target
        })
      ];
    }

    if (analysis.classification === "existing_self_intro") {
      return [
        createEvidence({
          index: startIndex,
          sourceId: analysis.sourceId,
          sourceType: "existing_self_intro",
          fact: summarizeFact("기존 자소서", analysis.extractedText),
          confidence: "medium",
          allowedInDraft: false,
          needsUserConfirmation: true,
          target
        })
      ];
    }

    return [
      createEvidence({
        index: startIndex,
        sourceId: analysis.sourceId,
        sourceType: "reference_material",
        fact: summarizeFact("참고자료", analysis.extractedText),
        confidence: "medium",
        allowedInDraft: true,
        needsUserConfirmation: true,
        target
      })
    ];
  }
}

function normalizeUserMessageFact(message: string) {
  const cleaned = message
    .replace(URL_PATTERN, " ")
    .replace(COMMAND_WORD_PATTERN, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length < 8) {
    return "";
  }

  return `사용자 입력: ${cleaned.slice(0, 500)}`;
}

function summarizeFact(prefix: string, text: string) {
  const summary = text.replace(/\s+/g, " ").trim().slice(0, 500);
  return `${prefix}: ${summary}`;
}

function githubFactNeedsUserConfirmation(sourceType: CareerEvidenceSourceType) {
  return sourceType === "github_profile";
}

function portfolioFactNeedsUserConfirmation(fact: string) {
  return !/^포트폴리오 (?:제목|기술스택):/.test(fact);
}

function createEvidence(input: {
  index: number;
  sourceId: string;
  sourceType: CareerEvidenceSourceType;
  fact: string;
  confidence: EvidenceConfidence;
  allowedInDraft: boolean;
  needsUserConfirmation: boolean;
  target: CareerDocumentWorkflowTarget;
  extraSlots?: string[];
  targetSlotsOverride?: string[];
}): CareerEvidenceVaultItem {
  const privacyRisk = detectPrivacyRisk(input.fact);
  const targetSlots = input.targetSlotsOverride ?? unique([...detectTargetSlots(input.fact, input.target), ...(input.extraSlots ?? [])]);
  const blocksSensitiveDraftUse = privacyRisk === "high";

  return {
    evidenceId: `ev-${input.index + 1}`,
    sourceId: input.sourceId,
    sourceType: input.sourceType,
    fact: input.fact,
    confidence: input.confidence,
    allowedInDraft: input.allowedInDraft && !blocksSensitiveDraftUse,
    privacyRisk,
    needsUserConfirmation: input.needsUserConfirmation,
    targetSlots
  };
}

function detectTargetSlots(text: string, target: CareerDocumentWorkflowTarget) {
  const slots = new Set<string>();
  const lower = text.toLowerCase();

  if (target.role?.trim() || /백엔드|프론트엔드|풀스택|개발자|engineer|developer|직무|지원/.test(text)) {
    slots.add("target_role");
  }
  if (/프로젝트|서비스|시스템|앱|웹|저장소|repository|repo|README|mvp/i.test(text)) {
    slots.add("project_name");
  }
  if (/문제|오류|장애|불편|개선|과제|도전|이슈/.test(text)) {
    slots.add("problem_context");
  }
  if (/맡|담당|역할|기여|직접|주도/.test(text)) {
    slots.add("user_role");
  }
  if (/구현|연동|수정|개선|분석|설계|검증|테스트|배포|정리|분리|자동화|fetch|api/i.test(text)) {
    slots.add("actions");
  }
  if (/기술|선택|이유|도입|아키텍처|구조|React|Node|TypeScript|JavaScript|Python|PostgreSQL|Prisma|Express|API|SQL/i.test(text)) {
    slots.add("technical_choice");
  }
  if (/결과|성과|달성|해결|증가|감소|개선|피드백|완료|운영|\d+\s*(명|개|건|%|퍼센트)/.test(text)) {
    slots.add("result");
  }
  if (/배운|학습|성장|느꼈|회고|다음에는|개선점/.test(text)) {
    slots.add("learning");
  }
  if (target.company?.trim() || target.jobPostingText?.trim() || /회사|기업|공고|자격요건|우대사항|문화|미션/.test(text)) {
    slots.add("company_fit");
  }
  if (/React|Node|TypeScript|JavaScript|Python|PostgreSQL|Prisma|Express|API|SQL/i.test(lower)) {
    slots.add("skills");
  }

  return Array.from(slots);
}

function detectPrivacyRisk(text: string): PrivacyRiskLevel {
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\d{2,3}-\d{3,4}-\d{4}|주민등록|여권번호/i.test(text)) {
    return "high";
  }
  if (/생년월일|주소|계좌|연봉|급여/.test(text)) {
    return "medium";
  }
  if (/학교명|나이|성별|사진|출신|고향|종교|결혼/.test(text)) {
    return "low";
  }
  return "none";
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export const evidenceVaultService = new EvidenceVaultService();
