import { describe, expect, it } from "vitest";
import {
  ProviderExecutionError,
  extractJsonObject,
  extractWorkflowOutput,
  parseStrictJsonObject
} from "./provider-utils.js";

describe("provider json parsing helpers", () => {
  it("keeps extractJsonObject tolerant for existing providers", () => {
    expect(extractJsonObject("warning\n{\"ok\":true}\n")).toEqual({ ok: true });
  });

  it("requires the entire output to be one JSON object for strict parsing", () => {
    expect(parseStrictJsonObject("{\"ok\":true}")).toEqual({ ok: true });
    expect(() => parseStrictJsonObject("warning\n{\"ok\":true}")).toThrow(ProviderExecutionError);
    expect(() => parseStrictJsonObject("[1,2,3]")).toThrow(ProviderExecutionError);
  });
});

describe("workflow output parsing", () => {
  it("wraps plain draft output instead of rejecting it as invalid JSON", () => {
    expect(extractWorkflowOutput("프로젝트 경험을 중심으로 작성한 초안입니다.", "draft")).toEqual({
      draftText: "프로젝트 경험을 중심으로 작성한 초안입니다."
    });
  });

  it("keeps plan output strict when JSON is missing", () => {
    expect(() => extractWorkflowOutput("질문을 더 해야 합니다.", "plan")).toThrow(ProviderExecutionError);
  });
});
