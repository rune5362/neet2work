import { randomUUID } from "node:crypto";
import type {
  CareerDocumentDraft,
  CareerDocumentSessionState,
  CareerDocumentWorkflowAnswerRequest,
  CareerDocumentWorkflowSession,
  CareerDocumentWorkflowSessionRequest,
  CareerEvidenceVaultItem,
  CareerGapAnswer
} from "../../types/career-document-workflow.js";
import { documentAnalysisService, DocumentAnalysisService } from "./document-analysis.service.js";
import { draftGenerationService, DraftGenerationService } from "./draft-generation.service.js";
import { evidenceVaultService, EvidenceVaultService } from "./evidence-vault.service.js";
import { gapInterviewService, GapInterviewService } from "./gap-interview.service.js";
import { githubAnalysisService, GithubAnalysisService } from "./github-analysis.service.js";
import { portfolioAnalysisService, PortfolioAnalysisService } from "./portfolio-analysis.service.js";

export class CareerDocumentWorkflowService {
  constructor(
    private readonly documents: DocumentAnalysisService = documentAnalysisService,
    private readonly github: GithubAnalysisService = githubAnalysisService,
    private readonly portfolio: PortfolioAnalysisService = portfolioAnalysisService,
    private readonly evidence: EvidenceVaultService = evidenceVaultService,
    private readonly interview: GapInterviewService = gapInterviewService,
    private readonly drafts: DraftGenerationService = draftGenerationService
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
    const drafts = this.drafts.generate({
      documentAnalyses,
      evidenceVault,
      target
    });
    const state = resolveState(questions.length, drafts);

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
      drafts,
      missingEvidence: collectMissingEvidence(drafts, githubAnalyses, portfolioAnalyses),
      risks: collectRisks(drafts, githubAnalyses, portfolioAnalyses)
    };
  }

  answerQuestion(request: CareerDocumentWorkflowAnswerRequest): CareerDocumentWorkflowSession {
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
    const drafts = this.drafts.generate({
      documentAnalyses: request.session.documentAnalyses,
      evidenceVault,
      target: request.session.target
    });
    const state = resolveState(questions.length, drafts);

    return {
      ...request.session,
      state,
      stages: buildStages(state),
      evidenceVault,
      interview: {
        questions,
        answers
      },
      drafts,
      missingEvidence: collectMissingEvidence(drafts, request.session.githubAnalyses, request.session.portfolioAnalyses),
      risks: collectRisks(drafts, request.session.githubAnalyses, request.session.portfolioAnalyses)
    };
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
