import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AIDraftChatBuilder } from "./AIDraftChatBuilder";

const SAMPLE_DEMO_RESUME_SNIPPET = "교내 앱 개발 공모전";
const USER_RESUME =
  "Node.js와 PostgreSQL로 REST API 서버를 구축하고 운영한 백엔드 개발 경험이 있습니다.";

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

const analysisResult = {
  jobId: "careercross-1591647",
  matchScore: 82,
  strengths: ["React 경험이 채용공고의 핵심 기술과 잘 맞습니다.", "API 연동 경험을 보여줄 수 있습니다."],
  weaknesses: ["TypeScript 경험이 부족하게 보일 수 있습니다."],
  missingKeywords: ["TypeScript", "상태 관리"],
  rewriteGuides: ["프로젝트 경험을 문제 상황, 해결 방법, 결과 중심으로 작성하세요."],
  suggestedSentences: ["React 기반 프로젝트에서 API 연동 경험이 있습니다.", "사용자 경험을 함께 고려했습니다."],
  mode: "mock" as const
};


function apiResponse(body: unknown) {
  return Promise.resolve({
    ok: true,
    json: async () => body
  } as Response);
}

function errorResponse() {
  return Promise.resolve({
    ok: false,
    json: async () => ({ message: "failed" })
  } as Response);
}

function getAnalyzeCallBody(fetchMock: ReturnType<typeof vi.fn>) {
  const analyzeCall = fetchMock.mock.calls.find(
    ([input, init]) => String(input).includes("/api/analyze") && init?.method === "POST"
  );
  expect(analyzeCall).toBeTruthy();
  return JSON.parse(String(analyzeCall?.[1]?.body));
}

async function submitUserResume(text = USER_RESUME) {
  const textarea = screen.getByPlaceholderText("메시지를 입력하세요...");
  fireEvent.change(textarea, { target: { value: text } });
  fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
  await screen.findByText(/충분한 경험 데이터가 확보되었습니다/);
}

async function confirmNewChat() {
  fireEvent.click(screen.getByRole("button", { name: /^\+?새 대화$/i }));
  await screen.findByRole("dialog");
  fireEvent.click(screen.getByRole("button", { name: "새 대화 시작" }));
}

function getUserMessage() {
  return within(screen.getByLabelText("내 메시지")).getByText(USER_RESUME);
}

function getHiddenFileInput() {
  return document.querySelector(".aiDraftHiddenFileInput") as HTMLInputElement;
}

async function attachTextFile(name: string, content: string) {
  const fileInput = getHiddenFileInput();
  const file = new File([content], name, { type: "text/plain" });

  await act(async () => {
    fireEvent.change(fileInput, { target: { files: [file] } });
  });

  await waitFor(() => {
    const attachments = screen.getByLabelText("첨부 파일");
    expect(within(attachments).getByText(new RegExp(name.replace(".", "\\.")))).toBeInTheDocument();
    expect(screen.queryByText(/읽기 실패/)).not.toBeInTheDocument();
    expect(screen.queryByText(/읽는 중…/)).not.toBeInTheDocument();
  });
}

async function attachDocumentFile(name: string, content: string, mimeType: string) {
  const fileInput = getHiddenFileInput();
  const file = new File([content], name, { type: mimeType });

  await act(async () => {
    fireEvent.change(fileInput, { target: { files: [file] } });
  });

  await waitFor(() => {
    expect(screen.getByLabelText("첨부 파일")).toBeInTheDocument();
  });
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

    fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes("/api/jobs/careercross-1591647")) {
        return apiResponse({ data: apiJob });
      }

      if (url.includes("/api/analyze") && init?.method === "POST") {
        return apiResponse({ data: analysisResult });
      }

      return errorResponse();
    });

    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
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

