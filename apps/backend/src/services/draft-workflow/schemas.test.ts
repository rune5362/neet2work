import { describe, expect, it } from "vitest";
import { aiExecutionMetaSchema, aiSelectionSchema } from "./schemas.js";

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
});
