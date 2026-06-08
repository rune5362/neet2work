export type ApplicationDocumentType = "resume" | "cover_letter";
export type ApplicationDocumentSource = "user" | "ai" | "system";

/**
 * 후보자가 작성하거나 AI가 생성한 지원 문서 목록/상세 응답 항목입니다.
 */
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

/**
 * 지원 문서 생성 요청 payload입니다.
 */
export type CreateDocumentPayload = {
  title: string;
  documentType: ApplicationDocumentType;
  profileId?: string | null;
  jobId?: string | null;
  content: string;
  contentJson?: unknown | null;
};

/**
 * 지원 문서 본문과 lifecycle 메타데이터 수정 요청 payload입니다.
 */
export type UpdateDocumentMetaPayload = {
  title?: string;
  profileId?: string | null;
  jobId?: string | null;
  content?: string;
  contentJson?: unknown | null;
  isArchived?: boolean;
};
