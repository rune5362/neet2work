import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AiProvider } from "../types/ai-routing.js";
import { AiRouter } from "./ai/ai-router.js";
import { HardcodedFallbackProvider } from "./ai/hardcoded-fallback.provider.js";
import { analyzeResume } from "./analyze.service.js";

vi.mock("./job.service.js", () => ({
  getJobById: vi.fn(async (id: string) => ({
    id,
    title: "프론트엔드 개발자",
    company: "샘플테크",
    location: "서울",
    careerLevel: "신입",
    skills: ["React", "TypeScript", "API"],
    description: "React와 TypeScript 기반 API 연동 화면 개발자를 찾습니다.",
    source: "sample",
    sourceJobId: id,
    country: "KR",
    language: "ko",
    sourceUrl: "https://example.com/jobs/1"
  }))
}));

function createFallbackOnlyRouter() {
  return new AiRouter([new HardcodedFallbackProvider()]);
}

function createCodexAnalyzeRouter(data: unknown) {
  const execute = vi.fn(async () => ({
    data,
    modelId: "codex-test-model",
    latencyMs: 1
  }));
  const provider: AiProvider = {
    id: "codex_bridge",
    label: "Codex Test",
    getStatus: async () => ({
      providerId: "codex_bridge",
      label: "Codex Test",
      online: true,
      configured: true,
      quotaExceeded: false,
      models: [{ modelId: "codex-test-model", label: "Codex Test", online: true, quotaExceeded: false }]
    }),
    execute
  };

  return {
    router: new AiRouter([provider, new HardcodedFallbackProvider()]),
    execute
  };
}

describe("analyzeResume", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("AI provider가 연결되어 있으면 실제 AI 분석 결과를 반환한다", async () => {
    const { router, execute } = createCodexAnalyzeRouter({
      matchScore: 91,
      strengths: ["React와 TypeScript 경험이 공고 요구사항과 직접 연결됩니다."],
      weaknesses: ["성과 수치가 더 구체화되면 좋습니다."],
      missingKeywords: ["테스트 자동화"],
      rewriteGuides: ["문제-행동-결과 순서로 프로젝트 경험을 정리하세요."],
      suggestedSentences: ["React 기반 화면에서 API 연동 안정성을 높인 경험을 직무 역량으로 설명할 수 있습니다."]
    });

    const result = await analyzeResume(
      {
        jobId: "job-001",
        resumeText: "React와 TypeScript를 활용해 API 연동 화면을 구현했습니다.",
        aiSelection: { mode: "manual", providerId: "codex_bridge" }
      },
      router
    );

    expect(execute).toHaveBeenCalledWith(expect.objectContaining({ operation: "analyze" }));
    expect(result).toMatchObject({
      jobId: "job-001",
      mode: "ai",
      matchScore: 91,
      aiMeta: {
        providerId: "codex_bridge",
        modelId: "codex-test-model",
        usedFallback: false
      }
    });
  });

  it("AI provider 응답 형식이 깨지면 규칙 기반 fallback 분석으로 내려간다", async () => {
    const { router } = createCodexAnalyzeRouter({
      matchScore: "높음",
      strengths: "React"
    });

    const result = await analyzeResume(
      {
        jobId: "job-001",
        resumeText: "React로 API 화면을 만들었습니다.",
        aiSelection: { mode: "manual", providerId: "codex_bridge" }
      },
      router
    );

    expect(result.mode).toBe("mock");
    expect(result.aiMeta).toMatchObject({
      providerId: "fallback",
      usedFallback: true,
      fallbackReason: "invalid_output"
    });
  });

  it("사용 가능한 provider가 없으면 demo fallback 분석을 반환한다", async () => {
    const result = await analyzeResume(
      {
        jobId: "job-001",
        resumeText: "React와 TypeScript를 활용해 API 연동 화면을 구현했습니다."
      },
      createFallbackOnlyRouter()
    );

    expect(result.mode).toBe("mock");
    expect(result.jobId).toBe("job-001");
    expect(result.matchScore).toBeGreaterThanOrEqual(80);
    expect(result.aiMeta).toMatchObject({
      providerId: "fallback",
      usedFallback: true
    });
  });
});
