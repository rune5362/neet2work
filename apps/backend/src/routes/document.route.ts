import { Router } from "express";
import { z } from "zod";
import {
  applyDocumentVersion,
  archiveDocument,
  archiveDocumentVersion,
  createDocument,
  createDocumentVersion,
  getDocument,
  getDocuments,
  getDocumentVersion,
  getDocumentVersions,
  restoreDocumentVersion,
  updateDocumentMeta
} from "../services/document.service.js";

export const documentRouter = Router();

const optionalTextSchema = z.string().trim().min(1).nullable().optional();
const documentTypeSchema = z.enum(["resume", "cover_letter"]);
const documentSourceSchema = z.enum(["user", "ai", "system"]);
const documentStatusSchema = z.enum(["draft", "active", "archived"]);

const candidateKeyQuerySchema = z.object({
  candidateKey: z.string().trim().min(1),
  includeArchived: z.enum(["true", "false"]).optional()
});

const documentListQuerySchema = candidateKeyQuerySchema.extend({
  documentType: documentTypeSchema.optional()
});

const candidateKeyBodySchema = z.object({
  candidateKey: z.string().trim().min(1)
});

const createDocumentSchema = z.object({
  candidateKey: z.string().trim().min(1),
  title: z.string().trim().min(1),
  documentType: documentTypeSchema,
  profileId: optionalTextSchema,
  profileVersionId: optionalTextSchema,
  jobId: optionalTextSchema,
  content: z.string().min(1),
  contentJson: z.unknown().nullable().optional(),
  versionTitle: optionalTextSchema,
  memo: optionalTextSchema
});

const updateDocumentMetaSchema = z.object({
  candidateKey: z.string().trim().min(1),
  title: z.string().trim().min(1).optional(),
  jobId: optionalTextSchema,
  isArchived: z.boolean().optional()
});

const createDocumentVersionSchema = z.object({
  candidateKey: z.string().trim().min(1),
  content: z.string().min(1),
  contentJson: z.unknown().nullable().optional(),
  title: optionalTextSchema,
  memo: optionalTextSchema,
  source: documentSourceSchema.optional(),
  status: documentStatusSchema.optional(),
  makeCurrent: z.boolean().optional()
});

function parseIncludeArchived(value: string | undefined) {
  return value === "true";
}

documentRouter.get("/", async (req, res, next) => {
  try {
    const query = documentListQuerySchema.parse(req.query);
    const documents = await getDocuments(query.candidateKey, {
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
    const body = createDocumentSchema.parse(req.body);
    const document = await createDocument(body);

    res.status(201).json({
      data: document
    });
  } catch (error) {
    next(error);
  }
});

documentRouter.get("/:documentId/versions", async (req, res, next) => {
  try {
    const query = candidateKeyQuerySchema.parse(req.query);
    const versions = await getDocumentVersions(query.candidateKey, req.params.documentId, {
      includeArchived: parseIncludeArchived(query.includeArchived)
    });

    res.json({
      data: versions,
      count: versions.length
    });
  } catch (error) {
    next(error);
  }
});

documentRouter.post("/:documentId/versions", async (req, res, next) => {
  try {
    const body = createDocumentVersionSchema.parse(req.body);
    const version = await createDocumentVersion(req.params.documentId, body);

    res.status(201).json({
      data: version
    });
  } catch (error) {
    next(error);
  }
});

documentRouter.get("/:documentId/versions/:versionId", async (req, res, next) => {
  try {
    const query = candidateKeyQuerySchema.parse(req.query);
    const version = await getDocumentVersion(query.candidateKey, req.params.documentId, req.params.versionId);

    res.json({
      data: version
    });
  } catch (error) {
    next(error);
  }
});

documentRouter.post("/:documentId/versions/:versionId/apply", async (req, res, next) => {
  try {
    const body = candidateKeyBodySchema.parse(req.body);
    const version = await applyDocumentVersion(body.candidateKey, req.params.documentId, req.params.versionId);

    res.json({
      data: version
    });
  } catch (error) {
    next(error);
  }
});

documentRouter.post("/:documentId/versions/:versionId/restore", async (req, res, next) => {
  try {
    const body = candidateKeyBodySchema.parse(req.body);
    const version = await restoreDocumentVersion(body.candidateKey, req.params.documentId, req.params.versionId);

    res.status(201).json({
      data: version
    });
  } catch (error) {
    next(error);
  }
});

documentRouter.delete("/:documentId/versions/:versionId", async (req, res, next) => {
  try {
    const body = candidateKeyBodySchema.parse(req.body);
    const version = await archiveDocumentVersion(body.candidateKey, req.params.documentId, req.params.versionId);

    res.json({
      data: version
    });
  } catch (error) {
    next(error);
  }
});

documentRouter.get("/:documentId", async (req, res, next) => {
  try {
    const query = candidateKeyQuerySchema.parse(req.query);
    const document = await getDocument(query.candidateKey, req.params.documentId);

    res.json({
      data: document
    });
  } catch (error) {
    next(error);
  }
});

documentRouter.patch("/:documentId", async (req, res, next) => {
  try {
    const body = updateDocumentMetaSchema.parse(req.body);
    const document = await updateDocumentMeta(req.params.documentId, body);

    res.json({
      data: document
    });
  } catch (error) {
    next(error);
  }
});

documentRouter.delete("/:documentId", async (req, res, next) => {
  try {
    const query = candidateKeyQuerySchema.parse(req.query);
    const document = await archiveDocument(query.candidateKey, req.params.documentId);

    res.json({
      data: document
    });
  } catch (error) {
    next(error);
  }
});
