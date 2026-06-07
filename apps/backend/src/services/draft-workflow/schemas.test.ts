import { describe, expect, it } from "vitest";
import { aiExecutionMetaSchema, aiSelectionSchema, draftWorkflowPlanSchema } from "./schemas.js";

describe("draft workflow provider schemas", () => {
  it("accepts agy_cli in manual provider selection", () => {
    expect(() =>
      aiSelectionSchema.parse({
        mode: "manual",
        providerId: "agy_cli"
      })
    ).not.toThrow();
  });

  it("accepts agy_cli in AI execution metadata", () => {
    expect(() =>
      aiExecutionMetaSchema.parse({
        providerId: "agy_cli",
        modelId: "agy-default",
        routingMode: "manual",
        usedFallback: false
      })
    ).not.toThrow();
  });

  it("normalizes nullable optional AI result fields", () => {
    const parsed = draftWorkflowPlanSchema.parse({
      mode: "ai",
      state: "GAP_INTERVIEWING",
      aiMeta: {
        providerId: "agy_cli",
        modelId: "agy-cli",
        routingMode: "manual",
        usedFallback: false
      },
      questionRubric: {
        intent: "지원동기 확인",
        requiredEvidence: [],
        mustAvoid: [],
        blindRules: []
      },
      experienceCards: [
        {
          experienceId: "exp-1",
          source: "portfolio",
          title: "API reliability project",
          period: null,
          context: null,
          role: null,
          problem: null,
          actions: [{ action: "Documented failure handling steps", method: null, rationale: null }],
          tools: [],
          outputs: [],
          results: [],
          skills: [],
          evidenceItems: [],
          claimLedger: [],
          missingSlots: [],
          blindRiskFlags: [],
          interviewDefensibility: "medium"
        }
      ],
      fitAssessments: [],
      answerStrategy: {
        mainClaim: "운영 안정성 기여",
        narrativePattern: "CompanyFit",
        primaryExperienceId: "exp-1",
        questionBudget: 600,
        neededQuestions: []
      },
      materialStore: {
        requirements: [],
        referenceRules: [],
        profile: { coreStrengths: [], tone: "담백한 실무형", privateConstraints: [] },
        experiences: [],
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
      outline: [{ paragraphId: "p1", purpose: "지원동기", plannedClaims: [], targetChars: null }]
    });

    expect(parsed.experienceCards[0].period).toBeUndefined();
    expect(parsed.experienceCards[0].actions[0].method).toBeUndefined();
    expect(parsed.outline[0].targetChars).toBeUndefined();
  });
});
