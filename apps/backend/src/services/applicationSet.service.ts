import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ApplicationDocument, ApplicationSet, CandidateProfile, PrismaClient } from "../generated/prisma/client.js";
import { getPrismaClient } from "../database/prisma.js";
import { HttpError } from "../errors/httpError.js";
import type { ApplicationSetItem, CreateApplicationSetInput, UpdateApplicationSetInput } from "../types/applicationSet.js";
import { getDocument } from "./document.service.js";
import { getProfile } from "./profile.service.js";

type ApplicationSetDb = Pick<PrismaClient, "applicationSet" | "candidateProfile" | "applicationDocument">;
type ApplicationSetWithRelations = ApplicationSet & {
  profile?: Pick<CandidateProfile, "title" | "deletedAt"> | null;
  resumeDocument?: Pick<ApplicationDocument, "title" | "deletedAt"> | null;
  coverLetterDocument?: Pick<ApplicationDocument, "title" | "deletedAt"> | null;
};

const serviceDir = path.dirname(fileURLToPath(import.meta.url));
const sampleDocumentSetsPath = path.resolve(serviceDir, "../../data/sampleDocumentSets.json");

const applicationSetMemoryStore: {
  initialized: boolean;
  sets: ApplicationSetItem[];
} = {
  initialized: false,
  sets: []
};

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}

function createMemoryId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso() {
  return new Date().toISOString();
}

async function readSampleJson<T>(filePath: string, fallback: T) {
  try {
    const file = await fs.readFile(filePath, "utf-8");
    return JSON.parse(file) as T;
  } catch {
    return fallback;
  }
}

async function getApplicationSetMemoryStore() {
  if (!applicationSetMemoryStore.initialized) {
    applicationSetMemoryStore.sets = await readSampleJson<ApplicationSetItem[]>(sampleDocumentSetsPath, []);
    applicationSetMemoryStore.initialized = true;
  }

  return applicationSetMemoryStore;
}

function toApplicationSetItem(set: ApplicationSetWithRelations): ApplicationSetItem {
  return {
    id: set.id,
    candidateKey: set.candidateKey,
    title: set.title,
    profileId: set.profileId,
    profileTitle: set.profile?.deletedAt ? null : set.profile?.title ?? null,
    resumeDocumentId: set.resumeDocumentId,
    resumeTitle: set.resumeDocument?.deletedAt ? null : set.resumeDocument?.title ?? null,
    coverLetterDocumentId: set.coverLetterDocumentId,
    coverLetterTitle: set.coverLetterDocument?.deletedAt ? null : set.coverLetterDocument?.title ?? null,
    isArchived: set.isArchived,
    createdAt: toIsoString(set.createdAt),
    updatedAt: toIsoString(set.updatedAt)
  };
}

function includeApplicationSetRelations() {
  return {
    profile: {
      select: {
        title: true,
        deletedAt: true
      }
    },
    resumeDocument: {
      select: {
        title: true,
        deletedAt: true
      }
    },
    coverLetterDocument: {
      select: {
        title: true,
        deletedAt: true
      }
    }
  };
}

async function findOwnedApplicationSet(db: ApplicationSetDb, candidateKey: string, setId: string) {
  const set = await db.applicationSet.findFirst({
    where: {
      id: setId,
      candidateKey
    },
    include: includeApplicationSetRelations()
  });

  if (!set) {
    throw new HttpError(404, "문서 묶음을 찾을 수 없습니다.");
  }

  return set;
}

async function validateProfile(db: ApplicationSetDb, candidateKey: string, profileId?: string | null) {
  if (!profileId) {
    return null;
  }

  const profile = await db.candidateProfile.findFirst({
    where: {
      id: profileId,
      candidateKey,
      deletedAt: null
    }
  });

  if (!profile) {
    throw new HttpError(400, "연결할 프로필을 찾을 수 없습니다.");
  }

  return profile.id;
}

