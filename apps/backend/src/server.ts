import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ZodError } from "zod";
import { analyzeRouter } from "./routes/analyze.route.js";
import { jobsRouter } from "./routes/jobs.route.js";
import { checkPostgresConnection } from "./storage/postgres.js";
import { formatErrorForLog } from "./utils/redact.js";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const rootEnvPath = path.resolve(appDir, "../../..", ".env");
const backendEnvPath = path.resolve(appDir, "..", ".env");

dotenv.config({ path: rootEnvPath });
dotenv.config({ path: backendEnvPath, override: true });

const PORT = Number(process.env.PORT) || 3000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

export function logServerError(error: unknown) {
  console.error(formatErrorForLog(error));
}

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: CLIENT_URL,
      credentials: true
    })
  );

  app.use(express.json({ limit: "2mb" }));

  app.get("/", (_req, res) => {
    res.json({
      service: "일했음 청년 API",
      status: "running",
      mode: process.env.NODE_ENV || "development"
    });
  });

  app.get("/health", async (_req, res, next) => {
    try {
      const database = await checkPostgresConnection();

      res.json({
        ok: true,
        database,
        ai: "mock",
        storage: "local"
      });
    } catch (error) {
      next(error);
    }
  });

  app.use("/api/jobs", jobsRouter);
  app.use("/api/analyze", analyzeRouter);

  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      logServerError(err);

      if (err instanceof ZodError) {
        res.status(400).json({
          message: "요청 데이터 형식이 올바르지 않습니다.",
          issues: err.issues,
          fallback: true
        });
        return;
      }

      res.status(500).json({
        message: "서버 오류가 발생했습니다.",
        fallback: true
      });
    }
  );

  return app;
}

export function startServer() {
  const app = createApp();

  return app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startServer();
}
