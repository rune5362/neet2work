import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ApplicationDocumentSource,
  type ApplicationDocument,
  type ApplicationDocumentType,
  type JobPosting,
  type Prisma,
  type PrismaClient
} from "../generated/prisma/client.js";
import { getPrismaClient } from "../database/prisma.js";
import { HttpError } from "../errors/httpError.js";
import type {
  CopyDocumentInput,
  CreateDocumentInput,
  DocumentDetail,
  DocumentListItem,
  UpdateDocumentMetaInput
} from "../types/document.js";
import { getJobs } from "./job.service.js";
import { getProfile } from "./profile.service.js";

const serviceDir = path.dirname(fileURLToPath(import.meta.url));
const sampleDocumentsPath = path.resolve(serviceDir, "../../data/sampleDocuments.json");

type DocumentDb = Pick<
  PrismaClient,
  | "applicationDocument"
  | "candidateProfile"
  | "jobPosting"
>;
type DocumentMemoryStore = {
  initialized: boolean;
  documents: DocumentListItem[];
};
type JobSnapshot = Pick<
  JobPosting,
  "id" | "title" | "company" | "location" | "careerLevel" | "skills" | "description" | "sourceUrl"
>;

const documentMemoryStore: DocumentMemoryStore = {
  initialized: false,
  documents: []
};

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}

function toDocumentListItem(
  document: ApplicationDocument,
  profileTitle: string | null = null,
  job: Pick<JobPosting, "title" | "company"> | null = null
): DocumentListItem {
  return {
    id: document.id,
    candidateKey: document.candidateKey,
    title: document.title,
    documentType: document.documentType,
    profileId: document.profileId,
    profileTitle,
    jobId: document.jobId,
    jobTitle: job?.title ?? null,
    company: job?.company ?? null,
    content: document.content,
    contentJson: document.contentJson,
    source: document.source,
    profileSnapshotText: document.profileSnapshotText,
    profileSnapshotJson: document.profileSnapshotJson,
    jobSnapshotJson: document.jobSnapshotJson,
    isArchived: document.isArchived,
    createdAt: toIsoString(document.createdAt),
    updatedAt: toIsoString(document.updatedAt)
  };
}

async function readSampleJson<T>(filePath: string, fallback: T) {
  try {
    const file = await fs.readFile(filePath, "utf-8");
    return JSON.parse(file) as T;
  } catch {
    return fallback;
  }
}

async function getDocumentMemoryStore() {
  if (!documentMemoryStore.initialized) {
    documentMemoryStore.documents = await readSampleJson<DocumentListItem[]>(sampleDocumentsPath, []);
    documentMemoryStore.initialized = true;
  }

  return documentMemoryStore;
}

function createMemoryId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function toMemoryDocumentDetail(document: DocumentListItem): DocumentDetail {
  return document;
}

async function findMemoryDocument(candidateKey: string, documentId: string) {
  const store = await getDocumentMemoryStore();
  const document = store.documents.find((item) => item.id === documentId && item.candidateKey === candidateKey);

  if (!document) {
    throw new HttpError(404, "문서를 찾을 수 없습니다.");
  }

  return document;
}

async function getMemoryDocuments(
  candidateKey: string,
  filters: { documentType?: ApplicationDocumentType; includeArchived?: boolean } = {}
) {
  const store = await getDocumentMemoryStore();
  return store.documents
    .filter(
      (document) =>
        document.candidateKey === candidateKey &&
        (filters.includeArchived || !document.isArchived) &&
        (!filters.documentType || document.documentType === filters.documentType)
    )
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .map((document) => document);
}

async function getMemoryDocument(candidateKey: string, documentId: string): Promise<DocumentDetail> {
  const document = await findMemoryDocument(candidateKey, documentId);
  return toMemoryDocumentDetail(document);
}

async function findMemoryProfileSnapshot(
  candidateKey: string,
  profileId?: string | null
) {
  if (!profileId) {
    return {
      profileId: null,
      profileTitle: null,
      profileSnapshotText: null,
      profileSnapshotJson: null
    };
  }

  const profile = await getProfile(candidateKey, profileId);

  return {
    profileId: profile.id,
    profileTitle: profile.title,
    profileSnapshotText: profile.profileText,
    profileSnapshotJson: profile.profileJson
  };
}

