import { Router } from "express";
import { z } from "zod";
import { createProtectedAiRouteMiddleware } from "../middleware/protectedAiRoute.js";
import { analyzeResume } from "../services/analyze.service.js";
import { aiSelectionSchema } from "../services/draft-workflow/schemas.js";

export const analyzeRouter = Router();
const protectedAiRoute = createProtectedAiRouteMiddleware();

const analyzeSchema = z.object({
  resumeText: z.string().min(10),
  jobId: z.string().min(1),
  aiSelection: aiSelectionSchema.optional()
});

analyzeRouter.post("/", ...protectedAiRoute, async (req, res, next) => {
  try {
    const body = analyzeSchema.parse(req.body);
    const result = await analyzeResume(body);

    res.json({
      data: result
    });
  } catch (error) {
    next(error);
  }
});
