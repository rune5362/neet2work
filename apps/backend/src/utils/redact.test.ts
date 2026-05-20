import { describe, expect, it } from "vitest";
import { redactSensitiveText } from "./redact.js";

describe("redactSensitiveText", () => {
  it("removes credentials from URLs and key-value secrets", () => {
    const redacted = redactSensitiveText(
      "DATABASE_URL=postgresql://user:super-secret@db.example.com/postgres DATABASE_PASSWORD=super-secret token=abc123"
    );

    expect(redacted).toContain("[redacted]");
    expect(redacted).not.toContain("super-secret");
    expect(redacted).not.toContain("abc123");
  });
});