async function findMemoryJobSnapshot(jobId?: string | null): Promise<JobSnapshot | null> {
  if (!jobId) {
    return null;
  }

  const jobs = await getJobs();
  const job = jobs.find((item) => item.id === jobId);

  if (!job) {
    throw new HttpError(400, "연결할 채용공고를 찾을 수 없습니다.");
  }

  return {
    id: job.id,
    title: job.title,
    company: job.company,
    location: job.location,
    careerLevel: job.careerLevel,
    skills: job.skills,
    description: job.description,
    sourceUrl: job.sourceUrl
  };
}

async function createMemoryDocument(input: CreateDocumentInput) {
  const store = await getDocumentMemoryStore();
  const profileSnapshot = await findMemoryProfileSnapshot(input.candidateKey, input.profileId);
  const jobSnapshot = await findMemoryJobSnapshot(input.jobId);
  const timestamp = nowIso();
  const documentId = createMemoryId("document");
  const document: DocumentListItem = {
    id: documentId,
    candidateKey: input.candidateKey,
    title: input.title,
    documentType: input.documentType,
    profileId: profileSnapshot.profileId,
    profileTitle: profileSnapshot.profileTitle,
    jobId: jobSnapshot?.id ?? null,
    jobTitle: jobSnapshot?.title ?? null,
    company: jobSnapshot?.company ?? null,
    content: input.content,
    contentJson: input.contentJson ?? null,
    source: ApplicationDocumentSource.user,
    profileSnapshotText: profileSnapshot.profileSnapshotText,
    profileSnapshotJson: profileSnapshot.profileSnapshotJson,
    jobSnapshotJson: jobSnapshot,
    isArchived: false,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  store.documents.push(document);

  return toMemoryDocumentDetail(document);
}

async function updateMemoryDocumentMeta(documentId: string, input: UpdateDocumentMetaInput) {
  const store = await getDocumentMemoryStore();
  const document = await findMemoryDocument(input.candidateKey, documentId);
  const profileSnapshot =
    input.profileId === undefined
      ? undefined
      : await findMemoryProfileSnapshot(input.candidateKey, input.profileId);
  const jobSnapshot = input.jobId === undefined ? undefined : await findMemoryJobSnapshot(input.jobId);
  const updatedDocument: DocumentListItem = {
    ...document,
    ...(input.title === undefined ? {} : { title: input.title }),
    ...(profileSnapshot === undefined
      ? {}
      : {
          profileId: profileSnapshot.profileId,
          profileTitle: profileSnapshot.profileTitle,
          profileSnapshotText: profileSnapshot.profileSnapshotText,
          profileSnapshotJson: profileSnapshot.profileSnapshotJson
        }),
    ...(input.jobId === undefined
      ? {}
      : {
          jobId: jobSnapshot?.id ?? null,
          jobTitle: jobSnapshot?.title ?? null,
          company: jobSnapshot?.company ?? null,
          jobSnapshotJson: jobSnapshot
        }),
    ...(input.content === undefined ? {} : { content: input.content }),
    ...(input.contentJson === undefined ? {} : { contentJson: input.contentJson }),
    ...(input.isArchived === undefined ? {} : { isArchived: input.isArchived }),
    updatedAt: nowIso()
  };

  store.documents = store.documents.map((item) => (item.id === documentId ? updatedDocument : item));
  return getMemoryDocument(input.candidateKey, documentId);
}

function formatCopyTimestamp(date = new Date()) {
  const pad = (value: number) => value.toString().padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function buildCopyTitle(title: string) {
  return `${title} ${formatCopyTimestamp()}`;
}

async function copyMemoryDocument(documentId: string, input: CopyDocumentInput) {
  const store = await getDocumentMemoryStore();
  const sourceDocument = await findMemoryDocument(input.candidateKey, documentId);
  const timestamp = nowIso();
  const copiedDocument: DocumentListItem = {
    ...sourceDocument,
    id: createMemoryId("document"),
    title: buildCopyTitle(sourceDocument.title),
    isArchived: false,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  store.documents.push(copiedDocument);
  return toMemoryDocumentDetail(copiedDocument);
}

async function buildProfileTitleMap(db: DocumentDb, profileIds: string[]) {
  const uniqueIds = Array.from(new Set(profileIds.filter(Boolean)));

  if (uniqueIds.length === 0) {
    return new Map<string, string>();
  }

  const profiles = await db.candidateProfile.findMany({
    where: {
      id: {
        in: uniqueIds
      }
    },
    select: {
      id: true,
      title: true
    }
  });

  return new Map(profiles.map((profile) => [profile.id, profile.title]));
}

async function buildJobMap(db: DocumentDb, jobIds: string[]) {
  const uniqueIds = Array.from(new Set(jobIds.filter(Boolean)));

  if (uniqueIds.length === 0) {
    return new Map<string, Pick<JobPosting, "title" | "company">>();
  }

  const jobs = await db.jobPosting.findMany({
    where: {
      id: {
        in: uniqueIds
      },
      deletedAt: null
    },
    select: {
      id: true,
      title: true,
      company: true
    }
  });

  return new Map(jobs.map((job) => [job.id, job]));
}

async function findOwnedDocument(db: DocumentDb, candidateKey: string, documentId: string) {
  const document = await db.applicationDocument.findFirst({
    where: {
      id: documentId,
      candidateKey
    }
  });

  if (!document) {
    throw new HttpError(404, "문서를 찾을 수 없습니다.");
  }

  return document;
}

async function findOwnedProfileSnapshot(
  db: DocumentDb,
  candidateKey: string,
  profileId?: string | null
) {
  if (!profileId) {
    return {
      profileId: null,
      profileSnapshotText: null,
      profileSnapshotJson: null
    };
  }

  const profile = await db.candidateProfile.findFirst({
    where: {
      id: profileId ?? "",
      candidateKey
    }
  });

  if (!profile) {
    throw new HttpError(400, "연결할 프로필을 찾을 수 없습니다.");
  }

  return {
    profileId: profile.id,
    profileSnapshotText: profile.profileText,
    profileSnapshotJson: profile.profileJson
  };
}

async function findJobSnapshot(db: DocumentDb, jobId?: string | null): Promise<JobSnapshot | null> {
  if (!jobId) {
    return null;
  }

  const job = await db.jobPosting.findFirst({
    where: {
      id: jobId,
      deletedAt: null
    },
    select: {
      id: true,
      title: true,
      company: true,
      location: true,
      careerLevel: true,
      skills: true,
      description: true,
      sourceUrl: true
    }
  });

  if (!job) {
    throw new HttpError(400, "연결할 채용공고를 찾을 수 없습니다.");
  }

  return job;
}

export async function getDocuments(
  candidateKey: string,
  filters: { documentType?: ApplicationDocumentType; includeArchived?: boolean } = {}
) {
  const prisma = getPrismaClient();

  if (prisma) {
    try {
      const documents = await prisma.applicationDocument.findMany({
        where: {
          candidateKey,
          ...(filters.includeArchived ? {} : { isArchived: false }),
          ...(filters.documentType ? { documentType: filters.documentType } : {})
        },
        orderBy: {
          updatedAt: "desc"
        }
      });
      const profileTitleMap = await buildProfileTitleMap(
        prisma,
        documents.map((document) => document.profileId).filter((id): id is string => Boolean(id))
      );
      const jobMap = await buildJobMap(
        prisma,
        documents.map((document) => document.jobId).filter((id): id is string => Boolean(id))
      );

      return documents.map((document) =>
        toDocumentListItem(
          document,
          document.profileId ? profileTitleMap.get(document.profileId) ?? null : null,
          document.jobId ? jobMap.get(document.jobId) ?? null : null
        )
      );
    } catch {
      // Keep the mock-first demo path alive when the local DB is missing or unmigrated.
    }
  }

  return getMemoryDocuments(candidateKey, filters);
}

export async function createDocument(input: CreateDocumentInput) {
  const prisma = getPrismaClient();

  if (!prisma) {
    return createMemoryDocument(input);
  }

  try {
    const document = await prisma.$transaction(async (tx) => {
      const profileSnapshot = await findOwnedProfileSnapshot(tx, input.candidateKey, input.profileId);
      const jobSnapshot = await findJobSnapshot(tx, input.jobId);
      const createdDocument = await tx.applicationDocument.create({
        data: {
          candidateKey: input.candidateKey,
          title: input.title,
          documentType: input.documentType,
          profileId: profileSnapshot.profileId,
          jobId: jobSnapshot?.id ?? null,
          content: input.content,
          contentJson: input.contentJson === undefined ? undefined : (input.contentJson as Prisma.InputJsonValue),
          source: ApplicationDocumentSource.user,
          profileSnapshotText: profileSnapshot.profileSnapshotText,
          profileSnapshotJson:
            profileSnapshot.profileSnapshotJson === null
              ? undefined
              : (profileSnapshot.profileSnapshotJson as Prisma.InputJsonValue),
          jobSnapshotJson: jobSnapshot === null ? undefined : (jobSnapshot as Prisma.InputJsonValue)
        }
      });
      return createdDocument;
    });

    return getDocument(input.candidateKey, document.id);
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
  }

  return createMemoryDocument(input);
}

export async function getDocument(candidateKey: string, documentId: string): Promise<DocumentDetail> {
  const prisma = getPrismaClient();

  if (prisma) {
    try {
      const document = await findOwnedDocument(prisma, candidateKey, documentId);
      const profileTitleMap = await buildProfileTitleMap(
        prisma,
        document.profileId ? [document.profileId] : []
      );
      const jobMap = await buildJobMap(prisma, document.jobId ? [document.jobId] : []);

      return toDocumentListItem(
        document,
        document.profileId ? profileTitleMap.get(document.profileId) ?? null : null,
        document.jobId ? jobMap.get(document.jobId) ?? null : null
      );
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
    }
  }

  return getMemoryDocument(candidateKey, documentId);
}

export async function updateDocumentMeta(documentId: string, input: UpdateDocumentMetaInput) {
  const prisma = getPrismaClient();

  if (!prisma) {
    return updateMemoryDocumentMeta(documentId, input);
  }

  try {
    const document = await prisma.$transaction(async (tx) => {
      await findOwnedDocument(tx, input.candidateKey, documentId);
      const profileSnapshot =
        input.profileId === undefined
          ? undefined
          : await findOwnedProfileSnapshot(tx, input.candidateKey, input.profileId);
      const jobSnapshot = input.jobId === undefined ? undefined : await findJobSnapshot(tx, input.jobId);

      return tx.applicationDocument.update({
        where: {
          id: documentId
        },
        data: {
          ...(input.title === undefined ? {} : { title: input.title }),
          ...(profileSnapshot === undefined
            ? {}
            : {
                profileId: profileSnapshot.profileId,
                profileSnapshotText: profileSnapshot.profileSnapshotText,
                profileSnapshotJson:
                  profileSnapshot.profileSnapshotJson === null
                    ? undefined
                    : (profileSnapshot.profileSnapshotJson as Prisma.InputJsonValue)
              }),
          ...(input.jobId === undefined ? {} : { jobId: jobSnapshot?.id ?? null }),
          ...(input.jobId === undefined
            ? {}
            : {
                jobSnapshotJson: jobSnapshot === null ? undefined : (jobSnapshot as Prisma.InputJsonValue)
              }),
          ...(input.content === undefined ? {} : { content: input.content }),
          ...(input.contentJson === undefined ? {} : { contentJson: input.contentJson as Prisma.InputJsonValue }),
          ...(input.isArchived === undefined ? {} : { isArchived: input.isArchived })
        }
      });
    });

    return getDocument(input.candidateKey, document.id);
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
  }

  return updateMemoryDocumentMeta(documentId, input);
}

export async function copyDocument(documentId: string, input: CopyDocumentInput) {
  const prisma = getPrismaClient();

  if (!prisma) {
    return copyMemoryDocument(documentId, input);
  }

  try {
    const copiedDocument = await prisma.$transaction(async (tx) => {
      const sourceDocument = await findOwnedDocument(tx, input.candidateKey, documentId);

      return tx.applicationDocument.create({
        data: {
          candidateKey: sourceDocument.candidateKey,
          title: buildCopyTitle(sourceDocument.title),
          documentType: sourceDocument.documentType,
          profileId: sourceDocument.profileId,
          jobId: sourceDocument.jobId,
          content: sourceDocument.content,
          contentJson:
            sourceDocument.contentJson === null ? undefined : (sourceDocument.contentJson as Prisma.InputJsonValue),
          source: sourceDocument.source,
          profileSnapshotText: sourceDocument.profileSnapshotText,
          profileSnapshotJson:
            sourceDocument.profileSnapshotJson === null
              ? undefined
              : (sourceDocument.profileSnapshotJson as Prisma.InputJsonValue),
          jobSnapshotJson:
            sourceDocument.jobSnapshotJson === null ? undefined : (sourceDocument.jobSnapshotJson as Prisma.InputJsonValue),
          isArchived: false
        }
      });
    });

    return getDocument(input.candidateKey, copiedDocument.id);
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
  }

  return copyMemoryDocument(documentId, input);
}

export async function archiveDocument(candidateKey: string, documentId: string) {
  return updateDocumentMeta(documentId, {
    candidateKey,
    isArchived: true
  });
}
