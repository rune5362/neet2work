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
