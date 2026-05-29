import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  Prisma,
  type CandidateProfile,
  type PrismaClient
} from "../generated/prisma/client.js";
import { getPrismaClient } from "../database/prisma.js";
import { HttpError } from "../errors/httpError.js";
import type {
  CandidateProfileJson,
  CopyProfileInput,
  CreateProfileInput,
  ProfileDetail,
  ProfileListItem,
  UpdateProfileMetaInput
} from "../types/profile.js";
import { buildProfileText, extractProfileSummaryFields } from "../utils/profile.js";

const serviceDir = path.dirname(fileURLToPath(import.meta.url));
const sampleProfilesPath = path.resolve(serviceDir, "../../data/sampleProfiles.json");

type ProfileDb = Pick<PrismaClient, "candidateProfile">;
type ProfileMemoryStore = {
  initialized: boolean;
  profiles: ProfileListItem[];
};

const profileMemoryStore: ProfileMemoryStore = {
  initialized: false,
  profiles: []
};

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}

function asProfileJson(value: unknown) {
  return value as CandidateProfileJson;
}

function toProfileListItem(profile: CandidateProfile): ProfileListItem {
  return {
    id: profile.id,
    candidateKey: profile.candidateKey,
    title: profile.title,
    targetRole: profile.targetRole,
    targetCompany: profile.targetCompany,
    targetJobId: profile.targetJobId,
    name: profile.name,
    email: profile.email,
    desiredRoles: profile.desiredRoles,
    skills: profile.skills,
    profileText: profile.profileText,
    profileJson: profile.profileJson ? asProfileJson(profile.profileJson) : null,
    schemaVersion: profile.schemaVersion,
    source: profile.source,
    isDefault: profile.isDefault,
    isArchived: profile.isArchived,
    createdAt: toIsoString(profile.createdAt),
    updatedAt: toIsoString(profile.updatedAt)
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

async function getProfileMemoryStore() {
  if (!profileMemoryStore.initialized) {
    profileMemoryStore.profiles = await readSampleJson<ProfileListItem[]>(sampleProfilesPath, []);
    profileMemoryStore.initialized = true;
  }

  return profileMemoryStore;
}

function createMemoryId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function toMemoryProfileDetail(profile: ProfileListItem): ProfileDetail {
  return profile;
}

async function findMemoryProfile(candidateKey: string, profileId: string) {
  const store = await getProfileMemoryStore();
  const profile = store.profiles.find((item) => item.id === profileId && item.candidateKey === candidateKey);

  if (!profile) {
    throw new HttpError(404, "프로필을 찾을 수 없습니다.");
  }

  return profile;
}

function setDefaultProfile(store: ProfileMemoryStore, candidateKey: string, profileId: string) {
  store.profiles = store.profiles.map((profile) =>
    profile.candidateKey === candidateKey
      ? {
          ...profile,
          isDefault: profile.id === profileId
        }
      : profile
  );
}

async function getMemoryProfiles(candidateKey: string, includeArchived = false) {
  const store = await getProfileMemoryStore();
  return store.profiles
    .filter((profile) => profile.candidateKey === candidateKey && (includeArchived || !profile.isArchived))
    .sort((left, right) => Number(right.isDefault) - Number(left.isDefault) || right.updatedAt.localeCompare(left.updatedAt))
    .map((profile) => profile);
}

async function getMemoryProfile(candidateKey: string, profileId: string) {
  const profile = await findMemoryProfile(candidateKey, profileId);
  return toMemoryProfileDetail(profile);
}

async function createMemoryProfile(input: CreateProfileInput) {
  const store = await getProfileMemoryStore();
  const timestamp = nowIso();
  const profileMeta = buildProfileMeta(input);
  const profileText = buildProfileText(input.profileJson);
  const profileId = createMemoryId("profile");
  const profile: ProfileListItem = {
    id: profileId,
    candidateKey: input.candidateKey,
    ...profileMeta,
    profileText,
    profileJson: input.profileJson,
    schemaVersion: 1,
    source: "user",
    isDefault: input.isDefault ?? false,
    isArchived: false,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  store.profiles.push(profile);

  if (profile.isDefault) {
    setDefaultProfile(store, input.candidateKey, profileId);
  }

  return toMemoryProfileDetail(profile);
}

async function updateMemoryProfileMeta(profileId: string, input: UpdateProfileMetaInput) {
  const store = await getProfileMemoryStore();
  const profile = await findMemoryProfile(input.candidateKey, profileId);
  const profileJsonUpdate =
    input.profileJson === undefined
      ? {}
      : {
          ...buildSummaryUpdate(input.profileJson),
          profileText: buildProfileText(input.profileJson),
          profileJson: input.profileJson,
          schemaVersion: 1,
          source: "user"
        };
  const updatedProfile: ProfileListItem = {
    ...profile,
    ...(input.title === undefined ? {} : { title: input.title }),
    ...(input.targetRole === undefined ? {} : { targetRole: input.targetRole }),
    ...(input.targetCompany === undefined ? {} : { targetCompany: input.targetCompany }),
    ...(input.targetJobId === undefined ? {} : { targetJobId: input.targetJobId }),
    ...profileJsonUpdate,
    ...(input.isDefault === undefined ? {} : { isDefault: input.isDefault }),
    ...(input.isArchived === undefined ? {} : { isArchived: input.isArchived }),
    updatedAt: nowIso()
  };

  store.profiles = store.profiles.map((item) => (item.id === profileId ? updatedProfile : item));

  if (input.isDefault) {
    setDefaultProfile(store, input.candidateKey, profileId);
  }

  return getMemoryProfile(input.candidateKey, profileId);
}

function formatCopyTimestamp(date = new Date()) {
  const pad = (value: number) => value.toString().padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function buildCopyTitle(title: string) {
  return `${title} ${formatCopyTimestamp()}`;
}

async function copyMemoryProfile(profileId: string, input: CopyProfileInput) {
  const store = await getProfileMemoryStore();
  const sourceProfile = await findMemoryProfile(input.candidateKey, profileId);
  const timestamp = nowIso();
  const copiedProfile: ProfileListItem = {
    ...sourceProfile,
    id: createMemoryId("profile"),
    title: buildCopyTitle(sourceProfile.title),
    isDefault: false,
    isArchived: false,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  store.profiles.push(copiedProfile);
  return toMemoryProfileDetail(copiedProfile);
}

async function findOwnedProfile(db: ProfileDb, candidateKey: string, profileId: string) {
  const profile = await db.candidateProfile.findFirst({
    where: {
      id: profileId,
      candidateKey
    }
  });

  if (!profile) {
    throw new HttpError(404, "프로필을 찾을 수 없습니다.");
  }

  return profile;
}

function buildProfileMeta(input: {
  title: string;
  targetRole?: string | null;
  targetCompany?: string | null;
  targetJobId?: string | null;
  profileJson: CandidateProfileJson;
}) {
  const summaryFields = extractProfileSummaryFields(input.profileJson);

  return {
    title: input.title,
    targetRole: input.targetRole ?? null,
    targetCompany: input.targetCompany ?? null,
    targetJobId: input.targetJobId ?? null,
    name: summaryFields.name,
    email: summaryFields.email,
    desiredRoles: summaryFields.desiredRoles,
    skills: summaryFields.skills
  };
}

function buildSummaryUpdate(profileJson: CandidateProfileJson) {
  const summaryFields = extractProfileSummaryFields(profileJson);

  return {
    name: summaryFields.name,
    email: summaryFields.email,
    desiredRoles: summaryFields.desiredRoles,
    skills: summaryFields.skills
  };
}

export async function getProfiles(candidateKey: string, options: { includeArchived?: boolean } = {}) {
  const prisma = getPrismaClient();
  const includeArchived = options.includeArchived ?? false;

  if (prisma) {
    try {
      const profiles = await prisma.candidateProfile.findMany({
        where: {
          candidateKey,
          ...(includeArchived ? {} : { isArchived: false })
        },
        orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }]
      });

      return profiles.map(toProfileListItem);
    } catch {
      // Keep the mock-first demo path alive when the local DB is missing or unmigrated.
    }
  }

  return getMemoryProfiles(candidateKey, includeArchived);
}

export async function createProfile(input: CreateProfileInput) {
  const profileText = buildProfileText(input.profileJson);
  const profileMeta = buildProfileMeta(input);
  const prisma = getPrismaClient();

  if (!prisma) {
    return createMemoryProfile(input);
  }

  try {
    const profile = await prisma.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.candidateProfile.updateMany({
          where: {
            candidateKey: input.candidateKey,
            isDefault: true
          },
          data: {
            isDefault: false
          }
        });
      }

      return tx.candidateProfile.create({
        data: {
          candidateKey: input.candidateKey,
          ...profileMeta,
          profileText,
          profileJson: input.profileJson as Prisma.InputJsonValue,
          schemaVersion: 1,
          source: "user",
          isDefault: input.isDefault ?? false
        }
      });
    });

    return getProfile(input.candidateKey, profile.id);
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
  }

  return createMemoryProfile(input);
}

