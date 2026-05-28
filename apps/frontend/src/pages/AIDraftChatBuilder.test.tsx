import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AIDraftChatBuilder } from "./AIDraftChatBuilder";

const apiJob = {
  id: "careercross-1591647",
  title: "실전 백엔드 엔지니어",
  company: "Backend Bridge",
  location: "Tokyo",
  careerLevel: "Mid Career",
  skills: ["Node.js", "REST API", "PostgreSQL"],
  description: "실서비스 API와 데이터 처리를 담당합니다.",
  source: "careercross",
  sourceJobId: "1591647",
  sourceUrl: "https://example.com/jobs/careercross-1591647",
  country: "JP",
  language: "en",
  employmentType: "Permanent Full-time",
  careerStage: "junior",
  employmentTypeCategory: "permanent",
  educationLevel: null,
  salaryText: null,
  deadlineText: null,
  applyMethod: null,
  postedAt: null,
  collectedAt: "2026-05-19T03:16:08.341Z"
};

function apiResponse(body: unknown) {
  return Promise.resolve({
    ok: true,
    json: async () => body
  } as Response);
}

describe("AIDraftChatBuilder job context", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let elementScrollToMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    window.history.pushState({}, "", "/ai-analysis");
    elementScrollToMock = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollTo", {
      configurable: true,
      value: elementScrollToMock
    });

    fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/api/jobs/careercross-1591647")) {
        return apiResponse({ data: apiJob });
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

  it("loads the selected job from the jobId query instead of keeping the mock card", async () => {
    window.history.pushState({}, "", "/ai-analysis?jobId=careercross-1591647");

    render(<AIDraftChatBuilder />);

    expect(await screen.findByText("실전 백엔드 엔지니어")).toBeInTheDocument();
    expect(screen.getByText("Backend Bridge")).toBeInTheDocument();
    expect(screen.getByText("선택된 공고")).toBeInTheDocument();
    expect(screen.queryByText("선택된 공고 (Mock)")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/jobs/careercross-1591647")
    );
  });

  it("keeps the existing mock card when no jobId query is provided", async () => {
    render(<AIDraftChatBuilder />);

    await waitFor(() => {
      expect(screen.getByText("선택된 공고 (Mock)")).toBeInTheDocument();
    });
    expect(screen.getByText("네이트워크 테크")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
