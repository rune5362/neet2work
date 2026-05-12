import { Router } from "express";
import { getJobs } from "../services/job.service.js";

export const jobsRouter = Router();

jobsRouter.get("/", async (_req, res, next) => {
  try {
    const jobs = await getJobs();

    res.json({
      data: jobs,
      count: jobs.length
    });
  } catch (error) {
    next(error);
  }
});
