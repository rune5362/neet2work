import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ZodError } from "zod";
import { createRateLimit } from "./middleware/rateLimit.js";
import { analyzeRouter } from "./routes/analyze.route.js";
import { applicationSetRouter } from "./routes/applicationSet.route.js";
import { authRouter } from "./routes/auth.route.js";
import { careerWorkflowRouter } from "./routes/career-workflow.route.js";
import { documentRouter } from "./routes/document.route.js";
import { draftWorkflowRouter } from "./routes/draft-workflow.route.js";
import { jobsRouter } from "./routes/jobs.route.js";
import { profileRouter } from "./routes/profile.route.js";
import { resumeExtractRouter } from "./routes/resume-extract.route.js";
import { checkPostgresConnection, type PostgresHealth, type PostgresStatus } from "./storage/postgres.js";
import { HttpError } from "./utils/http-error.js";
import { formatErrorForLog } from "./utils/redact.js";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const rootEnvPath = path.resolve(appDir, "../../..", ".env");
const backendEnvPath = path.resolve(appDir, "..", ".env");
const LOCALHOST_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

dotenv.config({ path: rootEnvPath });
dotenv.config({ path: backendEnvPath, override: true });

const PORT = Number(process.env.PORT) || 3000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const allowedClientOrigins = new Set(
  CLIENT_URL.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);
const NODE_ENV = process.env.NODE_ENV || "development";
const AUTH_RATE_LIMIT_WINDOW_SECONDS = Number(process.env.AUTH_RATE_LIMIT_WINDOW_SECONDS) || 60;
const AUTH_RATE_LIMIT_MAX_REQUESTS = Number(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS) || 30;

export function logServerError(error: unknown) {
  console.error(formatErrorForLog(error));
}

function isAllowedOrigin(origin?: string) {
  if (!origin) {
    return true;
  }

  if (allowedClientOrigins.has(origin)) {
    return true;
  }

  try {
    const url = new URL(origin);
    const allowsLocalhostOrigins =
      (process.env.NODE_ENV || NODE_ENV) !== "production" ||
      process.env.ALLOW_LOCALHOST_ORIGINS === "true";

    return allowsLocalhostOrigins && LOCALHOST_HOSTNAMES.has(url.hostname);
  } catch {
    return false;
  }
}

function createHttpsGuard() {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!shouldRequireHttps()) {
      next();
      return;
    }

    if (req.secure) {
      res.setHeader("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
      next();
      return;
    }

    res.status(400).json({
      message: "HTTPS 연결이 필요합니다."
    });
  };
}

function shouldRequireHttps() {
  const value = process.env.REQUIRE_HTTPS?.trim();

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return (process.env.NODE_ENV || NODE_ENV) === "production";
}

function resolveTrustProxySetting() {
  const value = process.env.TRUST_PROXY?.trim();

  if (!value || value === "false") {
    return false;
  }

  if (value === "true") {
    if ((process.env.NODE_ENV || NODE_ENV) === "production") {
      throw new Error("TRUST_PROXY=true is not allowed in production. Use a hop count or explicit subnet.");
    }

    return true;
  }

  const numeric = Number(value);
  if (Number.isInteger(numeric) && numeric >= 0) {
    return numeric;
  }

  return value;
}

function normalizePostgresHealth(
  value: PostgresHealth | PostgresStatus
): PostgresHealth {
  if (typeof value === "string") {
    return {
      status: value
    };
  }

  return value;
}

export function createApp() {
  const app = express();
  const authRateLimit = createRateLimit({
    keyPrefix: "auth",
    maxRequests: AUTH_RATE_LIMIT_MAX_REQUESTS,
    windowMs: AUTH_RATE_LIMIT_WINDOW_SECONDS * 1000
  });

  app.set("trust proxy", resolveTrustProxySetting());
  app.use(createHttpsGuard());

  app.use(
    cors({
      origin(origin, callback) {
        callback(null, isAllowedOrigin(origin));
      },
      credentials: true
    })
  );

  app.use(express.json({ limit: "2mb" }));

  app.get("/", (_req, res) => {
    res.json({
      service: "일했음 청년 API",
      status: "running",
      mode: NODE_ENV
    });
  });

  app.get("/health", async (_req, res, next) => {
    try {
      const databaseHealth = normalizePostgresHealth(await checkPostgresConnection());

      if (databaseHealth.status === "unavailable" && databaseHealth.error) {
        console.error("[database] connection failed", {
          code: databaseHealth.error.code,
          message: databaseHealth.error.message
        });
      }

      res.json({
        ok: true,
        database: databaseHealth.status,
        ...(NODE_ENV === "development" && databaseHealth.error
          ? {
              databaseError: databaseHealth.error
            }
          : {}),
        ai: "mock",
        storage: "local"
      });
    } catch (error) {
      next(error);
    }
  });

  app.use("/api/jobs", jobsRouter);
  app.use("/api/analyze", analyzeRouter);
  app.use("/api/career-workflow", careerWorkflowRouter);
  app.use("/api/draft-workflow", draftWorkflowRouter);
  app.use("/api/resume/extract", resumeExtractRouter);
  app.use("/api/auth", authRateLimit, authRouter);
  app.use("/api/profiles", profileRouter);
  app.use("/api/documents", documentRouter);
  app.use("/api/document-sets", applicationSetRouter);

  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      if (err instanceof ZodError) {
        res.status(400).json({
          message: "요청 데이터 형식이 올바르지 않습니다.",
          issues: err.issues,
          fallback: true
        });
        return;
      }

      if (err instanceof HttpError) {
        if (err.statusCode >= 500) {
          logServerError(err);
        }

        res.status(err.statusCode).json({
          message: err.message,
          fallback: true
        });
        return;
      }

      logServerError(err);

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
