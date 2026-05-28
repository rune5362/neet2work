import { Router } from "express";
import { z } from "zod";
import {
  applyProfileVersion,
  archiveProfile,
  archiveProfileVersion,
  createProfile,
  createProfileVersion,
  getProfile,
  getProfiles,
  getProfileVersion,
  getProfileVersions,
  restoreProfileVersion,
  updateProfileMeta
} from "../services/profile.service.js";

export const profileRouter = Router();

const optionalTextSchema = z.string().trim().min(1).nullable().optional();
const stringListSchema = z.array(z.string().trim()).default([]);

const profileProjectSchema = z.object({
  name: z.string().optional(),
  title: z.string().optional(),
  role: z.string().optional(),
  result: z.string().optional(),
  impact: z.string().optional(),
  achievements: z.array(z.string()).optional()
});

const profileJsonSchema = z.object({
  basics: z.object({
    name: z.string(),
    email: z.string(),
    phone: z.string(),
    location: z.string(),
    links: z.object({
      github: z.string().optional(),
      portfolio: z.string().optional(),
      blog: z.string().optional()
    })
  }),
  desired: z.object({
    roles: stringListSchema,
    industries: stringListSchema,
    locations: stringListSchema,
    employmentTypes: stringListSchema
  }),
  summary: z.object({
    headline: z.string(),
    description: z.string()
  }),
  skills: stringListSchema,
  projects: z.array(profileProjectSchema).default([]),
  experiences: z.array(z.unknown()).default([]),
  certifications: z.array(z.unknown()).default([]),
  education: z.array(z.unknown()).default([]),
  activities: z.array(z.unknown()).default([]),
  metadata: z.object({
    lastUpdatedBy: z.enum(["user", "ai", "system"]),
    lastAiUpdatedAt: z.string().nullable()
  })
});

const candidateKeyQuerySchema = z.object({
  candidateKey: z.string().trim().min(1),
  includeArchived: z.enum(["true", "false"]).optional()
});

const candidateKeyBodySchema = z.object({
  candidateKey: z.string().trim().min(1)
});

const createProfileSchema = z.object({
  candidateKey: z.string().trim().min(1),
  title: z.string().trim().min(1),
  targetRole: optionalTextSchema,
  targetCompany: optionalTextSchema,
  targetJobId: optionalTextSchema,
  isDefault: z.boolean().optional(),
  profileJson: profileJsonSchema,
  versionTitle: optionalTextSchema,
  memo: optionalTextSchema
});

const updateProfileMetaSchema = z.object({
  candidateKey: z.string().trim().min(1),
  title: z.string().trim().min(1).optional(),
  targetRole: optionalTextSchema,
  targetCompany: optionalTextSchema,
  targetJobId: optionalTextSchema,
  isDefault: z.boolean().optional(),
  isArchived: z.boolean().optional()
});

const createProfileVersionSchema = z.object({
  candidateKey: z.string().trim().min(1),
  profileJson: profileJsonSchema,
  title: optionalTextSchema,
  memo: optionalTextSchema,
  source: z.enum(["user", "ai", "system"]).optional(),
  status: z.enum(["draft", "active", "archived"]).optional(),
  changeSummary: optionalTextSchema,
  makeCurrent: z.boolean().optional()
});

function parseIncludeArchived(value: string | undefined) {
  return value === "true";
}

profileRouter.get("/", async (req, res, next) => {
  try {
    const query = candidateKeyQuerySchema.parse(req.query);
    const profiles = await getProfiles(query.candidateKey, {
      includeArchived: parseIncludeArchived(query.includeArchived)
    });

    res.json({
      data: profiles,
      count: profiles.length
    });
  } catch (error) {
    next(error);
  }
});

profileRouter.post("/", async (req, res, next) => {
  try {
    const body = createProfileSchema.parse(req.body);
    const profile = await createProfile(body);

    res.status(201).json({
      data: profile
    });
  } catch (error) {
    next(error);
  }
});

profileRouter.get("/:profileId/versions", async (req, res, next) => {
  try {
    const query = candidateKeyQuerySchema.parse(req.query);
    const versions = await getProfileVersions(query.candidateKey, req.params.profileId, {
      includeArchived: parseIncludeArchived(query.includeArchived)
    });

    res.json({
      data: versions,
      count: versions.length
    });
  } catch (error) {
    next(error);
  }
});

profileRouter.post("/:profileId/versions", async (req, res, next) => {
  try {
    const body = createProfileVersionSchema.parse(req.body);
    const version = await createProfileVersion(req.params.profileId, body);

    res.status(201).json({
      data: version
    });
  } catch (error) {
    next(error);
  }
});

profileRouter.get("/:profileId/versions/:versionId", async (req, res, next) => {
  try {
    const query = candidateKeyQuerySchema.parse(req.query);
    const version = await getProfileVersion(query.candidateKey, req.params.profileId, req.params.versionId);

    res.json({
      data: version
    });
  } catch (error) {
    next(error);
  }
});

profileRouter.post("/:profileId/versions/:versionId/apply", async (req, res, next) => {
  try {
    const body = candidateKeyBodySchema.parse(req.body);
    const version = await applyProfileVersion(body.candidateKey, req.params.profileId, req.params.versionId);

    res.json({
      data: version
    });
  } catch (error) {
    next(error);
  }
});

profileRouter.post("/:profileId/versions/:versionId/restore", async (req, res, next) => {
  try {
    const body = candidateKeyBodySchema.parse(req.body);
    const version = await restoreProfileVersion(body.candidateKey, req.params.profileId, req.params.versionId);

    res.status(201).json({
      data: version
    });
  } catch (error) {
    next(error);
  }
});

profileRouter.delete("/:profileId/versions/:versionId", async (req, res, next) => {
  try {
    const body = candidateKeyBodySchema.parse(req.body);
    const version = await archiveProfileVersion(body.candidateKey, req.params.profileId, req.params.versionId);

    res.json({
      data: version
    });
  } catch (error) {
    next(error);
  }
});

profileRouter.get("/:profileId", async (req, res, next) => {
  try {
    const query = candidateKeyQuerySchema.parse(req.query);
    const profile = await getProfile(query.candidateKey, req.params.profileId);

    res.json({
      data: profile
    });
  } catch (error) {
    next(error);
  }
});

profileRouter.patch("/:profileId", async (req, res, next) => {
  try {
    const body = updateProfileMetaSchema.parse(req.body);
    const profile = await updateProfileMeta(req.params.profileId, body);

    res.json({
      data: profile
    });
  } catch (error) {
    next(error);
  }
});

profileRouter.delete("/:profileId", async (req, res, next) => {
  try {
    const query = candidateKeyQuerySchema.parse(req.query);
    const profile = await archiveProfile(query.candidateKey, req.params.profileId);

    res.json({
      data: profile
    });
  } catch (error) {
    next(error);
  }
});
