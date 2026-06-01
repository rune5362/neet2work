import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPrismaClient } from "../database/prisma.js";
import {
  classifyCareerStage,
  classifyEmploymentTypeCategory,
  getJobById,
  getJobFacets,
  getJobs,
  getJobsPage
} from "./job.service.js";

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
  employmentType: "正社員",
  careerStage: null,
  educationLevel: null,
  salaryText: null,
  deadlineText: "2026.05.19 ~ 2026.06.30",
  applyMethod: null,
  collectedAt: new Date("2026-05-19T06:00:00.000Z")
};

function mockPaginatedJobPostingQuery(jobs: typeof dbJob[], total = jobs.length) {
  const count = vi.fn().mockResolvedValue(total);
  const findMany = vi.fn()
    .mockResolvedValueOnce(jobs)
    .mockResolvedValueOnce(jobs.map((job) => ({ skills: job.skills })));

  getPrismaClientMock.mockReturnValue({
    jobPosting: { findMany, count }
  } as unknown as ReturnType<typeof getPrismaClient>);

  return { count, findMany };
}

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
        take: undefined
      })
    );
  });

  it("returns all matching database jobs when limit is omitted", async () => {
    const findMany = vi.fn().mockResolvedValue([
      dbJob,
      { ...dbJob, id: "db-job-002", sourceJobId: "1590001" }
    ]);
    getPrismaClientMock.mockReturnValue({
      jobPosting: { findMany }
    } as unknown as ReturnType<typeof getPrismaClient>);

    await expect(getJobs({ source: "careercross" })).resolves.toHaveLength(2);

    const [query] = findMany.mock.calls[0] ?? [];
    expect(query?.take).toBeUndefined();
  });

  it("derives and filters public career stages from raw career labels", async () => {
    const findMany = vi.fn().mockResolvedValue([
      { ...dbJob, id: "entry-job", careerLevel: "未経験歓迎" },
      { ...dbJob, id: "junior-job", careerLevel: "Mid Career" },
      { ...dbJob, id: "senior-job", careerLevel: "경력8년↑" },
      { ...dbJob, id: "unknown-job", careerLevel: "Experience not specified" }
    ]);
    getPrismaClientMock.mockReturnValue({
      jobPosting: { findMany }
    } as unknown as ReturnType<typeof getPrismaClient>);

    await expect(getJobs({ careerStage: "junior", limit: 5 })).resolves.toEqual([
      expect.objectContaining({
        id: "junior-job",
        careerLevel: "Mid Career",
        careerStage: "junior"
      })
    ]);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: [expect.objectContaining({ OR: expect.any(Array) })],
          status: "active"
        }),
        take: undefined
      })
    );
  });

  it("derives and filters public employment type categories from raw labels", async () => {
    const findMany = vi.fn().mockResolvedValue([
      { ...dbJob, id: "permanent-job", employmentType: "正社員" },
      { ...dbJob, id: "contract-job", employmentType: "契約社員" },
      { ...dbJob, id: "intern-job", employmentType: "Internship" },
      { ...dbJob, id: "freelance-job", employmentType: "Freelance" },
      { ...dbJob, id: "unknown-job", employmentType: "Employment Type not specified" }
    ]);
    getPrismaClientMock.mockReturnValue({
      jobPosting: { findMany }
    } as unknown as ReturnType<typeof getPrismaClient>);

    await expect(getJobs({ employmentTypeCategory: "freelance", limit: 5 })).resolves.toEqual([
      expect.objectContaining({
        id: "freelance-job",
        employmentType: "Freelance",
        employmentTypeCategory: "freelance"
      })
    ]);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: [expect.objectContaining({ OR: expect.any(Array) })],
          status: "active"
        }),
        take: undefined
      })
    );
  });

  it("falls back to title and description when employmentType is missing or vague", async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        ...dbJob,
        id: "intern-title-job",
        employmentType: "기타",
        title: "채용연계형 인턴 모집",
        description: "실무 중심 프론트엔드 인턴십"
      },
      {
        ...dbJob,
        id: "contract-desc-job",
        employmentType: "Employment Type not specified",
        title: "백엔드 엔지니어",
        description: "계약직 포지션이며 API 고도화를 담당합니다."
      }
    ]);
    getPrismaClientMock.mockReturnValue({
      jobPosting: { findMany }
    } as unknown as ReturnType<typeof getPrismaClient>);

    await expect(getJobs({ employmentTypeCategory: "intern" })).resolves.toEqual([
      expect.objectContaining({
        id: "intern-title-job",
        employmentTypeCategory: "intern"
      })
    ]);
    await expect(getJobs({ employmentTypeCategory: "contract" })).resolves.toEqual([
      expect.objectContaining({
        id: "contract-desc-job",
        employmentTypeCategory: "contract"
      })
    ]);
  });

  it("matches 재택 queries against Korean and Japanese remote-work signals", async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        ...dbJob,
        id: "kr-remote-job",
        country: "KR",
        language: "ko",
        title: "백엔드 개발자",
        location: "서울 강남구 (원격 근무 가능)",
        description: "재택근무와 원격 협업이 가능한 포지션입니다."
      },
      {
        ...dbJob,
        id: "jp-remote-job",
        country: "JP",
        language: "ja",
        title: "【IT系総合職】未経験入社9割＆月25万スタート★フルリモあり",
        location: "フルリモート",
        description: "全国からリモート勤務できます。"
      },
      {
        ...dbJob,
        id: "office-only-job",
        country: "KR",
        language: "ko",
        title: "사무실 상주 개발자",
        location: "서울 강서구",
        description: "출근 기반 근무입니다."
      }
    ]);
    getPrismaClientMock.mockReturnValue({
      jobPosting: { findMany }
    } as unknown as ReturnType<typeof getPrismaClient>);

    await expect(getJobs({ q: "재택" })).resolves.toEqual([
      expect.objectContaining({ id: "kr-remote-job" }),
      expect.objectContaining({ id: "jp-remote-job" })
    ]);
  });

  it("keeps non-remote keywords required when expanding 재택 aliases", async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        ...dbJob,
        id: "kr-remote-python-job",
        country: "KR",
        language: "ko",
        title: "재택 Python 백엔드 개발자",
        location: "서울 강남구 (원격 근무 가능)",
        description: "Python API와 재택근무 환경을 함께 제공합니다.",
        skills: ["Python", "FastAPI"]
      },
      {
        ...dbJob,
        id: "jp-remote-design-job",
        country: "JP",
        language: "ja",
        title: "フルリモート UIデザイナー",
        location: "フルリモート",
        description: "全国からリモート勤務できます。",
        skills: ["Figma"]
      },
      {
        ...dbJob,
        id: "onsite-python-job",
        country: "KR",
        language: "ko",
        title: "Python 데이터 엔지니어",
        location: "서울 강서구",
        description: "출근 기반 근무입니다.",
        skills: ["Python", "SQL"]
      }
    ]);
    getPrismaClientMock.mockReturnValue({
      jobPosting: { findMany }
    } as unknown as ReturnType<typeof getPrismaClient>);

    await expect(getJobs({ q: "재택 Python" })).resolves.toEqual([
      expect.objectContaining({ id: "kr-remote-python-job" })
    ]);
  });

  it("derives postedAt from range starts and source update dates", async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        ...dbJob,
        id: "range-job",
        deadlineText: "2026.05.17 ~ 2026.06.01"
      },
      {
        ...dbJob,
        id: "updated-job",
        sourceJobId: "1590001",
        deadlineText: "마감일 미기재",
        rawJson: { updateDate: "May 18, 2026" }
      },
      {
        ...dbJob,
        id: "unknown-job",
        sourceJobId: "1590002",
        deadlineText: "2026-06-30"
      }
    ]);
    getPrismaClientMock.mockReturnValue({
      jobPosting: { findMany }
    } as unknown as ReturnType<typeof getPrismaClient>);

    await expect(getJobs()).resolves.toEqual([
      expect.objectContaining({
        id: "range-job",
        postedAt: "2026-05-17T00:00:00.000Z"
      }),
      expect.objectContaining({
        id: "updated-job",
        postedAt: "2026-05-18T00:00:00.000Z"
      }),
      expect.objectContaining({
        id: "unknown-job",
        postedAt: null
      })
    ]);
  });

  it("returns an empty database result instead of sample fallback when the database is connected", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    getPrismaClientMock.mockReturnValue({
      jobPosting: { findMany }
    } as unknown as ReturnType<typeof getPrismaClient>);

    await expect(getJobs()).resolves.toEqual([]);
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

describe("getJobsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPrismaClientMock.mockReturnValue(null);
    delete process.env.DATABASE_URL;
    delete process.env.DATABASE_PASSWORD;
  });

  it("returns server pagination metadata instead of preloading the whole list", async () => {
    const paginatedDbJobs = Array.from({ length: 12 }, (_, index) => ({
      ...dbJob,
      id: `db-job-${String(index + 1).padStart(3, "0")}`,
      sourceJobId: `1590${String(index + 1).padStart(3, "0")}`,
      title: `Backend Developer ${index + 1}`,
      skills: index < 9 ? ["TypeScript", "React"] : ["TypeScript", "Go"]
    }));
    const count = vi.fn().mockResolvedValue(paginatedDbJobs.length);
    const findMany = vi.fn()
      .mockResolvedValueOnce(paginatedDbJobs.slice(9, 12))
      .mockResolvedValueOnce(paginatedDbJobs.map((job) => ({ skills: job.skills })));
    getPrismaClientMock.mockReturnValue({
      jobPosting: { findMany, count }
    } as unknown as ReturnType<typeof getPrismaClient>);

    await expect(getJobsPage({ page: 2, limit: 9 })).resolves.toEqual({
      data: [
        expect.objectContaining({ id: "db-job-010" }),
        expect.objectContaining({ id: "db-job-011" }),
        expect.objectContaining({ id: "db-job-012" })
      ],
      count: 3,
      total: 12,
      page: 2,
      limit: 9,
      availableSkills: ["Go", "React", "TypeScript"]
    });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "active" }),
        skip: 9,
        take: 9
      })
    );
  });

  it("uses count and page-level skip/take instead of materializing every row for pagination", async () => {
    const paginatedDbJobs = Array.from({ length: 3 }, (_, index) => ({
      ...dbJob,
      id: `page-slice-job-${index + 10}`,
      sourceJobId: `2590${String(index + 10).padStart(3, "0")}`,
      title: `Backend Developer ${index + 10}`
    }));
    const { count, findMany } = mockPaginatedJobPostingQuery(paginatedDbJobs, 12);

    await expect(getJobsPage({ page: 2, limit: 9 })).resolves.toEqual({
      data: [
        expect.objectContaining({ id: "page-slice-job-10" }),
        expect.objectContaining({ id: "page-slice-job-11" }),
        expect.objectContaining({ id: "page-slice-job-12" })
      ],
      count: 3,
      total: 12,
      page: 2,
      limit: 9,
      availableSkills: ["TypeScript"]
    });

    expect(count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "active" })
      })
    );
    expect(findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({ status: "active" }),
        skip: 9,
        take: 9
      })
    );
  });

  it("treats unspecified employment as a first-class server-side filter", async () => {
    mockPaginatedJobPostingQuery([
      {
        ...dbJob,
        id: "unspecified-job",
        sourceJobId: "1590002",
        employmentType: null,
        title: "운영 코디네이터",
        description: "근무 조건은 면접 후 안내합니다."
      }
    ], 1);

    await expect(
      getJobsPage({ employmentTypeCategory: "unspecified", page: 1, limit: 9 })
    ).resolves.toEqual({
      data: [expect.objectContaining({ id: "unspecified-job", employmentTypeCategory: null })],
      count: 1,
      total: 1,
      page: 1,
      limit: 9,
      availableSkills: ["TypeScript"]
    });
  });

  it("matches Korean wide-region labels against normalized stored locations", async () => {
    mockPaginatedJobPostingQuery([
      {
        ...dbJob,
        id: "kr-seoul-job",
        country: "KR",
        language: "ko",
        location: "서울 마포구",
        sourceJobId: "1591000"
      }
    ]);

    await expect(getJobsPage({ country: "KR", region1: "서울특별시", page: 1, limit: 9 })).resolves
      .toEqual({
        data: [expect.objectContaining({ id: "kr-seoul-job" })],
        count: 1,
        total: 1,
        page: 1,
        limit: 9,
        availableSkills: ["TypeScript"]
      });
  });

  it("keeps detailed Korean location filters working when region1 uses the display label", async () => {
    mockPaginatedJobPostingQuery([
      {
        ...dbJob,
        id: "kr-gyeonggi-job",
        country: "KR",
        language: "ko",
        location: "경기 성남시 분당구",
        sourceJobId: "1591001"
      }
    ]);

    await expect(
      getJobsPage({
        country: "KR",
        region1: "경기도",
        region2: "성남시",
        region3: "분당구",
        page: 1,
        limit: 9
      })
    ).resolves.toEqual({
      data: [expect.objectContaining({ id: "kr-gyeonggi-job" })],
      count: 1,
      total: 1,
      page: 1,
      limit: 9,
      availableSkills: ["TypeScript"]
    });
  });

  it("matches Japanese ward labels against romanized stored locations", async () => {
    mockPaginatedJobPostingQuery([
      {
        ...dbJob,
        id: "jp-minato-job",
        country: "JP",
        language: "en",
        location: "Asia Japan Tokyo Minato",
        sourceJobId: "1591002"
      }
    ]);

    await expect(
      getJobsPage({
        country: "JP",
        region1: "도쿄도",
        region2: "미나토구",
        page: 1,
        limit: 9
      })
    ).resolves.toEqual({
      data: [expect.objectContaining({ id: "jp-minato-job" })],
      count: 1,
      total: 1,
      page: 1,
      limit: 9,
      availableSkills: ["TypeScript"]
    });
  });

  it("uses title and description as fallback location signals for Japanese wards", async () => {
    mockPaginatedJobPostingQuery([
      {
        ...dbJob,
        id: "jp-shibuya-fallback-job",
        country: "JP",
        language: "en",
        location: "勤務地確認必要",
        title: "Account Executive / Hybrid work style/Shibuya office",
        description: "Primary office is located in Tokyo Shibuya.",
        sourceJobId: "1591003"
      }
    ]);

    await expect(
      getJobsPage({
        country: "JP",
        region1: "도쿄도",
        region2: "시부야구",
        page: 1,
        limit: 9
      })
    ).resolves.toEqual({
      data: [expect.objectContaining({ id: "jp-shibuya-fallback-job" })],
      count: 1,
      total: 1,
      page: 1,
      limit: 9,
      availableSkills: ["TypeScript"]
    });
  });

  it("matches 재택 queries in paginated results for Korean and Japanese remote jobs", async () => {
    mockPaginatedJobPostingQuery([
      {
        ...dbJob,
        id: "kr-remote-page-job",
        country: "KR",
        language: "ko",
        title: "플랫폼 엔지니어",
        location: "서울 (원격 근무 가능)",
        description: "재택 중심으로 일합니다."
      },
      {
        ...dbJob,
        id: "jp-remote-page-job",
        country: "JP",
        language: "ja",
        title: "バックエンドエンジニア",
        location: "Available across Japan",
        description: "フルリモート勤務が可能です。"
      }
    ], 2);

    await expect(getJobsPage({ q: "재택", page: 1, limit: 9 })).resolves.toEqual({
      data: [
        expect.objectContaining({ id: "kr-remote-page-job" }),
        expect.objectContaining({ id: "jp-remote-page-job" })
      ],
      count: 2,
      total: 2,
      page: 1,
      limit: 9,
      availableSkills: ["TypeScript"]
    });
  });

  it("keeps non-remote tokens required in paginated 재택 searches", async () => {
    const count = vi.fn().mockResolvedValue(1);
    const findMany = vi.fn()
      .mockResolvedValueOnce([
        {
          ...dbJob,
          id: "kr-remote-page-python-job",
          country: "KR",
          language: "ko",
          title: "재택 Python 플랫폼 엔지니어",
          location: "서울 (원격 근무 가능)",
          description: "Python API를 재택 중심으로 운영합니다.",
          skills: ["Python", "FastAPI"]
        }
      ])
      .mockResolvedValueOnce([{ skills: ["Python", "FastAPI"] }]);
    getPrismaClientMock.mockReturnValue({
      jobPosting: { findMany, count }
    } as unknown as ReturnType<typeof getPrismaClient>);

    await expect(getJobsPage({ q: "재택 Python", page: 1, limit: 9 })).resolves.toEqual({
      data: [expect.objectContaining({ id: "kr-remote-page-python-job" })],
      count: 1,
      total: 1,
      page: 1,
      limit: 9,
      availableSkills: ["FastAPI", "Python"]
    });
  });
});

