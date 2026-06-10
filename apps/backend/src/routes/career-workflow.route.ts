import { Router } from "express";
import {
  careerWorkflowAnswerQuestionRequestSchema,
  careerWorkflowNextQuestionRequestSchema,
  careerWorkflowSessionRequestSchema
} from "../services/career-workflow/schemas.js";
import {
  careerDocumentWorkflowAnswerRequestSchema,
  careerDocumentWorkflowSessionRequestSchema
} from "../services/career-document-workflow/schemas.js";
import { createProtectedAiRouteMiddleware } from "../middleware/protectedAiRoute.js";
import { careerDocumentWorkflowService } from "../services/career-document-workflow/career-document-workflow.service.js";
import { careerWorkflowService } from "../services/career-workflow/career-workflow.service.js";

/**
 * 커리어 문서 작성과 보완 질문 흐름을 제공하는 career workflow HTTP surface입니다.
 *
 * @remarks
 * `/session` 계열은 자료를 근거 저장소로 정리하고, `/document-session` 계열은
 * 첨부 자료와 프로필 컨텍스트를 바탕으로 제출 가능한 문서 패키지까지 생성합니다.
 */
export const careerWorkflowRouter = Router();
const protectedAiRoute = createProtectedAiRouteMiddleware();

careerWorkflowRouter.post("/session", ...protectedAiRoute, (req, res, next) => {
  try {
    const body = careerWorkflowSessionRequestSchema.parse(req.body);
    const data = careerWorkflowService.createSession(body);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

careerWorkflowRouter.post("/document-session", ...protectedAiRoute, async (req, res, next) => {
  try {
    const body = careerDocumentWorkflowSessionRequestSchema.parse(req.body);
    const data = await careerDocumentWorkflowService.createSession(body);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

careerWorkflowRouter.post("/document-session/answer", ...protectedAiRoute, async (req, res, next) => {
  try {
    const body = careerDocumentWorkflowAnswerRequestSchema.parse(req.body);
    const data = await careerDocumentWorkflowService.answerQuestion(body);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

careerWorkflowRouter.post("/next-question", ...protectedAiRoute, (req, res, next) => {
  try {
    const body = careerWorkflowNextQuestionRequestSchema.parse(req.body);
    const data = careerWorkflowService.getNextQuestion(body.session);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

careerWorkflowRouter.post("/answer-question", ...protectedAiRoute, (req, res, next) => {
  try {
    const body = careerWorkflowAnswerQuestionRequestSchema.parse(req.body);
    const data = careerWorkflowService.answerQuestion(body);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});
