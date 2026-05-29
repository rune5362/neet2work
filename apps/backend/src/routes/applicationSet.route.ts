import { Router } from "express";
import { z } from "zod";
import {
  archiveApplicationSet,
  createApplicationSet,
  getApplicationSet,
  getApplicationSets,
  updateApplicationSet
} from "../services/applicationSet.service.js";

export const applicationSetRouter = Router();

const optionalTextSchema = z.string().trim().min(1).nullable().optional();

const candidateKeyQuerySchema = z.object({
  candidateKey: z.string().trim().min(1),
  includeArchived: z.enum(["true", "false"]).optional()
});

const createApplicationSetSchema = z.object({
  candidateKey: z.string().trim().min(1),
  title: z.string().trim().min(1),
  profileId: optionalTextSchema,
  resumeDocumentId: optionalTextSchema,
  coverLetterDocumentId: optionalTextSchema
});

const updateApplicationSetSchema = z.object({
  candidateKey: z.string().trim().min(1),
  title: z.string().trim().min(1).optional(),
  profileId: optionalTextSchema,
  resumeDocumentId: optionalTextSchema,
  coverLetterDocumentId: optionalTextSchema,
  isArchived: z.boolean().optional()
});

function parseIncludeArchived(value: string | undefined) {
  return value === "true";
}

applicationSetRouter.get("/", async (req, res, next) => {
  try {
    const query = candidateKeyQuerySchema.parse(req.query);
    const sets = await getApplicationSets(query.candidateKey, {
      includeArchived: parseIncludeArchived(query.includeArchived)
    });

    res.json({
      data: sets,
      count: sets.length
    });
  } catch (error) {
    next(error);
  }
});

applicationSetRouter.post("/", async (req, res, next) => {
  try {
    const body = createApplicationSetSchema.parse(req.body);
    const set = await createApplicationSet(body);

    res.status(201).json({
      data: set
    });
  } catch (error) {
    next(error);
  }
});

applicationSetRouter.get("/:setId", async (req, res, next) => {
  try {
    const query = candidateKeyQuerySchema.parse(req.query);
    const set = await getApplicationSet(query.candidateKey, req.params.setId);

    res.json({
      data: set
    });
  } catch (error) {
    next(error);
  }
});

applicationSetRouter.patch("/:setId", async (req, res, next) => {
  try {
    const body = updateApplicationSetSchema.parse(req.body);
    const set = await updateApplicationSet(req.params.setId, body);

    res.json({
      data: set
    });
  } catch (error) {
    next(error);
  }
});

applicationSetRouter.delete("/:setId", async (req, res, next) => {
  try {
    const query = candidateKeyQuerySchema.parse(req.query);
    const set = await archiveApplicationSet(query.candidateKey, req.params.setId);

    res.json({
      data: set
    });
  } catch (error) {
    next(error);
  }
});
