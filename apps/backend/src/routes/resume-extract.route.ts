import { Router } from "express";
import { z } from "zod";
import { extractResumeFile } from "../services/resume-extract.service.js";

export const resumeExtractRouter = Router();

const resumeExtractSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().optional(),
  contentBase64: z.string().min(1)
});

resumeExtractRouter.post("/", async (req, res, next) => {
  try {
    const body = resumeExtractSchema.parse(req.body);
    const result = await extractResumeFile(body);

    res.json({
      data: result
    });
  } catch (error) {
    next(error);
  }
});
