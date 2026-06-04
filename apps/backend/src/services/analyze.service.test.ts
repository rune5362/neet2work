import { beforeEach, describe, expect, it } from "vitest";
import { analyzeResume } from "./analyze.service.js";

describe("analyzeResume", () => {
  beforeEach(() => {
    delete process.env.AI_API_KEY;
  });

  it("AI 키가 없으면 mock 분석 결과를 반환한다", async () => {
    const result = await analyzeResume({
      jobId: "job-001",
      resumeText: "React와 TypeScript를 활용해 API 연동 화면을 구현했습니다."
    });

    expect(result.mode).toBe("mock");
    expect(result.jobId).toBe("job-001");
    expect(result.matchScore).toBeGreaterThanOrEqual(80);
  });

  it("AI 키가 있어도 실제 AI 연동 전에는 mock 분석 결과를 반환한다", async () => {
    process.env.AI_API_KEY = "present-but-not-wired";

    const result = await analyzeResume({
      jobId: "job-001",
      resumeText: "React와 TypeScript를 활용해 API 연동 화면을 구현했습니다."
    });

    expect(result.mode).toBe("mock");
  });
});
