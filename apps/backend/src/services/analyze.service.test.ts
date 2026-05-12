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
});