describe("classifyCareerStage", () => {
  it("maps raw source career labels into the public three-step stage ids", () => {
    expect(classifyCareerStage("未経験歓迎")).toBe("entry");
    expect(classifyCareerStage("Entry Level")).toBe("entry");
    expect(classifyCareerStage("Mid Career")).toBe("junior");
    expect(classifyCareerStage("Experience welcome")).toBe("junior");
    expect(classifyCareerStage("경력8년↑")).toBe("senior");
    expect(classifyCareerStage("Experience not specified")).toBeNull();
    expect(classifyCareerStage("経験条件一部ログイン後")).toBeNull();
  });
});

describe("classifyEmploymentTypeCategory", () => {
  it("maps raw source employment labels into the public four-step category ids", () => {
    expect(classifyEmploymentTypeCategory("正社員")).toBe("permanent");
    expect(
      classifyEmploymentTypeCategory(
        "Employment Type: Full-time employee Contract Period: • Probationary period"
      )
    ).toBe("permanent");
    expect(classifyEmploymentTypeCategory("契約社員")).toBe("contract");
    expect(classifyEmploymentTypeCategory("Contract employee")).toBe("contract");
    expect(classifyEmploymentTypeCategory("계약직/정규직 전환 가능")).toBe("contract");
    expect(classifyEmploymentTypeCategory("Internship")).toBe("intern");
    expect(classifyEmploymentTypeCategory("業務委託")).toBe("freelance");
    expect(classifyEmploymentTypeCategory("Freelance")).toBe("freelance");
    expect(classifyEmploymentTypeCategory("Employment Type not specified")).toBeNull();
  });

  it("uses title and description as fallback evidence when employmentType is missing", () => {
    expect(
      classifyEmploymentTypeCategory("기타", "채용연계형 인턴 모집", "신입", "서비스 운영 인턴십")
    ).toBe("intern");
    expect(
      classifyEmploymentTypeCategory(
        "Employment Type not specified",
        "백엔드 엔지니어",
        "주니어",
        "계약직 포지션이며 API 고도화를 담당합니다."
      )
    ).toBe("contract");
    expect(
      classifyEmploymentTypeCategory(
        null,
        "Internal Account Manager",
        "Experience welcome",
        "Global account operations"
      )
    ).toBeNull();
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
      expect.objectContaining({ where: expect.objectContaining({ status: "active", deletedAt: null }) })
    );
    expect(groupBy).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ where: expect.objectContaining({ status: "active", deletedAt: null }) })
    );
    expect(groupBy).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ where: expect.objectContaining({ status: "active", deletedAt: null }) })
    );
    expect(count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        status: "active",
        deletedAt: null
      })
    });
  });

  it("returns empty database facets instead of sample fallback when the database is connected", async () => {
    const groupBy = vi.fn().mockResolvedValue([]);
    const count = vi.fn().mockResolvedValue(0);
    getPrismaClientMock.mockReturnValue({
      jobPosting: { groupBy, count }
    } as unknown as ReturnType<typeof getPrismaClient>);

    await expect(getJobFacets()).resolves.toEqual({
      sources: [],
      countries: [],
      languages: [],
      total: 0
    });
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

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "db-job-001",
          status: "active",
          deletedAt: null
        }),
        select: expect.any(Object)
      })
    );
  });
});
