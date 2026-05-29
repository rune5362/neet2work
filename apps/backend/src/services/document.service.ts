import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ApplicationDocumentSource,
  ApplicationDocumentStatus,
  type ApplicationDocument,
  type ApplicationDocumentType,
  type ApplicationDocumentVersion,
  type JobPosting,
  type Prisma,
  type PrismaClient
} from "../generated/prisma/client.js";
import { getPrismaClient } from "../database/prisma.js";
import { HttpError } from "../errors/httpError.js";
import type {
  CreateDocumentInput,
  CreateDocumentVersionInput,
  DocumentDetail,
  DocumentListItem,
  DocumentVersion,
  UpdateDocumentMetaInput
} from "../types/document.js";
import { getJobs } from "./job.service.js";
import { getProfile, getProfiles, getProfileVersion, getProfileVersions } from "./profile.service.js";

const serviceDir = path.dirname(fileURLToPath(import.meta.url));
const sampleDocumentsPath = path.resolve(serviceDir, "../../data/sampleDocuments.json");
const sampleDocumentVersionsPath = path.resolve(serviceDir, "../../data/sampleDocumentVersions.json");

type DocumentDb = Pick<
  PrismaClient,
  | "applicationDocument"
  | "applicationDocumentVersion"
  | "candidateProfile"
  | "candidateProfileVersion"
  | "jobPosting"
>;
type DocumentWithVersions = ApplicationDocument & {
  versions?: Array<Pick<ApplicationDocumentVersion, "id" | "versionNo" | "status">>;
};
type DocumentMemoryStore = {
  initialized: boolean;
  documents: DocumentListItem[];
  versions: DocumentVersion[];
};
type JobSnapshot = Pick<
  JobPosting,
  "id" | "title" | "company" | "location" | "careerLevel" | "skills" | "description" | "sourceUrl"
>;

const documentMemoryStore: DocumentMemoryStore = {
  initialized: false,
  documents: [],
  versions: []
};

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}

function findCurrentVersionNo(document: DocumentWithVersions) {
  if (!document.versions || !document.currentVersionId) {
    return null;
  }

  return document.versions.find((version) => version.id === document.currentVersionId)?.versionNo ?? null;
}

function toDocumentVersion(version: ApplicationDocumentVersion): DocumentVersion {
  return {
    id: version.id,
    documentId: version.documentId,
    candidateKey: version.candidateKey,
    versionNo: version.versionNo,
    title: version.title,
    memo: version.memo,
    content: version.content,
    contentJson: version.contentJson,
    source: version.source,
    status: version.status,
    parentVersionId: version.parentVersionId,
    profileSnapshotText: version.profileSnapshotText,
    profileSnapshotJson: version.profileSnapshotJson,
    jobSnapshotJson: version.jobSnapshotJson,
    createdAt: toIsoString(version.createdAt),
    updatedAt: toIsoString(version.updatedAt)
  };
}

