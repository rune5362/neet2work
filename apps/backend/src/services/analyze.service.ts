import { z } from "zod";
import type { AnalysisResult } from "../types/analysis.js";
import type { AiExecutionMeta, AiSelection, FallbackReason } from "../types/ai-routing.js";
import { defaultAiRouter, type AiRouter } from "./ai/ai-router.js";
import { buildFallbackAnalysis, type AnalyzeFallbackInput } from "./analysis-fallback.js";
import { getJobById } from "./job.service.js";

type AnalyzeInput = {
  resumeText: string;
  jobId: string;
  aiSelection?: AiSelection;
};

const analysisPayloadSchema = z.object({
  matchScore: z.number().min(0).max(100),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  missingKeywords: z.array(z.string()),
  rewriteGuides: z.array(z.string()),
  suggestedSentences: z.array(z.string())
});

export async function analyzeResume(
  input: AnalyzeInput,
  router: AiRouter = defaultAiRouter
): Promise<AnalysisResult> {
  const payload = await buildAnalyzePayload(input);
  const aiSelection = input.aiSelection ?? { mode: "auto" as const };

  try {
    const result = await router.execute<unknown>({
      operation: "analyze",
      payload,
      aiSelection
    });
    const parsed = analysisPayloadSchema.safeParse(result.data);

    if (!parsed.success) {
      return executeAnalyzeFallback(router, payload, aiSelection, "invalid_output");
    }

    return {
      ...parsed.data,
      jobId: input.jobId,
      mode: result.aiMeta.usedFallback ? "mock" : "ai",
      aiMeta: result.aiMeta
    };
  } catch {
    return executeAnalyzeFallback(router, payload, aiSelection, "provider_error");
  }
}

async function buildAnalyzePayload(input: AnalyzeInput): Promise<AnalyzeFallbackInput> {
  const job = await getJobById(input.jobId).catch(() => undefined);

  return {
    resumeText: input.resumeText,
    jobId: input.jobId,
    job: job
      ? {
          title: job.title,
          company: job.company,
          description: job.description,
          skills: job.skills
        }
      : null
  };
}

async function executeAnalyzeFallback(
  router: AiRouter,
  payload: AnalyzeFallbackInput,
  aiSelection: AiSelection,
  fallbackReason: FallbackReason
): Promise<AnalysisResult> {
  try {
    const fallback = await router.executeFallback<AnalysisResult>({
      operation: "analyze",
      payload,
      routingMode: aiSelection.mode,
      fallbackReason
    });
    const parsed = analysisPayloadSchema.parse(fallback.data);

    return {
      ...parsed,
      jobId: payload.jobId,
      mode: "mock",
      aiMeta: fallback.aiMeta
    };
  } catch {
    return {
      ...buildFallbackAnalysis(payload),
      aiMeta: buildLocalFallbackMeta(aiSelection, fallbackReason)
    };
  }
}

function buildLocalFallbackMeta(aiSelection: AiSelection, fallbackReason: FallbackReason): AiExecutionMeta {
  return {
    providerId: "fallback",
    modelId: "rule-analyze",
    routingMode: aiSelection.mode,
    usedFallback: true,
    fallbackReason
  };
}
