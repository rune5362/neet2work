import { randomUUID } from "node:crypto";
import type { AiExecutionMeta, AiSelection } from "../../types/ai-routing.js";
import type { DraftWorkflowDraft, DraftWorkflowPlan } from "../../types/draft-workflow.js";
import type {
  CareerDocumentPackage,
  CareerDocumentDraft,
  CareerDocumentQuestion,
  CareerDocumentSessionState,
  CareerDocumentWorkflowAnswerRequest,
  CareerDocumentWorkflowSession,
  CareerDocumentWorkflowSessionRequest,
  CareerEvidenceVaultItem,
  CareerGapAnswer,
  CareerGapQuestion
} from "../../types/career-document-workflow.js";
import type { AiRouter } from "../ai/ai-router.js";
import { defaultAiRouter } from "../ai/ai-router.js";
import { documentAnalysisService, DocumentAnalysisService } from "./document-analysis.service.js";
import { draftGenerationService, DraftGenerationService } from "./draft-generation.service.js";
import { evidenceVaultService, EvidenceVaultService } from "./evidence-vault.service.js";
import { gapInterviewService, GapInterviewService } from "./gap-interview.service.js";
import { githubAnalysisService, GithubAnalysisService } from "./github-analysis.service.js";
import { portfolioAnalysisService, PortfolioAnalysisService } from "./portfolio-analysis.service.js";
import { draftWorkflowDraftSchema, draftWorkflowPlanSchema } from "../draft-workflow/schemas.js";
import {
  buildFallbackStructureRules,
  buildReferenceRuleTexts,
  buildSocraticDraftingRules
} from "./self-intro-style-guide.js";

const CAREER_DOCUMENT_AI_TIMEOUT_MS = Number(process.env.CAREER_DOCUMENT_AI_TIMEOUT_MS) || 300_000;

/**
 * 첨부 자료 분석부터 보완 질문, 초안, 저장 가능한 문서 패키지까지 생성하는 통합 workflow입니다.
 *
 * @remarks
 * GitHub/portfolio/첨부 문서를 근거 저장소로 통합한 뒤 AI provider를 통해 질문과 초안을 보강합니다.
 * provider 출력이 유효하지 않으면 service 내부에서 fallback draft 구조를 사용합니다.
 */
export class CareerDocumentWorkflowService {
  constructor(
    private readonly documents: DocumentAnalysisService = documentAnalysisService,
    private readonly github: GithubAnalysisService = githubAnalysisService,
    private readonly portfolio: PortfolioAnalysisService = portfolioAnalysisService,
    private readonly evidence: EvidenceVaultService = evidenceVaultService,
    private readonly interview: GapInterviewService = gapInterviewService,
    private readonly drafts: DraftGenerationService = draftGenerationService,
    private readonly router: AiRouter = defaultAiRouter
  ) {}

  /**
   * 커리어 문서 작성 세션을 만들고 초기 질문, 초안, 문서 패키지를 생성합니다.
   *
   * @param request - 사용자 메시지, 첨부 자료, 목표 정보, 프로필 컨텍스트, AI 선택값입니다.
   * @returns UI가 단계별 진행 상황과 생성 결과를 표시할 수 있는 workflow 세션입니다.
   */
  async createSession(request: CareerDocumentWorkflowSessionRequest): Promise<CareerDocumentWorkflowSession> {
    const sessionId = randomUUID();
    const target = request.target ?? {};
    const analysisContextText = buildAnalysisContextText(request);
    const documentAnalyses = this.documents.analyze(request.attachments ?? []);
    const githubAnalyses = await this.github.analyzeFromText(analysisContextText);
    const portfolioAnalyses = await this.portfolio.analyzeFromText(analysisContextText);
    const evidenceVault = this.evidence.build({
      message: request.message,
      target,
      documentAnalyses,
      githubAnalyses,
      portfolioAnalyses,
      profileContexts: request.profileContexts
    });
    const answers: CareerGapAnswer[] = [];
    const baseQuestions = this.interview.build({
      documentAnalyses,
      githubAnalyses,
      portfolioAnalyses,
      evidenceVault,
      target,
      answers
    });
    const questionResult = await this.generateQuestions({
      baseQuestions,
      documentAnalyses,
      evidenceVault,
      target,
      answers,
      message: request.message,
      aiSelection: request.aiSelection
    });
    const questions = questionResult.questions;
    const baseDrafts = this.drafts.generate({
      documentAnalyses,
      evidenceVault,
      target
    });
    const draftResult = await this.generateDrafts({
      baseDrafts,
      questions,
      documentAnalyses,
      evidenceVault,
      target,
      aiSelection: request.aiSelection
    });
    const state = resolveState(questions.length, draftResult.drafts);
    const completion = buildCompletion(state, questions, draftResult.drafts);
    const missingEvidence = collectMissingEvidence(draftResult.drafts, githubAnalyses, portfolioAnalyses);
    const risks = collectRisks(draftResult.drafts, githubAnalyses, portfolioAnalyses);
    const documentPackages = buildDocumentPackages({
      sessionId,
      state,
      target,
      profileContexts: request.profileContexts ?? [],
      drafts: draftResult.drafts,
      evidenceVault,
      completion,
      missingEvidence,
      risks
    });

    return {
      sessionId,
      state,
      target,
      stages: buildStages(state, draftResult.drafts),
      documentAnalyses,
      githubAnalyses,
      portfolioAnalyses,
      evidenceVault,
      profileContexts: request.profileContexts ?? [],
      interview: {
        questions,
        answers
      },
      drafts: draftResult.drafts,
      completion,
      documentPackages,
      aiMeta: draftResult.aiMeta ?? questionResult.aiMeta,
      missingEvidence,
      risks
    };
  }

