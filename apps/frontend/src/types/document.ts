export type ApplicationDocumentType = "resume" | "cover_letter";
export type ApplicationDocumentSource = "user" | "ai" | "system";

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
  deletedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  deletedBy: string | null;
};

export type DocumentDetail = DocumentListItem;

export type CreateDocumentPayload = {
  title: string;
  documentType: ApplicationDocumentType;
  profileId?: string | null;
  jobId?: string | null;
  content: string;
  contentJson?: unknown | null;
};

export type UpdateDocumentMetaPayload = {
  title?: string;
  profileId?: string | null;
  jobId?: string | null;
  content?: string;
  contentJson?: unknown | null;
  isArchived?: boolean;
};