export async function getProfile(candidateKey: string, profileId: string): Promise<ProfileDetail> {
  const prisma = getPrismaClient();

  if (prisma) {
    try {
      const profile = await findOwnedProfile(prisma, candidateKey, profileId);
      return toProfileListItem(profile);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
    }
  }

  return getMemoryProfile(candidateKey, profileId);
}

export async function updateProfileMeta(profileId: string, input: UpdateProfileMetaInput) {
  const prisma = getPrismaClient();

  if (!prisma) {
    return updateMemoryProfileMeta(profileId, input);
  }

  try {
    const profile = await prisma.$transaction(async (tx) => {
      await findOwnedProfile(tx, input.candidateKey, profileId);
      const profileJsonUpdate =
        input.profileJson === undefined
          ? {}
          : {
              ...buildSummaryUpdate(input.profileJson),
              profileText: buildProfileText(input.profileJson),
              profileJson: input.profileJson as Prisma.InputJsonValue,
              schemaVersion: 1,
              source: "user"
            };

      if (input.isDefault) {
        await tx.candidateProfile.updateMany({
          where: {
            candidateKey: input.candidateKey,
            isDefault: true,
            id: {
              not: profileId
            }
          },
          data: {
            isDefault: false
          }
        });
      }

      return tx.candidateProfile.update({
        where: {
          id: profileId
        },
        data: {
          ...(input.title === undefined ? {} : { title: input.title }),
          ...(input.targetRole === undefined ? {} : { targetRole: input.targetRole }),
          ...(input.targetCompany === undefined ? {} : { targetCompany: input.targetCompany }),
          ...(input.targetJobId === undefined ? {} : { targetJobId: input.targetJobId }),
          ...profileJsonUpdate,
          ...(input.isDefault === undefined ? {} : { isDefault: input.isDefault }),
          ...(input.isArchived === undefined ? {} : { isArchived: input.isArchived })
        }
      });
    });

    return getProfile(input.candidateKey, profile.id);
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
  }

  return updateMemoryProfileMeta(profileId, input);
}

