import type {
  ApplicationDocumentSource,
  ApplicationDocumentType
} from "../generated/prisma/client.js";

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
 * 문서 생성 service가 받는 입력입니다.
 *
 * @remarks
 * `candidateKey`는 소유자 범위, `actorUserId`는 감사 로그 행위자를 표현합니다.
 */
export type CreateDocumentInput = {
  candidateKey: string;
  title: string;
  documentType: ApplicationDocumentType;
  profileId?: string | null;
  jobId?: string | null;
  content: string;
  contentJson?: unknown | null;
  actorUserId?: string | null;
};

/**
 * 문서 본문과 lifecycle 메타데이터를 갱신하는 service 입력입니다.
 */
export type UpdateDocumentMetaInput = {
  candidateKey: string;
  title?: string;
  profileId?: string | null;
  jobId?: string | null;
  content?: string;
  contentJson?: unknown | null;
  isArchived?: boolean;
  actorUserId?: string | null;
};

export type CopyDocumentInput = {
  candidateKey: string;
  actorUserId?: string | null;
};
