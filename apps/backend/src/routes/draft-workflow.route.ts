import { Router } from "express";
import {
  draftWorkflowDraftRequestSchema,
  draftWorkflowPlanRequestSchema,
  draftWorkflowReviseRequestSchema
} from "../services/draft-workflow/schemas.js";
import { draftWorkflowService } from "../services/draft-workflow/draft-workflow.service.js";
import {
  getCodexBridgeLoginStatus,
  startCodexBridgeLogin
} from "../services/ai/codex-login-session.service.js";
import { HttpError } from "../utils/http-error.js";
import { createProtectedAiRouteMiddleware } from "../middleware/protectedAiRoute.js";

/**
 * 자기소개서 문항 분석, 작성 계획, 초안 생성, 수정 요청을 제공하는 AI draft workflow HTTP surface입니다.
 *
 * @remarks
 * provider 상태 조회를 제외한 생성/수정 계열 엔드포인트는 보호된 AI route로 동작하며,
 * route는 요청 검증과 service 호출만 담당합니다.
 */
export const draftWorkflowRouter = Router();
const protectedAiRoute = createProtectedAiRouteMiddleware();

draftWorkflowRouter.get("/providers", async (_req, res, next) => {
  try {
    const providers = await draftWorkflowService.getProviders();
    res.json({ data: providers });
  } catch (error) {
    next(error);
  }
});

draftWorkflowRouter.post("/providers/codex/login", ...protectedAiRoute, async (_req, res, next) => {
  try {
    const data = await startCodexBridgeLogin();
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

draftWorkflowRouter.get("/providers/codex/login/:loginId", ...protectedAiRoute, async (req, res, next) => {
  try {
    const rawLoginId = req.params.loginId;
    const loginId = (Array.isArray(rawLoginId) ? rawLoginId[0] ?? "" : rawLoginId).trim();
    const data = await getCodexBridgeLoginStatus(loginId);
    if (!data) {
      throw new HttpError(404, "Codex 로그인 세션을 찾을 수 없습니다.");
    }

    res.json({ data });
  } catch (error) {
    next(error);
  }
});

draftWorkflowRouter.post("/plan", ...protectedAiRoute, async (req, res, next) => {
  try {
    const body = draftWorkflowPlanRequestSchema.parse(req.body);
    const data = await draftWorkflowService.createPlan(body);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

draftWorkflowRouter.post("/draft", ...protectedAiRoute, async (req, res, next) => {
  try {
    const body = draftWorkflowDraftRequestSchema.parse(req.body);
    const data = await draftWorkflowService.createDraft(body);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

draftWorkflowRouter.post("/revise", ...protectedAiRoute, async (req, res, next) => {
  try {
    const body = draftWorkflowReviseRequestSchema.parse(req.body);
    const data = await draftWorkflowService.reviseDraft(body);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});
