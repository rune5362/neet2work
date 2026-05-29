import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Jobs } from "./Jobs";

const apiJob = {
  id: "api-job-1",
  title: "API 백엔드 연결 공고",
  company: "Backend Bridge",
  location: "Tokyo",
  careerLevel: "주니어",
  skills: ["React", "REST API"],
  description: "백엔드 API에서 내려온 공고입니다.",
  source: "careercross",
  sourceJobId: "1590000",
  sourceUrl: "https://example.com/api-job-1",
  country: "JP",
  language: "en",
  employmentType: "正社員",
  careerStage: "junior",
  employmentTypeCategory: "permanent",
  educationLevel: "학력무관",
  salaryText: "500 - 700만 엔",
  deadlineText: "2026-07-31",
  applyMethod: "원문 공고 지원",
  postedAt: "2026-05-20T00:00:00.000Z",
  collectedAt: "2026-05-20T00:00:00.000Z"
};

const krApiJob = {
  ...apiJob,
  id: "api-job-2",
  title: "한국 백엔드 공고",
  location: "Seoul",
  careerLevel: "신입",
  country: "KR",
  language: "ko",
  employmentType: "契約社員",
  careerStage: "entry",
  employmentTypeCategory: "contract",
  postedAt: "2026-05-10T00:00:00.000Z"
};

const legacyCareerApiJob = {
  ...apiJob,
  id: "api-job-legacy",
  title: "Legacy Mid Career 공고",
  careerLevel: "Mid Career",
  careerStage: undefined
};

const legacyEmploymentApiJob = {
  ...apiJob,
  id: "api-job-legacy-employment",
  title: "Legacy Freelance 공고",
  careerLevel: "Mid Career",
  employmentType: "Freelance",
  careerStage: undefined,
  employmentTypeCategory: undefined
};

const legacyInternApiJob = {
  ...apiJob,
  id: "api-job-legacy-intern",
  title: "채용연계형 인턴 모집",
  careerLevel: "신입",
  employmentType: "기타",
  description: "백엔드 API 연동을 담당하는 인턴십 포지션입니다.",
  careerStage: undefined,
  employmentTypeCategory: undefined
};

const unspecifiedEmploymentApiJob = {
  ...apiJob,
  id: "api-job-unspecified",
  title: "운영 코디네이터",
  careerLevel: "경력무관",
  employmentType: null,
  description: "근무 조건은 면접 후 안내합니다.",
  employmentTypeCategory: null,
  postedAt: null
};

const displayFormatApiJob = {
  ...apiJob,
  id: "api-job-display-format",
  title: "표시 포맷 공고",
  careerLevel: "Mid Career",
  careerStage: undefined,
  employmentType: "Permanent Full-time",
  employmentTypeCategory: undefined,
  salaryText: "4 million yen ~ 6 million yen",
  deadlineText: null
};

const displayFallbackApiJob = {
  ...apiJob,
  id: "api-job-display-fallback",
  title: "표시 미기재 공고",
  careerLevel: "경력 확인 필요",
  careerStage: undefined,
  employmentType: null,
  employmentTypeCategory: null,
  salaryText: null,
  deadlineText: null
};

const displayJpyKRangeApiJob = {
  ...apiJob,
  id: "api-job-display-jpy-k-range",
  title: "JPY K 범위 공고",
  salaryText: "JPY - Japanese Yen JPY 6000K - JPY 10000K"
};

const displayJpyKOverApiJob = {
  ...apiJob,
  id: "api-job-display-jpy-k-over",
  title: "JPY K 이상 공고",
  salaryText: "JPY - Japanese Yen JPY 4500K Over"
};

const displayNegotiableCapApiJob = {
  ...apiJob,
  id: "api-job-display-negotiable-cap",
  title: "협의 상한 공고",
  salaryText: "Negotiable, based on experience ~ 9 million yen"
};

const displayNegotiableApiJob = {
  ...apiJob,
  id: "api-job-display-negotiable",
  title: "협의 공고",
  salaryText: "Negotiable, based on experience"
};

