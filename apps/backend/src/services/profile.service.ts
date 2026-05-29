import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ProfileVersionSource,
  ProfileVersionStatus,
  type CandidateProfile,
  type CandidateProfileVersion,
  type Prisma,
  type PrismaClient
} from "../generated/prisma/client.js";
import { getPrismaClient } from "../database/prisma.js";
import { HttpError } from "../errors/httpError.js";
import type {
  CandidateProfileJson,
  CreateProfileInput,
  CreateProfileVersionInput,
  ProfileDetail,
  ProfileListItem,
  ProfileVersion,
  UpdateProfileMetaInput
} from "../types/profile.js";
import { buildProfileText, extractProfileSummaryFields } from "../utils/profile.js";

const serviceDir = path.dirname(fileURLToPath(import.meta.url));
const sampleProfilesPath = path.resolve(serviceDir, "../../data/sampleProfiles.json");
const sampleProfileVersionsPath = path.resolve(serviceDir, "../../data/sampleProfileVersions.json");

type ProfileDb = Pick<PrismaClient, "candidateProfile" | "candidateProfileVersion">;
type ProfileWithVersions = CandidateProfile & {
  versions?: Array<Pick<CandidateProfileVersion, "id" | "versionNo" | "status">>;
};
type ProfileMemoryStore = {
  initialized: boolean;
  profiles: ProfileListItem[];
  versions: ProfileVersion[];
};

const profileMemoryStore: ProfileMemoryStore = {
  initialized: false,
  profiles: [],
  versions: []
};

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}

function asProfileJson(value: unknown) {
  return value as CandidateProfileJson;
}

function findCurrentVersionNo(profile: ProfileWithVersions) {
  if (!profile.versions || !profile.currentVersionId) {
    return null;
  }

  return profile.versions.find((version) => version.id === profile.currentVersionId)?.versionNo ?? null;
}

function toProfileListItem(profile: ProfileWithVersions): ProfileListItem {
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
    currentVersionId: profile.currentVersionId,
    currentVersionNo: findCurrentVersionNo(profile),
    isDefault: profile.isDefault,
    isArchived: profile.isArchived,
    createdAt: toIsoString(profile.createdAt),
    updatedAt: toIsoString(profile.updatedAt)
  };
}

