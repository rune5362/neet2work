import { describe, expect, it, vi } from "vitest";
import { createRateLimit } from "./rateLimit.js";

function createResponse() {
  const headers = new Map<string, string>();
  const response = {
    body: undefined as unknown,
    statusCode: 200,
    json: vi.fn((body: unknown) => {
      response.body = body;
      return response;
    }),
    setHeader: vi.fn((key: string, value: string) => {
      headers.set(key, value);
      return response;
    }),
    status: vi.fn((statusCode: number) => {
      response.statusCode = statusCode;
      return response;
    })
  };

  return {
    headers,
    response
  };
}

describe("createRateLimit", () => {
  it("blocks requests over the configured limit", () => {
    const middleware = createRateLimit({
      maxRequests: 2,
      windowMs: 60_000
    });
    const request = {
      ip: "127.0.0.1",
      path: "/login"
    };
    const first = createResponse();
    const second = createResponse();
    const third = createResponse();
    const next = vi.fn();

    middleware(request as never, first.response as never, next);
    middleware(request as never, second.response as never, next);
    middleware(request as never, third.response as never, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(third.response.statusCode).toBe(429);
    expect(third.response.body).toEqual({
      message: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요."
    });
    expect(third.headers.get("Retry-After")).toBe("60");
  });
});