  /**
   * 보완 질문 답변을 반영해 근거 저장소와 초안, 문서 패키지를 다시 계산합니다.
   *
   * @param request - 기존 세션, 답변 대상 질문, 답변 내용, AI 선택값입니다.
   * @returns 답변 반영 후의 최신 workflow 세션입니다.
   */
  async answerQuestion(request: CareerDocumentWorkflowAnswerRequest): Promise<CareerDocumentWorkflowSession> {
    const previousAnswer = request.session.interview.answers.find(
      (item) => item.questionId === request.questionId
    );
    const answeredQuestion = request.session.interview.questions.find(
      (question) => question.questionId === request.questionId
    );
    const answer = {
      questionId: request.questionId,
      slot: answeredQuestion?.slot ?? previousAnswer?.slot,
      answer: request.answer.trim()
    };
    const answers = [
      ...request.session.interview.answers.filter((item) => item.questionId !== request.questionId),
      answer
    ];
    const baseEvidence = request.session.evidenceVault.filter((item) => item.sourceType !== "interview_answer");
    const answerEvidence = this.evidence
      .build({
        message: "",
        target: request.session.target,
        documentAnalyses: [],
        githubAnalyses: [],
        portfolioAnalyses: [],
        answers
      })
      .map((item, index) => ({
        ...item,
        evidenceId: `ev-answer-${index + 1}`
      }));
    const evidenceVault: CareerEvidenceVaultItem[] = [...baseEvidence, ...answerEvidence];
    const baseQuestions = this.interview.build({
      documentAnalyses: request.session.documentAnalyses,
      githubAnalyses: request.session.githubAnalyses,
      portfolioAnalyses: request.session.portfolioAnalyses,
      evidenceVault,
      target: request.session.target,
      answers
    });
    const questionResult = await this.generateQuestions({
      baseQuestions,
      documentAnalyses: request.session.documentAnalyses,
      evidenceVault,
      target: request.session.target,
      answers,
      aiSelection: request.aiSelection
    });
    const questions = questionResult.questions;
    const baseDrafts = this.drafts.generate({
      documentAnalyses: request.session.documentAnalyses,
      evidenceVault,
      target: request.session.target
    });
    const draftResult = await this.generateDrafts({
      baseDrafts,
      questions,
      documentAnalyses: request.session.documentAnalyses,
      evidenceVault,
      target: request.session.target,
      aiSelection: request.aiSelection
    });
    const state = resolveState(questions.length, draftResult.drafts);
    const completion = buildCompletion(state, questions, draftResult.drafts);
    const missingEvidence = collectMissingEvidence(draftResult.drafts, request.session.githubAnalyses, request.session.portfolioAnalyses);
    const risks = collectRisks(draftResult.drafts, request.session.githubAnalyses, request.session.portfolioAnalyses);
    const documentPackages = buildDocumentPackages({
      sessionId: request.session.sessionId,
      state,
      target: request.session.target,
      profileContexts: request.session.profileContexts,
      drafts: draftResult.drafts,
      evidenceVault,
      completion,
      missingEvidence,
      risks
    });

    return {
      ...request.session,
      state,
      stages: buildStages(state, draftResult.drafts),
      evidenceVault,
      interview: {
        questions,
        answers
      },
      drafts: draftResult.drafts,
      completion,
      documentPackages,
      aiMeta: draftResult.aiMeta ?? questionResult.aiMeta,
      missingEvidence,
      risks
    };
  }

  private async generateQuestions(input: {
    baseQuestions: CareerGapQuestion[];
    documentAnalyses: CareerDocumentWorkflowSession["documentAnalyses"];
    evidenceVault: CareerEvidenceVaultItem[];
    target: CareerDocumentWorkflowSession["target"];
    answers: CareerGapAnswer[];
    message?: string;
    aiSelection?: AiSelection;
  }): Promise<{ questions: CareerGapQuestion[]; aiMeta?: AiExecutionMeta }> {
    if (input.baseQuestions.length === 0) {
      return { questions: input.baseQuestions };
    }

    const aiSelection = input.aiSelection ?? { mode: "auto" as const };

    try {
      const result = await this.router.execute<DraftWorkflowPlan>({
        operation: "plan",
        aiSelection,
        payload: buildAiQuestionPlanPayload(input),
        timeoutMs: CAREER_DOCUMENT_AI_TIMEOUT_MS
      });

      if (result.aiMeta.usedFallback) {
        return { questions: input.baseQuestions };
      }

      const parsed = draftWorkflowPlanSchema.safeParse({
        ...(typeof result.data === "object" && result.data !== null ? result.data : {}),
        aiMeta: result.aiMeta,
        mode: "ai"
      });

      if (!parsed.success) {
        return {
          questions: input.baseQuestions,
          aiMeta: {
            providerId: "fallback",
            modelId: "rule-gap",
            routingMode: result.aiMeta.routingMode,
            usedFallback: true,
            fallbackReason: "invalid_output"
          }
        };
      }

      const aiQuestions = mapAiQuestionsToGapQuestions(parsed.data, input.baseQuestions);
      return {
        questions: aiQuestions.length > 0 ? aiQuestions : input.baseQuestions,
        aiMeta: result.aiMeta
      };
    } catch {
      return {
        questions: input.baseQuestions,
        aiMeta: {
          providerId: "fallback",
          modelId: "rule-gap",
          routingMode: aiSelection.mode,
          usedFallback: true,
          fallbackReason: "provider_error"
        }
      };
    }
  }