describe("AIDraftChatBuilder analyze flow", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let elementScrollToMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    window.history.pushState({}, "", "/ai-analysis?jobId=careercross-1591647");
    elementScrollToMock = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollTo", {
      configurable: true,
      value: elementScrollToMock
    });

    fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes("/api/jobs/careercross-1591647")) {
        return apiResponse({ data: apiJob });
      }

      if (url.includes("/api/analyze") && init?.method === "POST") {
        return apiResponse({ data: analysisResult });
      }

      return errorResponse();
    });

    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("does not analyze with demo resume text before the user sends input", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    expect(screen.queryByRole("button", { name: /AI 초안 생성 시작/i })).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining("/api/analyze"),
      expect.anything()
    );
  });

  it("sends the user resume text and selected job id in the analyze payload", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    await submitUserResume();

    fireEvent.click(screen.getByRole("button", { name: /AI 초안 생성 시작/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/analyze"),
        expect.objectContaining({ method: "POST" })
      );
    });

    const body = getAnalyzeCallBody(fetchMock);
    expect(body.jobId).toBe("careercross-1591647");
    expect(body.resumeText).toContain("Node.js와 PostgreSQL");
    expect(body.resumeText).not.toContain(SAMPLE_DEMO_RESUME_SNIPPET);
  });

  it("includes attached text file content in the analyze payload", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    fireEvent.click(screen.getByRole("button", { name: "작성 옵션" }));
    await attachTextFile("resume.txt", "첨부 파일 본문 텍스트입니다.");
    await submitUserResume();

    fireEvent.click(screen.getByRole("button", { name: /AI 초안 생성 시작/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/analyze"),
        expect.objectContaining({ method: "POST" })
      );
    });

    const body = getAnalyzeCallBody(fetchMock);
    expect(body.resumeText).toContain("첨부 파일 본문 텍스트입니다.");
    expect(body.resumeText).toContain("Node.js와 PostgreSQL");
  });

  it("allows analyze with only an attached text file", async () => {
    const attachOnlyResume =
      "첨부 파일만으로도 분석 가능한 충분히 긴 자기소개 본문 텍스트입니다.";

    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    fireEvent.click(screen.getByRole("button", { name: "작성 옵션" }));
    await attachTextFile("resume.txt", attachOnlyResume);

    const generateButton = await screen.findByRole("button", { name: /AI 초안 생성 시작/i });
    expect(generateButton).toBeEnabled();

    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/analyze"),
        expect.objectContaining({ method: "POST" })
      );
    });

    const body = getAnalyzeCallBody(fetchMock);
    expect(body.resumeText).toContain(attachOnlyResume);
    expect(body.resumeText).not.toContain(USER_RESUME);
  });

  it("does not include pdf attachments in the analyze payload", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    fireEvent.click(screen.getByRole("button", { name: "작성 옵션" }));
    await attachDocumentFile("resume.pdf", "%PDF-1.4", "application/pdf");
    await submitUserResume();

    fireEvent.click(screen.getByRole("button", { name: /AI 초안 생성 시작/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/analyze"),
        expect.objectContaining({ method: "POST" })
      );
    });

    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining("/api/resume/extract"),
      expect.anything()
    );

    const body = getAnalyzeCallBody(fetchMock);
    expect(body.resumeText).toContain("Node.js와 PostgreSQL");
    expect(body.resumeText).not.toContain("mock 추출");
  });

  it("clears previous analysis results when a new attachment is added", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    await submitUserResume();
    fireEvent.click(screen.getByRole("button", { name: /AI 초안 생성 시작/i }));
    expect(await screen.findByText("mock 분석")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "작성 옵션" }));
    await attachTextFile("extra.txt", "새로 첨부한 추가 자기소개 본문 텍스트입니다.");

    expect(screen.queryByText("mock 분석")).not.toBeInTheDocument();
  });

  it("excludes removed attachment content from the analyze payload", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    fireEvent.click(screen.getByRole("button", { name: "작성 옵션" }));
    await attachTextFile("resume.txt", "제거될 첨부 파일 본문 텍스트입니다.");
    fireEvent.click(screen.getByRole("button", { name: "resume.txt 제거" }));
    await waitFor(() => {
      expect(screen.queryByLabelText("첨부 파일")).not.toBeInTheDocument();
    });
    await submitUserResume();

    fireEvent.click(screen.getByRole("button", { name: /AI 초안 생성 시작/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/analyze"),
        expect.objectContaining({ method: "POST" })
      );
    });

    const body = getAnalyzeCallBody(fetchMock);
    expect(body.resumeText).not.toContain("제거될 첨부 파일 본문 텍스트입니다.");
  });

  it("disables analyze when resume text is shorter than 10 characters", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    await confirmNewChat();

    const textarea = screen.getByPlaceholderText("메시지를 입력하세요...");
    fireEvent.change(textarea, { target: { value: "a" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    await screen.findByText(/답변이 조금 간결한 편입니다/);

    fireEvent.change(textarea, { target: { value: "b" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    const generateButton = await screen.findByRole("button", { name: /AI 초안 생성 시작/i });
    expect(generateButton).toBeDisabled();
    expect(screen.getByText("자기소개 내용을 10자 이상 입력해야 분석할 수 있습니다.")).toBeInTheDocument();
  });

  it("renders API analysis fields after a successful request", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    await submitUserResume();
    fireEvent.click(screen.getByRole("button", { name: /AI 초안 생성 시작/i }));

    expect(await screen.findByText("mock 분석")).toBeInTheDocument();
    expect(screen.getByText("React 경험이 채용공고의 핵심 기술과 잘 맞습니다.")).toBeInTheDocument();
    expect(screen.getByText("TypeScript 경험이 부족하게 보일 수 있습니다.")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByText("상태 관리")).toBeInTheDocument();
    expect(screen.getByText("프로젝트 경험을 문제 상황, 해결 방법, 결과 중심으로 작성하세요.")).toBeInTheDocument();
    expect(await screen.findByText(/React 기반 프로젝트에서 API 연동 경험이 있습니다/)).toBeInTheDocument();
    expect(screen.getAllByText("82").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: "다음 질문 이어가기" }).querySelector("img")?.getAttribute("src")
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "다음 질문 이어가기" }).querySelector("img")
    ).toHaveAttribute("data-icon-name", "followUp");
  });

  it("shows an error message when analyze request fails", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL, _init?: RequestInit) => {
      const url = String(input);

      if (url.includes("/api/jobs/careercross-1591647")) {
        return apiResponse({ data: apiJob });
      }

      if (url.includes("/api/analyze")) {
        return errorResponse();
      }

      return errorResponse();
    });

    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    await submitUserResume();
    fireEvent.click(screen.getByRole("button", { name: /AI 초안 생성 시작/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("분석 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    expect(screen.queryByText("mock 분석")).not.toBeInTheDocument();
  });

  it("clears stale analysis results when a retry fails after a successful run", async () => {
    let analyzeAttempt = 0;

    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes("/api/jobs/careercross-1591647")) {
        return apiResponse({ data: apiJob });
      }

      if (url.includes("/api/analyze") && init?.method === "POST") {
        analyzeAttempt += 1;
        if (analyzeAttempt === 1) {
          return apiResponse({ data: analysisResult });
        }
        return errorResponse();
      }

      return errorResponse();
    });

    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    await submitUserResume();
    fireEvent.click(screen.getByRole("button", { name: /AI 초안 생성 시작/i }));
    expect(await screen.findByText("mock 분석")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /AI 초안 생성 시작/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("분석 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    await waitFor(() => {
      expect(screen.queryByText("mock 분석")).not.toBeInTheDocument();
    });
    expect(screen.queryByText(/React 기반 프로젝트에서 API 연동 경험이 있습니다/)).not.toBeInTheDocument();
  });

  it("clears previous analysis results when the selected job changes", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    await submitUserResume();
    fireEvent.click(screen.getByRole("button", { name: /AI 초안 생성 시작/i }));
    expect(await screen.findByText("mock 분석")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "수정" }));
    fireEvent.click(screen.getByRole("button", { name: /네이트워크 테크/i }));

    await waitFor(() => {
      expect(screen.queryByText("mock 분석")).not.toBeInTheDocument();
    });
    expect(screen.queryByText("React 경험이 채용공고의 핵심 기술과 잘 맞습니다.")).not.toBeInTheDocument();
  });

  it("ignores stale analyze responses after the job changes during loading", async () => {
    let resolveAnalyze: ((value: Response) => void) | undefined;

    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes("/api/jobs/careercross-1591647")) {
        return apiResponse({ data: apiJob });
      }

      if (url.includes("/api/analyze") && init?.method === "POST") {
        return new Promise<Response>((resolve) => {
          resolveAnalyze = resolve;
        });
      }

      return errorResponse();
    });

    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    await submitUserResume();
    fireEvent.click(screen.getByRole("button", { name: /AI 초안 생성 시작/i }));

    fireEvent.click(screen.getByRole("button", { name: "수정" }));
    fireEvent.click(screen.getByRole("button", { name: /네이트워크 테크/i }));

    resolveAnalyze?.(apiResponse({ data: analysisResult }) as Response);

    await waitFor(() => {
      expect(screen.queryByText("mock 분석")).not.toBeInTheDocument();
    });
    expect(screen.queryByText("React 경험이 채용공고의 핵심 기술과 잘 맞습니다.")).not.toBeInTheDocument();
  });

  it("clears analysis results when the user sends a new message after success", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    await submitUserResume();
    fireEvent.click(screen.getByRole("button", { name: /AI 초안 생성 시작/i }));
    expect(await screen.findByText("mock 분석")).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText("메시지를 입력하세요...");
    fireEvent.change(textarea, { target: { value: "추가로 캐시 최적화 경험도 있습니다." } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    await waitFor(() => {
      expect(screen.queryByText("mock 분석")).not.toBeInTheDocument();
    });
  });

  it("drops ready state immediately when the user sends another message", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    await submitUserResume();

    expect(screen.getByRole("button", { name: /AI 초안 생성 시작/i })).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText("메시지를 입력하세요...");
    fireEvent.change(textarea, {
      target: { value: "추가로 Docker 기반 배포 파이프라인을 운영한 경험도 있습니다." },
    });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    expect(screen.queryByRole("button", { name: /AI 초안 생성 시작/i })).not.toBeInTheDocument();
  });

  it("ignores stale AI reply timers when the user sends another message quickly", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");

    const textarea = screen.getByPlaceholderText("메시지를 입력하세요...");
    fireEvent.change(textarea, { target: { value: USER_RESUME } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    await new Promise((resolve) => window.setTimeout(resolve, 300));

    fireEvent.change(textarea, {
      target: { value: "추가로 Docker 기반 배포 파이프라인을 운영한 경험도 있습니다." },
    });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    await screen.findByText(/충분한 경험 데이터가 확보되었습니다/);
    expect(screen.getAllByText(/충분한 경험 데이터가 확보되었습니다/).length).toBe(1);
  });
});

