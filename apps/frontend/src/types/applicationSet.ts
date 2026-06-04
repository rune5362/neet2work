export type ApplicationSetItem = {
  id: string;
  candidateKey: string;
  title: string;
  profileId: string | null;
  profileTitle: string | null;
  resumeDocumentId: string | null;
  resumeTitle: string | null;
  coverLetterDocumentId: string | null;
  coverLetterTitle: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateApplicationSetPayload = {
  title: string;
  profileId?: string | null;
  resumeDocumentId?: string | null;
  coverLetterDocumentId?: string | null;
};

export type UpdateApplicationSetPayload = {
  title?: string;
  profileId?: string | null;
  resumeDocumentId?: string | null;
  coverLetterDocumentId?: string | null;
  isArchived?: boolean;
};
