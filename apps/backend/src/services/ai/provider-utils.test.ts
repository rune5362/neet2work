import { describe, expect, it } from "vitest";
import { ProviderExecutionError, extractJsonObject, parseStrictJsonObject } from "./provider-utils.js";

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