  private async generateDrafts(input: {
    baseDrafts: CareerDocumentDraft[];
    questions: CareerGapQuestion[];
    documentAnalyses: CareerDocumentWorkflowSession["documentAnalyses"];
    evidenceVault: CareerEvidenceVaultItem[];
    target: CareerDocumentWorkflowSession["target"];
    aiSelection?: AiSelection;
  }): Promise<{ drafts: CareerDocumentDraft[]; aiMeta?: AiExecutionMeta }> {
    if (input.questions.length > 0 || input.baseDrafts.some((draft) => draft.status === "needs_more_evidence")) {
      return { drafts: input.baseDrafts };
    }

    const drafted = input.baseDrafts.filter((draft) => draft.status === "drafted" && draft.draftText);
    if (drafted.length === 0) {
      return { drafts: input.baseDrafts };
    }

    const aiSelection = input.aiSelection ?? { mode: "auto" as const };
    let lastMeta: AiExecutionMeta | undefined;
    const aiDrafts: CareerDocumentDraft[] = [];

    for (const draft of input.baseDrafts) {
      if (draft.status !== "drafted") {
        aiDrafts.push(draft);
        continue;
      }

      const question = findQuestion(input.documentAnalyses, draft.questionId);
      const result = await this.generateSingleAiDraft({
        draft,
        question,
        evidenceVault: input.evidenceVault,
        target: input.target,
        aiSelection
      });
      lastMeta = result.aiMeta ?? lastMeta;
      aiDrafts.push(result.draft);
    }

    return { drafts: aiDrafts, aiMeta: lastMeta };
  }

  private async generateSingleAiDraft(input: {
    draft: CareerDocumentDraft;
    question?: CareerDocumentQuestion;
    evidenceVault: CareerEvidenceVaultItem[];
    target: CareerDocumentWorkflowSession["target"];
    aiSelection: AiSelection;
  }): Promise<{ draft: CareerDocumentDraft; aiMeta?: AiExecutionMeta }> {
    try {
      const result = await this.router.execute<DraftWorkflowDraft>({
        operation: "draft",
        aiSelection: input.aiSelection,
        payload: buildAiDraftPayload(input),
        timeoutMs: CAREER_DOCUMENT_AI_TIMEOUT_MS
      });

      if (result.aiMeta.usedFallback) {
        return { draft: input.draft, aiMeta: result.aiMeta };
      }

      const parsed = draftWorkflowDraftSchema.safeParse({
        ...(typeof result.data === "object" && result.data !== null ? result.data : {}),
        aiMeta: result.aiMeta,
        mode: "ai"
      });

      if (!parsed.success) {
        return {
          draft: {
            ...input.draft,
            risks: unique([...input.draft.risks, "AI 초안 응답 형식이 맞지 않아 규칙 기반 초안으로 대체했습니다."])
          },
          aiMeta: {
            providerId: "fallback",
            modelId: "rule-draft",
            routingMode: result.aiMeta.routingMode,
            usedFallback: true,
            fallbackReason: "invalid_output"
          }
        };
      }

      const draftText = fitAiDraftToLimit(parsed.data.draftText, input.draft.charLimit, input.draft.charCountRule);

      return {
        draft: {
          ...input.draft,
          draftText,
          charCount: {
            withSpaces: draftText.length,
            withoutSpaces: draftText.replace(/\s/g, "").length,
            limit: input.draft.charLimit
          },
          risks: unique([...parsed.data.reviewReport.issues.map((issue) => issue.message), ...parsed.data.reviewReport.sensitiveWarnings])
        },
        aiMeta: result.aiMeta
      };
    } catch {
      return {
        draft: {
          ...input.draft,
          risks: unique([...input.draft.risks, "AI provider 호출에 실패해 규칙 기반 초안으로 대체했습니다."])
        },
        aiMeta: {
          providerId: "fallback",
          modelId: "rule-draft",
          routingMode: input.aiSelection.mode,
          usedFallback: true,
          fallbackReason: "provider_error"
        }
      };
    }
  }
}

function resolveState(questionCount: number, drafts: CareerDocumentDraft[]): CareerDocumentSessionState {
  if (questionCount > 0 || drafts.some((draft) => draft.status === "needs_more_evidence")) {
    return "INTERVIEW_REQUIRED";
  }

  if (drafts.some((draft) => draft.status === "drafted")) {
    return "DRAFT_READY";
  }

  return "EVIDENCE_ANALYZED";
}

function findQuestion(
  documentAnalyses: CareerDocumentWorkflowSession["documentAnalyses"],
  questionId: string
) {
  return documentAnalyses
    .flatMap((analysis) => analysis.template?.questions ?? [])
    .find((question) => question.questionId === questionId);
}

