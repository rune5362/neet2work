import { Router } from "express";
import { z } from "zod";
import {
  archiveDocument,
  copyDocument,
  createDocument,
  getDocument,
  getDocuments,
  updateDocumentMeta
} from "../services/document.service.js";

export const documentRouter = Router();

const optionalTextSchema = z.string().trim().min(1).nullable().optional();
const documentTypeSchema = z.enum(["resume", "cover_letter"]);
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
  jobId: optionalTextSchema,
  content: z.string().min(1),
  contentJson: z.unknown().nullable().optional(),
  versionTitle: optionalTextSchema,
  memo: optionalTextSchema
});

const updateDocumentMetaSchema = z.object({
  candidateKey: z.string().trim().min(1),
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

function sendDeprecatedVersionResponse(_req: unknown, res: { status: (code: number) => { json: (body: unknown) => void } }) {
  res.status(410).json({
    message: "문서 버전 API는 더 이상 사용하지 않습니다. 문서 복사 API를 사용해 주세요."
  });
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

documentRouter.all("/:documentId/versions", sendDeprecatedVersionResponse);
documentRouter.all("/:documentId/versions/:versionId", sendDeprecatedVersionResponse);
documentRouter.all("/:documentId/versions/:versionId/apply", sendDeprecatedVersionResponse);
documentRouter.all("/:documentId/versions/:versionId/restore", sendDeprecatedVersionResponse);

documentRouter.post("/:documentId/copy", async (req, res, next) => {
  try {
    const body = candidateKeyBodySchema.parse(req.body);
    const document = await copyDocument(req.params.documentId, body);

    res.status(201).json({
      data: document
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
