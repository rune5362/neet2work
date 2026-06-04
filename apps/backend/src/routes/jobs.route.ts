import { Router } from "express";
import { z } from "zod";
import { getJobById, getJobFacets, getJobsPage } from "../services/job.service.js";

export const jobsRouter = Router();

const optionalStringQuery = z.preprocess((value) => {
  const raw = Array.isArray(value) ? value[0] : value;

  if (typeof raw !== "string") {
    return undefined;
  }

  return raw.trim() || undefined;
}, z.string().optional());

const optionalLimitQuery = z.preprocess((value) => {
  const raw = Array.isArray(value) ? value[0] : value;

  if (typeof raw !== "string" || !raw.trim()) {
    return undefined;
  }

  return Number(raw);
}, z.number().int().min(1).max(100).optional());

const optionalPageQuery = z.preprocess((value) => {
  const raw = Array.isArray(value) ? value[0] : value;

  if (typeof raw !== "string" || !raw.trim()) {
    return undefined;
  }

  return Number(raw);
}, z.number().int().min(1).optional());

const optionalCareerStageQuery = z.preprocess((value) => {
  const raw = Array.isArray(value) ? value[0] : value;

  if (typeof raw !== "string") {
    return undefined;
  }

  return raw.trim() || undefined;
}, z.enum(["entry", "junior", "senior"]).optional());

const optionalEmploymentTypeCategoryQuery = z.preprocess((value) => {
  const raw = Array.isArray(value) ? value[0] : value;

  if (typeof raw !== "string") {
    return undefined;
  }

  return raw.trim() || undefined;
}, z.enum(["permanent", "contract", "intern", "freelance", "unspecified"]).optional());

const optionalSalaryVisibilityQuery = z.preprocess((value) => {
  const raw = Array.isArray(value) ? value[0] : value;

  if (typeof raw !== "string") {
    return undefined;
  }

  return raw.trim() || undefined;
}, z.enum(["disclosed", "undisclosed"]).optional());

const optionalDeadlineTypeQuery = z.preprocess((value) => {
  const raw = Array.isArray(value) ? value[0] : value;

  if (typeof raw !== "string") {
    return undefined;
  }

  return raw.trim() || undefined;
}, z.enum(["dated", "rolling"]).optional());

const optionalBooleanQuery = z.preprocess((value) => {
  const raw = Array.isArray(value) ? value[0] : value;

  if (typeof raw === "boolean") {
    return raw;
  }

  if (typeof raw !== "string") {
    return undefined;
  }

  const normalized = raw.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }

  if (normalized === "true" || normalized === "1") {
    return true;
  }

  if (normalized === "false" || normalized === "0") {
    return false;
  }

  return raw;
}, z.boolean().optional());

const jobsQuerySchema = z.object({
  q: optionalStringQuery,
  source: optionalStringQuery,
  country: optionalStringQuery,
  language: optionalStringQuery,
  careerStage: optionalCareerStageQuery,
  employmentTypeCategory: optionalEmploymentTypeCategoryQuery,
  jobCategory: optionalStringQuery,
  region1: optionalStringQuery,
  region2: optionalStringQuery,
  region3: optionalStringQuery,
  skill: optionalStringQuery,
  salaryVisibility: optionalSalaryVisibilityQuery,
  deadlineType: optionalDeadlineTypeQuery,
  newOnly: optionalBooleanQuery,
  page: optionalPageQuery,
  limit: optionalLimitQuery
});

jobsRouter.get("/", async (req, res, next) => {
  try {
    const query = jobsQuerySchema.parse(req.query);
    const jobsPage = await getJobsPage(query);

    res.json(jobsPage);
  } catch (error) {
    next(error);
  }
});

jobsRouter.get("/facets", async (_req, res, next) => {
  try {
    const facets = await getJobFacets();

    res.json({
      data: facets
    });
  } catch (error) {
    next(error);
  }
});

jobsRouter.get("/:id", async (req, res, next) => {
  try {
    const job = await getJobById(req.params.id);

    if (!job) {
      res.status(404).json({
        message: "채용공고를 찾을 수 없습니다."
      });
      return;
    }

    res.json({
      data: job
    });
  } catch (error) {
    next(error);
  }
});
