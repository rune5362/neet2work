import type {
  ApplicationDocumentSource,
  ApplicationDocumentStatus,
  ApplicationDocumentType
} from "../generated/prisma/client.js";

export type DocumentListItem = {
  id: string;
  candidateKey: string;
  title: string;
  documentType: ApplicationDocumentType;
  profileId: string | null;
  profileVersionId: string | null;
  profileTitle: string | null;
  jobId: string | null;
  jobTitle: string | null;
  company: string | null;
  currentVersionId: string | null;
  currentVersionNo: number | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DocumentVersion = {
  id: string;
  documentId: string;
  candidateKey: string;
  versionNo: number;
  title: string | null;
  memo: string | null;
  content: string;
  contentJson: unknown | null;
  source: ApplicationDocumentSource;
  status: ApplicationDocumentStatus;
  parentVersionId: string | null;
  profileSnapshotText: string | null;
  profileSnapshotJson: unknown | null;
  jobSnapshotJson: unknown | null;
  createdAt: string;
  updatedAt: string;
};

export type DocumentDetail = DocumentListItem & {
  currentVersion: DocumentVersion | null;
};

export type CreateDocumentInput = {
  candidateKey: string;
  title: string;
  documentType: ApplicationDocumentType;
  profileId?: string | null;
  profileVersionId?: string | null;
  jobId?: string | null;
  content: string;
  contentJson?: unknown | null;
  versionTitle?: string | null;
  memo?: string | null;
};

export type UpdateDocumentMetaInput = {
  candidateKey: string;
  title?: string;
  jobId?: string | null;
  isArchived?: boolean;
};

export type CreateDocumentVersionInput = {
  candidateKey: string;
  content: string;
  contentJson?: unknown | null;
  title?: string | null;
  memo?: string | null;
  source?: ApplicationDocumentSource;
  status?: ApplicationDocumentStatus;
  makeCurrent?: boolean;
};
