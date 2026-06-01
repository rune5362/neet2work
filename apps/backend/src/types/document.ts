import type {
  ApplicationDocumentSource,
  ApplicationDocumentType
} from "../generated/prisma/client.js";

export type DocumentListItem = {
  id: string;
  candidateKey: string;
  title: string;
  documentType: ApplicationDocumentType;
  profileId: string | null;
  profileTitle: string | null;
  jobId: string | null;
  jobTitle: string | null;
  company: string | null;
  content: string;
  contentJson: unknown | null;
  source: ApplicationDocumentSource;
  profileSnapshotText: string | null;
  profileSnapshotJson: unknown | null;
  jobSnapshotJson: unknown | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DocumentDetail = DocumentListItem;

export type CreateDocumentInput = {
  candidateKey: string;
  title: string;
  documentType: ApplicationDocumentType;
  profileId?: string | null;
  jobId?: string | null;
  content: string;
  contentJson?: unknown | null;
};

export type UpdateDocumentMetaInput = {
  candidateKey: string;
  title?: string;
  profileId?: string | null;
  jobId?: string | null;
  content?: string;
  contentJson?: unknown | null;
  isArchived?: boolean;
};

export type CopyDocumentInput = {
  candidateKey: string;
};
