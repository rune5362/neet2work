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
type JobSnapshot = Pick<
  JobPosting,
  "id" | "title" | "company" | "location" | "careerLevel" | "skills" | "description" | "sourceUrl"
>;

function requirePrisma() {
  const prisma = getPrismaClient();

  if (!prisma) {
    throw new HttpError(503, "문서 저장소를 사용할 수 없습니다.");
  }

  return prisma;
}

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

async function getSampleDocuments(
  candidateKey: string,
  filters: { documentType?: ApplicationDocumentType; includeArchived?: boolean } = {}
) {
  const documents = await readSampleJson<DocumentListItem[]>(sampleDocumentsPath, []);
  return documents.filter(
    (document) =>
      document.candidateKey === candidateKey &&
      (filters.includeArchived || !document.isArchived) &&
      (!filters.documentType || document.documentType === filters.documentType)
  );
}

async function getSampleDocument(candidateKey: string, documentId: string): Promise<DocumentDetail | null> {
  const documents = await readSampleJson<DocumentListItem[]>(sampleDocumentsPath, []);
  const versions = await readSampleJson<DocumentVersion[]>(sampleDocumentVersionsPath, []);
  const document = documents.find((item) => item.id === documentId && item.candidateKey === candidateKey);

  if (!document) {
    return null;
  }

  const currentVersion =
    versions.find((version) => version.id === document.currentVersionId && version.documentId === documentId) ??
    versions
      .filter(
        (version) =>
          version.documentId === documentId &&
          version.candidateKey === candidateKey &&
          version.status === ApplicationDocumentStatus.active
      )
      .sort((left, right) => right.versionNo - left.versionNo)[0] ??
    null;

  return {
    ...document,
    currentVersion
  };
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

  return getSampleDocuments(candidateKey, filters);
}

export async function createDocument(input: CreateDocumentInput) {
  const prisma = requirePrisma();

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

  const sampleDocument = await getSampleDocument(candidateKey, documentId);

  if (!sampleDocument) {
    throw new HttpError(404, "문서를 찾을 수 없습니다.");
  }

  return sampleDocument;
}

export async function updateDocumentMeta(documentId: string, input: UpdateDocumentMetaInput) {
  const prisma = requirePrisma();

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
  const prisma = requirePrisma();

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
}

export async function createDocumentVersion(documentId: string, input: CreateDocumentVersionInput) {
  const prisma = requirePrisma();
  const makeCurrent = input.makeCurrent ?? true;

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
}

export async function getDocumentVersion(candidateKey: string, documentId: string, versionId: string) {
  const prisma = requirePrisma();
  const version = await findOwnedDocumentVersion(prisma, candidateKey, documentId, versionId);
  return toDocumentVersion(version);
}

export async function applyDocumentVersion(candidateKey: string, documentId: string, versionId: string) {
  const prisma = requirePrisma();

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
}

export async function restoreDocumentVersion(candidateKey: string, documentId: string, versionId: string) {
  const prisma = requirePrisma();

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
}

export async function archiveDocumentVersion(candidateKey: string, documentId: string, versionId: string) {
  const prisma = requirePrisma();

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
}
