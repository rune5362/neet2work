import { Router } from "express";
import {
  careerWorkflowAnswerQuestionRequestSchema,
  careerWorkflowNextQuestionRequestSchema,
  careerWorkflowSessionRequestSchema
} from "../services/career-workflow/schemas.js";
import { careerWorkflowService } from "../services/career-workflow/career-workflow.service.js";

export const careerWorkflowRouter = Router();

careerWorkflowRouter.post("/session", (req, res, next) => {
  try {
    const body = careerWorkflowSessionRequestSchema.parse(req.body);
    const data = careerWorkflowService.createSession(body);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

careerWorkflowRouter.post("/next-question", (req, res, next) => {
  try {
    const body = careerWorkflowNextQuestionRequestSchema.parse(req.body);
    const data = careerWorkflowService.getNextQuestion(body.session);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

careerWorkflowRouter.post("/answer-question", (req, res, next) => {
  try {
    const body = careerWorkflowAnswerQuestionRequestSchema.parse(req.body);
    const data = careerWorkflowService.answerQuestion(body);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});
