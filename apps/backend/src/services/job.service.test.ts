import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPrismaClient } from "../database/prisma.js";
import { getJobById, getJobFacets, getJobs } from "./job.service.js";

vi.mock("../database/prisma.js", () => ({
  getPrismaClient: vi.fn()
}));

const getPrismaClientMock = vi.mocked(getPrismaClient);

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

describe("getJobs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPrismaClientMock.mockReturnValue(null);
    delete process.env.DATABASE_URL;
    delete process.env.DATABASE_PASSWORD;
  });

  it("filters fallback jobs by text and exact facets", async () => {
    const jobs = await getJobs({
      q: "express",
      source: "sample",
      country: "KR",
      language: "ko",
      limit: 5
    });

    expect(jobs.map((job) => job.id)).toEqual(["job-002"]);
  });

  it("limits fallback jobs", async () => {
    const jobs = await getJobs({ limit: 2 });

    expect(jobs).toHaveLength(2);
  });

  it("queries only active database jobs", async () => {
    const findMany = vi.fn().mockResolvedValue([dbJob]);
    getPrismaClientMock.mockReturnValue({
      jobPosting: { findMany }
    } as unknown as ReturnType<typeof getPrismaClient>);

    await getJobs({ source: "careercross", limit: 5 });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "active",
          source: "careercross"
        }),
        take: 5
      })
    );
  });

  it("does not hide query or schema drift behind sample fallback", async () => {
    const findMany = vi.fn().mockRejectedValue(new Error("column does not exist"));
    getPrismaClientMock.mockReturnValue({
      jobPosting: { findMany }
    } as unknown as ReturnType<typeof getPrismaClient>);

    await expect(getJobs()).rejects.toThrow("column does not exist");
  });

  it("redacts sensitive database details before logging fallback warnings", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const findMany = vi.fn().mockRejectedValue(
      new Error(
        "ENOTFOUND DATABASE_URL=postgresql://n2w:super-secret@db.example.com/postgres DATABASE_PASSWORD=super-secret"
      )
    );
    getPrismaClientMock.mockReturnValue({
      jobPosting: { findMany }
    } as unknown as ReturnType<typeof getPrismaClient>);

    await expect(getJobs()).resolves.toHaveLength(3);

    const warning = String(warnSpy.mock.calls[0]?.[0] ?? "");
    expect(warning).toContain("getJobs database unavailable");
    expect(warning).toContain("[redacted]");
    expect(warning).not.toContain("super-secret");
    expect(warning).not.toContain("DATABASE_PASSWORD=super-secret");

    warnSpy.mockRestore();
  });
});

describe("getJobFacets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPrismaClientMock.mockReturnValue(null);
    delete process.env.DATABASE_URL;
    delete process.env.DATABASE_PASSWORD;
  });

  it("summarizes fallback jobs into filter facets", async () => {
    await expect(getJobFacets()).resolves.toEqual({
      sources: [{ value: "sample", count: 3 }],
      countries: [{ value: "KR", count: 3 }],
      languages: [{ value: "ko", count: 3 }],
      total: 3
    });
  });

  it("counts facets from active database jobs only", async () => {
    const groupBy = vi
      .fn()
      .mockResolvedValueOnce([{ source: "careercross", _count: { _all: 4 } }])
      .mockResolvedValueOnce([{ country: "JP", _count: { _all: 4 } }])
      .mockResolvedValueOnce([{ language: "en", _count: { _all: 4 } }]);
    const count = vi.fn().mockResolvedValue(4);
    getPrismaClientMock.mockReturnValue({
      jobPosting: { groupBy, count }
    } as unknown as ReturnType<typeof getPrismaClient>);

    await expect(getJobFacets()).resolves.toMatchObject({
      sources: [{ value: "careercross", count: 4 }],
      countries: [{ value: "JP", count: 4 }],
      languages: [{ value: "en", count: 4 }],
      total: 4
    });
    expect(groupBy).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ where: { status: "active" } })
    );
    expect(groupBy).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ where: { status: "active" } })
    );
    expect(groupBy).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ where: { status: "active" } })
    );
    expect(count).toHaveBeenCalledWith({ where: { status: "active" } });
  });
});

describe("getJobById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPrismaClientMock.mockReturnValue(null);
    delete process.env.DATABASE_URL;
    delete process.env.DATABASE_PASSWORD;
  });

  it("returns a matching sample job when the database is not configured", async () => {
    const job = await getJobById("job-002");

    expect(job?.title).toBe("Node.js 백엔드 개발자");
    expect(job?.source).toBe("sample");
  });

  it("returns undefined when no job matches", async () => {
    await expect(getJobById("missing-job")).resolves.toBeUndefined();
  });

  it("looks up only active database jobs", async () => {
    const findFirst = vi.fn().mockResolvedValue(dbJob);
    getPrismaClientMock.mockReturnValue({
      jobPosting: { findFirst }
    } as unknown as ReturnType<typeof getPrismaClient>);

    await getJobById("db-job-001");

    expect(findFirst).toHaveBeenCalledWith({
      where: { id: "db-job-001", status: "active" },
      select: expect.any(Object)
    });
  });
});
