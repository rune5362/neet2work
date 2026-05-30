import type { DraftWorkflowDraft, DraftWorkflowPlan } from "../../types/draft-workflow.js";
import type { AiExecutionMeta, AiSelection, AiWorkflowOperation } from "../../types/ai-routing.js";
import type { AiRouter } from "../ai/ai-router.js";
import { defaultAiRouter } from "../ai/ai-router.js";
import type {
  DraftWorkflowDraftRequest,
  DraftWorkflowPlanRequest,
  DraftWorkflowReviseRequest
} from "../../types/draft-workflow.js";
import { ZodError, type ZodType } from "zod";
import {
  draftWorkflowDraftSchema,
  draftWorkflowPlanSchema
} from "./schemas.js";
import { assertDraftIsEvidenceLocked } from "./validation.js";

type RouterResult<T> = { data: T; aiMeta: AiExecutionMeta };

function parseWorkflowResult<T>(schema: ZodType<T>, result: RouterResult<T>) {
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
    return this.executeAndParse<DraftWorkflowPlan>({
      operation: "plan",
      payload,
      aiSelection: request.aiSelection,
      schema: draftWorkflowPlanSchema
    });
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

    assertDraftIsEvidenceLocked(request.plan, request.target, parsed);

    return parsed;
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

    assertDraftIsEvidenceLocked(request.plan, request.target, parsed);

    return parsed;
  }

  private async executeAndParse<T>(input: {
    operation: AiWorkflowOperation;
    payload: unknown;
    aiSelection: AiSelection;
    schema: ZodType<T>;
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
}

export const draftWorkflowService = new DraftWorkflowService();
