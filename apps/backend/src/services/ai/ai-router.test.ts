import { beforeEach, describe, expect, it } from "vitest";
import { AiRouter } from "./ai-router.js";
import { HardcodedFallbackProvider } from "./hardcoded-fallback.provider.js";
import type { AiProvider, AiProviderStatus } from "../../types/ai-routing.js";
import { ProviderExecutionError } from "./provider-utils.js";

function createStubProvider(input: {
  id: AiProvider["id"];
  status: AiProviderStatus;
  shouldFail?: boolean;
  failCode?: ProviderExecutionError["code"];
}): AiProvider {
  return {
    id: input.id,
    label: input.id,
    getStatus: async () => input.status,
    execute: async () => {
      if (input.shouldFail) {
        throw new ProviderExecutionError(input.failCode ?? "provider_error", "stub failure");
      }
      return {
        data: { ok: true, provider: input.id },
        modelId: "stub-model",
        latencyMs: 12
      };
    }
  };
}

describe("AiRouter", () => {
  beforeEach(() => {
    delete process.env.AI_PROVIDER_ORDER;
  });

  it("auto mode tries providers in order and uses the first online provider", async () => {
    const router = new AiRouter([
      createStubProvider({
        id: "codex_bridge",
        status: {
          providerId: "codex_bridge",
          label: "Codex",
          online: false,
          configured: true,
          quotaExceeded: false,
          models: []
        },
        shouldFail: true,
        failCode: "offline"
      }),
      createStubProvider({
        id: "gemini",
        status: {
          providerId: "gemini",
          label: "Gemini",
          online: true,
          configured: true,
          quotaExceeded: false,
          models: [{ modelId: "gemini-pro", label: "gemini-pro", online: true, quotaExceeded: false }]
        }
      }),
      new HardcodedFallbackProvider()
    ]);

    const result = await router.execute({
      operation: "plan",
      payload: { target: {}, experienceInput: {} },
      aiSelection: { mode: "auto" }
    });

    expect(result.aiMeta.usedFallback).toBe(false);
    expect(result.aiMeta.providerId).toBe("gemini");
  });

  it("manual mode uses the selected provider on success and does not execute fallback", async () => {
    let fallbackExecuteCount = 0;
    const router = new AiRouter([
      createStubProvider({
        id: "gemini",
        status: {
          providerId: "gemini",
          label: "Gemini",
          online: true,
          configured: true,
          quotaExceeded: false,
          models: [{ modelId: "gemini-pro", label: "gemini-pro", online: true, quotaExceeded: false }]
        }
      }),
      {
        id: "fallback",
        label: "Fallback",
        getStatus: async () => ({
          providerId: "fallback",
          label: "Fallback",
          online: true,
          configured: true,
          quotaExceeded: false,
          models: [{ modelId: "hardcoded-demo", label: "Demo", online: true, quotaExceeded: false }]
        }),
        execute: async () => {
          fallbackExecuteCount += 1;
          return {
            data: { ok: true, provider: "fallback" },
            modelId: "hardcoded-demo",
            latencyMs: 12
          };
        }
      }
    ]);

    const result = await router.execute({
      operation: "plan",
      payload: {
        target: {
          company: "Neet2Work",
          role: "Frontend",
          questionText: "Describe a practical work experience.",
          charCountRule: "with_spaces",
          jobPostingText: "Frontend Product Work",
          blindRecruitment: false
        },
        experienceInput: { manualExperienceText: "I collaborated on React product work." }
      },
      aiSelection: { mode: "manual", providerId: "gemini", modelId: "gemini-pro" }
    });

    expect(result.aiMeta.usedFallback).toBe(false);
    expect(result.aiMeta.providerId).toBe("gemini");
    expect(fallbackExecuteCount).toBe(0);
  });

  it("manual mode falls back when selected provider is offline", async () => {
    const router = new AiRouter([
      createStubProvider({
        id: "gemini",
        status: {
          providerId: "gemini",
          label: "Gemini",
          online: false,
          configured: true,
          quotaExceeded: false,
          models: []
        },
        shouldFail: true,
        failCode: "offline"
      }),
      new HardcodedFallbackProvider()
    ]);

    const result = await router.execute({
      operation: "plan",
      payload: {
        target: {
          company: "Acme",
          role: "Backend",
          questionText: "지원 동기를 작성하세요.",
          charCountRule: "with_spaces",
          jobPostingText: "Node.js REST API 경험 우대",
          blindRecruitment: false
        },
        experienceInput: { manualExperienceText: "Node.js API 서버 운영 경험이 있습니다." }
      },
      aiSelection: { mode: "manual", providerId: "gemini", modelId: "gemini-pro" }
    });

    expect(result.aiMeta.usedFallback).toBe(true);
    expect(result.aiMeta.fallbackReason).toBe("offline");
    expect(result.aiMeta.providerId).toBe("fallback");
  });

  it("manual mode does not auto-failover to another paid provider", async () => {
    const router = new AiRouter([
      createStubProvider({
        id: "gemini",
        status: {
          providerId: "gemini",
          label: "Gemini",
          online: false,
          configured: true,
          quotaExceeded: true,
          models: []
        },
        shouldFail: true,
        failCode: "quota_exceeded"
      }),
      createStubProvider({
        id: "local",
        status: {
          providerId: "local",
          label: "Local",
          online: true,
          configured: true,
          quotaExceeded: false,
          models: [{ modelId: "llama", label: "llama", online: true, quotaExceeded: false }]
        }
      }),
      new HardcodedFallbackProvider()
    ]);

    const result = await router.execute({
      operation: "plan",
      payload: {
        target: {
          company: "Acme",
          role: "Backend",
          questionText: "지원 동기를 작성하세요.",
          charCountRule: "with_spaces",
          jobPostingText: "Node.js REST API 경험 우대",
          blindRecruitment: false
        },
        experienceInput: { manualExperienceText: "Node.js API 서버 운영 경험이 있습니다." }
      },
      aiSelection: { mode: "manual", providerId: "gemini" }
    });

    expect(result.aiMeta.usedFallback).toBe(true);
    expect(result.aiMeta.fallbackReason).toBe("quota_exceeded");
  });

  it("auto mode uses hardcoded fallback when all providers are offline", async () => {
    const router = new AiRouter([
      createStubProvider({
        id: "codex_bridge",
        status: {
          providerId: "codex_bridge",
          label: "Codex",
          online: false,
          configured: false,
          quotaExceeded: false,
          models: []
        }
      }),
      createStubProvider({
        id: "gemini",
        status: {
          providerId: "gemini",
          label: "Gemini",
          online: false,
          configured: false,
          quotaExceeded: false,
          models: []
        }
      }),
      createStubProvider({
        id: "local",
        status: {
          providerId: "local",
          label: "Local",
          online: false,
          configured: false,
          quotaExceeded: false,
          models: []
        }
      }),
      new HardcodedFallbackProvider()
    ]);

    const result = await router.execute({
      operation: "plan",
      payload: {
        target: {
          company: "Acme",
          role: "Backend",
          questionText: "지원 동기를 작성하세요.",
          charCountRule: "with_spaces",
          jobPostingText: "Node.js REST API 경험 우대",
          blindRecruitment: false
        },
        experienceInput: { manualExperienceText: "Node.js API 서버 운영 경험이 있습니다." }
      },
      aiSelection: { mode: "auto" }
    });

    expect(result.aiMeta.usedFallback).toBe(true);
    expect(result.aiMeta.providerId).toBe("fallback");
    expect(result.aiMeta.fallbackReason).toBe("offline");
  });

  it("auto mode falls back when provider returns invalid JSON output", async () => {
    const router = new AiRouter([
      createStubProvider({
        id: "gemini",
        status: {
          providerId: "gemini",
          label: "Gemini",
          online: true,
          configured: true,
          quotaExceeded: false,
          models: [{ modelId: "gemini-pro", label: "gemini-pro", online: true, quotaExceeded: false }]
        },
        shouldFail: true,
        failCode: "invalid_output"
      }),
      new HardcodedFallbackProvider()
    ]);

    const result = await router.execute({
      operation: "plan",
      payload: {
        target: {
          company: "Acme",
          role: "Backend",
          questionText: "지원 동기를 작성하세요.",
          charCountRule: "with_spaces",
          jobPostingText: "Node.js REST API 경험 우대",
          blindRecruitment: false
        },
        experienceInput: { manualExperienceText: "Node.js API 서버 운영 경험이 있습니다." }
      },
      aiSelection: { mode: "auto" }
    });

    expect(result.aiMeta.usedFallback).toBe(true);
    expect(result.aiMeta.fallbackReason).toBe("invalid_output");
  });
});

