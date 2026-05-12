import { Router } from "express";
import { z } from "zod";
import { analyzeResume } from "../services/analyze.service.js";

export const analyzeRouter = Router();

const analyzeSchema = z.object({
  resumeText: z.string().min(10),
  jobId: z.string().min(1)
});

analyzeRouter.post("/", async (req, res, next) => {
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