const displayKoreanRangeApiJob = {
  ...krApiJob,
  id: "api-job-display-kr-range",
  title: "한국 연봉 범위 공고",
  salaryText: "연봉 3,000~6,000만원 (면접 후 결정)"
};

const displayKoreanNegotiableApiJob = {
  ...krApiJob,
  id: "api-job-display-kr-negotiable",
  title: "한국 내규 공고",
  salaryText: "회사 내규에 따름 (면접 후 결정)"
};

const japanNationwideLocationApiJob = {
  ...apiJob,
  id: "api-job-location-japan-wide",
  title: "【IT系総合職】未経験入社9割＆月25万スタート★フルリモあり",
  location:
    "北海道、青森県、岩手県、宮城県、秋田県、山形県、福島県、茨城県、栃木県、群馬県、埼玉県、千葉県、東京都、神奈川県、富山県、石川県、福井県、新潟県、山梨県、長野県、岐阜県、静岡県、愛知県、三重県、滋賀県、京都府、大阪府、兵庫県、奈良県、和歌山県、鳥取県、島根県、岡山県、広島県、山口県、徳島県、香川県、愛媛県、高知県、福岡県、佐賀県、長崎県、熊本県、大分県、宮崎県、鹿児島県、沖縄県",
  country: "JP",
  language: "ja"
};

const japanMinatoLocationApiJob = {
  ...apiJob,
  id: "api-job-location-minato",
  title: "도쿄 미나토구 공고",
  location: "Asia Japan Tokyo Minato",
  country: "JP",
  language: "en"
};

const koreaMultiLocationApiJob = {
  ...krApiJob,
  id: "api-job-location-kr-multi",
  title: "서울 다지역 공고",
  location: "서울 강서구 외 14",
  country: "KR",
  language: "ko"
};

function jobsPageResponse(
  jobs: Array<typeof apiJob>,
  options: {
    total?: number;
    page?: number;
    limit?: number;
    availableSkills?: string[];
  } = {}
) {
  return {
    data: jobs,
    count: jobs.length,
    total: options.total ?? jobs.length,
    page: options.page ?? 1,
    limit: options.limit ?? 9,
    availableSkills:
      options.availableSkills ??
      Array.from(new Set(jobs.flatMap((job) => job.skills))).sort((a, b) => a.localeCompare(b))
  };
}

function apiResponse(body: unknown) {
  return Promise.resolve({
    ok: true,
    json: async () => body
  } as Response);
}

