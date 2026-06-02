import { Router } from "express";
import { z } from "zod";
import {
  copyDocument,
  createDocument,
  deleteDocument,
  getDocument,
  getDocuments,
  protectDocument,
  updateDocumentMeta
} from "../services/document.service.js";
import { getAuthenticatedCandidateKey, getAuthenticatedUserId } from "../utils/auth-session.js";

export const documentRouter = Router();

const optionalTextSchema = z.string().trim().min(1).nullable().optional();
const documentTypeSchema = z.enum(["resume", "cover_letter"]);
const documentListQuerySchema = z.object({
  includeArchived: z.enum(["true", "false"]).optional()
});

const documentListFilterSchema = documentListQuerySchema.extend({
  documentType: documentTypeSchema.optional()
});

const copyDocumentSchema = z.object({});
const deleteDocumentSchema = z.object({});

const createDocumentSchema = z.object({
  title: z.string().trim().min(1),
  documentType: documentTypeSchema,
  profileId: optionalTextSchema,
  jobId: optionalTextSchema,
  content: z.string().min(1),
  contentJson: z.unknown().nullable().optional()
});

const updateDocumentMetaSchema = z.object({
  title: z.string().trim().min(1).optional(),
  profileId: optionalTextSchema,
  jobId: optionalTextSchema,
  content: z.string().min(1).optional(),
  contentJson: z.unknown().nullable().optional(),
  isArchived: z.boolean().optional()
});

function parseIncludeArchived(value: string | undefined) {
  return value === "true";
}

documentRouter.get("/", async (req, res, next) => {
  try {
    const candidateKey = getAuthenticatedCandidateKey(req.get("authorization"));
    const query = documentListFilterSchema.parse(req.query);
    const documents = await getDocuments(candidateKey, {
      documentType: query.documentType,
      includeArchived: parseIncludeArchived(query.includeArchived)
    });

    res.json({
      data: documents,
      count: documents.length
    });
  } catch (error) {
    next(error);
  }
});

documentRouter.post("/", async (req, res, next) => {
  try {
    const candidateKey = getAuthenticatedCandidateKey(req.get("authorization"));
    const actorUserId = getAuthenticatedUserId(req.get("authorization"));
    const body = createDocumentSchema.parse(req.body);
    const document = await createDocument({
      ...body,
      candidateKey,
      actorUserId
    });

    res.status(201).json({
      data: document
    });
  } catch (error) {
    next(error);
  }
});

documentRouter.post("/:documentId/copy", async (req, res, next) => {
  try {
    const candidateKey = getAuthenticatedCandidateKey(req.get("authorization"));
    const actorUserId = getAuthenticatedUserId(req.get("authorization"));
    copyDocumentSchema.parse(req.body);
    const document = await copyDocument(req.params.documentId, { candidateKey, actorUserId });

    res.status(201).json({
      data: document
    });
  } catch (error) {
    next(error);
  }
});

documentRouter.post("/:documentId/delete", async (req, res, next) => {
  try {
    const candidateKey = getAuthenticatedCandidateKey(req.get("authorization"));
    const actorUserId = getAuthenticatedUserId(req.get("authorization"));
    deleteDocumentSchema.parse(req.body);
    const document = await deleteDocument(candidateKey, req.params.documentId, actorUserId);

    res.json({
      data: document
    });
  } catch (error) {
    next(error);
  }
});

documentRouter.get("/:documentId", async (req, res, next) => {
  try {
    const candidateKey = getAuthenticatedCandidateKey(req.get("authorization"));
    const document = await getDocument(candidateKey, req.params.documentId);

    res.json({
      data: document
    });
  } catch (error) {
    next(error);
  }
});

documentRouter.patch("/:documentId", async (req, res, next) => {
  try {
    const candidateKey = getAuthenticatedCandidateKey(req.get("authorization"));
    const actorUserId = getAuthenticatedUserId(req.get("authorization"));
    const body = updateDocumentMetaSchema.parse(req.body);
    const document = await updateDocumentMeta(req.params.documentId, {
      ...body,
      candidateKey,
      actorUserId
    });

    res.json({
      data: document
    });
  } catch (error) {
    next(error);
  }
});

documentRouter.delete("/:documentId", async (req, res, next) => {
  try {
    const candidateKey = getAuthenticatedCandidateKey(req.get("authorization"));
    const actorUserId = getAuthenticatedUserId(req.get("authorization"));
    const document = await protectDocument(candidateKey, req.params.documentId, actorUserId);

    res.json({
      data: document
    });
  } catch (error) {
    next(error);
  }
});
