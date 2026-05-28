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

function requirePrisma() {
  const prisma = getPrismaClient();

  if (!prisma) {
    throw new HttpError(503, "프로필 저장소를 사용할 수 없습니다.");
  }

  return prisma;
}

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

async function getSampleProfiles(candidateKey: string, includeArchived = false) {
  const profiles = await readSampleJson<ProfileListItem[]>(sampleProfilesPath, []);
  return profiles.filter(
    (profile) => profile.candidateKey === candidateKey && (includeArchived || !profile.isArchived)
  );
}

async function getSampleProfile(candidateKey: string, profileId: string): Promise<ProfileDetail | null> {
  const profiles = await readSampleJson<ProfileListItem[]>(sampleProfilesPath, []);
  const versions = await readSampleJson<ProfileVersion[]>(sampleProfileVersionsPath, []);
  const profile = profiles.find((item) => item.id === profileId && item.candidateKey === candidateKey);

  if (!profile) {
    return null;
  }

  const currentVersion =
    versions.find((version) => version.id === profile.currentVersionId && version.profileId === profileId) ??
    versions
      .filter(
        (version) =>
          version.profileId === profileId &&
          version.candidateKey === candidateKey &&
          version.status === ProfileVersionStatus.active
      )
      .sort((left, right) => right.versionNo - left.versionNo)[0] ??
    null;

  return {
    ...profile,
    currentVersion
  };
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

  return getSampleProfiles(candidateKey, includeArchived);
}

export async function createProfile(input: CreateProfileInput) {
  const prisma = requirePrisma();
  const profileText = buildProfileText(input.profileJson);
  const profileMeta = buildProfileMeta(input);

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

  const sampleProfile = await getSampleProfile(candidateKey, profileId);

  if (!sampleProfile) {
    throw new HttpError(404, "프로필을 찾을 수 없습니다.");
  }

  return sampleProfile;
}

export async function updateProfileMeta(profileId: string, input: UpdateProfileMetaInput) {
  const prisma = requirePrisma();

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
  const prisma = requirePrisma();

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
}

export async function createProfileVersion(profileId: string, input: CreateProfileVersionInput) {
  const prisma = requirePrisma();
  const makeCurrent = input.makeCurrent ?? true;

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
}

export async function getProfileVersion(candidateKey: string, profileId: string, versionId: string) {
  const prisma = requirePrisma();
  const version = await findOwnedProfileVersion(prisma, candidateKey, profileId, versionId);
  return toProfileVersion(version);
}

export async function applyProfileVersion(candidateKey: string, profileId: string, versionId: string) {
  const prisma = requirePrisma();

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
}

export async function restoreProfileVersion(candidateKey: string, profileId: string, versionId: string) {
  const prisma = requirePrisma();

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
}

export async function archiveProfileVersion(candidateKey: string, profileId: string, versionId: string) {
  const prisma = requirePrisma();

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
}