async function validateDocument(
  db: ApplicationSetDb,
  candidateKey: string,
  documentId: string | null | undefined,
  documentType: "resume" | "cover_letter"
) {
  if (!documentId) {
    return null;
  }

  const document = await db.applicationDocument.findFirst({
    where: {
      id: documentId,
      candidateKey,
      documentType,
      deletedAt: null
    }
  });

  if (!document) {
    throw new HttpError(
      400,
      documentType === "resume" ? "연결할 이력서를 찾을 수 없습니다." : "연결할 자기소개서를 찾을 수 없습니다."
    );
  }

  return document.id;
}

async function validateMemoryProfile(candidateKey: string, profileId?: string | null) {
  if (!profileId) {
    return null;
  }

  try {
    await getProfile(candidateKey, profileId);
  } catch (error) {
    if (error instanceof HttpError) {
      throw new HttpError(400, "연결할 프로필을 찾을 수 없습니다.");
    }

    throw error;
  }
  return profileId;
}

async function validateMemoryDocument(
  candidateKey: string,
  documentId: string | null | undefined,
  documentType: "resume" | "cover_letter"
) {
  if (!documentId) {
    return null;
  }

  let document;

  try {
    document = await getDocument(candidateKey, documentId);
  } catch (error) {
    if (error instanceof HttpError) {
      throw new HttpError(
        400,
        documentType === "resume" ? "연결할 이력서를 찾을 수 없습니다." : "연결할 자기소개서를 찾을 수 없습니다."
      );
    }

    throw error;
  }

  if (document.documentType !== documentType) {
    throw new HttpError(
      400,
      documentType === "resume" ? "연결할 이력서를 찾을 수 없습니다." : "연결할 자기소개서를 찾을 수 없습니다."
    );
  }

  return documentId;
}

async function findMemoryApplicationSet(candidateKey: string, setId: string) {
  const store = await getApplicationSetMemoryStore();
  const set = store.sets.find((item) => item.id === setId && item.candidateKey === candidateKey);

  if (!set) {
    throw new HttpError(404, "문서 묶음을 찾을 수 없습니다.");
  }

  return set;
}

