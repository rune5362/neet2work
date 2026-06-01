import { Router } from "express";
import { z } from "zod";
import {
  archiveProfile,
  copyProfile,
  createProfile,
  getProfile,
  getProfiles,
  updateProfileMeta
} from "../services/profile.service.js";
import { getAuthenticatedCandidateKey } from "../utils/auth-session.js";

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

const profileListQuerySchema = z.object({
  includeArchived: z.enum(["true", "false"]).optional()
});

const copyProfileSchema = z.object({});

const createProfileSchema = z.object({
  title: z.string().trim().min(1),
  targetRole: optionalTextSchema,
  targetCompany: optionalTextSchema,
  targetJobId: optionalTextSchema,
  isDefault: z.boolean().optional(),
  profileJson: profileJsonSchema
});

const updateProfileMetaSchema = z.object({
  title: z.string().trim().min(1).optional(),
  targetRole: optionalTextSchema,
  targetCompany: optionalTextSchema,
  targetJobId: optionalTextSchema,
  profileJson: profileJsonSchema.optional(),
  isDefault: z.boolean().optional(),
  isArchived: z.boolean().optional()
});

function parseIncludeArchived(value: string | undefined) {
  return value === "true";
}

profileRouter.get("/", async (req, res, next) => {
  try {
    const candidateKey = getAuthenticatedCandidateKey(req.get("authorization"));
    const query = profileListQuerySchema.parse(req.query);
    const profiles = await getProfiles(candidateKey, {
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
    const candidateKey = getAuthenticatedCandidateKey(req.get("authorization"));
    const body = createProfileSchema.parse(req.body);
    const profile = await createProfile({
      ...body,
      candidateKey
    });

    res.status(201).json({
      data: profile
    });
  } catch (error) {
    next(error);
  }
});

profileRouter.post("/:profileId/copy", async (req, res, next) => {
  try {
    const candidateKey = getAuthenticatedCandidateKey(req.get("authorization"));
    copyProfileSchema.parse(req.body);
    const profile = await copyProfile(req.params.profileId, { candidateKey });

    res.status(201).json({
      data: profile
    });
  } catch (error) {
    next(error);
  }
});

profileRouter.get("/:profileId", async (req, res, next) => {
  try {
    const candidateKey = getAuthenticatedCandidateKey(req.get("authorization"));
    const profile = await getProfile(candidateKey, req.params.profileId);

    res.json({
      data: profile
    });
  } catch (error) {
    next(error);
  }
});

profileRouter.patch("/:profileId", async (req, res, next) => {
  try {
    const candidateKey = getAuthenticatedCandidateKey(req.get("authorization"));
    const body = updateProfileMetaSchema.parse(req.body);
    const profile = await updateProfileMeta(req.params.profileId, {
      ...body,
      candidateKey
    });

    res.json({
      data: profile
    });
  } catch (error) {
    next(error);
  }
});

profileRouter.delete("/:profileId", async (req, res, next) => {
  try {
    const candidateKey = getAuthenticatedCandidateKey(req.get("authorization"));
    const profile = await archiveProfile(candidateKey, req.params.profileId);

    res.json({
      data: profile
    });
  } catch (error) {
    next(error);
  }
});
