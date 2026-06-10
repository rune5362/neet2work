import type { RequestHandler } from "express";
import { requireAuthenticatedUser } from "./auth.js";
import { createRateLimit } from "./rateLimit.js";

const defaultAiRateLimitWindowSeconds = 60;
const defaultAiRateLimitMaxRequests = 20;

function positiveIntegerEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

export function createProtectedAiRouteMiddleware(): RequestHandler[] {
  let rateLimit: RequestHandler | undefined;
  const deferredRateLimit: RequestHandler = (req, res, next) => {
    rateLimit ??= createRateLimit({
      keyPrefix: "ai",
      windowMs: positiveIntegerEnv("AI_RATE_LIMIT_WINDOW_SECONDS", defaultAiRateLimitWindowSeconds) * 1000,
      maxRequests: positiveIntegerEnv("AI_RATE_LIMIT_MAX_REQUESTS", defaultAiRateLimitMaxRequests),
      keyGenerator(request, response) {
        const authenticatedUserId = response.locals.authenticatedUserId;
        const identity =
          typeof authenticatedUserId === "string" && authenticatedUserId.trim()
            ? `user:${authenticatedUserId}`
            : `ip:${request.ip ?? "unknown"}`;

        return `${identity}:${request.baseUrl}${request.path}`;
      }
    });

    rateLimit(req, res, next);
  };

  return [requireAuthenticatedUser, deferredRateLimit];
}
