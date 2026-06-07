import type { Request, RequestHandler, Response } from "express";

type RateLimitOptions = {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
  keyGenerator?: (req: Request, res: Response) => string;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

export function createRateLimit(options: RateLimitOptions): RequestHandler {
  const buckets = new Map<string, RateLimitBucket>();

  return (req, res, next) => {
    const now = Date.now();
    const key = options.keyGenerator?.(req, res) ?? `${options.keyPrefix ?? "rate"}:${req.ip ?? "unknown"}:${req.path}`;
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      buckets.set(key, {
        count: 1,
        resetAt: now + options.windowMs
      });
      next();
      return;
    }

    current.count += 1;

    if (current.count > options.maxRequests) {
      const retryAfterSeconds = Math.ceil((current.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfterSeconds));
      res.status(429).json({
        message: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요."
      });
      return;
    }

    next();
  };
}