describe("HardcodedFallbackProvider", () => {
  it("returns plan envelope with experience cards and outline", async () => {
    const provider = new HardcodedFallbackProvider();
    const result = await provider.execute({
      operation: "plan",
      payload: {
        target: {
          company: "Neet2Work",
          role: "Frontend",
          questionText: "협업 경험을 작성하세요.",
          charCountRule: "with_spaces",
          jobPostingText: "React TypeScript REST API",
          blindRecruitment: true
        },
        experienceInput: {
          manualExperienceText: "React와 TypeScript로 사용자 대시보드를 개발했습니다."
        }
      },
      timeoutMs: 1000
    });

    const plan = result.data as {
      experienceCards: unknown[];
      fitAssessments: unknown[];
      answerStrategy: unknown;
      outline: unknown[];
      aiMeta?: { usedFallback?: boolean };
    };

    expect(plan.experienceCards.length).toBeGreaterThan(0);
    expect(plan.fitAssessments.length).toBeGreaterThan(0);
    expect(plan.answerStrategy).toBeTruthy();
    expect(plan.outline.length).toBeGreaterThan(0);
  });

  it("returns draft envelope with review report and revision options", async () => {
    const provider = new HardcodedFallbackProvider();
    const planResult = await provider.execute({
      operation: "plan",
      payload: {
        target: {
          company: "Neet2Work",
          role: "Frontend",
          questionText: "협업 경험을 작성하세요.",
          charCountRule: "with_spaces",
          jobPostingText: "React TypeScript REST API",
          blindRecruitment: true
        },
        experienceInput: {
          manualExperienceText: "React와 TypeScript로 사용자 대시보드를 개발했습니다."
        }
      },
      timeoutMs: 1000
    });

    const draft = await provider.execute({
      operation: "draft",
      payload: {
        target: {
          company: "Neet2Work",
          role: "Frontend",
          questionText: "협업 경험을 작성하세요.",
          charCountRule: "with_spaces",
          jobPostingText: "React TypeScript REST API",
          blindRecruitment: true
        },
        experienceInput: {
          manualExperienceText: "React와 TypeScript로 사용자 대시보드를 개발했습니다."
        },
        plan: planResult.data
      },
      timeoutMs: 1000
    });

    const parsed = draft.data as {
      draftText: string;
      evidenceMap: unknown[];
      reviewReport: unknown;
      revisionOptions: string[];
    };

    expect(parsed.draftText.length).toBeGreaterThan(20);
    expect(parsed.evidenceMap.length).toBeGreaterThan(0);
    expect(parsed.reviewReport).toBeTruthy();
    expect(parsed.revisionOptions.length).toBeGreaterThan(0);
  });
});
