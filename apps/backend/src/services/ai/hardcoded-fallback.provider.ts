import type {
  AiExecutionMeta,
  AiProvider,
  AiProviderExecuteInput,
  AiProviderExecuteResult,
  AiProviderStatus,
  AiWorkflowOperation
} from "../../types/ai-routing.js";
import type {
  DraftTarget,
  DraftWorkflowDraft,
  DraftWorkflowPlan,
  GapAnswer,
  MaterialStore
} from "../../types/draft-workflow.js";
import {
  countChars,
  defaultDocumentFormatting,
  extractExperienceText,
  fallbackSeedContent,
  inferBlindRiskFlags,
  inferSkills
} from "../draft-workflow/fallback-content.js";

type FallbackPlanPayload = {
  target: DraftTarget;
  experienceInput: {
    portfolioText?: string;
    manualExperienceText?: string;
    additionalContext?: string;
    referenceSelfIntroText?: string;
  };
};

type FallbackDraftPayload = FallbackPlanPayload & {
  plan: DraftWorkflowPlan;
  gapAnswers?: GapAnswer[];
};

function createAiMeta(usedFallback = true): AiExecutionMeta {
  return {
    providerId: "fallback",
    modelId: "hardcoded-demo",
    routingMode: "auto",
    usedFallback,
    fallbackReason: usedFallback ? "all_providers_unavailable" : undefined
  };
}

function compactText(text: string, limit = 240) {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length > limit ? `${normalized.slice(0, limit).trimEnd()}...` : normalized;
}

function inferSectionName(target: DraftTarget) {
  if (target.sectionName?.trim()) {
    return target.sectionName.trim();
  }

  if (/성장\s*과정|성장과정/.test(target.questionText)) return "성장과정";
  if (/성격|장점|단점/.test(target.questionText)) return "성격소개";
  if (/직무\s*역량|역량|기술/.test(target.questionText)) return "직무역량";
  if (/지원\s*동기|포부|입사\s*후/.test(target.questionText)) return "지원동기 및 포부";
  return "자기소개";
}

