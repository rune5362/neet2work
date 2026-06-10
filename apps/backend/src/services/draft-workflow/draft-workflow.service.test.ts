import { describe, expect, it } from "vitest";
import { DraftWorkflowService, draftWorkflowService } from "./draft-workflow.service.js";
import { AiRouter } from "../ai/ai-router.js";

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

const documentFormatting = {
  encoding: "UTF-8",
  fontFamily: "Malgun Gothic",
  fontDisplayName: "맑은 고딕",
  lineSpacing: "normal",
  normalizeWhitespace: true,
  forbidMojibake: true
} as const;

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

  it("createPlan prioritizes attached document requirements in materialStore", async () => {
    const plan = await draftWorkflowService.createPlan({
      aiSelection: { mode: "auto" },
      target: {
        ...sampleTarget,
        requirementSourceText: "자소서 요구사항\n소제목을 작성하고 두괄식으로 구체 경험을 포함하세요."
      },
      experienceInput: sampleExperience
    });

    expect(plan.materialStore.requirements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "attached_document",
          priority: "critical",
          text: expect.stringContaining("두괄식")
        })
      ])
    );
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

  it("normalizes AI draft charCount instead of rejecting otherwise valid Codex output", async () => {
    const plan = await draftWorkflowService.createPlan({
      aiSelection: { mode: "auto" },
      target: sampleTarget,
      experienceInput: sampleExperience
    });
    const card = plan.experienceCards[0];
    const allowedClaim = card.claimLedger.find((claim) => claim.allowedInDraft);
    expect(allowedClaim).toBeDefined();
    const allowedClaimId = allowedClaim?.claimId ?? "";
    const draftText = "Node.js와 PostgreSQL 기반 REST API 경험을 바탕으로 지원 직무에 기여하겠습니다.";
    const service = new DraftWorkflowService({
      listProviderStatuses: async () => [],
      execute: async () => ({
        data: {
          state: "REVIEW_COMPLETED",
          draftText,
          charCount: { withSpaces: 1, withoutSpaces: 1, limit: sampleTarget.charLimit },
          evidenceMap: [
            {
              textRangeLabel: "1문단",
              claimIds: [allowedClaimId],
              experienceIds: [card.experienceId]
            }
          ],
          documentFormatting,
          reviewReport: {
            scores: {
              promptFit: 80,
              jobFit: 80,
              specificity: 75,
              evidenceSafety: 90,
              koreanReadability: 85,
              aiLikenessRisk: 40,
              blindRisk: 10,
              interviewDefensibility: 80
            },
            issues: [],
            likelyInterviewQuestions: [],
            sensitiveWarnings: []
          },
          revisionOptions: []
        },
        aiMeta: {
          providerId: "codex_bridge",
          modelId: "codex-app-server",
          routingMode: "manual",
          usedFallback: false
        }
      })
    } as unknown as AiRouter);

    const draft = await service.createDraft({
      aiSelection: { mode: "manual", providerId: "codex_bridge" },
      target: sampleTarget,
      experienceInput: sampleExperience,
      plan
    });

    expect(draft.aiMeta.usedFallback).toBe(false);
    expect(draft.charCount).toEqual({
      withSpaces: draftText.length,
      withoutSpaces: draftText.replace(/\s/g, "").length,
      limit: sampleTarget.charLimit
    });
  });

  it("falls back when an AI provider returns an empty draft body", async () => {
    const plan = await draftWorkflowService.createPlan({
      aiSelection: { mode: "auto" },
      target: sampleTarget,
      experienceInput: sampleExperience
    });
    const fallbackDraft = await draftWorkflowService.createDraft({
      aiSelection: { mode: "manual", providerId: "fallback" },
      target: sampleTarget,
      experienceInput: sampleExperience,
      plan
    });
    const service = new DraftWorkflowService({
      listProviderStatuses: async () => [],
      execute: async () => ({
        data: {
          state: "REVIEW_COMPLETED",
          draftText: "",
          charCount: { withSpaces: 0, withoutSpaces: 0, limit: sampleTarget.charLimit },
          evidenceMap: [],
          documentFormatting,
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
          providerId: "codex_bridge",
          modelId: "codex-app-server",
          routingMode: "manual",
          usedFallback: false
        }
      }),
      executeFallback: async () => ({
        data: fallbackDraft,
        aiMeta: {
          providerId: "fallback",
          modelId: "hardcoded-demo",
          routingMode: "manual",
          usedFallback: true,
          fallbackReason: "invalid_output"
        }
      })
    } as unknown as AiRouter);

    const draft = await service.createDraft({
      aiSelection: { mode: "manual", providerId: "codex_bridge" },
      target: sampleTarget,
      experienceInput: sampleExperience,
      plan
    });

    expect(draft.aiMeta.usedFallback).toBe(true);
    expect(draft.aiMeta.fallbackReason).toBe("invalid_output");
    expect(draft.draftText.length).toBeGreaterThan(20);
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

  it("createDraft falls back when an AI provider returns disallowed claims", async () => {
    const plan = await draftWorkflowService.createPlan({
      aiSelection: { mode: "auto" },
      target: sampleTarget,
      experienceInput: sampleExperience
    });
    const fallbackDraft = await draftWorkflowService.createDraft({
      aiSelection: { mode: "manual", providerId: "fallback" },
      target: sampleTarget,
      experienceInput: sampleExperience,
      plan
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
          documentFormatting,
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
      }),
      executeFallback: async () => ({
        data: fallbackDraft,
        aiMeta: {
          providerId: "fallback",
          modelId: "hardcoded-demo",
          routingMode: "auto",
          usedFallback: true,
          fallbackReason: "invalid_output"
        }
      })
    } as unknown as AiRouter);

    const draft = await service.createDraft({
      aiSelection: { mode: "auto" },
      target: sampleTarget,
      experienceInput: sampleExperience,
      plan
    });

    expect(draft.aiMeta.usedFallback).toBe(true);
    expect(draft.aiMeta.fallbackReason).toBe("invalid_output");
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

  it("injects mode and aiMeta for agy_cli output that omits backend metadata", async () => {
    const fallbackPlan = await draftWorkflowService.createPlan({
      aiSelection: { mode: "auto" },
      target: sampleTarget,
      experienceInput: sampleExperience
    });
    const { mode: _mode, aiMeta: _aiMeta, ...agyData } = fallbackPlan;

    const service = new DraftWorkflowService({
      listProviderStatuses: async () => [],
      execute: async () => ({
        data: agyData,
        aiMeta: {
          providerId: "agy_cli",
          modelId: "agy-cli",
          routingMode: "manual",
          usedFallback: false
        }
      })
    } as unknown as AiRouter);

    const plan = await service.createPlan({
      aiSelection: { mode: "manual", providerId: "agy_cli" },
      target: sampleTarget,
      experienceInput: sampleExperience
    });

    expect(plan.mode).toBe("ai");
    expect(plan.aiMeta).toMatchObject({
      providerId: "agy_cli",
      modelId: "agy-cli",
      routingMode: "manual",
      usedFallback: false
    });
    expect((agyData as { mode?: unknown; aiMeta?: unknown }).mode).toBeUndefined();
    expect((agyData as { mode?: unknown; aiMeta?: unknown }).aiMeta).toBeUndefined();
  });

  it("reviseDraft rejects fallback revisions containing disallowed claims with 422", async () => {
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
          providerId: "fallback",
          modelId: "hardcoded-demo",
          routingMode: "auto",
          usedFallback: true
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