export async function copyProfile(profileId: string, input: CopyProfileInput) {
  const prisma = getPrismaClient();

  if (!prisma) {
    return copyMemoryProfile(profileId, input);
  }

  try {
    const copiedProfile = await prisma.$transaction(async (tx) => {
      const sourceProfile = await findOwnedProfile(tx, input.candidateKey, profileId);

      return tx.candidateProfile.create({
        data: {
          candidateKey: sourceProfile.candidateKey,
          title: buildCopyTitle(sourceProfile.title),
          targetRole: sourceProfile.targetRole,
          targetCompany: sourceProfile.targetCompany,
          targetJobId: sourceProfile.targetJobId,
          name: sourceProfile.name,
          email: sourceProfile.email,
          desiredRoles: sourceProfile.desiredRoles,
          skills: sourceProfile.skills,
          profileText: sourceProfile.profileText,
          profileJson:
            sourceProfile.profileJson === null ? Prisma.JsonNull : (sourceProfile.profileJson as Prisma.InputJsonValue),
          schemaVersion: sourceProfile.schemaVersion,
          source: sourceProfile.source,
          isDefault: false,
          isArchived: false
        }
      });
    });

    return getProfile(input.candidateKey, copiedProfile.id);
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
  }

  return copyMemoryProfile(profileId, input);
}

export async function archiveProfile(candidateKey: string, profileId: string) {
  return updateProfileMeta(profileId, {
    candidateKey,
    isArchived: true,
    isDefault: false
  });
}
