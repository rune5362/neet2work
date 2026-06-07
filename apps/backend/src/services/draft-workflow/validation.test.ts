import { describe, expect, it } from "vitest";
import {
  assertDraftEvidenceMapUsesAllowedClaims,
  assertDraftTextIsExportSafe,
  assertDraftWithinCharLimit,
  assertPlanPrioritizesAttachedRequirements,
  assertDraftRespectsClaimLedger,
  findDisallowedClaimsInDraft
} from "./validation.js";
import type { DraftWorkflowPlan } from "../../types/draft-workflow.js";

const documentFormatting = {
  encoding: "UTF-8",
  fontFamily: "Malgun Gothic",
  fontDisplayName: "맑은 고딕",
  lineSpacing: "normal",
  normalizeWhitespace: true,
  forbidMojibake: true
} as const;

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
  materialStore: {
    requirements: [
      {
        requirementId: "job-posting-fit-1",
        source: "job_posting",
        text: "공고 요구사항",
        priority: "high",
        appliesTo: ["자기소개"]
      }
    ],
    referenceRules: [],
    profile: {
      coreStrengths: ["문제 해결"],
      tone: "담백한 실무형",
      privateConstraints: []
    },
    experiences: [
      {
        experienceId: "exp-1",
        facts: ["허용된 경험"],
        skills: [],
        usableSections: ["자기소개"],
        privateConstraints: [],
        sourceEvidenceIds: []
      }
    ],
    sectionPlan: [
      {
        sectionName: "자기소개",
        mainClaim: "test",
        evidenceIds: [],
        avoidRepeating: []
      }
    ],
    outputRules: documentFormatting
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

  it("throws when attached requirements are not prioritized in the plan", () => {
    expect(() =>
      assertPlanPrioritizesAttachedRequirements(
        {
          company: "A",
          role: "B",
          questionText: "지원 동기를 작성하세요.",
          charCountRule: "with_spaces",
          jobPostingText: "충분히 긴 공고 텍스트",
          blindRecruitment: false,
          requirementSourceText: "자소서 요구사항: 두괄식으로 작성"
        },
        samplePlan
      )
    ).toThrow(/첨부 문서 요구사항/);
  });

  it("throws when draft text contains unsafe export characters", () => {
    expect(() => assertDraftTextIsExportSafe("정상 문장\u00A0깨진 공백")).toThrow(/안전하지 않은 문자/);
  });

  it("throws when draft text is empty", () => {
    expect(() => assertDraftTextIsExportSafe("   \n\t")).toThrow(/초안 본문/);
  });
});
