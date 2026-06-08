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

/**
 * 자기소개서 draft workflow의 AI 실행, fallback, 결과 검증을 조율합니다.
 *
 * @remarks
 * route 계층은 Zod로 요청을 검증하고 이 service는 provider 선택, AI 응답 파싱,
 * 근거 잠금 검증, fallback 재시도 같은 domain 결정을 담당합니다.
 */
export class DraftWorkflowService {
  constructor(private readonly router: AiRouter = defaultAiRouter) {}

  /**
   * 현재 draft workflow에서 선택 가능한 AI provider 상태를 반환합니다.
   *
   * @returns provider별 연결 가능 여부와 추천 모델 정보입니다.
   */
  async getProviders() {
    return this.router.listProviderStatuses();
  }

  /**
   * 문항과 사용자 경험 자료를 분석해 작성 계획을 생성합니다.
   *
   * @param request - 목표 문항, 경험 입력, AI provider 선택을 담은 계획 생성 요청입니다.
   * @returns 문항 의도, 경험 카드, 근거 저장소, 문단 outline을 포함한 계획입니다.
   */
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

  /**
   * 확정된 계획과 보완 답변을 바탕으로 자기소개서 초안을 생성합니다.
   *
   * @param request - 계획, 목표 문항, 경험 입력, 선택 outline을 담은 초안 생성 요청입니다.
   * @returns 근거 매핑과 검토 리포트가 포함된 초안입니다.
   */
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

  /**
   * 기존 초안을 검토 이슈나 사용자 요청에 맞게 다시 작성합니다.
   *
   * @param request - 수정 대상 초안, 원 계획, 수정 지시를 담은 요청입니다.
   * @returns 수정 후에도 근거 잠금 검증을 통과한 초안입니다.
   */
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