function toProfileVersion(version: CandidateProfileVersion): ProfileVersion {
  return {
    id: version.id,
    profileId: version.profileId,
    candidateKey: version.candidateKey,
    versionNo: version.versionNo,
    title: version.title,
    memo: version.memo,
    profileText: version.profileText,
    profileJson: asProfileJson(version.profileJson),
    schemaVersion: version.schemaVersion,
    source: version.source,
    status: version.status,
    parentVersionId: version.parentVersionId,
    changeSummary: version.changeSummary,
    createdAt: toIsoString(version.createdAt),
    updatedAt: toIsoString(version.updatedAt)
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
    profileMemoryStore.versions = await readSampleJson<ProfileVersion[]>(sampleProfileVersionsPath, []);
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

function getCurrentMemoryProfileVersion(profile: ProfileListItem, versions: ProfileVersion[]) {
  return (
    versions.find((version) => version.id === profile.currentVersionId && version.profileId === profile.id) ??
    versions
      .filter(
        (version) =>
          version.profileId === profile.id &&
          version.candidateKey === profile.candidateKey &&
          version.status === ProfileVersionStatus.active
      )
      .sort((left, right) => right.versionNo - left.versionNo)[0] ??
    null
  );
}

function toMemoryProfileDetail(profile: ProfileListItem, versions: ProfileVersion[]): ProfileDetail {
  return {
    ...profile,
    currentVersion: getCurrentMemoryProfileVersion(profile, versions)
  };
}

async function findMemoryProfile(candidateKey: string, profileId: string) {
  const store = await getProfileMemoryStore();
  const profile = store.profiles.find((item) => item.id === profileId && item.candidateKey === candidateKey);

  if (!profile) {
    throw new HttpError(404, "프로필을 찾을 수 없습니다.");
  }

  return profile;
}

async function findMemoryProfileVersion(candidateKey: string, profileId: string, versionId: string) {
  const store = await getProfileMemoryStore();
  const version = store.versions.find(
    (item) => item.id === versionId && item.profileId === profileId && item.candidateKey === candidateKey
  );

  if (!version) {
    throw new HttpError(404, "프로필 버전을 찾을 수 없습니다.");
  }

  return version;
}

function getNextMemoryProfileVersionNo(store: ProfileMemoryStore, profileId: string) {
  const maxVersionNo = store.versions
    .filter((version) => version.profileId === profileId)
    .reduce((max, version) => Math.max(max, version.versionNo), 0);

  return maxVersionNo + 1;
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
    .sort((left, right) => Number(right.isDefault) - Number(left.isDefault) || right.updatedAt.localeCompare(left.updatedAt));
}

async function getMemoryProfile(candidateKey: string, profileId: string) {
  const store = await getProfileMemoryStore();
  const profile = await findMemoryProfile(candidateKey, profileId);
  return toMemoryProfileDetail(profile, store.versions);
}

async function createMemoryProfile(input: CreateProfileInput) {
  const store = await getProfileMemoryStore();
  const timestamp = nowIso();
  const profileMeta = buildProfileMeta(input);
  const profileId = createMemoryId("profile");
  const versionId = createMemoryId("profile-version");
  const version: ProfileVersion = {
    id: versionId,
    profileId,
    candidateKey: input.candidateKey,
    versionNo: 1,
    title: input.versionTitle ?? null,
    memo: input.memo ?? null,
    profileText: buildProfileText(input.profileJson),
    profileJson: input.profileJson,
    schemaVersion: 1,
    source: ProfileVersionSource.user,
    status: ProfileVersionStatus.active,
    parentVersionId: null,
    changeSummary: null,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  const profile: ProfileListItem = {
    id: profileId,
    candidateKey: input.candidateKey,
    ...profileMeta,
    currentVersionId: versionId,
    currentVersionNo: 1,
    isDefault: input.isDefault ?? false,
    isArchived: false,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  store.profiles.push(profile);
  store.versions.push(version);

  if (profile.isDefault) {
    setDefaultProfile(store, input.candidateKey, profileId);
  }

  return toMemoryProfileDetail(profile, store.versions);
}

async function updateMemoryProfileMeta(profileId: string, input: UpdateProfileMetaInput) {
  const store = await getProfileMemoryStore();
  const profile = await findMemoryProfile(input.candidateKey, profileId);
  const updatedProfile: ProfileListItem = {
    ...profile,
    ...(input.title === undefined ? {} : { title: input.title }),
    ...(input.targetRole === undefined ? {} : { targetRole: input.targetRole }),
    ...(input.targetCompany === undefined ? {} : { targetCompany: input.targetCompany }),
    ...(input.targetJobId === undefined ? {} : { targetJobId: input.targetJobId }),
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

async function getMemoryProfileVersions(
  candidateKey: string,
  profileId: string,
  options: { includeArchived?: boolean } = {}
) {
  const store = await getProfileMemoryStore();
  await findMemoryProfile(candidateKey, profileId);

  return store.versions
    .filter(
      (version) =>
        version.profileId === profileId &&
        version.candidateKey === candidateKey &&
        (options.includeArchived || version.status !== ProfileVersionStatus.archived)
    )
    .sort((left, right) => right.versionNo - left.versionNo);
}

async function createMemoryProfileVersion(profileId: string, input: CreateProfileVersionInput) {
  const store = await getProfileMemoryStore();
  const profile = await findMemoryProfile(input.candidateKey, profileId);
  const makeCurrent = input.makeCurrent ?? true;
  const timestamp = nowIso();
  const currentVersion = getCurrentMemoryProfileVersion(profile, store.versions);
  const version: ProfileVersion = {
    id: createMemoryId("profile-version"),
    profileId,
    candidateKey: input.candidateKey,
    versionNo: getNextMemoryProfileVersionNo(store, profileId),
    title: input.title ?? null,
    memo: input.memo ?? null,
    profileText: buildProfileText(input.profileJson),
    profileJson: input.profileJson,
    schemaVersion: 1,
    source: input.source ?? ProfileVersionSource.user,
    status: input.status ?? ProfileVersionStatus.active,
    parentVersionId: currentVersion?.id ?? null,
    changeSummary: input.changeSummary ?? null,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  store.versions.push(version);

  if (makeCurrent) {
    const summaryFields = buildSummaryUpdate(input.profileJson);
    store.profiles = store.profiles.map((item) =>
      item.id === profileId
        ? {
            ...item,
            ...summaryFields,
            currentVersionId: version.id,
            currentVersionNo: version.versionNo,
            updatedAt: timestamp
          }
        : item
    );
  }

  return version;
}

async function applyMemoryProfileVersion(candidateKey: string, profileId: string, versionId: string) {
  const version = await findMemoryProfileVersion(candidateKey, profileId, versionId);

  if (version.status === ProfileVersionStatus.archived) {
    throw new HttpError(400, "보관된 프로필 버전은 현재 버전으로 적용할 수 없습니다.");
  }

  const summaryFields = buildSummaryUpdate(version.profileJson);
  const store = await getProfileMemoryStore();
  store.profiles = store.profiles.map((profile) =>
    profile.id === profileId && profile.candidateKey === candidateKey
      ? {
          ...profile,
          ...summaryFields,
          currentVersionId: versionId,
          currentVersionNo: version.versionNo,
          updatedAt: nowIso()
        }
      : profile
  );

  return version;
}

async function restoreMemoryProfileVersion(candidateKey: string, profileId: string, versionId: string) {
  const sourceVersion = await findMemoryProfileVersion(candidateKey, profileId, versionId);

  return createMemoryProfileVersion(profileId, {
    candidateKey,
    profileJson: sourceVersion.profileJson,
    title: `v${sourceVersion.versionNo}에서 복원`,
    memo: sourceVersion.memo,
    source: ProfileVersionSource.user,
    status: ProfileVersionStatus.active,
    changeSummary: `v${sourceVersion.versionNo}에서 복원`,
    makeCurrent: true
  });
}

async function archiveMemoryProfileVersion(candidateKey: string, profileId: string, versionId: string) {
  const store = await getProfileMemoryStore();
  const profile = await findMemoryProfile(candidateKey, profileId);

  if (profile.currentVersionId === versionId) {
    throw new HttpError(400, "현재 적용 중인 프로필 버전은 보관할 수 없습니다.");
  }

  const version = await findMemoryProfileVersion(candidateKey, profileId, versionId);
  const updatedVersion = {
    ...version,
    status: ProfileVersionStatus.archived,
    updatedAt: nowIso()
  };

  store.versions = store.versions.map((item) => (item.id === versionId ? updatedVersion : item));
  return updatedVersion;
}

async function findOwnedProfile(db: ProfileDb, candidateKey: string, profileId: string) {
  const profile = await db.candidateProfile.findFirst({
    where: {
      id: profileId,
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

  if (!profile) {
    throw new HttpError(404, "프로필을 찾을 수 없습니다.");
  }

  return profile;
}

async function findCurrentProfileVersion(db: ProfileDb, profile: CandidateProfile) {
  if (profile.currentVersionId) {
    const currentVersion = await db.candidateProfileVersion.findFirst({
      where: {
        id: profile.currentVersionId,
        profileId: profile.id,
        candidateKey: profile.candidateKey
      }
    });

    if (currentVersion) {
      return currentVersion;
    }
  }

  return db.candidateProfileVersion.findFirst({
    where: {
      profileId: profile.id,
      candidateKey: profile.candidateKey,
      status: ProfileVersionStatus.active
    },
    orderBy: {
      versionNo: "desc"
    }
  });
}

async function findOwnedProfileVersion(
  db: ProfileDb,
  candidateKey: string,
  profileId: string,
  versionId: string
) {
  const version = await db.candidateProfileVersion.findFirst({
    where: {
      id: versionId,
      profileId,
      candidateKey
    }
  });

  if (!version) {
    throw new HttpError(404, "프로필 버전을 찾을 수 없습니다.");
  }

  return version;
}

async function getNextProfileVersionNo(db: ProfileDb, profileId: string) {
  const result = await db.candidateProfileVersion.aggregate({
    where: {
      profileId
    },
    _max: {
      versionNo: true
    }
  });

  return (result._max.versionNo ?? 0) + 1;
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

      const createdProfile = await tx.candidateProfile.create({
        data: {
          candidateKey: input.candidateKey,
          ...profileMeta,
          isDefault: input.isDefault ?? false
        }
      });

      const version = await tx.candidateProfileVersion.create({
        data: {
          profileId: createdProfile.id,
          candidateKey: input.candidateKey,
          versionNo: 1,
          title: input.versionTitle ?? null,
          memo: input.memo ?? null,
          profileText,
          profileJson: input.profileJson as Prisma.InputJsonValue,
          source: ProfileVersionSource.user,
          status: ProfileVersionStatus.active
        }
      });

      return tx.candidateProfile.update({
        where: {
          id: createdProfile.id
        },
        data: {
          currentVersionId: version.id
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
      const currentVersion = await findCurrentProfileVersion(prisma, profile);

      return {
        ...toProfileListItem(profile),
        currentVersion: currentVersion ? toProfileVersion(currentVersion) : null
      };
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

export async function archiveProfile(candidateKey: string, profileId: string) {
  return updateProfileMeta(profileId, {
    candidateKey,
    isArchived: true,
    isDefault: false
  });
}

export async function getProfileVersions(
  candidateKey: string,
  profileId: string,
  options: { includeArchived?: boolean } = {}
) {
  const prisma = getPrismaClient();

  if (!prisma) {
    return getMemoryProfileVersions(candidateKey, profileId, options);
  }

  try {
    await findOwnedProfile(prisma, candidateKey, profileId);

    const versions = await prisma.candidateProfileVersion.findMany({
      where: {
        profileId,
        candidateKey,
        ...(options.includeArchived ? {} : { status: { not: ProfileVersionStatus.archived } })
      },
      orderBy: {
        versionNo: "desc"
      }
    });

    return versions.map(toProfileVersion);
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
  }

  return getMemoryProfileVersions(candidateKey, profileId, options);
}

export async function createProfileVersion(profileId: string, input: CreateProfileVersionInput) {
  const prisma = getPrismaClient();
  const makeCurrent = input.makeCurrent ?? true;

  if (!prisma) {
    return createMemoryProfileVersion(profileId, input);
  }

  try {
    const version = await prisma.$transaction(async (tx) => {
    const profile = await findOwnedProfile(tx, input.candidateKey, profileId);
    const currentVersion = await findCurrentProfileVersion(tx, profile);
    const nextVersionNo = await getNextProfileVersionNo(tx, profileId);
    const profileText = buildProfileText(input.profileJson);

    const createdVersion = await tx.candidateProfileVersion.create({
      data: {
        profileId,
        candidateKey: input.candidateKey,
        versionNo: nextVersionNo,
        title: input.title ?? null,
        memo: input.memo ?? null,
        profileText,
        profileJson: input.profileJson as Prisma.InputJsonValue,
        source: input.source ?? ProfileVersionSource.user,
        status: input.status ?? ProfileVersionStatus.active,
        parentVersionId: currentVersion?.id ?? null,
        changeSummary: input.changeSummary ?? null
      }
    });

    if (makeCurrent) {
      await tx.candidateProfile.update({
        where: {
          id: profileId
        },
        data: {
          currentVersionId: createdVersion.id,
          ...buildSummaryUpdate(input.profileJson)
        }
      });
    }

    return createdVersion;
  });

    return toProfileVersion(version);
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
  }

  return createMemoryProfileVersion(profileId, input);
}

export async function getProfileVersion(candidateKey: string, profileId: string, versionId: string) {
  const prisma = getPrismaClient();

  if (!prisma) {
    return findMemoryProfileVersion(candidateKey, profileId, versionId);
  }

  try {
    const version = await findOwnedProfileVersion(prisma, candidateKey, profileId, versionId);
    return toProfileVersion(version);
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
  }

  return findMemoryProfileVersion(candidateKey, profileId, versionId);
}

export async function applyProfileVersion(candidateKey: string, profileId: string, versionId: string) {
  const prisma = getPrismaClient();

  if (!prisma) {
    return applyMemoryProfileVersion(candidateKey, profileId, versionId);
  }

  try {
    const version = await prisma.$transaction(async (tx) => {
    await findOwnedProfile(tx, candidateKey, profileId);
    const targetVersion = await findOwnedProfileVersion(tx, candidateKey, profileId, versionId);

    if (targetVersion.status === ProfileVersionStatus.archived) {
      throw new HttpError(400, "보관된 프로필 버전은 현재 버전으로 적용할 수 없습니다.");
    }

    await tx.candidateProfile.update({
      where: {
        id: profileId
      },
      data: {
        currentVersionId: versionId,
        ...buildSummaryUpdate(asProfileJson(targetVersion.profileJson))
      }
    });

    return targetVersion;
  });

    return toProfileVersion(version);
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
  }

  return applyMemoryProfileVersion(candidateKey, profileId, versionId);
}

export async function restoreProfileVersion(candidateKey: string, profileId: string, versionId: string) {
  const prisma = getPrismaClient();

  if (!prisma) {
    return restoreMemoryProfileVersion(candidateKey, profileId, versionId);
  }

  try {
    const restoredVersion = await prisma.$transaction(async (tx) => {
    const profile = await findOwnedProfile(tx, candidateKey, profileId);
    const sourceVersion = await findOwnedProfileVersion(tx, candidateKey, profileId, versionId);
    const currentVersion = await findCurrentProfileVersion(tx, profile);
    const nextVersionNo = await getNextProfileVersionNo(tx, profileId);
    const profileJson = asProfileJson(sourceVersion.profileJson);

    const version = await tx.candidateProfileVersion.create({
      data: {
        profileId,
        candidateKey,
        versionNo: nextVersionNo,
        title: `v${sourceVersion.versionNo}에서 복원`,
        memo: sourceVersion.memo,
        profileText: sourceVersion.profileText,
        profileJson: profileJson as Prisma.InputJsonValue,
        source: ProfileVersionSource.user,
        status: ProfileVersionStatus.active,
        parentVersionId: currentVersion?.id ?? null,
        changeSummary: `v${sourceVersion.versionNo}에서 복원`
      }
    });

    await tx.candidateProfile.update({
      where: {
        id: profileId
      },
      data: {
        currentVersionId: version.id,
        ...buildSummaryUpdate(profileJson)
      }
    });

    return version;
  });

    return toProfileVersion(restoredVersion);
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
  }

  return restoreMemoryProfileVersion(candidateKey, profileId, versionId);
}

export async function archiveProfileVersion(candidateKey: string, profileId: string, versionId: string) {
  const prisma = getPrismaClient();

  if (!prisma) {
    return archiveMemoryProfileVersion(candidateKey, profileId, versionId);
  }

  try {
    const version = await prisma.$transaction(async (tx) => {
    const profile = await findOwnedProfile(tx, candidateKey, profileId);

    if (profile.currentVersionId === versionId) {
      throw new HttpError(400, "현재 적용 중인 프로필 버전은 보관할 수 없습니다.");
    }

    await findOwnedProfileVersion(tx, candidateKey, profileId, versionId);

    return tx.candidateProfileVersion.update({
      where: {
        id: versionId
      },
      data: {
        status: ProfileVersionStatus.archived
      }
    });
  });

    return toProfileVersion(version);
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
  }

  return archiveMemoryProfileVersion(candidateKey, profileId, versionId);
}