describe("AIDraftChatBuilder chat UX", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    window.history.pushState({}, "", "/ai-analysis?jobId=careercross-1591647");
    Object.defineProperty(HTMLElement.prototype, "scrollTo", {
      configurable: true,
      value: vi.fn()
    });

    fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes("/api/jobs/careercross-1591647")) {
        return apiResponse({ data: apiJob });
      }

      if (url.includes("/api/analyze") && init?.method === "POST") {
        return apiResponse({ data: analysisResult });
      }

      return errorResponse();
    });

    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
    vi.unstubAllGlobals();
  });

  it("opens a confirmation dialog instead of resetting immediately on new chat", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    await submitUserResume();

    fireEvent.click(screen.getByRole("button", { name: /^\+?새 대화$/i }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("새 대화를 시작할까요?")).toBeInTheDocument();
    expect(screen.getByText("현재 대화와 분석 결과가 초기화됩니다.")).toBeInTheDocument();
    expect(getUserMessage()).toBeInTheDocument();
  });

  it("preserves the conversation when new chat confirmation is cancelled", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    await submitUserResume();

    fireEvent.click(screen.getByRole("button", { name: /^\+?새 대화$/i }));
    fireEvent.click(await screen.findByRole("button", { name: "취소" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(getUserMessage()).toBeInTheDocument();
  });

  it("preserves the conversation when Escape closes the new chat dialog", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    await submitUserResume();

    fireEvent.click(screen.getByRole("button", { name: /^\+?새 대화$/i }));
    fireEvent.keyDown(window, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(getUserMessage()).toBeInTheDocument();
  });

  it("resets the conversation only after confirming new chat start", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    await submitUserResume();
    await confirmNewChat();

    expect(screen.queryByText(USER_RESUME)).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText(/Neet2Work AI 스크래치입니다/)).toBeInTheDocument();
  });

  it("does not render the header AI settings button", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    expect(screen.queryByRole("button", { name: "AI 설정" })).not.toBeInTheDocument();
  });

  it("keeps composer controls inside a single pill bar", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");

    const composerBar = screen.getByPlaceholderText("메시지를 입력하세요...").closest(".aiDraftComposerBar");
    expect(composerBar).toBeTruthy();

    const scoped = within(composerBar as HTMLElement);
    expect(scoped.getByRole("button", { name: "작성 옵션" })).toBeInTheDocument();
    expect(scoped.getByPlaceholderText("메시지를 입력하세요...")).toBeInTheDocument();
    expect(scoped.getByRole("button", { name: /AI 모델 선택/i })).toBeInTheDocument();
    expect(scoped.getByRole("button", { name: "메시지 보내기" })).toBeInTheDocument();
    expect(scoped.getByRole("button", { name: "메시지 보내기" }).querySelector('[data-icon-name="arrowUp"]')).toBeTruthy();
  });

  it("opens composer options from the plus button", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    fireEvent.click(screen.getByRole("button", { name: "작성 옵션" }));

    const optionsDialog = screen.getByRole("dialog", { name: "작성 옵션" });
    expect(optionsDialog).toHaveClass("aiDraftComposerOptionsMenuCompact");
    expect(screen.getByRole("button", { name: "사진 및 파일 추가" })).toBeEnabled();
    expect(screen.queryByText("준비 중")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "문체 설정" })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "단답 보완 질문" })).toBeInTheDocument();
    expect(optionsDialog.querySelectorAll(".aiDraftComposerMenuDivider").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByRole("option", { name: "성과 강조형" })).not.toBeInTheDocument();
  });

  it("opens the tone submenu from the composer options dialog", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    fireEvent.click(screen.getByRole("button", { name: "작성 옵션" }));
    fireEvent.click(screen.getByRole("button", { name: "문체 설정" }));

    const toneSubmenu = document.querySelector(".aiDraftComposerToneSubmenu");
    expect(toneSubmenu).toBeTruthy();
    expect(toneSubmenu).toHaveClass("aiDraftComposerToneSubmenuAligned");
    expect(screen.getByRole("listbox", { name: "문체 설정" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "담백한 실무형" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("option", { name: "성과 강조형" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "성장 서사형" })).toBeInTheDocument();
    expect(
      document.querySelector(".aiDraftComposerSubmenuTrigger[aria-expanded='true'] .aiDraftComposerSubmenuChevron")
    ).toBeTruthy();
  });

  it("opens the hidden file input from the attach menu item", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, "click");
    fireEvent.click(screen.getByRole("button", { name: "작성 옵션" }));
    fireEvent.click(screen.getByRole("button", { name: "사진 및 파일 추가" }));

    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it("shows attached text files as chips above the composer bar", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    fireEvent.click(screen.getByRole("button", { name: "작성 옵션" }));
    await attachTextFile("resume.md", "마크다운 첨부 본문입니다.");

    expect(screen.getByText(/resume\.md/)).toBeInTheDocument();
    expect(getHiddenFileInput()).toHaveAttribute("accept", "image/*,.txt,.md,.pdf,.doc,.docx");
  });

  it("toggles followUp from the composer options menu", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    fireEvent.click(screen.getByRole("button", { name: "작성 옵션" }));

    const followUpToggle = screen.getByRole("switch", { name: "단답 보완 질문" });
    expect(followUpToggle).toHaveAttribute("aria-checked", "true");

    fireEvent.click(followUpToggle);
    expect(followUpToggle).toHaveAttribute("aria-checked", "false");
  });

  it("selects tone from the tone submenu and closes both popups", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    fireEvent.click(screen.getByRole("button", { name: "작성 옵션" }));
    fireEvent.click(screen.getByRole("button", { name: "문체 설정" }));

    fireEvent.click(screen.getByRole("option", { name: "성과 강조형" }));

    expect(document.querySelector(".aiDraftComposerToneSubmenu")).toBeNull();
    expect(screen.queryByRole("dialog", { name: "작성 옵션" })).not.toBeInTheDocument();
    expect(document.querySelector(".aiDraftSideHeader strong")?.textContent).toBe("성과 강조형");
  });

  it("updates the selected model from the composer model menu", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    fireEvent.click(screen.getByRole("button", { name: /AI 모델 선택, 현재 Gemini Pro/i }));

    fireEvent.click(screen.getByRole("menuitemradio", { name: "Fast Draft" }));

    expect(screen.getByRole("button", { name: /AI 모델 선택, 현재 Fast Draft/i })).toBeInTheDocument();
    expect(screen.queryByRole("menu", { name: "AI 모델 선택" })).not.toBeInTheDocument();
  });

  it("sends a message from the composer send button", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");

    const textarea = screen.getByPlaceholderText("메시지를 입력하세요...");
    fireEvent.change(textarea, { target: { value: USER_RESUME } });
    fireEvent.click(screen.getByRole("button", { name: "메시지 보내기" }));

    await waitFor(() => {
      expect(getUserMessage()).toBeInTheDocument();
    });
  });

  it("expands the composer textarea without vertical scrolling as input grows", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    const textarea = screen.getByPlaceholderText("메시지를 입력하세요...") as HTMLTextAreaElement;

    Object.defineProperty(textarea, "scrollHeight", {
      configurable: true,
      get: () => 120,
    });

    fireEvent.change(textarea, { target: { value: "첫 줄\n둘째 줄\n셋째 줄\n넷째 줄" } });

    await waitFor(() => {
      expect(textarea.style.height).toBe("120px");
    });
    expect(textarea.style.overflowY).toBe("hidden");
  });

  it("enables textarea scrolling when pasted content exceeds the composer max height", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    const textarea = screen.getByPlaceholderText("메시지를 입력하세요...") as HTMLTextAreaElement;

    Object.defineProperty(textarea, "scrollHeight", {
      configurable: true,
      get: () => 320,
    });

    fireEvent.change(textarea, {
      target: { value: Array.from({ length: 20 }, (_, index) => `경험 줄 ${index + 1}`).join("\n") },
    });

    await waitFor(() => {
      expect(textarea.style.height).toBe("240px");
    });
    expect(textarea.style.overflowY).toBe("auto");
  });

  it("shows an empty conversation summary before the user sends messages", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    expect(screen.getByText("대화를 시작하면 요약이 표시됩니다.")).toBeInTheDocument();
    expect(screen.queryByText("팀 리더로서 프로젝트 일정 재정비 및 소통 체계 구축")).not.toBeInTheDocument();
  });

  it("builds the conversation summary from user messages", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    await submitUserResume();

    const summaryCard = screen.getByText("대화 요약").closest(".aiDraftInfoCard");
    expect(summaryCard).toBeTruthy();
    expect(within(summaryCard as HTMLElement).getByText(USER_RESUME)).toBeInTheDocument();
    expect(screen.queryByText("대화를 시작하면 요약이 표시됩니다.")).not.toBeInTheDocument();
    expect(screen.queryByText("팀 리더로서 프로젝트 일정 재정비 및 소통 체계 구축")).not.toBeInTheDocument();
  });

  it("renders the logo symbol for AI message avatars", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");

    const aiMessage = screen.getByLabelText("AI 답변");
    expect(aiMessage.querySelector(".aiDraftAvatarLogo")).toBeTruthy();
    expect(aiMessage.querySelector("img")?.getAttribute("src")).toContain("neet2work_symbol_reference_curve");
  });
});
