import { describe, expect, it } from "vitest";
import {
  assertDraftEvidenceMapUsesAllowedClaims,
  assertDraftWithinCharLimit,
  assertDraftRespectsClaimLedger,
  findDisallowedClaimsInDraft
} from "./validation.js";
import type { DraftWorkflowPlan } from "../../types/draft-workflow.js";

const samplePlan: DraftWorkflowPlan = {
  mode: "fallback",
  state: "OUTLINE_READY",
  aiMeta: {
    providerId: "fallback",
    modelId: "hardcoded-demo",
    routingMode: "auto",
    usedFallback: true
  },
  questionRubric: {
    intent: "test",
    requiredEvidence: [],
    mustAvoid: [],
    blindRules: []
  },
  experienceCards: [
    {
      experienceId: "exp-1",
      source: "manual",
      title: "경험",
      actions: [],
      tools: [],
      outputs: [],
      results: [],
      skills: [],
      evidenceItems: [],
      claimLedger: [
        {
          claimId: "allowed-1",
          text: "허용된 claim 문장",
          supportedBy: [],
          confidence: "high",
          allowedInDraft: true
        },
        {
          claimId: "blocked-1",
          text: "데모용 하드코딩 초안 문장은 실제 AI 결과가 아닙니다.",
          supportedBy: [],
          confidence: "low",
          allowedInDraft: false
        }
      ],
      missingSlots: [],
      blindRiskFlags: [],
      interviewDefensibility: "medium"
    }
  ],
  fitAssessments: [],
  answerStrategy: {
    mainClaim: "test",
    narrativePattern: "STAR",
    primaryExperienceId: "exp-1",
    questionBudget: 800,
    neededQuestions: []
  },
  outline: []
};

describe("assertDraftRespectsClaimLedger", () => {
  it("passes when disallowed claims are absent", () => {
    expect(() =>
      assertDraftRespectsClaimLedger(samplePlan, "허용된 claim 문장만 포함합니다.")
    ).not.toThrow();
  });

  it("throws when a disallowed claim appears in draft text", () => {
    expect(() =>
      assertDraftRespectsClaimLedger(
        samplePlan,
        "데모용 하드코딩 초안 문장은 실제 AI 결과가 아닙니다."
      )
    ).toThrow(/blocked-1/);
  });

  it("returns violating claim ids", () => {
    const violations = findDisallowedClaimsInDraft(
      samplePlan,
      "데모용 하드코딩 초안 문장은 실제 AI 결과가 아닙니다."
    );
    expect(violations).toEqual([
      {
        claimId: "blocked-1",
        text: "데모용 하드코딩 초안 문장은 실제 AI 결과가 아닙니다."
      }
    ]);
  });

  it("throws when evidenceMap references blocked or unknown claims", () => {
    expect(() =>
      assertDraftEvidenceMapUsesAllowedClaims(samplePlan, {
        mode: "ai",
        state: "REVIEW_COMPLETED",
        aiMeta: samplePlan.aiMeta,
        draftText: "초안",
        charCount: { withSpaces: 2, withoutSpaces: 2, limit: 800 },
        evidenceMap: [{ textRangeLabel: "전체", claimIds: ["blocked-1", "missing"], experienceIds: ["exp-1"] }],
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
      })
    ).toThrow(/claims=blocked-1,missing/);
  });

  it("throws when draft text exceeds target char limit", () => {
    expect(() =>
      assertDraftWithinCharLimit(
        {
          company: "A",
          role: "B",
          questionText: "지원 동기를 작성하세요.",
          charLimit: 5,
          charCountRule: "with_spaces",
          jobPostingText: "충분히 긴 공고 텍스트",
          blindRecruitment: false
        },
        "123456"
      )
    ).toThrow(/글자 수 제한/);
  });
});
