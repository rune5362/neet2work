import { randomUUID } from "node:crypto";
import type { AiExecutionMeta, AiSelection } from "../../types/ai-routing.js";
import type { DraftWorkflowDraft } from "../../types/draft-workflow.js";
import type {
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
import { draftWorkflowDraftSchema } from "../draft-workflow/schemas.js";

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

  async createSession(request: CareerDocumentWorkflowSessionRequest): Promise<CareerDocumentWorkflowSession> {
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
      portfolioAnalyses
    });
    const answers: CareerGapAnswer[] = [];
    const questions = this.interview.build({
      documentAnalyses,
      githubAnalyses,
      portfolioAnalyses,
      evidenceVault,
      target,
      answers
    });
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

    return {
      sessionId: randomUUID(),
      state,
      target,
      stages: buildStages(state),
      documentAnalyses,
      githubAnalyses,
      portfolioAnalyses,
      evidenceVault,
      interview: {
        questions,
        answers
      },
      drafts: draftResult.drafts,
      aiMeta: draftResult.aiMeta,
      missingEvidence: collectMissingEvidence(draftResult.drafts, githubAnalyses, portfolioAnalyses),
      risks: collectRisks(draftResult.drafts, githubAnalyses, portfolioAnalyses)
    };
  }

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
    const questions = this.interview.build({
      documentAnalyses: request.session.documentAnalyses,
      githubAnalyses: request.session.githubAnalyses,
      portfolioAnalyses: request.session.portfolioAnalyses,
      evidenceVault,
      target: request.session.target,
      answers
    });
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

    return {
      ...request.session,
      state,
      stages: buildStages(state),
      evidenceVault,
      interview: {
        questions,
        answers
      },
      drafts: draftResult.drafts,
      aiMeta: draftResult.aiMeta,
      missingEvidence: collectMissingEvidence(draftResult.drafts, request.session.githubAnalyses, request.session.portfolioAnalyses),
      risks: collectRisks(draftResult.drafts, request.session.githubAnalyses, request.session.portfolioAnalyses)
    };
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
        payload: buildAiDraftPayload(input)
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

function buildAiDraftPayload(input: {
  draft: CareerDocumentDraft;
  question?: CareerDocumentQuestion;
  evidenceVault: CareerEvidenceVaultItem[];
  target: CareerDocumentWorkflowSession["target"];
}) {
  const allowedEvidence = input.evidenceVault.filter((item) => item.allowedInDraft);
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
    requirementSourceText: [input.draft.questionText, ...question.writingRules].filter(Boolean).join("\n")
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
        question.intent ? `문항 의도: ${question.intent}` : ""
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
        referenceRules: question.writingRules,
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
            avoidRepeating: []
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

function buildStages(state: CareerDocumentSessionState): CareerDocumentWorkflowSession["stages"] {
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
      status: state === "DRAFT_READY" ? "complete" : state === "INTERVIEW_REQUIRED" ? "blocked" : "pending"
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