export async function getApplicationSets(candidateKey: string, options: { includeArchived?: boolean } = {}) {
  const prisma = getPrismaClient();
  const includeArchived = options.includeArchived ?? false;

  if (prisma) {
    try {
      const sets = await prisma.applicationSet.findMany({
        where: {
          candidateKey,
          ...(includeArchived ? {} : { isArchived: false })
        },
        include: includeApplicationSetRelations(),
        orderBy: {
          updatedAt: "desc"
        }
      });

      return sets.map(toApplicationSetItem);
    } catch {
      // Keep local demo mode usable without a migrated database.
    }
  }

  const store = await getApplicationSetMemoryStore();
  return store.sets
    .filter((set) => set.candidateKey === candidateKey && (includeArchived || !set.isArchived))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function createApplicationSet(input: CreateApplicationSetInput) {
  const prisma = getPrismaClient();

  if (prisma) {
    try {
      const set = await prisma.$transaction(async (tx) => {
        const profileId = await validateProfile(tx, input.candidateKey, input.profileId);
        const resumeDocumentId = await validateDocument(tx, input.candidateKey, input.resumeDocumentId, "resume");
        const coverLetterDocumentId = await validateDocument(
          tx,
          input.candidateKey,
          input.coverLetterDocumentId,
          "cover_letter"
        );

        return tx.applicationSet.create({
          data: {
            candidateKey: input.candidateKey,
            title: input.title,
            profileId,
            resumeDocumentId,
            coverLetterDocumentId
          },
          include: includeApplicationSetRelations()
        });
      });

      return toApplicationSetItem(set);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
    }
  }

  const timestamp = nowIso();
  const store = await getApplicationSetMemoryStore();
  const profileId = await validateMemoryProfile(input.candidateKey, input.profileId);
  const resumeDocumentId = await validateMemoryDocument(input.candidateKey, input.resumeDocumentId, "resume");
  const coverLetterDocumentId = await validateMemoryDocument(
    input.candidateKey,
    input.coverLetterDocumentId,
    "cover_letter"
  );
  const profile = profileId ? await getProfile(input.candidateKey, profileId) : null;
  const resume = resumeDocumentId ? await getDocument(input.candidateKey, resumeDocumentId) : null;
  const coverLetter = coverLetterDocumentId ? await getDocument(input.candidateKey, coverLetterDocumentId) : null;
  const set: ApplicationSetItem = {
    id: createMemoryId("document-set"),
    candidateKey: input.candidateKey,
    title: input.title,
    profileId,
    profileTitle: profile?.title ?? null,
    resumeDocumentId,
    resumeTitle: resume?.title ?? null,
    coverLetterDocumentId,
    coverLetterTitle: coverLetter?.title ?? null,
    isArchived: false,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  store.sets.push(set);
  return set;
}

export async function getApplicationSet(candidateKey: string, setId: string) {
  const prisma = getPrismaClient();

  if (prisma) {
    try {
      return toApplicationSetItem(await findOwnedApplicationSet(prisma, candidateKey, setId));
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
    }
  }

  return findMemoryApplicationSet(candidateKey, setId);
}

export async function updateApplicationSet(setId: string, input: UpdateApplicationSetInput) {
  const prisma = getPrismaClient();

  if (prisma) {
    try {
      const set = await prisma.$transaction(async (tx) => {
        await findOwnedApplicationSet(tx, input.candidateKey, setId);
        const profileId =
          input.profileId === undefined ? undefined : await validateProfile(tx, input.candidateKey, input.profileId);
        const resumeDocumentId =
          input.resumeDocumentId === undefined
            ? undefined
            : await validateDocument(tx, input.candidateKey, input.resumeDocumentId, "resume");
        const coverLetterDocumentId =
          input.coverLetterDocumentId === undefined
            ? undefined
            : await validateDocument(tx, input.candidateKey, input.coverLetterDocumentId, "cover_letter");

        return tx.applicationSet.update({
          where: {
            id: setId
          },
          data: {
            ...(input.title === undefined ? {} : { title: input.title }),
            ...(profileId === undefined ? {} : { profileId }),
            ...(resumeDocumentId === undefined ? {} : { resumeDocumentId }),
            ...(coverLetterDocumentId === undefined ? {} : { coverLetterDocumentId }),
            ...(input.isArchived === undefined ? {} : { isArchived: input.isArchived })
          },
          include: includeApplicationSetRelations()
        });
      });

      return toApplicationSetItem(set);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
    }
  }

  const set = await findMemoryApplicationSet(input.candidateKey, setId);
  const profileId =
    input.profileId === undefined ? undefined : await validateMemoryProfile(input.candidateKey, input.profileId);
  const resumeDocumentId =
    input.resumeDocumentId === undefined
      ? undefined
      : await validateMemoryDocument(input.candidateKey, input.resumeDocumentId, "resume");
  const coverLetterDocumentId =
    input.coverLetterDocumentId === undefined
      ? undefined
      : await validateMemoryDocument(input.candidateKey, input.coverLetterDocumentId, "cover_letter");
  const profile = profileId ? await getProfile(input.candidateKey, profileId) : null;
  const resume = resumeDocumentId ? await getDocument(input.candidateKey, resumeDocumentId) : null;
  const coverLetter = coverLetterDocumentId ? await getDocument(input.candidateKey, coverLetterDocumentId) : null;
  const updatedSet: ApplicationSetItem = {
    ...set,
    ...(input.title === undefined ? {} : { title: input.title }),
    ...(profileId === undefined ? {} : { profileId, profileTitle: profile?.title ?? null }),
    ...(resumeDocumentId === undefined ? {} : { resumeDocumentId, resumeTitle: resume?.title ?? null }),
    ...(coverLetterDocumentId === undefined
      ? {}
      : { coverLetterDocumentId, coverLetterTitle: coverLetter?.title ?? null }),
    ...(input.isArchived === undefined ? {} : { isArchived: input.isArchived }),
    updatedAt: nowIso()
  };
  const store = await getApplicationSetMemoryStore();
  const index = store.sets.findIndex((item) => item.id === setId);
  store.sets[index] = updatedSet;

  return updatedSet;
}

export async function archiveApplicationSet(candidateKey: string, setId: string) {
  return updateApplicationSet(setId, {
    candidateKey,
    isArchived: true
  });
}
