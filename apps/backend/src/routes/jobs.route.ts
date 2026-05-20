import { Router } from "express";
import { z } from "zod";
import { getJobById, getJobFacets, getJobs } from "../services/job.service.js";

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

const jobsQuerySchema = z.object({
  q: optionalStringQuery,
  source: optionalStringQuery,
  country: optionalStringQuery,
  location: optionalStringQuery,
  language: optionalStringQuery,
  limit: optionalLimitQuery
});

jobsRouter.get("/", async (req, res, next) => {
  try {
    const query = jobsQuerySchema.parse(req.query);
    const jobs = await getJobs(query);

    res.json({
      data: jobs,
      count: jobs.length
    });
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
