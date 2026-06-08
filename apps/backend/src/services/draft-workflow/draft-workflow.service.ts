import type { AiExecutionMeta, AiSelection, AiWorkflowOperation } from "../../types/ai-routing.js";
import type { AiRouter } from "../ai/ai-router.js";
import { defaultAiRouter } from "../ai/ai-router.js";
import type {
  DraftTarget,
  DraftWorkflowDraft,
  DraftWorkflowDraftRequest,
  DraftWorkflowPlan,
  DraftWorkflowPlanRequest,
  DraftWorkflowReviseRequest
} from "../../types/draft-workflow.js";
import { ZodError, type ZodType, type ZodTypeDef } from "zod";
import {
  draftWorkflowDraftSchema,
  draftWorkflowPlanSchema
} from "./schemas.js";
import {
  assertDraftIsEvidenceLocked,
  assertPlanPrioritizesAttachedRequirements
} from "./validation.js";

type RouterResult<T> = { data: T; aiMeta: AiExecutionMeta };

type WorkflowResultSchema<T> = ZodType<T, ZodTypeDef, unknown>;

function parseWorkflowResult<T>(schema: WorkflowResultSchema<T>, result: RouterResult<T>) {
  const data = typeof result.data === "object" && result.data !== null ? result.data : {};
  return schema.parse({
    ...data,
    aiMeta: result.aiMeta,
    mode: result.aiMeta.usedFallback ? "fallback" : "ai"
  });
}

export class DraftWorkflowService {
  constructor(private readonly router: AiRouter = defaultAiRouter) {}

  async getProviders() {
    return this.router.listProviderStatuses();
  }

  async createPlan(request: DraftWorkflowPlanRequest) {
    const payload = {
      target: request.target,
      experienceInput: request.experienceInput
    };
    const parsed = await this.executeAndParse<DraftWorkflowPlan>({
      operation: "plan",
      payload,
      aiSelection: request.aiSelection,
      schema: draftWorkflowPlanSchema
    });

    try {
      assertPlanPrioritizesAttachedRequirements(request.target, parsed);
      return parsed;
    } catch (error) {
      if (parsed.aiMeta.usedFallback) {
        throw error;
      }

      const fallback = await this.router.executeFallback<DraftWorkflowPlan>({
        operation: "plan",
        payload,
        routingMode: parsed.aiMeta.routingMode,
        fallbackReason: "invalid_output"
      });
      const fallbackPlan = parseWorkflowResult(draftWorkflowPlanSchema, fallback);
      assertPlanPrioritizesAttachedRequirements(request.target, fallbackPlan);
      return fallbackPlan;
    }
  }

  async createDraft(request: DraftWorkflowDraftRequest) {
    const payload = {
      target: request.target,
      experienceInput: request.experienceInput,
      plan: request.plan,
      gapAnswers: request.gapAnswers,
      confirmedOutline: request.confirmedOutline
    };
    const parsed = await this.executeAndParse<DraftWorkflowDraft>({
      operation: "draft",
      payload,
      aiSelection: request.aiSelection,
      schema: draftWorkflowDraftSchema
    });
    const normalized = normalizeDraftCharCount(parsed, request.target);

    return this.validateDraftOrFallback({
      operation: "draft",
      payload,
      parsed: normalized,
      target: request.target,
      plan: request.plan
    });
  }

  async reviseDraft(request: DraftWorkflowReviseRequest) {
    const payload = {
      target: request.target,
      draft: request.draft,
      plan: request.plan,
      revisionRequest: request.revisionRequest,
      reviewIssueTypes: request.reviewIssueTypes
    };
    const parsed = await this.executeAndParse<DraftWorkflowDraft>({
      operation: "revise",
      payload,
      aiSelection: request.aiSelection,
      schema: draftWorkflowDraftSchema
    });
    const normalized = normalizeDraftCharCount(parsed, request.target);

    return this.validateDraftOrFallback({
      operation: "revise",
      payload,
      parsed: normalized,
      target: request.target,
      plan: request.plan
    });
  }

  private async executeAndParse<T>(input: {
    operation: AiWorkflowOperation;
    payload: unknown;
    aiSelection: AiSelection;
    schema: WorkflowResultSchema<T>;
  }) {
    const result = await this.router.execute<T>({
      operation: input.operation,
      payload: input.payload,
      aiSelection: input.aiSelection
    });

    try {
      return parseWorkflowResult(input.schema, result);
    } catch (error) {
      if (!(error instanceof ZodError) || result.aiMeta.usedFallback) {
        throw error;
      }

      const fallback = await this.router.executeFallback<T>({
        operation: input.operation,
        payload: input.payload,
        routingMode: result.aiMeta.routingMode,
        fallbackReason: "invalid_output"
      });

      return parseWorkflowResult(input.schema, fallback);
    }
  }

  private async validateDraftOrFallback(input: {
    operation: "draft" | "revise";
    payload: unknown;
    parsed: DraftWorkflowDraft;
    target: DraftTarget;
    plan: DraftWorkflowPlan;
  }) {
    try {
      assertDraftIsEvidenceLocked(input.plan, input.target, input.parsed);
      return input.parsed;
    } catch (error) {
      if (input.parsed.aiMeta.usedFallback) {
        throw error;
      }

      const fallback = await this.router.executeFallback<DraftWorkflowDraft>({
        operation: input.operation,
        payload: input.payload,
        routingMode: input.parsed.aiMeta.routingMode,
        fallbackReason: "invalid_output"
      });
      const parsedFallback = parseWorkflowResult(draftWorkflowDraftSchema, fallback);
      const normalizedFallback = normalizeDraftCharCount(parsedFallback, input.target);
      assertDraftIsEvidenceLocked(input.plan, input.target, normalizedFallback);
      return normalizedFallback;
    }
  }
}

function normalizeDraftCharCount(draft: DraftWorkflowDraft, target: DraftTarget): DraftWorkflowDraft {
  return {
    ...draft,
    charCount: {
      withSpaces: draft.draftText.length,
      withoutSpaces: draft.draftText.replace(/\s/g, "").length,
      limit: target.charLimit ?? draft.charCount.limit
    }
  };
}

export const draftWorkflowService = new DraftWorkflowService();
