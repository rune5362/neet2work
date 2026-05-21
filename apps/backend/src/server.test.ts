import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPrismaClient } from "./database/prisma.js";
import { checkPostgresConnection } from "./storage/postgres.js";
import { createApp, logServerError } from "./server.js";

vi.mock("./database/prisma.js", () => ({
  getPrismaClient: vi.fn()
}));

vi.mock("./storage/postgres.js", () => ({
  checkPostgresConnection: vi.fn()
}));

const getPrismaClientMock = vi.mocked(getPrismaClient);
const checkPostgresConnectionMock = vi.mocked(checkPostgresConnection);

const dbJob = {
  id: "db-job-001",
  title: "Backend Developer",
  company: "N2W",
  location: "Tokyo",
  careerLevel: "Mid Career",
  skills: ["TypeScript"],
  description: "Build public APIs",
  source: "careercross",
  sourceJobId: "1590000",
  sourceUrl: "https://example.com/jobs/1590000",
  country: "JP",
  language: "en",
  employmentType: null,
  educationLevel: null,
  salaryText: null,
  deadlineText: null,
  applyMethod: null,
  collectedAt: new Date("2026-05-19T06:00:00.000Z")
};

async function request(
  app: ReturnType<typeof createApp>,
  path: string,
  init?: RequestInit
): Promise<Response> {
  const server = app.listen(0);

  try {
    const address = server.address() as AddressInfo;
    return await fetch(`http://127.0.0.1:${address.port}${path}`, init);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
}

describe("server HTTP contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkPostgresConnectionMock.mockResolvedValue("connected");
    getPrismaClientMock.mockReturnValue(null);
    process.env.AI_API_KEY = "present-but-not-wired";
    process.env.R2_ACCESS_KEY_ID = "present-but-not-wired";
  });

  afterEach(() => {
    delete process.env.AI_API_KEY;
    delete process.env.R2_ACCESS_KEY_ID;
  });

  it("reports only live runtime capabilities in health", async () => {
    const response = await request(createApp(), "/health");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      database: "connected",
      ai: "mock",
      storage: "local"
    });
  });

  it("keeps the analyze route envelope stable", async () => {
    const response = await request(createApp(), "/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        jobId: "job-001",
        resumeText: "React와 TypeScript로 API 연동 화면을 만들었습니다."
      })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({
      jobId: "job-001",
      mode: "mock"
    });
  });

  it("keeps the jobs list route envelope stable", async () => {
    const findMany = vi.fn().mockResolvedValue([dbJob]);
    getPrismaClientMock.mockReturnValue({
      jobPosting: { findMany }
    } as unknown as ReturnType<typeof getPrismaClient>);

    const response = await request(createApp(), "/api/jobs?source=careercross&limit=1");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      data: [
        {
          ...dbJob,
          collectedAt: "2026-05-19T06:00:00.000Z"
        }
      ],
      count: 1
    });
  });

  it("keeps empty connected database job lists empty", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    getPrismaClientMock.mockReturnValue({
      jobPosting: { findMany }
    } as unknown as ReturnType<typeof getPrismaClient>);

    const response = await request(createApp(), "/api/jobs");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      data: [],
      count: 0
    });
  });

  it("keeps the jobs facets route envelope stable", async () => {
    const groupBy = vi
      .fn()
      .mockResolvedValueOnce([{ source: "careercross", _count: { _all: 4 } }])
      .mockResolvedValueOnce([{ country: "JP", _count: { _all: 4 } }])
      .mockResolvedValueOnce([{ language: "en", _count: { _all: 4 } }]);
    const count = vi.fn().mockResolvedValue(4);
    getPrismaClientMock.mockReturnValue({
      jobPosting: { groupBy, count }
    } as unknown as ReturnType<typeof getPrismaClient>);

    const response = await request(createApp(), "/api/jobs/facets");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      data: {
        sources: [{ value: "careercross", count: 4 }],
        countries: [{ value: "JP", count: 4 }],
        languages: [{ value: "en", count: 4 }],
        total: 4
      }
    });
  });

  it("keeps the job detail route envelope and 404 stable", async () => {
    const findFirst = vi.fn().mockResolvedValueOnce(dbJob).mockResolvedValueOnce(null);
    getPrismaClientMock.mockReturnValue({
      jobPosting: { findFirst }
    } as unknown as ReturnType<typeof getPrismaClient>);

    const foundResponse = await request(createApp(), "/api/jobs/db-job-001");
    const foundBody = await foundResponse.json();
    const missingResponse = await request(createApp(), "/api/jobs/missing");
    const missingBody = await missingResponse.json();

    expect(foundResponse.status).toBe(200);
    expect(foundBody).toEqual({
      data: {
        ...dbJob,
        collectedAt: "2026-05-19T06:00:00.000Z"
      }
    });
    expect(missingResponse.status).toBe(404);
    expect(missingBody).toEqual({
      message: "채용공고를 찾을 수 없습니다."
    });
  });
});

describe("logServerError", () => {
  it("redacts secrets before writing server errors", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    logServerError(
      new Error(
        "DATABASE_URL=postgresql://n2w:super-secret@db.example.com/postgres DATABASE_PASSWORD=super-secret"
      )
    );

    const output = errorSpy.mock.calls.flat().join(" ");
    expect(output).toContain("[redacted]");
    expect(output).not.toContain("super-secret");
    errorSpy.mockRestore();
  });
});