describe("Jobs page backend integration", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let scrollToMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    window.history.replaceState({}, "", "/jobs");
    scrollToMock = vi.fn();
    Object.defineProperty(window, "scrollTo", {
      configurable: true,
      value: scrollToMock
    });

    fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/api/jobs/api-job-1")) {
        return apiResponse({
          data: {
            ...apiJob,
            description: "상세 API 직무 설명입니다."
          }
        });
      }

      if (url.includes("/api/jobs")) {
        const isUnspecified = url.includes("employmentTypeCategory=unspecified");
        const isFreelance = url.includes("employmentTypeCategory=freelance");
        const isIntern = url.includes("employmentTypeCategory=intern");
        const isScoped = url.includes("country=JP") || url.includes("careerStage=junior");

        return apiResponse(
          isUnspecified
            ? jobsPageResponse([unspecifiedEmploymentApiJob], { total: 1 })
            : isFreelance
              ? jobsPageResponse([legacyEmploymentApiJob], { total: 1 })
              : isIntern
                ? jobsPageResponse([legacyInternApiJob], { total: 1 })
                : isScoped
                  ? jobsPageResponse([legacyCareerApiJob], { total: 1 })
                  : jobsPageResponse([apiJob, krApiJob, unspecifiedEmploymentApiJob], {
                      total: 3
                    })
        );
      }

      return Promise.resolve({
        ok: false,
        json: async () => ({ message: "not found" })
      } as Response);
    });

    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders backend jobs while keeping the original filter bar", async () => {
    render(<Jobs />);

    expect(await screen.findByText("API 백엔드 연결 공고")).toBeInTheDocument();
    expect(screen.queryByText("기능 상태 리뷰")).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "직무" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "경력" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /근무 지역/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "고용형태" })).toBeInTheDocument();
    expect(await screen.findByRole("option", { name: "신입 (0-2년)" })).toHaveValue("entry");
    expect(screen.getByRole("option", { name: "주니어 (3-5년)" })).toHaveValue("junior");
    expect(screen.getByRole("option", { name: "시니어 (6년 이상)" })).toHaveValue("senior");
    expect(screen.queryByRole("option", { name: "Mid Career" })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "정규직" })).toHaveValue("permanent");
    expect(screen.getByRole("option", { name: "계약직" })).toHaveValue("contract");
    expect(screen.getByRole("option", { name: "인턴" })).toHaveValue("intern");
    expect(screen.getByRole("option", { name: "프리랜서" })).toHaveValue("freelance");
    expect(screen.getByRole("option", { name: "미기재" })).toHaveValue("unspecified");
    expect(screen.queryByRole("option", { name: "正社員" })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Freelance" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /상세 필터/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "수집처" })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "국가" })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "언어" })).not.toBeInTheDocument();

    const calledUrls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(calledUrls.some((url) => url.includes("/api/jobs"))).toBe(true);
    expect(calledUrls.some((url) => url.includes("limit=9"))).toBe(true);
    expect(calledUrls.some((url) => url.includes("page=1"))).toBe(true);
    expect(calledUrls.some((url) => url.includes("/api/jobs/facets"))).toBe(false);
  });

  it("uses DB-facing filter ids for location, career, and employment filters", async () => {
    render(<Jobs />);

    expect(await screen.findByText("API 백엔드 연결 공고")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /근무 지역/ }));
    fireEvent.click(screen.getByRole("button", { name: "일본" }));

    await waitFor(() => {
      const calledUrls = fetchMock.mock.calls.map((call) => String(call[0]));
      expect(calledUrls.some((url) => url.includes("country=JP"))).toBe(true);
    });

    fireEvent.change(screen.getByLabelText("경력 수준"), {
      target: { value: "junior" }
    });
    await waitFor(() => {
      const calledUrls = fetchMock.mock.calls.map((call) => String(call[0]));
      expect(calledUrls.some((url) => url.includes("careerStage=junior"))).toBe(true);
    });
    fireEvent.change(screen.getByLabelText("고용형태"), {
      target: { value: "freelance" }
    });
    await waitFor(() => {
      const calledUrls = fetchMock.mock.calls.map((call) => String(call[0]));
      expect(calledUrls.some((url) => url.includes("employmentTypeCategory=freelance"))).toBe(true);
    });

    expect(screen.getByText("경력: 주니어 (3-5년)")).toBeInTheDocument();
    expect(await screen.findByText("Legacy Freelance 공고")).toBeInTheDocument();
    expect(screen.getByText("고용형태: 프리랜서")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "필터 초기화" })).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "고용형태: 프리랜서 필터 지우기" })
    ).toBeInTheDocument();
  });

  it("keeps legacy intern jobs visible when the backend omits employmentTypeCategory", async () => {
    render(<Jobs />);

    expect(await screen.findByText("API 백엔드 연결 공고")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("고용형태"), {
      target: { value: "intern" }
    });

    expect(await screen.findByText("채용연계형 인턴 모집")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "고용형태: 인턴 필터 지우기" })
    ).toBeInTheDocument();
  });

  it("filters only unspecified employment jobs with a server-side unspecified enum", async () => {
    render(<Jobs />);

    expect(await screen.findByText("API 백엔드 연결 공고")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("고용형태"), {
      target: { value: "unspecified" }
    });

    expect(await screen.findByText("운영 코디네이터")).toBeInTheDocument();
    expect(screen.queryByText("API 백엔드 연결 공고")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "고용형태: 미기재 필터 지우기" })
    ).toBeInTheDocument();

    const calledUrls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(calledUrls.some((url) => url.includes("employmentTypeCategory=unspecified"))).toBe(
      true
    );
  });

  it("loads the selected job detail from the backend before opening the drawer", async () => {
    render(<Jobs />);

    const detailButtons = await screen.findAllByRole("button", { name: "상세 보기" });
    fireEvent.click(detailButtons[0]);

    expect(await screen.findByText("상세 API 직무 설명입니다.")).toBeInTheDocument();
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes("/api/jobs/api-job-1"))).toBe(
      true
    );
  });

  it("shows salary supplementary notes only inside the detail drawer", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/api/jobs/api-job-display-kr-range")) {
        return apiResponse({
          data: {
            ...displayKoreanRangeApiJob,
            description: "급여 협의 조건이 포함된 상세 설명입니다."
          }
        });
      }

      if (url.includes("/api/jobs")) {
        return apiResponse(
          jobsPageResponse([displayKoreanRangeApiJob], {
            total: 1
          })
        );
      }

      return Promise.resolve({
        ok: false,
        json: async () => ({ message: "not found" })
      } as Response);
    });

    render(<Jobs />);

    expect(await screen.findByText("3,000만 원 ~ 6,000만 원")).toBeInTheDocument();
    expect(screen.queryByText("면접 후 결정")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "상세 보기" }));

    expect(await screen.findByText("급여 참고")).toBeInTheDocument();
    expect(screen.getByText("면접 후 결정")).toBeInTheDocument();
  });

  it("summarizes noisy card locations and shows them in Korean", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/api/jobs")) {
        return apiResponse(
          jobsPageResponse(
            [japanNationwideLocationApiJob, japanMinatoLocationApiJob, koreaMultiLocationApiJob],
            {
              total: 3
            }
          )
        );
      }

      return Promise.resolve({
        ok: false,
        json: async () => ({ message: "not found" })
      } as Response);
    });

    render(<Jobs />);

    const nationwideCard = (await screen.findByText("【IT系総合職】未経験入社9割＆月25万スタート★フルリモあり")).closest(
      "article"
    );
    expect(nationwideCard).not.toBeNull();
    expect(within(nationwideCard as HTMLElement).getByText("일본 전국 · 풀리모트 가능")).toBeInTheDocument();

    const minatoCard = screen.getByText("도쿄 미나토구 공고").closest("article");
    expect(minatoCard).not.toBeNull();
    expect(within(minatoCard as HTMLElement).getByText("도쿄도 미나토구")).toBeInTheDocument();

    const koreaMultiCard = screen.getByText("서울 다지역 공고").closest("article");
    expect(koreaMultiCard).not.toBeNull();
    expect(within(koreaMultiCard as HTMLElement).getByText("서울 강서구 외 14곳")).toBeInTheDocument();
  });

  it("shows New only for jobs posted within three days", async () => {
    const recentPostedAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const stalePostedAt = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/api/jobs/api-job-1")) {
        return apiResponse({
          data: {
            ...apiJob,
            description: "상세 API 직무 설명입니다.",
            postedAt: recentPostedAt
          }
        });
      }

      if (url.includes("/api/jobs")) {
        return apiResponse(
          jobsPageResponse(
            [
              { ...apiJob, postedAt: recentPostedAt },
              { ...krApiJob, postedAt: stalePostedAt },
              unspecifiedEmploymentApiJob
            ],
            { total: 3 }
          )
        );
      }

      return Promise.resolve({
        ok: false,
        json: async () => ({ message: "not found" })
      } as Response);
    });

    render(<Jobs />);

    expect(await screen.findByText("API 백엔드 연결 공고")).toBeInTheDocument();
    expect(screen.getAllByText("New")).toHaveLength(1);
    expect(screen.getByText("API 백엔드 연결 공고")).toBeInTheDocument();
    expect(screen.queryByText("한국 백엔드 공고")).toBeInTheDocument();
  });

  it("normalizes the four condition slots into clean labels and fallback text", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/api/jobs")) {
        return apiResponse(
          jobsPageResponse(
            [
              displayFormatApiJob,
              displayJpyKRangeApiJob,
              displayJpyKOverApiJob,
              displayNegotiableCapApiJob,
              displayNegotiableApiJob,
              displayKoreanRangeApiJob,
              displayKoreanNegotiableApiJob,
              displayFallbackApiJob
            ],
            {
              total: 8
            }
          )
        );
      }

      return Promise.resolve({
        ok: false,
        json: async () => ({ message: "not found" })
      } as Response);
    });

    render(<Jobs />);

    const displayCard = (await screen.findByText("표시 포맷 공고")).closest("article");
    expect(displayCard).not.toBeNull();
    const displayScope = within(displayCard as HTMLElement);
    expect(displayScope.getByText("주니어 (3-5년)").closest(".jobsConditionItem")).toHaveTextContent(
      "경력:주니어 (3-5년)"
    );
    expect(displayScope.getByText("정규직").closest(".jobsConditionItem")).toHaveTextContent(
      "고용:정규직"
    );
    expect(displayScope.getByText("400만 엔 ~ 600만 엔").closest(".jobsConditionItem")).toHaveTextContent(
      "급여:400만 엔 ~ 600만 엔"
    );
    expect(displayScope.getByText("마감 미기재").closest(".jobsConditionItem")).toHaveTextContent(
      "마감:마감 미기재"
    );

    const jpyKRangeCard = screen.getByText("JPY K 범위 공고").closest("article");
    expect(jpyKRangeCard).not.toBeNull();
    expect(
      within(jpyKRangeCard as HTMLElement)
        .getByText("600만 엔 ~ 1,000만 엔")
        .closest(".jobsConditionItem")
    ).toHaveTextContent("급여:600만 엔 ~ 1,000만 엔");

    const jpyKOverCard = screen.getByText("JPY K 이상 공고").closest("article");
    expect(jpyKOverCard).not.toBeNull();
    expect(
      within(jpyKOverCard as HTMLElement).getByText("450만 엔 이상").closest(".jobsConditionItem")
    ).toHaveTextContent("급여:450만 엔 이상");

    const negotiableCapCard = screen.getByText("협의 상한 공고").closest("article");
    expect(negotiableCapCard).not.toBeNull();
    expect(
      within(negotiableCapCard as HTMLElement)
        .getByText("최대 900만 엔 (협의)")
        .closest(".jobsConditionItem")
    ).toHaveTextContent("급여:최대 900만 엔 (협의)");

    const negotiableCard = screen.getByText("협의 공고").closest("article");
    expect(negotiableCard).not.toBeNull();
    expect(
      within(negotiableCard as HTMLElement).getByText("급여 협의").closest(".jobsConditionItem")
    ).toHaveTextContent("급여:급여 협의");

    const koreanRangeCard = screen.getByText("한국 연봉 범위 공고").closest("article");
    expect(koreanRangeCard).not.toBeNull();
    expect(
      within(koreanRangeCard as HTMLElement)
        .getByText("3,000만 원 ~ 6,000만 원")
        .closest(".jobsConditionItem")
    ).toHaveTextContent("급여:3,000만 원 ~ 6,000만 원");

    const koreanNegotiableCard = screen.getByText("한국 내규 공고").closest("article");
    expect(koreanNegotiableCard).not.toBeNull();
    expect(
      within(koreanNegotiableCard as HTMLElement)
        .getByText("급여 협의")
        .closest(".jobsConditionItem")
    ).toHaveTextContent("급여:급여 협의");

    const fallbackCard = screen.getByText("표시 미기재 공고").closest("article");
    expect(fallbackCard).not.toBeNull();
    const fallbackScope = within(fallbackCard as HTMLElement);
    expect(fallbackScope.getByText("경력 미기재").closest(".jobsConditionItem")).toHaveTextContent(
      "경력:경력 미기재"
    );
    expect(fallbackScope.getByText("고용 미기재").closest(".jobsConditionItem")).toHaveTextContent(
      "고용:고용 미기재"
    );
    expect(fallbackScope.getByText("급여 미기재").closest(".jobsConditionItem")).toHaveTextContent(
      "급여:급여 미기재"
    );
    expect(fallbackScope.getByText("마감 미기재").closest(".jobsConditionItem")).toHaveTextContent(
      "마감:마감 미기재"
    );
  });

  it("requests the next server page and moves to the next page from the bottom pager", async () => {
    const paginatedJobs = Array.from({ length: 12 }, (_, index) => ({
      ...apiJob,
      id: `page-job-${index + 1}`,
      title: `페이지 공고 ${index + 1}`,
      sourceJobId: `page-job-${index + 1}`
    }));

    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = new URL(String(input));

      if (url.pathname === "/api/jobs") {
        const page = Number(url.searchParams.get("page") ?? "1");
        const limit = Number(url.searchParams.get("limit") ?? "9");
        const startIndex = (page - 1) * limit;

        return apiResponse(
          jobsPageResponse(paginatedJobs.slice(startIndex, startIndex + limit), {
            total: paginatedJobs.length,
            page,
            limit
          })
        );
      }

      return Promise.resolve({
        ok: false,
        json: async () => ({ message: "not found" })
      } as Response);
    });

    render(<Jobs />);

    expect(await screen.findByText("페이지 공고 1")).toBeInTheDocument();
    expect(screen.getByText("페이지 공고 9")).toBeInTheDocument();
    expect(screen.queryByText("페이지 공고 10")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "다음 페이지" }));

    expect(await screen.findByText("페이지 공고 10")).toBeInTheDocument();
    expect(screen.getByText("페이지 공고 12")).toBeInTheDocument();
    expect(screen.queryByText("페이지 공고 1")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { current: "page", name: "2" })).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some((call) => String(call[0]).includes("page=2&limit=9"))
    ).toBe(true);
    expect(scrollToMock).toHaveBeenCalledWith({
      top: 0,
      behavior: "smooth"
    });
  });

  it("restores filter and page state from the URL query on first render", async () => {
    const paginatedJobs = Array.from({ length: 12 }, (_, index) => ({
      ...apiJob,
      id: `restore-job-${index + 1}`,
      title: `Restore Job ${index + 1}`,
      sourceJobId: `restore-job-${index + 1}`
    }));

    window.history.replaceState(
      {},
      "",
      "/jobs?q=%EC%9E%AC%ED%83%9D&employmentTypeCategory=unspecified&careerStage=entry&page=2"
    );

    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = new URL(String(input));

      if (url.pathname === "/api/jobs") {
        const page = Number(url.searchParams.get("page") ?? "1");
        const limit = Number(url.searchParams.get("limit") ?? "9");
        const startIndex = (page - 1) * limit;

        return apiResponse(
          jobsPageResponse(paginatedJobs.slice(startIndex, startIndex + limit), {
            total: paginatedJobs.length,
            page,
            limit
          })
        );
      }

      return Promise.resolve({
        ok: false,
        json: async () => ({ message: "not found" })
      } as Response);
    });

    render(<Jobs />);

    expect(await screen.findByText("Restore Job 10")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("직무, 회사명, 스킬 또는 키워드 입력")).toHaveValue("재택");
    expect(screen.getByRole("combobox", { name: "고용형태" })).toHaveValue("unspecified");
    expect(screen.getByRole("combobox", { name: /경력/ })).toHaveValue("entry");
    expect(screen.getByRole("button", { current: "page", name: "2" })).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some((call) =>
        String(call[0]).includes(
          "q=%EC%9E%AC%ED%83%9D&careerStage=entry&employmentTypeCategory=unspecified&page=2&limit=9"
        )
      )
    ).toBe(true);
  });

  it("syncs the current filter and page state into the URL", async () => {
    const paginatedJobs = Array.from({ length: 12 }, (_, index) => ({
      ...apiJob,
      id: `sync-job-${index + 1}`,
      title: `Sync Job ${index + 1}`,
      sourceJobId: `sync-job-${index + 1}`
    }));

    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = new URL(String(input));

      if (url.pathname === "/api/jobs") {
        const page = Number(url.searchParams.get("page") ?? "1");
        const limit = Number(url.searchParams.get("limit") ?? "9");
        const startIndex = (page - 1) * limit;

        return apiResponse(
          jobsPageResponse(paginatedJobs.slice(startIndex, startIndex + limit), {
            total: paginatedJobs.length,
            page,
            limit
          })
        );
      }

      return Promise.resolve({
        ok: false,
        json: async () => ({ message: "not found" })
      } as Response);
    });

    render(<Jobs />);

    expect(await screen.findByText("Sync Job 1")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("직무, 회사명, 스킬 또는 키워드 입력"), {
      target: { value: "재택" }
    });
    fireEvent.change(screen.getByRole("combobox", { name: "고용형태" }), {
      target: { value: "unspecified" }
    });

    expect(await screen.findByText("Sync Job 1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "다음 페이지" }));

    expect(await screen.findByText("Sync Job 10")).toBeInTheDocument();

    const params = new URLSearchParams(window.location.search);
    expect(params.get("q")).toBe("재택");
    expect(params.get("employmentTypeCategory")).toBe("unspecified");
    expect(params.get("page")).toBe("2");
  });

  it("keeps the demo fallback visible on API failure and retries the request on demand", async () => {
    let jobsRequestCount = 0;

    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/api/jobs")) {
        jobsRequestCount += 1;

        if (jobsRequestCount === 1) {
          return Promise.resolve({
            ok: false,
            json: async () => ({ message: "temporary failure" })
          } as Response);
        }

        return apiResponse(
          jobsPageResponse([apiJob], {
            total: 1
          })
        );
      }

      return Promise.resolve({
        ok: false,
        json: async () => ({ message: "not found" })
      } as Response);
    });

    render(<Jobs />);

    expect(await screen.findByText("시니어 풀스택 엔지니어 (SaaS)")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("서버와의 연결이 원활하지 않습니다");

    fireEvent.click(screen.getByRole("button", { name: "다시 시도하기" }));

    expect(await screen.findByText("API 백엔드 연결 공고")).toBeInTheDocument();
    expect(jobsRequestCount).toBe(2);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("derives the last page number from the server total without preloading every job", async () => {
    const paginatedJobs = Array.from({ length: 95 }, (_, index) => ({
      ...apiJob,
      id: `bulk-job-${index + 1}`,
      title: `대량 공고 ${index + 1}`,
      sourceJobId: `bulk-job-${index + 1}`
    }));

    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = new URL(String(input));

      if (url.pathname === "/api/jobs") {
        const page = Number(url.searchParams.get("page") ?? "1");
        const limit = Number(url.searchParams.get("limit") ?? "9");
        const startIndex = (page - 1) * limit;

        return apiResponse(
          jobsPageResponse(paginatedJobs.slice(startIndex, startIndex + limit), {
            total: paginatedJobs.length,
            page,
            limit
          })
        );
      }

      return Promise.resolve({
        ok: false,
        json: async () => ({ message: "not found" })
      } as Response);
    });

    render(<Jobs />);

    expect(await screen.findByText("대량 공고 1")).toBeInTheDocument();
    expect(screen.getByRole("button", { current: "page", name: "1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "3" })).toBeInTheDocument();
    expect(screen.getByText("...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "11" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "12" })).not.toBeInTheDocument();
    expect(screen.queryByText("대량 공고 10")).not.toBeInTheDocument();
  });
  it("keeps page 4 visible when the user is on page 3", async () => {
    const paginatedJobs = Array.from({ length: 95 }, (_, index) => ({
      ...apiJob,
      id: `pager-job-${index + 1}`,
      title: `Pager Job ${index + 1}`,
      sourceJobId: `pager-job-${index + 1}`
    }));

    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = new URL(String(input));

      if (url.pathname === "/api/jobs") {
        const page = Number(url.searchParams.get("page") ?? "1");
        const limit = Number(url.searchParams.get("limit") ?? "9");
        const startIndex = (page - 1) * limit;

        return apiResponse(
          jobsPageResponse(paginatedJobs.slice(startIndex, startIndex + limit), {
            total: paginatedJobs.length,
            page,
            limit
          })
        );
      }

      return Promise.resolve({
        ok: false,
        json: async () => ({ message: "not found" })
      } as Response);
    });

    render(<Jobs />);

    expect(await screen.findByText("Pager Job 1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "3" }));

    expect(await screen.findByText("Pager Job 19")).toBeInTheDocument();
    expect(screen.getByRole("button", { current: "page", name: "3" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "4" })).toBeInTheDocument();
  });
});