function extractRequirementLines(text?: string) {
  return (text ?? "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\s*ㆍ•-]+/, "").trim())
    .filter((line) => line.length >= 4)
    .slice(0, 8);
}

function inferReferenceRules(referenceText?: string) {
  if (!referenceText?.trim()) {
    return [];
  }

  const rules = [];
  if (/두괄|결론|소\s*제\s*목/.test(referenceText)) {
    rules.push("두괄식으로 문단의 결론을 먼저 제시합니다.");
  }
  if (/구체|경험|근거/.test(referenceText)) {
    rules.push("주장마다 구체 경험과 검증 가능한 근거를 붙입니다.");
  }
  if (/직무|역량|기술/.test(referenceText)) {
    rules.push("경험을 지원 직무에서 발휘할 수 있는 역량으로 연결합니다.");
  }
  return rules;
}

function inferCoreStrengths(text: string) {
  const strengths = [];
  if (/AI|인공지능|프롬프트|prompt/i.test(text)) strengths.push("AI 활용");
  if (/자동화|반복/.test(text)) strengths.push("자동화");
  if (/아키텍처|구조|설계/.test(text)) strengths.push("로직/아키텍처 설계");
  if (/실행|구현|만들/.test(text)) strengths.push("빠른 실행과 검증");
  return strengths.length > 0 ? strengths : ["문제 정의", "실행", "직무 경험 정리"];
}

function isMotivationQuestion(target: DraftTarget) {
  return /지원\s*동기|포부|입사\s*후|회사/.test(target.questionText);
}

function hasSpecificCompanyContext(text: string) {
  const normalized = text.trim();
  if (normalized.length < 80) return false;
  return /서비스|제품|사업|고객|시장|문화|비전|기술|문제|도메인|프로덕트/.test(normalized);
}

function buildMaterialStore(payload: FallbackPlanPayload, card: ReturnType<typeof buildExperienceCard>): MaterialStore {
  const sectionName = inferSectionName(payload.target);
  const requirementLines = extractRequirementLines(payload.target.requirementSourceText);
  const referenceRules = inferReferenceRules(payload.experienceInput.referenceSelfIntroText);
  const experienceText = extractExperienceText(payload.experienceInput);
  const requirements: MaterialStore["requirements"] = [];

  requirementLines.forEach((line, index) => {
    requirements.push({
      requirementId: `attached-requirement-${index + 1}`,
      source: "attached_document",
      text: compactText(line),
      priority: "critical",
      appliesTo: [sectionName]
    });
  });

  if (requirements.length === 0 && referenceRules.length > 0) {
    referenceRules.forEach((rule, index) => {
      requirements.push({
        requirementId: `reference-rule-${index + 1}`,
        source: "reference",
        text: rule,
        priority: "medium",
        appliesTo: [sectionName]
      });
    });
  }

  requirements.push({
    requirementId: "job-posting-fit-1",
    source: "job_posting",
    text: compactText(payload.target.jobPostingText),
    priority: payload.target.requirementSourceText?.trim() ? "medium" : "high",
    appliesTo: [sectionName]
  });

  return {
    requirements,
    referenceRules,
    profile: {
      coreStrengths: inferCoreStrengths(`${experienceText}\n${payload.target.jobPostingText}`),
      tone: payload.target.writingStyle ?? "담백한 실무형",
      privateConstraints: /상품화|비공개|자세히 알려줄/.test(experienceText)
        ? ["상품화 예정이거나 비공개인 세부 로직은 공개하지 않습니다."]
        : []
    },
    experiences: [
      {
        experienceId: card.experienceId,
        facts: [
          compactText(card.problem ?? "문제 상황"),
          ...card.actions.map((item) => compactText(item.action)),
          ...card.outputs.map((item) => compactText(item))
        ].filter(Boolean),
        skills: card.skills,
        usableSections: [sectionName],
        privateConstraints: /상품화|비공개|자세히 알려줄/.test(experienceText)
          ? ["세부 구현 로직은 면접에서 공개 가능한 수준으로만 설명합니다."]
          : [],
        sourceEvidenceIds: card.evidenceItems.map((item) => item.evidenceId)
      }
    ],
    sectionPlan: [
      {
        sectionName,
        mainClaim: card.claimLedger.find((claim) => claim.allowedInDraft)?.text ?? "경험 기반 역량을 구체적으로 설명합니다.",
        evidenceIds: card.evidenceItems.map((item) => item.evidenceId),
        avoidRepeating: payload.target.previousDraftText ? inferCoreStrengths(payload.target.previousDraftText) : []
      }
    ],
    outputRules: defaultDocumentFormatting
  };
}

function buildExperienceCard(
  target: DraftTarget,
  experienceText: string,
  source: "portfolio" | "manual" | "conversation" | "fallback"
) {
  const skills = inferSkills(`${experienceText}\n${target.jobPostingText}`);
  const evidenceId = `${source}-evidence-1`;
  const claimId = `${source}-claim-1`;
  const blindRiskFlags = inferBlindRiskFlags(experienceText, target.blindRecruitment);

  return {
    experienceId: `${source}-experience-1`,
    source,
    title: source === "fallback" ? "데모 경험 카드" : "사용자 입력 경험",
    context: target.company,
    role: target.role,
    problem: "초기 문제 상황을 사용자 입력에서 추출해야 합니다.",
    actions: [
      {
        action: "핵심 문제를 정의하고 실행 계획을 재정리했습니다.",
        method: "일정 재정리 및 커뮤니케이션 강화",
        rationale: "진행 방향 불명확 문제를 해소하기 위함"
      }
    ],
    tools: skills.slice(0, 4),
    outputs: ["MVP 기능 우선순위", "사용자 인터뷰 인사이트"],
    results: [
      {
        type: "output" as const,
        description: "프로젝트 결과물과 사용자 반응을 정리했습니다.",
        verified: source !== "fallback"
      }
    ],
    skills,
    evidenceItems: [
      {
        evidenceId,
        type: source === "fallback" ? ("fallback_seed" as const) : ("user_statement" as const),
        content: experienceText.slice(0, 500) || fallbackSeedContent.draftText.slice(0, 200),
        confidence: source === "fallback" ? ("low" as const) : ("medium" as const)
      }
    ],
    claimLedger: [
      {
        claimId,
        text: "사용자가 제공한 경험을 중심으로 문제-행동-결과를 서술합니다.",
        supportedBy: [evidenceId],
        confidence: source === "fallback" ? ("low" as const) : ("medium" as const),
        allowedInDraft: source !== "fallback"
      },
      {
        claimId: `${source}-claim-demo`,
        text: "데모용 하드코딩 초안 문장은 실제 AI 결과가 아닙니다.",
        supportedBy: [evidenceId],
        confidence: "low" as const,
        allowedInDraft: false
      }
    ],
    missingSlots: experienceText.length < 80 ? ["result_metric", "personal_role"] : [],
    blindRiskFlags,
    interviewDefensibility: source === "fallback" ? ("low" as const) : ("medium" as const)
  };
}

function buildNeededQuestions(payload: FallbackPlanPayload, card: ReturnType<typeof buildExperienceCard>) {
  const questions = card.missingSlots.map((slot, index) => ({
    questionId: `gap-${index + 1}`,
    slot,
    priority: index + 1,
    question:
      slot === "result_metric"
        ? "이 경험에서 실제로 확인 가능한 결과는 무엇이었나요? 수치가 없다면 달라진 점을 한 문장으로 적어주세요."
        : "이 경험에서 본인이 직접 맡은 역할과 판단한 이유는 무엇이었나요?",
    choices:
      slot === "result_metric"
        ? ["속도/품질 개선", "사용자 반응", "팀 작업 효율"]
        : ["직접 구현", "구조 설계", "분석/검증"]
  }));

  if (isMotivationQuestion(payload.target) && !hasSpecificCompanyContext(payload.target.jobPostingText)) {
    questions.push({
      questionId: "company-fit-1",
      slot: "company_fit_evidence",
      priority: questions.length + 1,
      question: "지원 회사에서 끌린 구체적인 서비스, 기술, 문제 영역은 무엇인가요?",
      choices: ["서비스/제품", "기술 스택", "해결하는 문제"]
    });
  }

  return questions;
}

export function buildFallbackPlan(payload: FallbackPlanPayload): DraftWorkflowPlan {
  const experienceText = extractExperienceText(payload.experienceInput);
  const usingSeed = experienceText.length < 20;
  const cardSource = usingSeed ? "fallback" : experienceText.includes("\n") ? "portfolio" : "manual";
  const card = buildExperienceCard(payload.target, usingSeed ? fallbackSeedContent.draftText : experienceText, cardSource);
  const questionId = "question-1";
  const neededQuestions = buildNeededQuestions(payload, card);

  return {
    mode: "fallback",
    state: neededQuestions.length > 0 ? "GAP_INTERVIEWING" : "OUTLINE_READY",
    aiMeta: createAiMeta(),
    questionRubric: {
      intent: `${payload.target.questionText}에 답하기 위해 경험의 문제-행동-결과를 연결합니다.`,
      requiredEvidence: ["문제 상황", "본인 역할", "구체적 행동", "결과"],
      mustAvoid: payload.target.blindRecruitment
        ? ["학교명", "나이", "성별", "출신지역"]
        : ["근거 없는 수치", "과장된 성과"],
      blindRules: payload.target.blindRecruitment
        ? ["개인 신상 정보를 노출하지 않습니다."]
        : []
    },
    experienceCards: [card],
    fitAssessments: [
      {
        questionId,
        experienceId: card.experienceId,
        fitScore: usingSeed ? 52 : 78,
        recommendedUsage: "main",
        fitReasons: ["사용자 입력 경험이 문항 의도와 연결 가능합니다."],
        risks: usingSeed ? ["데모 fallback 데이터 기반"] : []
      }
    ],
    answerStrategy: {
      mainClaim: card.claimLedger.find((claim) => claim.allowedInDraft)?.text ?? card.claimLedger[0].text,
      narrativePattern: "STAR",
      primaryExperienceId: card.experienceId,
      questionBudget: payload.target.charLimit ?? 800,
      neededQuestions
    },
    materialStore: buildMaterialStore(payload, card),
    outline: [
      {
        paragraphId: "p1",
        purpose: "문제 상황과 역할 소개",
        plannedClaims: [card.claimLedger[0].claimId],
        targetChars: Math.round((payload.target.charLimit ?? 800) * 0.35)
      },
      {
        paragraphId: "p2",
        purpose: "행동과 방법",
        plannedClaims: [card.claimLedger[0].claimId],
        targetChars: Math.round((payload.target.charLimit ?? 800) * 0.4)
      },
      {
        paragraphId: "p3",
        purpose: "결과와 배운 점",
        plannedClaims: [card.claimLedger[0].claimId],
        targetChars: Math.round((payload.target.charLimit ?? 800) * 0.25)
      }
    ]
  };
}

function appendGapAnswers(baseText: string, gapAnswers?: FallbackDraftPayload["gapAnswers"]) {
  if (!gapAnswers?.length) {
    return baseText;
  }

  const additions = gapAnswers
    .map((item) => item.answer.trim())
    .filter(Boolean)
    .join("\n\n");

  if (!additions) {
    return baseText;
  }

  return `${baseText}\n\n${additions}`;
}

function applyCharLimit(text: string, target: DraftTarget) {
  if (!target.charLimit) {
    return text;
  }

  if (target.charCountRule === "without_spaces") {
    let count = 0;
    let end = text.length;
    for (let index = 0; index < text.length; index += 1) {
      if (!/\s/.test(text[index])) {
        count += 1;
      }
      if (count > target.charLimit) {
        end = index;
        break;
      }
    }
    return text.slice(0, end).trimEnd();
  }

  return text.length > target.charLimit ? text.slice(0, target.charLimit).trimEnd() : text;
}

export function buildFallbackDraft(payload: FallbackDraftPayload): DraftWorkflowDraft {
  const experienceText = extractExperienceText(payload.experienceInput);
  const usingSeed = experienceText.length < 20;
  const baseDraftText = usingSeed
    ? fallbackSeedContent.draftText
    : `${experienceText.trim()}\n\n위 경험을 바탕으로 ${payload.target.company} ${payload.target.role} 직무에 필요한 문제 해결 역량을 설명할 수 있습니다.`;
  const draftText = applyCharLimit(appendGapAnswers(baseDraftText, payload.gapAnswers), payload.target);

  const counts = countChars(draftText);
  const primaryCard = payload.plan.experienceCards[0];

  return {
    mode: "fallback",
    state: "REVIEW_COMPLETED",
    aiMeta: createAiMeta(),
    draftText,
    charCount: {
      ...counts,
      limit: payload.target.charLimit
    },
    evidenceMap: [
      {
        textRangeLabel: "전체 초안",
        claimIds: primaryCard.claimLedger.filter((claim) => claim.allowedInDraft).map((claim) => claim.claimId),
        experienceIds: [primaryCard.experienceId]
      }
    ],
    documentFormatting: defaultDocumentFormatting,
    reviewReport: {
      scores: {
        promptFit: usingSeed ? 62 : 74,
        jobFit: 70,
        specificity: usingSeed ? 55 : 72,
        evidenceSafety: usingSeed ? 58 : 76,
        koreanReadability: 80,
        aiLikenessRisk: usingSeed ? 68 : 42,
        blindRisk: payload.target.blindRecruitment ? 20 : 8,
        interviewDefensibility: usingSeed ? 48 : 70
      },
      issues: usingSeed
        ? [
            {
              type: "fallback_demo",
              severity: "high" as const,
              message: "현재 결과는 실제 AI가 아닌 데모 초안입니다.",
              suggestedQuestion: "실제 경험 텍스트를 더 입력해 주세요."
            }
          ]
        : [
            {
              type: "evidence_gap",
              severity: "medium" as const,
              message: "결과 수치가 확인되면 설득력이 더 높아집니다.",
              suggestedQuestion: "성과를 수치로 표현할 수 있나요?"
            }
          ],
      likelyInterviewQuestions: [
        "이 경험에서 가장 어려웠던 의사결정은 무엇이었나요?",
        "팀 내 갈등이나 리스크를 어떻게 관리했나요?"
      ],
      sensitiveWarnings: payload.target.blindRecruitment
        ? ["블라인드 채용 모드: 개인 신상 정보 노출을 피하세요."]
        : []
    },
    revisionOptions: fallbackSeedContent.rewriteGuides
  };
}

export class HardcodedFallbackProvider implements AiProvider {
  readonly id = "fallback" as const;
  readonly label = "Fallback Demo";

  async getStatus(): Promise<AiProviderStatus> {
    return {
      providerId: this.id,
      label: this.label,
      online: true,
      configured: true,
      quotaExceeded: false,
      models: [
        {
          modelId: "hardcoded-demo",
          label: "Demo Fallback",
          online: true,
          quotaExceeded: false,
          recommended: true
        }
      ]
    };
  }

  async execute<T>(input: AiProviderExecuteInput<unknown>): Promise<AiProviderExecuteResult<T>> {
    const startedAt = Date.now();
    const data = this.buildOperationResult(input.operation, input.payload) as T;
    return {
      data,
      modelId: "hardcoded-demo",
      latencyMs: Date.now() - startedAt
    };
  }

  private buildOperationResult(operation: AiWorkflowOperation, payload: unknown) {
    if (operation === "plan") {
      return buildFallbackPlan(payload as FallbackPlanPayload);
    }
    if (operation === "draft") {
      return buildFallbackDraft(payload as FallbackDraftPayload);
    }
    if (operation === "revise") {
      const revisePayload = payload as {
        target?: DraftTarget;
        draft: DraftWorkflowDraft;
        revisionRequest: string;
      };
      const revisedText = applyCharLimit(
        `${revisePayload.draft.draftText}\n\n[수정 요청 반영: ${revisePayload.revisionRequest}]`,
        revisePayload.target ?? {
          company: "",
          role: "",
          questionText: "",
          charCountRule: "with_spaces",
          jobPostingText: "",
          blindRecruitment: false,
          charLimit: revisePayload.draft.charCount.limit
        }
      );
      return {
        ...revisePayload.draft,
        draftText: revisedText,
        charCount: {
          ...countChars(revisedText),
          limit: revisePayload.draft.charCount.limit
        },
        documentFormatting: revisePayload.draft.documentFormatting ?? defaultDocumentFormatting,
        state: "REVISION_REQUESTED",
        mode: "fallback" as const,
        aiMeta: createAiMeta()
      };
    }
    throw new Error(`unsupported fallback operation: ${operation}`);
  }
}

export function createFallbackProvider() {
  return new HardcodedFallbackProvider();
}
