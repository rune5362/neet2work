import { Router } from "express";
import { z } from "zod";
import {
  archiveApplicationSet,
  createApplicationSet,
  getApplicationSet,
  getApplicationSets,
  updateApplicationSet
} from "../services/applicationSet.service.js";
import { getAuthenticatedCandidateKey } from "../utils/auth-session.js";

export const applicationSetRouter = Router();

const optionalTextSchema = z.string().trim().min(1).nullable().optional();

const applicationSetListQuerySchema = z.object({
  includeArchived: z.enum(["true", "false"]).optional()
});

const createApplicationSetSchema = z.object({
  title: z.string().trim().min(1),
  profileId: optionalTextSchema,
  resumeDocumentId: optionalTextSchema,
  coverLetterDocumentId: optionalTextSchema
});

const updateApplicationSetSchema = z.object({
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
    const candidateKey = getAuthenticatedCandidateKey(req.get("authorization"));
    const query = applicationSetListQuerySchema.parse(req.query);
    const sets = await getApplicationSets(candidateKey, {
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
    const candidateKey = getAuthenticatedCandidateKey(req.get("authorization"));
    const body = createApplicationSetSchema.parse(req.body);
    const set = await createApplicationSet({
      ...body,
      candidateKey
    });

    res.status(201).json({
      data: set
    });
  } catch (error) {
    next(error);
  }
});

applicationSetRouter.get("/:setId", async (req, res, next) => {
  try {
    const candidateKey = getAuthenticatedCandidateKey(req.get("authorization"));
    const set = await getApplicationSet(candidateKey, req.params.setId);

    res.json({
      data: set
    });
  } catch (error) {
    next(error);
  }
});

applicationSetRouter.patch("/:setId", async (req, res, next) => {
  try {
    const candidateKey = getAuthenticatedCandidateKey(req.get("authorization"));
    const body = updateApplicationSetSchema.parse(req.body);
    const set = await updateApplicationSet(req.params.setId, {
      ...body,
      candidateKey
    });

    res.json({
      data: set
    });
  } catch (error) {
    next(error);
  }
});

applicationSetRouter.delete("/:setId", async (req, res, next) => {
  try {
    const candidateKey = getAuthenticatedCandidateKey(req.get("authorization"));
    const set = await archiveApplicationSet(candidateKey, req.params.setId);

    res.json({
      data: set
    });
  } catch (error) {
    next(error);
  }
});
