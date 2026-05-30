import { describe, expect, it } from "vitest";
import { DraftWorkflowService, draftWorkflowService } from "./draft-workflow.service.js";
import { AiRouter } from "../ai/ai-router.js";
import { HttpError } from "../../utils/http-error.js";

const sampleTarget = {
  company: "Backend Bridge",
  role: "백엔드 엔지니어",
  questionText: "협업 경험을 구체적으로 작성하세요.",
  charLimit: 800,
  charCountRule: "with_spaces" as const,
  jobPostingText: "Node.js PostgreSQL REST API 경험자 우대",
  blindRecruitment: false
};

const sampleExperience = {
  manualExperienceText:
    "Node.js와 PostgreSQL로 REST API 서버를 구축하고 운영한 백엔드 개발 경험이 있습니다."
};

describe("draftWorkflowService", () => {
  it("returns provider statuses including fallback", async () => {
    const providers = await draftWorkflowService.getProviders();
    const fallback = providers.find((item) => item.providerId === "fallback");
    expect(fallback?.online).toBe(true);
  });

  it("createPlan returns required plan fields with fallback aiMeta", async () => {
    const plan = await draftWorkflowService.createPlan({
      aiSelection: { mode: "auto" },
      target: sampleTarget,
      experienceInput: sampleExperience
    });

    expect(plan.experienceCards.length).toBeGreaterThan(0);
    expect(plan.fitAssessments.length).toBeGreaterThan(0);
    expect(plan.answerStrategy).toBeTruthy();
    expect(plan.outline.length).toBeGreaterThan(0);
    expect(plan.aiMeta.usedFallback).toBe(true);
    expect(plan.aiMeta.providerId).toBe("fallback");
  });

  it("createDraft returns draft envelope", async () => {
    const plan = await draftWorkflowService.createPlan({
      aiSelection: { mode: "auto" },
      target: sampleTarget,
      experienceInput: sampleExperience
    });

    const draft = await draftWorkflowService.createDraft({
      aiSelection: { mode: "auto" },
      target: sampleTarget,
      experienceInput: sampleExperience,
      plan
    });

    expect(draft.draftText.length).toBeGreaterThan(20);
    expect(draft.evidenceMap.length).toBeGreaterThan(0);
    expect(draft.reviewReport).toBeTruthy();
    expect(draft.revisionOptions.length).toBeGreaterThan(0);
    expect(draft.aiMeta.usedFallback).toBe(true);
  });

  it("reviseDraft returns updated draft text", async () => {
    const plan = await draftWorkflowService.createPlan({
      aiSelection: { mode: "auto" },
      target: sampleTarget,
      experienceInput: sampleExperience
    });
    const draft = await draftWorkflowService.createDraft({
      aiSelection: { mode: "auto" },
      target: sampleTarget,
      experienceInput: sampleExperience,
      plan
    });

    const revised = await draftWorkflowService.reviseDraft({
      aiSelection: { mode: "auto" },
      target: sampleTarget,
      plan,
      draft,
      revisionRequest: "첫 문단을 더 간결하게"
    });

    expect(revised.draftText).toContain("첫 문단을 더 간결하게");
  });

  it("createDraft merges gap answers into fallback draft text", async () => {
    const plan = await draftWorkflowService.createPlan({
      aiSelection: { mode: "auto" },
      target: sampleTarget,
      experienceInput: sampleExperience
    });

    const draft = await draftWorkflowService.createDraft({
      aiSelection: { mode: "auto" },
      target: sampleTarget,
      experienceInput: sampleExperience,
      plan,
      gapAnswers: [{ questionId: "gap-1", answer: "월간 활성 사용자 1200명 증가" }]
    });

    expect(draft.draftText).toContain("월간 활성 사용자 1200명 증가");
  });

  it("createDraft rejects drafts containing disallowed claims with 422", async () => {
    const plan = await draftWorkflowService.createPlan({
      aiSelection: { mode: "auto" },
      target: sampleTarget,
      experienceInput: sampleExperience
    });

    const service = new DraftWorkflowService({
      listProviderStatuses: async () => [],
      execute: async () => ({
        data: {
          mode: "ai",
          state: "REVIEW_COMPLETED",
          draftText: "데모용 하드코딩 초안 문장은 실제 AI 결과가 아닙니다.",
          charCount: { withSpaces: 30, withoutSpaces: 24, limit: 800 },
          evidenceMap: [],
          reviewReport: {
            scores: {
              promptFit: 0,
              jobFit: 0,
              specificity: 0,
              evidenceSafety: 0,
              koreanReadability: 0,
              aiLikenessRisk: 0,
              blindRisk: 0,
              interviewDefensibility: 0
            },
            issues: [],
            likelyInterviewQuestions: [],
            sensitiveWarnings: []
          },
          revisionOptions: []
        },
        aiMeta: {
          providerId: "gemini",
          modelId: "gemini-pro",
          routingMode: "auto",
          usedFallback: false
        }
      })
    } as unknown as AiRouter);

    await expect(
      service.createDraft({
        aiSelection: { mode: "auto" },
        target: sampleTarget,
        experienceInput: sampleExperience,
        plan
      })
    ).rejects.toBeInstanceOf(HttpError);

    await expect(
      service.createDraft({
        aiSelection: { mode: "auto" },
        target: sampleTarget,
        experienceInput: sampleExperience,
        plan
      })
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it("createPlan falls back when an AI provider returns an invalid envelope", async () => {
    const service = new DraftWorkflowService({
      listProviderStatuses: async () => [],
      execute: async () => ({
        data: { invalid: true },
        aiMeta: {
          providerId: "gemini",
          modelId: "gemini-pro",
          routingMode: "auto",
          usedFallback: false
        }
      }),
      executeFallback: async () => ({
        data: await draftWorkflowService.createPlan({
          aiSelection: { mode: "auto" },
          target: sampleTarget,
          experienceInput: sampleExperience
        }),
        aiMeta: {
          providerId: "fallback",
          modelId: "hardcoded-demo",
          routingMode: "auto",
          usedFallback: true,
          fallbackReason: "invalid_output"
        }
      })
    } as unknown as AiRouter);

    const plan = await service.createPlan({
      aiSelection: { mode: "auto" },
      target: sampleTarget,
      experienceInput: sampleExperience
    });

    expect(plan.aiMeta.usedFallback).toBe(true);
    expect(plan.aiMeta.fallbackReason).toBe("invalid_output");
  });

  it("reviseDraft rejects revisions containing disallowed claims with 422", async () => {
    const plan = await draftWorkflowService.createPlan({
      aiSelection: { mode: "auto" },
      target: sampleTarget,
      experienceInput: sampleExperience
    });
    const draft = await draftWorkflowService.createDraft({
      aiSelection: { mode: "auto" },
      target: sampleTarget,
      experienceInput: sampleExperience,
      plan
    });

    const service = new DraftWorkflowService({
      listProviderStatuses: async () => [],
      execute: async () => ({
        data: {
          ...draft,
          mode: "ai",
          state: "REVIEW_COMPLETED",
          draftText: `${draft.draftText}\n데모용 하드코딩 초안 문장은 실제 AI 결과가 아닙니다.`
        },
        aiMeta: {
          providerId: "gemini",
          modelId: "gemini-pro",
          routingMode: "auto",
          usedFallback: false
        }
      })
    } as unknown as AiRouter);

    await expect(
      service.reviseDraft({
        aiSelection: { mode: "auto" },
        target: sampleTarget,
        plan,
        draft,
        revisionRequest: "더 강하게 보이게 수정"
      })
    ).rejects.toMatchObject({ statusCode: 422 });
  });
});