function buildAiQuestionPlanPayload(input: {
  baseQuestions: CareerGapQuestion[];
  documentAnalyses: CareerDocumentWorkflowSession["documentAnalyses"];
  evidenceVault: CareerEvidenceVaultItem[];
  target: CareerDocumentWorkflowSession["target"];
  answers: CareerGapAnswer[];
  message?: string;
}) {
  const allowedEvidence = input.evidenceVault.filter((item) => item.allowedInDraft && !item.needsUserConfirmation);
  const templateQuestions = input.documentAnalyses.flatMap((analysis) => analysis.template?.questions ?? []);
  const primaryQuestion = templateQuestions[0];
  const evidenceItems = allowedEvidence.map((item) => ({
    evidenceId: item.evidenceId,
    type: toDraftEvidenceType(item.sourceType),
    content: item.fact,
    confidence: item.confidence
  }));
  const claimLedger = allowedEvidence.map((item, index) => ({
    claimId: `gap-question-claim-${index + 1}`,
    text: item.fact,
    supportedBy: [item.evidenceId],
    confidence: item.confidence,
    allowedInDraft: item.allowedInDraft && !item.needsUserConfirmation
  }));
  const evidenceFacts = allowedEvidence.map((item) => item.fact);
  const answerFacts = input.answers.map((answer) => `${answer.slot ?? answer.questionId}: ${answer.answer}`);
  const referenceRules = [
    ...input.documentAnalyses.flatMap((analysis) => analysis.template?.writingRules ?? []),
    ...buildReferenceRuleTexts(),
    ...buildSocraticDraftingRules()
  ];
  const baseQuestionNotes = input.baseQuestions.map(
    (question) => `- slot=${question.slot}; priority=${question.priority}; why=${question.whyAsking}; targetQuestionIds=${question.targetQuestionIds.join(",")}`
  );

  return {
    target: {
      company: input.target.company ?? "",
      role: input.target.role ?? "지원 직무",
      questionText:
        input.target.questionText ??
        primaryQuestion?.text ??
        "지원 문서에 필요한 내용을 작성해 주세요.",
      charLimit: input.target.charLimit ?? primaryQuestion?.charLimit,
      charCountRule: input.target.charCountRule ?? primaryQuestion?.charCountRule ?? "with_spaces",
      jobPostingText:
        input.target.jobPostingText?.trim() ||
        "첨부 자료와 사용자 대화 내용을 기준으로 지원 문서를 작성합니다.",
      blindRecruitment: false,
      writingStyle: input.target.writingStyle,
      sectionName: input.target.formatLabel,
      requirementSourceText: [
        input.target.formatLabel ? `선택 형식: ${input.target.formatLabel}` : "",
        ...templateQuestions.map((question) => question.text),
        ...input.documentAnalyses.map((analysis) => analysis.summary)
      ].filter(Boolean).join("\n")
    },
    experienceInput: {
      portfolioText: evidenceFacts.join("\n"),
      manualExperienceText: [input.message, ...answerFacts].filter(Boolean).join("\n"),
      additionalContext: [
        "현재 감지된 부족 정보 슬롯입니다. 기존 규칙 문장을 복사하지 말고, 첨부 자료/대화/직무 맥락에 맞는 새 한국어 질문을 한 문장으로 작성해 주세요.",
        "질문은 사용자가 채팅에서 바로 답할 수 있어야 하고, 부족한 사실만 확인해야 합니다.",
        "레퍼런스는 문장 구조와 평가 기준으로만 사용하고, 레퍼런스의 사실/문장을 사용자 사실로 쓰지 마세요.",
        ...referenceRules,
        ...baseQuestionNotes
      ].join("\n")
    },
    plan: {
      state: "GAP_INTERVIEWING",
      questionRubric: {
        intent: "자료 기반 자기소개서 초안을 작성하기 전에 부족한 사실을 확인합니다.",
        requiredEvidence: input.baseQuestions.map((question) => question.slot),
        mustAvoid: ["첨부 자료나 사용자 답변에 없는 성과를 사실처럼 단정", "저장소 URL만 보고 기술스택을 단정"],
        blindRules: []
      },
      experienceCards: [
        {
          experienceId: "gap-question-evidence",
          source: "conversation",
          title: "첨부 자료와 대화 기반 부족 정보 분석",
          actions: allowedEvidence.slice(0, 6).map((item) => ({ action: item.fact })),
          tools: unique(
            allowedEvidence
              .filter((item) => item.targetSlots.includes("skills") || item.sourceType === "github_repo_metadata")
              .flatMap((item) => item.fact.split(/[,/·]/).map((part) => part.trim()))
          ).slice(0, 12),
          outputs: allowedEvidence.filter((item) => item.targetSlots.includes("result")).map((item) => item.fact),
          results: allowedEvidence
            .filter((item) => item.targetSlots.includes("result") || item.targetSlots.includes("learning"))
            .map((item) => ({ type: "output", description: item.fact, verified: item.confidence === "high" })),
          skills: unique(
            allowedEvidence
              .filter((item) => item.targetSlots.includes("skills") || item.sourceType === "github_repo_metadata")
              .flatMap((item) => item.fact.split(/[,/·]/).map((part) => part.trim()))
          ).slice(0, 12),
          evidenceItems,
          claimLedger,
          missingSlots: input.baseQuestions.map((question) => question.slot),
          blindRiskFlags: allowedEvidence.filter((item) => item.privacyRisk !== "none").map((item) => item.fact),
          interviewDefensibility: "medium"
        }
      ],
      fitAssessments: [],
      answerStrategy: {
        mainClaim: "부족한 사실을 질문으로 확인한 뒤 초안에 사용합니다.",
        narrativePattern: "STAR",
        primaryExperienceId: "gap-question-evidence",
        questionBudget: input.target.charLimit ?? primaryQuestion?.charLimit ?? 800,
        neededQuestions: input.baseQuestions.map((question) => ({
          questionId: question.questionId,
          slot: question.slot,
          priority: question.priority,
          question: `${question.slot} 슬롯을 확인할 새 질문을 작성하세요.`
        }))
      },
      materialStore: {
        requirements: templateQuestions.map((question, index) => ({
          requirementId: `gap-question-requirement-${index + 1}`,
          source: "attached_document" as const,
          text: question.text,
          priority: "critical" as const,
          appliesTo: [question.questionId]
        })),
        referenceRules,
        profile: {
          coreStrengths: allowedEvidence.filter((item) => item.targetSlots.includes("skills")).map((item) => item.fact),
          tone: input.target.writingStyle ?? "",
          privateConstraints: []
        },
        experiences: [
          {
            experienceId: "gap-question-evidence",
            facts: evidenceFacts,
            skills: unique(
              allowedEvidence
                .filter((item) => item.targetSlots.includes("skills"))
                .flatMap((item) => item.fact.split(/[,/·]/).map((part) => part.trim()))
            ).slice(0, 12),
            usableSections: templateQuestions.map((question) => question.questionId),
            privateConstraints: allowedEvidence.filter((item) => item.privacyRisk !== "none").map((item) => item.fact),
            sourceEvidenceIds: allowedEvidence.map((item) => item.evidenceId)
          }
        ],
        sectionPlan: [],
        outputRules: {
          encoding: "UTF-8",
          fontFamily: "Malgun Gothic",
          fontDisplayName: "맑은 고딕",
          lineSpacing: "normal",
          normalizeWhitespace: true,
          forbidMojibake: true
        }
      },
      outline: []
    }
  };
}