function toDocumentListItem(
  document: DocumentWithVersions,
  profileTitle: string | null = null,
  job: Pick<JobPosting, "title" | "company"> | null = null
): DocumentListItem {
  return {
    id: document.id,
    candidateKey: document.candidateKey,
    title: document.title,
    documentType: document.documentType,
    profileId: document.profileId,
    profileVersionId: document.profileVersionId,
    profileTitle,
    jobId: document.jobId,
    jobTitle: job?.title ?? null,
    company: job?.company ?? null,
    currentVersionId: document.currentVersionId,
    currentVersionNo: findCurrentVersionNo(document),
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
    documentMemoryStore.versions = await readSampleJson<DocumentVersion[]>(sampleDocumentVersionsPath, []);
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

function getCurrentMemoryDocumentVersion(document: DocumentListItem, versions: DocumentVersion[]) {
  return (
    versions.find((version) => version.id === document.currentVersionId && version.documentId === document.id) ??
    versions
      .filter(
        (version) =>
          version.documentId === document.id &&
          version.candidateKey === document.candidateKey &&
          version.status === ApplicationDocumentStatus.active
      )
      .sort((left, right) => right.versionNo - left.versionNo)[0] ??
    null
  );
}

function toMemoryDocumentDetail(document: DocumentListItem, versions: DocumentVersion[]): DocumentDetail {
  return {
    ...document,
    currentVersion: getCurrentMemoryDocumentVersion(document, versions)
  };
}

async function findMemoryDocument(candidateKey: string, documentId: string) {
  const store = await getDocumentMemoryStore();
  const document = store.documents.find((item) => item.id === documentId && item.candidateKey === candidateKey);

  if (!document) {
    throw new HttpError(404, "문서를 찾을 수 없습니다.");
  }

  return document;
}

async function findMemoryDocumentVersion(candidateKey: string, documentId: string, versionId: string) {
  const store = await getDocumentMemoryStore();
  const version = store.versions.find(
    (item) => item.id === versionId && item.documentId === documentId && item.candidateKey === candidateKey
  );

  if (!version) {
    throw new HttpError(404, "문서 버전을 찾을 수 없습니다.");
  }

  return version;
}

function getNextMemoryDocumentVersionNo(store: DocumentMemoryStore, documentId: string) {
  const maxVersionNo = store.versions
    .filter((version) => version.documentId === documentId)
    .reduce((max, version) => Math.max(max, version.versionNo), 0);

  return maxVersionNo + 1;
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
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

async function getMemoryDocument(candidateKey: string, documentId: string) {
  const store = await getDocumentMemoryStore();
  const document = await findMemoryDocument(candidateKey, documentId);
  return toMemoryDocumentDetail(document, store.versions);
}

async function findMemoryProfileVersionSnapshot(
  candidateKey: string,
  profileId?: string | null,
  profileVersionId?: string | null
) {
  if (!profileId && !profileVersionId) {
    return {
      profileId: null,
      profileVersionId: null,
      profileTitle: null,
      profileSnapshotText: null,
      profileSnapshotJson: null
    };
  }

  if (profileVersionId && profileId) {
    const profile = await getProfile(candidateKey, profileId);
    const version = await getProfileVersion(candidateKey, profileId, profileVersionId);

    return {
      profileId: version.profileId,
      profileVersionId: version.id,
      profileTitle: profile.title,
      profileSnapshotText: version.profileText,
      profileSnapshotJson: version.profileJson
    };
  }

  if (profileVersionId) {
    const profiles = await getProfiles(candidateKey, { includeArchived: true });
    const matchingProfile = (
      await Promise.all(
        profiles.map(async (profile) => ({
          profile,
          version: (await getProfileVersions(candidateKey, profile.id, { includeArchived: true })).find(
            (version) => version.id === profileVersionId
          )
        }))
      )
    ).find((item) => item.version);

    if (!matchingProfile?.version) {
      throw new HttpError(400, "연결할 프로필 버전을 찾을 수 없습니다.");
    }

    return {
      profileId: matchingProfile.version.profileId,
      profileVersionId: matchingProfile.version.id,
      profileTitle: matchingProfile.profile.title,
      profileSnapshotText: matchingProfile.version.profileText,
      profileSnapshotJson: matchingProfile.version.profileJson
    };
  }

  const profile = await getProfile(candidateKey, profileId ?? "");

  return {
    profileId: profile.id,
    profileVersionId: null,
    profileTitle: profile.title,
    profileSnapshotText: null,
    profileSnapshotJson: null
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
  const profileSnapshot = await findMemoryProfileVersionSnapshot(
    input.candidateKey,
    input.profileId,
    input.profileVersionId
  );
  const jobSnapshot = await findMemoryJobSnapshot(input.jobId);
  const timestamp = nowIso();
  const documentId = createMemoryId("document");
  const versionId = createMemoryId("document-version");
  const version: DocumentVersion = {
    id: versionId,
    documentId,
    candidateKey: input.candidateKey,
    versionNo: 1,
    title: input.versionTitle ?? null,
    memo: input.memo ?? null,
    content: input.content,
    contentJson: input.contentJson ?? null,
    source: ApplicationDocumentSource.user,
    status: ApplicationDocumentStatus.active,
    parentVersionId: null,
    profileSnapshotText: profileSnapshot.profileSnapshotText,
    profileSnapshotJson: profileSnapshot.profileSnapshotJson,
    jobSnapshotJson: jobSnapshot,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  const document: DocumentListItem = {
    id: documentId,
    candidateKey: input.candidateKey,
    title: input.title,
    documentType: input.documentType,
    profileId: profileSnapshot.profileId,
    profileVersionId: profileSnapshot.profileVersionId,
    profileTitle: profileSnapshot.profileTitle,
    jobId: jobSnapshot?.id ?? null,
    jobTitle: jobSnapshot?.title ?? null,
    company: jobSnapshot?.company ?? null,
    currentVersionId: versionId,
    currentVersionNo: 1,
    isArchived: false,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  store.documents.push(document);
  store.versions.push(version);

  return toMemoryDocumentDetail(document, store.versions);
}

async function updateMemoryDocumentMeta(documentId: string, input: UpdateDocumentMetaInput) {
  const store = await getDocumentMemoryStore();
  const document = await findMemoryDocument(input.candidateKey, documentId);
  const jobSnapshot = input.jobId === undefined ? undefined : await findMemoryJobSnapshot(input.jobId);
  const updatedDocument: DocumentListItem = {
    ...document,
    ...(input.title === undefined ? {} : { title: input.title }),
    ...(input.jobId === undefined
      ? {}
      : {
          jobId: jobSnapshot?.id ?? null,
          jobTitle: jobSnapshot?.title ?? null,
          company: jobSnapshot?.company ?? null
        }),
    ...(input.isArchived === undefined ? {} : { isArchived: input.isArchived }),
    updatedAt: nowIso()
  };

  store.documents = store.documents.map((item) => (item.id === documentId ? updatedDocument : item));
  return getMemoryDocument(input.candidateKey, documentId);
}

async function getMemoryDocumentVersions(
  candidateKey: string,
  documentId: string,
  options: { includeArchived?: boolean } = {}
) {
  const store = await getDocumentMemoryStore();
  await findMemoryDocument(candidateKey, documentId);

  return store.versions
    .filter(
      (version) =>
        version.documentId === documentId &&
        version.candidateKey === candidateKey &&
        (options.includeArchived || version.status !== ApplicationDocumentStatus.archived)
    )
    .sort((left, right) => right.versionNo - left.versionNo);
}

async function createMemoryDocumentVersion(documentId: string, input: CreateDocumentVersionInput) {
  const store = await getDocumentMemoryStore();
  const document = await findMemoryDocument(input.candidateKey, documentId);
  const currentVersion = getCurrentMemoryDocumentVersion(document, store.versions);
  const timestamp = nowIso();
  const version: DocumentVersion = {
    id: createMemoryId("document-version"),
    documentId,
    candidateKey: input.candidateKey,
    versionNo: getNextMemoryDocumentVersionNo(store, documentId),
    title: input.title ?? null,
    memo: input.memo ?? null,
    content: input.content,
    contentJson: input.contentJson ?? null,
    source: input.source ?? ApplicationDocumentSource.user,
    status: input.status ?? ApplicationDocumentStatus.active,
    parentVersionId: currentVersion?.id ?? null,
    profileSnapshotText: currentVersion?.profileSnapshotText ?? null,
    profileSnapshotJson: currentVersion?.profileSnapshotJson ?? null,
    jobSnapshotJson: currentVersion?.jobSnapshotJson ?? null,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  store.versions.push(version);

  if (input.makeCurrent ?? true) {
    store.documents = store.documents.map((item) =>
      item.id === documentId && item.candidateKey === input.candidateKey
        ? {
            ...item,
            currentVersionId: version.id,
            currentVersionNo: version.versionNo,
            updatedAt: timestamp
          }
        : item
    );
  }

  return version;
}

async function applyMemoryDocumentVersion(candidateKey: string, documentId: string, versionId: string) {
  const version = await findMemoryDocumentVersion(candidateKey, documentId, versionId);

  if (version.status === ApplicationDocumentStatus.archived) {
    throw new HttpError(400, "보관된 문서 버전은 현재 버전으로 적용할 수 없습니다.");
  }

  const store = await getDocumentMemoryStore();
  store.documents = store.documents.map((document) =>
    document.id === documentId && document.candidateKey === candidateKey
      ? {
          ...document,
          currentVersionId: versionId,
          currentVersionNo: version.versionNo,
          updatedAt: nowIso()
        }
      : document
  );

  return version;
}

async function restoreMemoryDocumentVersion(candidateKey: string, documentId: string, versionId: string) {
  const sourceVersion = await findMemoryDocumentVersion(candidateKey, documentId, versionId);

  return createMemoryDocumentVersion(documentId, {
    candidateKey,
    content: sourceVersion.content,
    contentJson: sourceVersion.contentJson,
    title: `v${sourceVersion.versionNo}에서 복원`,
    memo: sourceVersion.memo,
    source: ApplicationDocumentSource.user,
    status: ApplicationDocumentStatus.active,
    makeCurrent: true
  });
}

async function archiveMemoryDocumentVersion(candidateKey: string, documentId: string, versionId: string) {
  const store = await getDocumentMemoryStore();
  const document = await findMemoryDocument(candidateKey, documentId);

  if (document.currentVersionId === versionId) {
    throw new HttpError(400, "현재 적용 중인 문서 버전은 보관할 수 없습니다.");
  }

  const version = await findMemoryDocumentVersion(candidateKey, documentId, versionId);
  const updatedVersion = {
    ...version,
    status: ApplicationDocumentStatus.archived,
    updatedAt: nowIso()
  };

  store.versions = store.versions.map((item) => (item.id === versionId ? updatedVersion : item));
  return updatedVersion;
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
    },
    include: {
      versions: {
        select: {
          id: true,
          versionNo: true,
          status: true
        },
        orderBy: {
          versionNo: "desc"
        }
      }
    }
  });

  if (!document) {
    throw new HttpError(404, "문서를 찾을 수 없습니다.");
  }

  return document;
}

async function findCurrentDocumentVersion(db: DocumentDb, document: ApplicationDocument) {
  if (document.currentVersionId) {
    const currentVersion = await db.applicationDocumentVersion.findFirst({
      where: {
        id: document.currentVersionId,
        documentId: document.id,
        candidateKey: document.candidateKey
      }
    });

    if (currentVersion) {
      return currentVersion;
    }
  }

  return db.applicationDocumentVersion.findFirst({
    where: {
      documentId: document.id,
      candidateKey: document.candidateKey,
      status: ApplicationDocumentStatus.active
    },
    orderBy: {
      versionNo: "desc"
    }
  });
}

async function findOwnedDocumentVersion(
  db: DocumentDb,
  candidateKey: string,
  documentId: string,
  versionId: string
) {
  const version = await db.applicationDocumentVersion.findFirst({
    where: {
      id: versionId,
      documentId,
      candidateKey
    }
  });

  if (!version) {
    throw new HttpError(404, "문서 버전을 찾을 수 없습니다.");
  }

  return version;
}

async function getNextDocumentVersionNo(db: DocumentDb, documentId: string) {
  const result = await db.applicationDocumentVersion.aggregate({
    where: {
      documentId
    },
    _max: {
      versionNo: true
    }
  });

  return (result._max.versionNo ?? 0) + 1;
}

async function findOwnedProfileVersionSnapshot(
  db: DocumentDb,
  candidateKey: string,
  profileId?: string | null,
  profileVersionId?: string | null
) {
  if (!profileId && !profileVersionId) {
    return {
      profileId: null,
      profileVersionId: null,
      profileSnapshotText: null,
      profileSnapshotJson: null
    };
  }

  if (profileVersionId) {
    const version = await db.candidateProfileVersion.findFirst({
      where: {
        id: profileVersionId,
        candidateKey
      }
    });

    if (!version) {
      throw new HttpError(400, "연결할 프로필 버전을 찾을 수 없습니다.");
    }

    if (profileId && version.profileId !== profileId) {
      throw new HttpError(400, "프로필과 프로필 버전이 일치하지 않습니다.");
    }

    return {
      profileId: version.profileId,
      profileVersionId: version.id,
      profileSnapshotText: version.profileText,
      profileSnapshotJson: version.profileJson
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
    profileVersionId: null,
    profileSnapshotText: null,
    profileSnapshotJson: null
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
        include: {
          versions: {
            select: {
              id: true,
              versionNo: true,
              status: true
            },
            orderBy: {
              versionNo: "desc"
            }
          }
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
      const profileSnapshot = await findOwnedProfileVersionSnapshot(
        tx,
        input.candidateKey,
        input.profileId,
        input.profileVersionId
      );
      const jobSnapshot = await findJobSnapshot(tx, input.jobId);
      const createdDocument = await tx.applicationDocument.create({
        data: {
          candidateKey: input.candidateKey,
          title: input.title,
          documentType: input.documentType,
          profileId: profileSnapshot.profileId,
          profileVersionId: profileSnapshot.profileVersionId,
          jobId: jobSnapshot?.id ?? null
        }
      });
      const version = await tx.applicationDocumentVersion.create({
        data: {
          documentId: createdDocument.id,
          candidateKey: input.candidateKey,
          versionNo: 1,
          title: input.versionTitle ?? null,
          memo: input.memo ?? null,
          content: input.content,
          contentJson: input.contentJson === undefined ? undefined : (input.contentJson as Prisma.InputJsonValue),
          source: ApplicationDocumentSource.user,
          status: ApplicationDocumentStatus.active,
          profileSnapshotText: profileSnapshot.profileSnapshotText,
          profileSnapshotJson:
            profileSnapshot.profileSnapshotJson === null
              ? undefined
              : (profileSnapshot.profileSnapshotJson as Prisma.InputJsonValue),
          jobSnapshotJson: jobSnapshot === null ? undefined : (jobSnapshot as Prisma.InputJsonValue)
        }
      });

      return tx.applicationDocument.update({
        where: {
          id: createdDocument.id
        },
        data: {
          currentVersionId: version.id
        }
      });
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
      const currentVersion = await findCurrentDocumentVersion(prisma, document);
      const profileTitleMap = await buildProfileTitleMap(
        prisma,
        document.profileId ? [document.profileId] : []
      );
      const jobMap = await buildJobMap(prisma, document.jobId ? [document.jobId] : []);

      return {
        ...toDocumentListItem(
          document,
          document.profileId ? profileTitleMap.get(document.profileId) ?? null : null,
          document.jobId ? jobMap.get(document.jobId) ?? null : null
        ),
        currentVersion: currentVersion ? toDocumentVersion(currentVersion) : null
      };
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
      const jobSnapshot = input.jobId === undefined ? undefined : await findJobSnapshot(tx, input.jobId);

      return tx.applicationDocument.update({
        where: {
          id: documentId
        },
        data: {
          ...(input.title === undefined ? {} : { title: input.title }),
          ...(input.jobId === undefined ? {} : { jobId: jobSnapshot?.id ?? null }),
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

export async function archiveDocument(candidateKey: string, documentId: string) {
  return updateDocumentMeta(documentId, {
    candidateKey,
    isArchived: true
  });
}

export async function getDocumentVersions(
  candidateKey: string,
  documentId: string,
  options: { includeArchived?: boolean } = {}
) {
  const prisma = getPrismaClient();

  if (!prisma) {
    return getMemoryDocumentVersions(candidateKey, documentId, options);
  }

  try {
    await findOwnedDocument(prisma, candidateKey, documentId);

    const versions = await prisma.applicationDocumentVersion.findMany({
      where: {
        documentId,
        candidateKey,
        ...(options.includeArchived ? {} : { status: { not: ApplicationDocumentStatus.archived } })
      },
      orderBy: {
        versionNo: "desc"
      }
    });

    return versions.map(toDocumentVersion);
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
  }

  return getMemoryDocumentVersions(candidateKey, documentId, options);
}

export async function createDocumentVersion(documentId: string, input: CreateDocumentVersionInput) {
  const prisma = getPrismaClient();
  const makeCurrent = input.makeCurrent ?? true;

  if (!prisma) {
    return createMemoryDocumentVersion(documentId, input);
  }

  try {
    const version = await prisma.$transaction(async (tx) => {
    const document = await findOwnedDocument(tx, input.candidateKey, documentId);
    const currentVersion = await findCurrentDocumentVersion(tx, document);
    const nextVersionNo = await getNextDocumentVersionNo(tx, documentId);
    const createdVersion = await tx.applicationDocumentVersion.create({
      data: {
        documentId,
        candidateKey: input.candidateKey,
        versionNo: nextVersionNo,
        title: input.title ?? null,
        memo: input.memo ?? null,
        content: input.content,
        contentJson: input.contentJson === undefined ? undefined : (input.contentJson as Prisma.InputJsonValue),
        source: input.source ?? ApplicationDocumentSource.user,
        status: input.status ?? ApplicationDocumentStatus.active,
        parentVersionId: currentVersion?.id ?? null,
        profileSnapshotText: currentVersion?.profileSnapshotText ?? null,
        profileSnapshotJson:
          currentVersion?.profileSnapshotJson === null || currentVersion?.profileSnapshotJson === undefined
            ? undefined
            : (currentVersion.profileSnapshotJson as Prisma.InputJsonValue),
        jobSnapshotJson:
          currentVersion?.jobSnapshotJson === null || currentVersion?.jobSnapshotJson === undefined
            ? undefined
            : (currentVersion.jobSnapshotJson as Prisma.InputJsonValue)
      }
    });

    if (makeCurrent) {
      await tx.applicationDocument.update({
        where: {
          id: documentId
        },
        data: {
          currentVersionId: createdVersion.id
        }
      });
    }

    return createdVersion;
  });

    return toDocumentVersion(version);
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
  }

  return createMemoryDocumentVersion(documentId, input);
}

export async function getDocumentVersion(candidateKey: string, documentId: string, versionId: string) {
  const prisma = getPrismaClient();

  if (!prisma) {
    return findMemoryDocumentVersion(candidateKey, documentId, versionId);
  }

  try {
    const version = await findOwnedDocumentVersion(prisma, candidateKey, documentId, versionId);
    return toDocumentVersion(version);
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
  }

  return findMemoryDocumentVersion(candidateKey, documentId, versionId);
}

export async function applyDocumentVersion(candidateKey: string, documentId: string, versionId: string) {
  const prisma = getPrismaClient();

  if (!prisma) {
    return applyMemoryDocumentVersion(candidateKey, documentId, versionId);
  }

  try {
    const version = await prisma.$transaction(async (tx) => {
    await findOwnedDocument(tx, candidateKey, documentId);
    const targetVersion = await findOwnedDocumentVersion(tx, candidateKey, documentId, versionId);

    if (targetVersion.status === ApplicationDocumentStatus.archived) {
      throw new HttpError(400, "보관된 문서 버전은 현재 버전으로 적용할 수 없습니다.");
    }

    await tx.applicationDocument.update({
      where: {
        id: documentId
      },
      data: {
        currentVersionId: versionId
      }
    });

    return targetVersion;
  });

    return toDocumentVersion(version);
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
  }

  return applyMemoryDocumentVersion(candidateKey, documentId, versionId);
}

export async function restoreDocumentVersion(candidateKey: string, documentId: string, versionId: string) {
  const prisma = getPrismaClient();

  if (!prisma) {
    return restoreMemoryDocumentVersion(candidateKey, documentId, versionId);
  }

  try {
    const restoredVersion = await prisma.$transaction(async (tx) => {
    const document = await findOwnedDocument(tx, candidateKey, documentId);
    const sourceVersion = await findOwnedDocumentVersion(tx, candidateKey, documentId, versionId);
    const currentVersion = await findCurrentDocumentVersion(tx, document);
    const nextVersionNo = await getNextDocumentVersionNo(tx, documentId);
    const version = await tx.applicationDocumentVersion.create({
      data: {
        documentId,
        candidateKey,
        versionNo: nextVersionNo,
        title: `v${sourceVersion.versionNo}에서 복원`,
        memo: sourceVersion.memo,
        content: sourceVersion.content,
        contentJson:
          sourceVersion.contentJson === null ? undefined : (sourceVersion.contentJson as Prisma.InputJsonValue),
        source: ApplicationDocumentSource.user,
        status: ApplicationDocumentStatus.active,
        parentVersionId: currentVersion?.id ?? null,
        profileSnapshotText: sourceVersion.profileSnapshotText,
        profileSnapshotJson:
          sourceVersion.profileSnapshotJson === null
            ? undefined
            : (sourceVersion.profileSnapshotJson as Prisma.InputJsonValue),
        jobSnapshotJson:
          sourceVersion.jobSnapshotJson === null
            ? undefined
            : (sourceVersion.jobSnapshotJson as Prisma.InputJsonValue)
      }
    });

    await tx.applicationDocument.update({
      where: {
        id: documentId
      },
      data: {
        currentVersionId: version.id
      }
    });

    return version;
  });

    return toDocumentVersion(restoredVersion);
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
  }

  return restoreMemoryDocumentVersion(candidateKey, documentId, versionId);
}

export async function archiveDocumentVersion(candidateKey: string, documentId: string, versionId: string) {
  const prisma = getPrismaClient();

  if (!prisma) {
    return archiveMemoryDocumentVersion(candidateKey, documentId, versionId);
  }

  try {
    const version = await prisma.$transaction(async (tx) => {
    const document = await findOwnedDocument(tx, candidateKey, documentId);

    if (document.currentVersionId === versionId) {
      throw new HttpError(400, "현재 적용 중인 문서 버전은 보관할 수 없습니다.");
    }

    await findOwnedDocumentVersion(tx, candidateKey, documentId, versionId);

    return tx.applicationDocumentVersion.update({
      where: {
        id: versionId
      },
      data: {
        status: ApplicationDocumentStatus.archived
      }
    });
  });

    return toDocumentVersion(version);
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
  }

  return archiveMemoryDocumentVersion(candidateKey, documentId, versionId);
}
