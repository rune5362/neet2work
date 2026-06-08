import { describe, expect, it } from "vitest";
import { ProviderExecutionError, extractWorkflowOutput } from "./provider-utils.js";

describe("provider utils", () => {
  it("wraps plain draft output instead of rejecting it as invalid JSON", () => {
    expect(extractWorkflowOutput("프로젝트 경험을 중심으로 작성한 초안입니다.", "draft")).toEqual({
      draftText: "프로젝트 경험을 중심으로 작성한 초안입니다."
    });
  });

  it("keeps plan output strict when JSON is missing", () => {
    expect(() => extractWorkflowOutput("질문을 더 해야 합니다.", "plan")).toThrow(ProviderExecutionError);
  });
});
