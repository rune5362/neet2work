import { Router } from "express";
import {
  draftWorkflowDraftRequestSchema,
  draftWorkflowPlanRequestSchema,
  draftWorkflowReviseRequestSchema
} from "../services/draft-workflow/schemas.js";
import { draftWorkflowService } from "../services/draft-workflow/draft-workflow.service.js";

export const draftWorkflowRouter = Router();

draftWorkflowRouter.get("/providers", async (_req, res, next) => {
  try {
    const providers = await draftWorkflowService.getProviders();
    res.json({ data: providers });
  } catch (error) {
    next(error);
  }
});

draftWorkflowRouter.post("/plan", async (req, res, next) => {
  try {
    const body = draftWorkflowPlanRequestSchema.parse(req.body);
    const data = await draftWorkflowService.createPlan(body);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

draftWorkflowRouter.post("/draft", async (req, res, next) => {
  try {
    const body = draftWorkflowDraftRequestSchema.parse(req.body);
    const data = await draftWorkflowService.createDraft(body);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

draftWorkflowRouter.post("/revise", async (req, res, next) => {
  try {
    const body = draftWorkflowReviseRequestSchema.parse(req.body);
    const data = await draftWorkflowService.reviseDraft(body);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});