function mapAiQuestionsToGapQuestions(
  plan: DraftWorkflowPlan,
  baseQuestions: CareerGapQuestion[]
): CareerGapQuestion[] {
  const baseBySlot = new Map(baseQuestions.map((question) => [question.slot, question]));

  return plan.answerStrategy.neededQuestions
    .map((question, index) => {
      const baseQuestion = baseBySlot.get(question.slot);
      if (!baseQuestion || question.question.trim().length === 0) {
        return null;
      }

      return {
        ...baseQuestion,
        questionId: `ai-${sanitizeQuestionId(question.questionId || baseQuestion.questionId || question.slot)}`,
        question: question.question.trim(),
        whyAsking: "AI가 현재 자료에서 초안 근거가 부족하다고 판단한 항목입니다.",
        priority: question.priority || baseQuestion.priority || index + 1
      };
    })
    .filter((question): question is CareerGapQuestion => Boolean(question));
}

function sanitizeQuestionId(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "question";
}

function buildAiDraftPayload(input: {
  draft: CareerDocumentDraft;
  question?: CareerDocumentQuestion;
  evidenceVault: CareerEvidenceVaultItem[];
  target: CareerDocumentWorkflowSession["target"];
}) {
  const allowedEvidence = input.evidenceVault.filter((item) => item.allowedInDraft && !item.needsUserConfirmation);
  const question = input.question ?? {
    questionId: input.draft.questionId,
    text: input.draft.questionText,
    charLimit: input.draft.charLimit,
    charCountRule: input.draft.charCountRule,
    intent: "role_competency",
    requiredSlots: [],
    writingRules: []
  };
  const evidenceItems = allowedEvidence.map((item) => ({
    evidenceId: item.evidenceId,
    type: toDraftEvidenceType(item.sourceType),
    content: item.fact,
    confidence: item.confidence
  }));
  const claimLedger = allowedEvidence.map((item, index) => ({
    claimId: `career-doc-claim-${index + 1}`,
    text: item.fact,
    supportedBy: [item.evidenceId],
    confidence: item.confidence,
    allowedInDraft: item.allowedInDraft && !item.needsUserConfirmation
  }));
  const allowedClaimIds = claimLedger.filter((claim) => claim.allowedInDraft).map((claim) => claim.claimId);
  const referenceRules = [
    ...question.writingRules,
    ...buildReferenceRuleTexts(),
    ...buildSocraticDraftingRules(),
    ...buildFallbackStructureRules()
  ];
  const target = {
    company: input.target.company ?? "",
    role: input.target.role ?? "지원 직무",
    questionText: input.draft.questionText,
    charLimit: input.draft.charLimit,
    charCountRule: input.draft.charCountRule,
    jobPostingText: input.target.jobPostingText ?? "첨부 자료와 사용자 답변 기준",
    blindRecruitment: false,
    writingStyle: input.target.writingStyle,
    sectionName: input.target.formatLabel,
    requirementSourceText: [input.draft.questionText, ...referenceRules].filter(Boolean).join("\n")
  };

  return {
    target,
    experienceInput: {
      portfolioText: allowedEvidence.map((item) => item.fact).join("\n"),
      manualExperienceText: allowedEvidence
        .filter((item) => item.sourceType === "user_input" || item.sourceType === "interview_answer")
        .map((item) => item.fact)
        .join("\n"),
      additionalContext: [
        input.target.formatLabel ? `작성 형식: ${input.target.formatLabel}` : "",
        input.target.writingStyle ? `문체: ${input.target.writingStyle}` : "",
        question.intent ? `문항 의도: ${question.intent}` : "",
        "레퍼런스 규칙은 문장 구조와 품질 점검에만 사용하고, 레퍼런스의 사실이나 예문을 새 초안 사실로 쓰지 마세요.",
        ...referenceRules
      ].filter(Boolean).join("\n")
    },
    plan: {
      state: "OUTLINE_READY",
      questionRubric: {
        intent: question.intent,
        requiredEvidence: question.requiredSlots,
        mustAvoid: [
          "근거 없는 수치",
          "확인되지 않은 본인 기여",
          "첨부 자료나 사용자 답변에 없는 기술/성과"
        ],
        blindRules: []
      },
      experienceCards: [
        {
          experienceId: "career-document-evidence",
          source: "portfolio",
          title: "첨부 자료와 사용자 답변 기반 경험",
          actions: allowedEvidence
            .filter((item) => item.targetSlots.includes("actions") || item.targetSlots.includes("technical_choice"))
            .slice(0, 6)
            .map((item) => ({ action: item.fact })),
          tools: unique(
            allowedEvidence
              .filter((item) => item.targetSlots.includes("skills"))
              .flatMap((item) => item.fact.split(/[,/·]/).map((part) => part.trim()))
          ).slice(0, 12),
          outputs: allowedEvidence.filter((item) => item.targetSlots.includes("result")).map((item) => item.fact),
          results: allowedEvidence
            .filter((item) => item.targetSlots.includes("result") || item.targetSlots.includes("learning"))
            .map((item) => ({ type: "output", description: item.fact, verified: item.confidence === "high" })),
          skills: unique(
            allowedEvidence
              .filter((item) => item.targetSlots.includes("skills") || item.sourceType === "github_repo_metadata")
              .flatMap((item) => item.fact.split(/[,/·]/).map((part) => part.trim()))
          ).slice(0, 12),
          evidenceItems,
          claimLedger,
          missingSlots: [],
          blindRiskFlags: allowedEvidence.filter((item) => item.privacyRisk !== "none").map((item) => item.fact),
          interviewDefensibility: allowedEvidence.some((item) => item.needsUserConfirmation) ? "medium" : "high"
        }
      ],
      fitAssessments: [
        {
          questionId: input.draft.questionId,
          experienceId: "career-document-evidence",
          fitScore: 80,
          recommendedUsage: "main",
          fitReasons: allowedEvidence.slice(0, 4).map((item) => item.fact),
          risks: input.draft.risks
        }
      ],
      answerStrategy: {
        mainClaim: allowedEvidence[0]?.fact ?? "확인된 사용자 자료를 중심으로 답변",
        narrativePattern: question.intent === "company_fit" ? "CompanyFit" : "STAR",
        primaryExperienceId: "career-document-evidence",
        questionBudget: input.draft.charLimit ?? 800,
        neededQuestions: []
      },
      materialStore: {
        requirements: [
          {
            requirementId: `${input.draft.questionId}-requirement`,
            source: "attached_document",
            text: input.draft.questionText,
            priority: "critical",
            appliesTo: [input.draft.questionId]
          }
        ],
        referenceRules,
        profile: {
          coreStrengths: allowedEvidence.filter((item) => item.targetSlots.includes("skills")).map((item) => item.fact),
          tone: input.target.writingStyle ?? "",
          privateConstraints: []
        },
        experiences: [
          {
            experienceId: "career-document-evidence",
            facts: allowedEvidence.map((item) => item.fact),
            skills: unique(
              allowedEvidence
                .filter((item) => item.targetSlots.includes("skills"))
                .flatMap((item) => item.fact.split(/[,/·]/).map((part) => part.trim()))
            ).slice(0, 12),
            usableSections: [input.draft.questionId],
            privateConstraints: allowedEvidence.filter((item) => item.privacyRisk !== "none").map((item) => item.fact),
            sourceEvidenceIds: allowedEvidence.map((item) => item.evidenceId)
          }
        ],
        sectionPlan: [
          {
            sectionName: input.draft.questionId,
            mainClaim: allowedEvidence[0]?.fact ?? "사용자 확인 자료 기반 답변",
            evidenceIds: allowedEvidence.map((item) => item.evidenceId),
            avoidRepeating: [
              "기술 스택은 ... 기반으로 구성했습니다",
              "확인 가능한 결과로",
              "사용자 입력",
              "선택 프로필"
            ]
          }
        ],
        outputRules: {
          encoding: "UTF-8",
          fontFamily: "Malgun Gothic",
          fontDisplayName: "맑은 고딕",
          lineSpacing: "normal",
          normalizeWhitespace: true,
          forbidMojibake: true
        }
      },
      outline: [
        {
          paragraphId: `${input.draft.questionId}-p1`,
          purpose: "첨부 양식 문항에 맞춘 자기소개서 본문 작성",
          plannedClaims: allowedClaimIds,
          targetChars: input.draft.charLimit
        }
      ]
    },
    gapAnswers: allowedEvidence
      .filter((item) => item.sourceType === "interview_answer")
      .map((item) => ({ questionId: item.sourceId, answer: item.fact })),
    confirmedOutline: true
  };
}

