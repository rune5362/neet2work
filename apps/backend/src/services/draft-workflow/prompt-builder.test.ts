import { describe, expect, it } from "vitest";
import { buildDraftWorkflowPrompt } from "./prompt-builder.js";

describe("buildDraftWorkflowPrompt", () => {
  it("limits final polishing to reducing repeated expressions in draft prompts", () => {
    const prompt = buildDraftWorkflowPrompt("draft", {
      target: { previousDraftText: "AI 자동화 경험을 강조했습니다." },
      plan: {
        materialStore: {
          sectionPlan: [{ avoidRepeating: ["AI 활용", "자동화", "저는", "구성했습니다"] }]
        }
      }
    });

    expect(prompt).toContain("Final polish is limited to reducing repeated expressions");
    expect(prompt).toContain("Keep the same evidence and claims");
    expect(prompt).toContain("Split overloaded technical sentences");
    expect(prompt).toContain("implementation verbs");
    expect(prompt).toContain("Avoid starting adjacent paragraphs");
  });

  it("keeps revise repetition reduction scoped to wording only", () => {
    const prompt = buildDraftWorkflowPrompt("revise", {
      revisionRequest: "표현 반복만 줄여줘"
    });

    expect(prompt).toContain("only reduce repeated expressions");
    expect(prompt).toContain("split overloaded sentences");
    expect(prompt).toContain("diversify repeated implementation verbs");
    expect(prompt).toContain("Do not change the claim structure or add new evidence");
  });

  it("asks plan prompts to track repeated openings and verb patterns for later polish", () => {
    const prompt = buildDraftWorkflowPrompt("plan", {
      target: { questionText: "성장과정을 작성하세요." },
      experienceInput: { manualExperienceText: "AI 자동화 프로젝트를 구성했습니다." }
    });

    expect(prompt).toContain("Fill materialStore.sectionPlan.avoidRepeating");
    expect(prompt).toContain("sentence openings");
    expect(prompt).toContain("verb patterns");
  });

  it("marks selected profile contexts as factual evidence in plan prompts", () => {
    const prompt = buildDraftWorkflowPrompt("plan", {
      target: { questionText: "직무 역량을 작성하세요." },
      experienceInput: {
        profileContexts: [
          {
            profileId: "candidate-profile-1",
            title: "백엔드 지원 프로필",
            profileJson: { skills: ["Node.js"] }
          }
        ]
      }
    });

    expect(prompt).toContain("profileContexts");
    expect(prompt).toContain("user-owned factual evidence");
    expect(prompt).toContain("백엔드 지원 프로필");
  });
});