function toDraftEvidenceType(sourceType: CareerEvidenceVaultItem["sourceType"]) {
  if (sourceType === "interview_answer") {
    return "gap_answer";
  }
  if (sourceType === "job_posting") {
    return "job_posting";
  }
  if (sourceType === "user_input") {
    return "user_statement";
  }
  return "portfolio_text";
}

function fitAiDraftToLimit(
  text: string,
  limit: number | undefined,
  charCountRule: CareerDocumentDraft["charCountRule"]
) {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!limit) {
    return normalized;
  }
  const count = charCountRule === "without_spaces" ? normalized.replace(/\s/g, "").length : normalized.length;
  if (count <= limit) {
    return normalized;
  }
  if (charCountRule !== "without_spaces") {
    return `${normalized.slice(0, Math.max(0, limit - 3)).trimEnd()}...`;
  }

  let visible = "";
  let nonSpaceCount = 0;
  for (const char of normalized) {
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

function buildCompletion(
  state: CareerDocumentSessionState,
  questions: CareerGapQuestion[],
  drafts: CareerDocumentDraft[]
): CareerDocumentWorkflowSession["completion"] {
  const draftsWithText = drafts.filter((draft) => draft.draftText?.trim());
  const missingEvidence = unique(drafts.flatMap((draft) => draft.missingEvidence));
  const gates: CareerDocumentWorkflowSession["completion"]["gates"] = [
    {
      id: "draft_available",
      label: "가초안 생성",
      passed: draftsWithText.length > 0,
      detail: draftsWithText.length > 0 ? `${draftsWithText.length}개 문항의 가초안이 있습니다.` : "아직 가초안을 만들 근거가 부족합니다."
    },
    {
      id: "required_questions_answered",
      label: "필수 보완 질문",
      passed: questions.length === 0,
      detail: questions.length === 0 ? "남은 필수 보완 질문이 없습니다." : `${questions.length}개 보완 질문이 남아 있습니다.`
    },
    {
      id: "missing_evidence_resolved",
      label: "부족 근거 해소",
      passed: missingEvidence.length === 0,
      detail: missingEvidence.length === 0 ? "문항별 부족 근거가 없습니다." : `${missingEvidence.slice(0, 3).join(", ")} 보완이 필요합니다.`
    },
    {
      id: "evidence_locked",
      label: "근거 잠금",
      passed: draftsWithText.length > 0 && draftsWithText.every((draft) => draft.usedEvidenceFacts.length > 0),
      detail:
        draftsWithText.length > 0
          ? "초안 문장이 첨부/대화/GitHub/포트폴리오 근거에 연결되어 있습니다."
          : "근거에 연결된 초안 문장이 아직 없습니다."
    }
  ];
  const passedGateCount = gates.filter((gate) => gate.passed).length;
  const score = Math.round((passedGateCount / gates.length) * 100);
  const status = state === "DRAFT_READY" && gates.every((gate) => gate.passed) ? "submission_ready" : "provisional";

  return {
    status,
    score,
    summary:
      status === "submission_ready"
        ? "제출 준비 기준을 통과했습니다."
        : "가초안 상태입니다. 남은 질문을 답하면 같은 초안을 갱신해 완성도를 높입니다.",
    gates
  };
}

function buildDocumentPackages(input: {
  sessionId: string;
  state: CareerDocumentSessionState;
  target: CareerDocumentWorkflowSession["target"];
  profileContexts: CareerDocumentWorkflowSession["profileContexts"];
  drafts: CareerDocumentDraft[];
  evidenceVault: CareerEvidenceVaultItem[];
  completion: CareerDocumentWorkflowSession["completion"];
  missingEvidence: string[];
  risks: string[];
}): CareerDocumentPackage[] {
  const packages: CareerDocumentPackage[] = [];
  const primaryProfile = input.profileContexts[0];
  const usedFacts = unique(input.drafts.flatMap((draft) => draft.usedEvidenceFacts));
  const packageBase = {
    sessionId: input.sessionId,
    state: input.state,
    target: input.target,
    profileContexts: input.profileContexts,
    completion: input.completion,
    missingEvidence: input.missingEvidence,
    risks: input.risks,
    usedFacts
  };
  const coverLetterSections = input.drafts
    .filter((draft) => draft.draftText?.trim())
    .map((draft, index) => ({
      sectionId: draft.questionId,
      title: draft.questionText || `자기소개서 문항 ${index + 1}`,
      body: draft.draftText?.trim() ?? "",
      usedEvidenceFacts: draft.usedEvidenceFacts,
      missingEvidence: draft.missingEvidence,
      risks: draft.risks
    }));

  if (coverLetterSections.length > 0) {
    const content = coverLetterSections
      .map((section, index) => `문항 ${index + 1}. ${section.title}\n\n${section.body}`)
      .join("\n\n");

    packages.push(
      buildPackage({
        ...packageBase,
        documentType: "cover_letter",
        title: buildPackageTitle(input.target, "자기소개서", input.completion.status),
        content,
        sections: coverLetterSections,
        profile: primaryProfile
      })
    );
  }

  const resumeContent = buildResumeContent({
    target: input.target,
    profile: primaryProfile,
    evidenceVault: input.evidenceVault,
    missingEvidence: input.missingEvidence
  });

  if (resumeContent.trim()) {
    packages.push(
      buildPackage({
        ...packageBase,
        documentType: "resume",
        title: buildPackageTitle(input.target, "이력서", input.completion.status),
        content: resumeContent,
        sections: [
          {
            sectionId: "resume-summary",
            title: "이력서 요약",
            body: resumeContent,
            usedEvidenceFacts: usedFacts,
            missingEvidence: input.missingEvidence,
            risks: input.risks
          }
        ],
        profile: primaryProfile
      })
    );
  }

  return packages;
}

function buildPackage(input: {
  documentType: "cover_letter" | "resume";
  title: string;
  content: string;
  sessionId: string;
  state: CareerDocumentSessionState;
  target: CareerDocumentWorkflowSession["target"];
  profileContexts: CareerDocumentWorkflowSession["profileContexts"];
  completion: CareerDocumentWorkflowSession["completion"];
  sections: CareerDocumentPackage["contentJson"]["sections"];
  usedFacts: string[];
  missingEvidence: string[];
  risks: string[];
  profile?: CareerDocumentWorkflowSession["profileContexts"][number];
}): CareerDocumentPackage {
  const charCountRule = input.target.charCountRule ?? "with_spaces";
  const profileSnapshot = input.profile
    ? {
        profileId: input.profile.profileId,
        title: input.profile.title,
        targetRole: input.profile.targetRole,
        desiredRoles: input.profile.desiredRoles,
        skills: input.profile.skills.length > 0 ? input.profile.skills : input.profile.profileJson.skills,
        profileText: input.profile.profileText
      }
    : undefined;

  return {
    documentType: input.documentType,
    title: input.title,
    content: input.content,
    profileId: input.profile?.profileId ?? null,
    jobId: input.target.jobId ?? null,
    contentJson: {
      schemaVersion: 1,
      source: {
        workflow: "career-document-workflow",
        sessionId: input.sessionId,
        state: input.state,
        generatedAt: new Date().toISOString(),
        completionStatus: input.completion.status
      },
      target: input.target,
      ...(profileSnapshot ? { profileSnapshot } : {}),
      sections: input.sections,
      evidence: {
        usedFacts: input.usedFacts,
        missingEvidence: input.missingEvidence,
        risks: input.risks
      },
      formatting: {
        charCountRule,
        withSpaces: input.content.length,
        withoutSpaces: input.content.replace(/\s/g, "").length,
        limit: input.target.charLimit
      }
    }
  };
}

function buildPackageTitle(
  target: CareerDocumentWorkflowSession["target"],
  label: "자기소개서" | "이력서",
  status: CareerDocumentWorkflowSession["completion"]["status"]
) {
  const role = target.role?.trim() || "지원";
  const suffix = status === "submission_ready" ? "완성본" : "가초안";
  return `${role} ${label} ${suffix}`;
}

function buildResumeContent(input: {
  target: CareerDocumentWorkflowSession["target"];
  profile?: CareerDocumentWorkflowSession["profileContexts"][number];
  evidenceVault: CareerEvidenceVaultItem[];
  missingEvidence: string[];
}) {
  const lines: string[] = [];
  const profile = input.profile;
  const skills = unique([
    ...(profile?.skills ?? []),
    ...(profile?.profileJson.skills ?? []),
    ...input.evidenceVault
      .filter((item) => item.targetSlots.includes("skills"))
      .flatMap((item) => extractSkillCandidates(item.fact))
  ]).slice(0, 18);
  const desiredRoles = unique([
    input.target.role ?? "",
    profile?.targetRole ?? "",
    ...(profile?.desiredRoles ?? []),
    ...(profile?.profileJson.desired?.roles ?? [])
  ]);
  const summary = profile?.profileJson.summary?.description?.trim() || profile?.profileJson.summary?.headline?.trim();
  const hasProfileProjects = (profile?.profileJson.projects ?? []).some(
    (project) => (project.name || project.title || project.role || project.result || project.impact || project.achievements?.length)
  );
  const projectFacts = unique([
    ...(profile?.profileJson.projects ?? []).map((project) =>
      [
        project.name || project.title,
        project.role ? `역할: ${project.role}` : "",
        project.result || project.impact || project.achievements?.join(", ")
      ].filter(Boolean).join(" / ")
    ),
    ...input.evidenceVault
      .filter((item) =>
        (item.targetSlots.includes("project_name") || item.targetSlots.includes("actions")) &&
        !(hasProfileProjects && item.sourceType === "profile_context")
      )
      .map((item) => item.fact)
  ]).filter((fact) => fact.trim().length > 0).slice(0, 6);

  if (profile?.profileJson.basics.name?.trim()) {
    lines.push(`이름: ${profile.profileJson.basics.name.trim()}`);
  }
  if (desiredRoles.length > 0) {
    lines.push(`희망 직무: ${desiredRoles.join(", ")}`);
  }
  if (skills.length > 0) {
    lines.push(`기술 스택: ${skills.join(", ")}`);
  }
  if (summary) {
    lines.push(`요약: ${summary}`);
  }
  if (projectFacts.length > 0) {
    lines.push("프로젝트 경험:");
    for (const fact of projectFacts) {
      lines.push(`- ${simplifyPackageFact(fact)}`);
    }
  }
  if (input.missingEvidence.length > 0) {
    lines.push(`보완 필요: ${input.missingEvidence.slice(0, 5).join(", ")}`);
  }

  return lines.join("\n");
}

function extractSkillCandidates(fact: string) {
  const knownSkills = [
    "TypeScript",
    "JavaScript",
    "React",
    "Vite",
    "Node.js",
    "Express",
    "PostgreSQL",
    "Prisma",
    "REST API",
    "GitHub Actions",
    "Docker",
    "SQL",
    "Python"
  ];
  const lower = fact.toLowerCase();
  return knownSkills.filter((skill) => lower.includes(skill.toLowerCase()));
}

function simplifyPackageFact(fact: string) {
  return fact.replace(/^선택 프로필 [^:]+:\s*/, "").replace(/\s+/g, " ").trim();
}

function buildStages(state: CareerDocumentSessionState, drafts: CareerDocumentDraft[]): CareerDocumentWorkflowSession["stages"] {
  const hasDraftText = drafts.some((draft) => draft.draftText?.trim());

  return [
    {
      id: "material_collection",
      label: "자료 수집",
      status: "complete"
    },
    {
      id: "evidence_analysis",
      label: "근거 분석",
      status: state === "COLLECTING_MATERIALS" ? "active" : "complete"
    },
    {
      id: "gap_interview",
      label: "부족 정보 질문",
      status: state === "INTERVIEW_REQUIRED" ? "active" : "complete"
    },
    {
      id: "section_drafts",
      label: "문항별 초안",
      status: state === "DRAFT_READY" ? "complete" : hasDraftText ? "active" : state === "INTERVIEW_REQUIRED" ? "blocked" : "pending"
    }
  ];
}

function collectMissingEvidence(
  drafts: CareerDocumentDraft[],
  githubAnalyses: CareerDocumentWorkflowSession["githubAnalyses"],
  portfolioAnalyses: CareerDocumentWorkflowSession["portfolioAnalyses"]
) {
  return unique([
    ...drafts.flatMap((draft) => draft.missingEvidence),
    ...githubAnalyses
      .filter((analysis) => analysis.status === "unavailable" && analysis.fallbackMessage)
      .map((analysis) => analysis.fallbackMessage as string),
    ...portfolioAnalyses
      .filter((analysis) => analysis.status === "unavailable" && analysis.fallbackMessage)
      .map((analysis) => analysis.fallbackMessage as string)
  ]);
}

function collectRisks(
  drafts: CareerDocumentDraft[],
  githubAnalyses: CareerDocumentWorkflowSession["githubAnalyses"],
  portfolioAnalyses: CareerDocumentWorkflowSession["portfolioAnalyses"]
) {
  return unique([
    ...drafts.flatMap((draft) => draft.risks),
    ...githubAnalyses
      .filter((analysis) => analysis.status === "unavailable")
      .map(() => "GitHub API 또는 네트워크 제한으로 저장소 내용을 확인하지 못했습니다."),
    ...portfolioAnalyses
      .filter((analysis) => analysis.status === "unavailable")
      .map(() => "포트폴리오 페이지를 확인하지 못했습니다.")
  ]);
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function buildAnalysisContextText(request: CareerDocumentWorkflowSessionRequest) {
  const target = request.target ?? {};

  return [
    request.message,
    target.company,
    target.role,
    target.jobPostingText,
    target.formatLabel,
    target.questionText,
    target.writingStyle,
    ...(request.attachments ?? []).map((attachment) => attachment.text)
  ]
    .filter(Boolean)
    .join("\n\n");
}

export const careerDocumentWorkflowService = new CareerDocumentWorkflowService();
