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

const aiMeta = {
  providerId: "fallback" as const,
  modelId: "hardcoded-demo",
  routingMode: "auto" as const,
  usedFallback: true,
  fallbackReason: "all_providers_unavailable" as const
};

const workflowPlanResult = {
  mode: "fallback" as const,
  state: "OUTLINE_READY" as const,
  aiMeta,
  questionRubric: {
    intent: "협업 경험을 문제-행동-결과로 연결합니다.",
    requiredEvidence: ["문제 상황", "본인 역할", "결과"],
    mustAvoid: ["근거 없는 수치"],
    blindRules: []
  },
  experienceCards: [
    {
      experienceId: "manual-experience-1",
      source: "manual" as const,
      title: "사용자 입력 경험",
      actions: [{ action: "API 서버 구축" }],
      tools: ["Node.js", "PostgreSQL"],
      outputs: ["REST API"],
      results: [{ type: "output" as const, description: "서버 운영", verified: true }],
      skills: ["Node.js", "PostgreSQL"],
      evidenceItems: [
        {
          evidenceId: "manual-evidence-1",
          type: "user_statement" as const,
          content: USER_RESUME,
          confidence: "medium" as const
        }
      ],
      claimLedger: [
        {
          claimId: "manual-claim-1",
          text: "백엔드 API 운영 경험",
          supportedBy: ["manual-evidence-1"],
          confidence: "medium" as const,
          allowedInDraft: true
        }
      ],
      missingSlots: [],
      blindRiskFlags: [],
      interviewDefensibility: "medium" as const
    }
  ],
  fitAssessments: [
    {
      questionId: "question-1",
      experienceId: "manual-experience-1",
      fitScore: 78,
      recommendedUsage: "main" as const,
      fitReasons: ["REST API 경험이 직무와 연결됩니다."],
      risks: []
    }
  ],
  answerStrategy: {
    mainClaim: "백엔드 API 운영 경험",
    narrativePattern: "STAR" as const,
    primaryExperienceId: "manual-experience-1",
    questionBudget: 800,
    neededQuestions: []
  },
  outline: [{ paragraphId: "p1", purpose: "문제 상황", plannedClaims: ["manual-claim-1"] }]
};

const workflowDraftResult = {
  mode: "fallback" as const,
  state: "REVIEW_COMPLETED" as const,
  aiMeta,
  draftText:
    "Node.js와 PostgreSQL로 REST API 서버를 구축하고 운영한 백엔드 개발 경험이 있습니다. 문제 상황에서 API 안정성을 확보하기 위해 모니터링과 예외 처리를 강화했습니다.",
  charCount: { withSpaces: 90, withoutSpaces: 74, limit: 800 },
  evidenceMap: [
    {
      textRangeLabel: "전체 초안",
      claimIds: ["manual-claim-1"],
      experienceIds: ["manual-experience-1"]
    }
  ],
  reviewReport: {
    scores: {
      promptFit: 74,
      jobFit: 70,
      specificity: 72,
      evidenceSafety: 76,
      koreanReadability: 80,
      aiLikenessRisk: 42,
      blindRisk: 8,
      interviewDefensibility: 70
    },
    issues: [
      {
        type: "evidence_gap",
        severity: "medium" as const,
        message: "결과 수치가 확인되면 설득력이 더 높아집니다."
      }
    ],
    likelyInterviewQuestions: ["API 장애 대응 경험을 설명해 주세요."],
    sensitiveWarnings: []
  },
  revisionOptions: ["프로젝트 경험을 문제 상황, 해결 방법, 결과 중심으로 작성하세요."]
};

const providerStatuses = [
  {
    providerId: "codex_bridge",
    label: "Codex Bridge",
    online: false,
    configured: false,
    quotaExceeded: false,
    models: []
  },
  {
    providerId: "gemini",
    label: "Gemini",
    online: false,
    configured: false,
    quotaExceeded: false,
    models: []
  },
  {
    providerId: "local",
    label: "Local AI",
    online: false,
    configured: false,
    quotaExceeded: false,
    models: []
  },
  {
    providerId: "fallback",
    label: "Fallback Demo",
    online: true,
    configured: true,
    quotaExceeded: false,
    models: [{ modelId: "hardcoded-demo", label: "Demo Fallback", online: true, quotaExceeded: false }]
  }
];

function createDraftWorkflowFetchMock(options?: { planFails?: boolean; draftFails?: boolean }) {
  return vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);

    if (url.includes("/api/draft-workflow/providers")) {
      return apiResponse({ data: providerStatuses });
    }

    if (url.includes("/api/jobs/careercross-1591647")) {
      return apiResponse({ data: apiJob });
    }

    if (url.includes("/api/resume/extract") && init?.method === "POST") {
      return apiResponse({
        data: {
          fileName: "resume.pdf",
          text: "PDF에서 추출한 포트폴리오 본문입니다.",
          mode: "mock"
        }
      });
    }

    if (url.includes("/api/draft-workflow/plan") && init?.method === "POST") {
      if (options?.planFails) return errorResponse();
      return apiResponse({ data: workflowPlanResult });
    }

    if (url.includes("/api/draft-workflow/draft") && init?.method === "POST") {
      if (options?.draftFails) return errorResponse();
      return apiResponse({ data: workflowDraftResult });
    }

    if (url.includes("/api/draft-workflow/revise") && init?.method === "POST") {
      return apiResponse({
        data: {
          ...workflowDraftResult,
          draftText: `${workflowDraftResult.draftText}\n\n[수정 요청 반영: 더 간결하게]`
        }
      });
    }

    return errorResponse();
  });
}

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

function getPlanCallBody(fetchMock: ReturnType<typeof vi.fn>) {
  const planCall = fetchMock.mock.calls.find(
    ([input, init]) => String(input).includes("/api/draft-workflow/plan") && init?.method === "POST"
  );
  expect(planCall).toBeTruthy();
  return JSON.parse(String(planCall?.[1]?.body));
}

async function submitUserResume(text = USER_RESUME) {
  const textarea = screen.getByPlaceholderText("메시지를 입력하세요...");
  fireEvent.change(textarea, { target: { value: text } });
  fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
  await screen.findByText(/충분한 경험 데이터가 확보되었습니다/);
}

async function runDraftWorkflowGeneration(fetchMock: ReturnType<typeof vi.fn>) {
  const startButton = await screen.findByRole("button", { name: /문항 분석 시작/i });
  await waitFor(() => expect(startButton).toBeEnabled());
  fireEvent.click(startButton);
  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/draft-workflow/plan"),
      expect.objectContaining({ method: "POST" })
    );
  });
  const draftButton = await screen.findByRole("button", { name: /개요 확인 및 초안 생성/i });
  await waitFor(() => expect(draftButton).toBeEnabled());
  fireEvent.click(draftButton);
  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/draft-workflow/draft"),
      expect.objectContaining({ method: "POST" })
    );
  });
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
    expect(screen.queryByText(/읽는 중…/)).not.toBeInTheDocument();
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

    fetchMock = createDraftWorkflowFetchMock();

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
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/draft-workflow/providers"));
  });
});

describe("AIDraftChatBuilder draft workflow flow", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let elementScrollToMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    window.history.pushState({}, "", "/ai-analysis?jobId=careercross-1591647");
    elementScrollToMock = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollTo", {
      configurable: true,
      value: elementScrollToMock
    });

    fetchMock = createDraftWorkflowFetchMock();

    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("does not call draft workflow before the user sends input", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    expect(screen.queryByRole("button", { name: /문항 분석 시작/i })).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining("/api/draft-workflow/plan"),
      expect.anything()
    );
  });

  it("sends the user resume text and target fields in the plan payload", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    await submitUserResume();

    fireEvent.click(screen.getByRole("button", { name: /문항 분석 시작/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/draft-workflow/plan"),
        expect.objectContaining({ method: "POST" })
      );
    });

    const body = getPlanCallBody(fetchMock);
    expect(body.target.questionText).toContain("지원 직무");
    expect(body.target.writingStyle).toBe("담백한 실무형");
    expect(body.experienceInput.manualExperienceText).toContain("Node.js와 PostgreSQL");
    expect(body.experienceInput.manualExperienceText).not.toContain(SAMPLE_DEMO_RESUME_SNIPPET);
  });

  it("includes attached text file content in the plan payload", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    fireEvent.click(screen.getByRole("button", { name: "작성 옵션" }));
    await attachTextFile("resume.txt", "첨부 파일 본문 텍스트입니다.");
    await submitUserResume();

    fireEvent.click(screen.getByRole("button", { name: /문항 분석 시작/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/draft-workflow/plan"),
        expect.objectContaining({ method: "POST" })
      );
    });

    const body = getPlanCallBody(fetchMock);
    expect(body.experienceInput.portfolioText).toContain("첨부 파일 본문 텍스트입니다.");
    expect(body.experienceInput.manualExperienceText).toContain("Node.js와 PostgreSQL");
  });

  it("allows draft workflow with only an attached text file", async () => {
    const attachOnlyResume =
      "첨부 파일만으로도 분석 가능한 충분히 긴 자기소개 본문 텍스트입니다.";

    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    fireEvent.click(screen.getByRole("button", { name: "작성 옵션" }));
    await attachTextFile("resume.txt", attachOnlyResume);

    const generateButton = await screen.findByRole("button", { name: /문항 분석 시작/i });
    expect(generateButton).toBeEnabled();

    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/draft-workflow/plan"),
        expect.objectContaining({ method: "POST" })
      );
    });

    const body = getPlanCallBody(fetchMock);
    expect(body.experienceInput.portfolioText).toContain(attachOnlyResume);
    expect(body.experienceInput.manualExperienceText ?? "").not.toContain(USER_RESUME);
  });

  it("includes extracted pdf attachments in the plan payload", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    fireEvent.click(screen.getByRole("button", { name: "작성 옵션" }));
    await attachDocumentFile("resume.pdf", "%PDF-1.4", "application/pdf");
    await submitUserResume();

    fireEvent.click(screen.getByRole("button", { name: /문항 분석 시작/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/draft-workflow/plan"),
        expect.objectContaining({ method: "POST" })
      );
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/resume/extract"),
      expect.objectContaining({ method: "POST" })
    );

    const body = getPlanCallBody(fetchMock);
    expect(body.experienceInput.manualExperienceText).toContain("Node.js와 PostgreSQL");
    expect(body.experienceInput.portfolioText).toContain("PDF에서 추출한 포트폴리오 본문입니다.");
  });

  it("clears previous draft results when a new attachment is added", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    await submitUserResume();
    await runDraftWorkflowGeneration(fetchMock);
    expect(await screen.findByText(/Fallback \(사용 가능한 AI 없음\)/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "작성 옵션" }));
    await attachTextFile("extra.txt", "새로 첨부한 추가 자기소개 본문 텍스트입니다.");

    expect(screen.queryByText(/Fallback \(사용 가능한 AI 없음\)/)).not.toBeInTheDocument();
  });

  it("excludes removed attachment content from the plan payload", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    fireEvent.click(screen.getByRole("button", { name: "작성 옵션" }));
    await attachTextFile("resume.txt", "제거될 첨부 파일 본문 텍스트입니다.");
    fireEvent.click(screen.getByRole("button", { name: "resume.txt 제거" }));
    await waitFor(() => {
      expect(screen.queryByLabelText("첨부 파일")).not.toBeInTheDocument();
    });
    await submitUserResume();

    fireEvent.click(screen.getByRole("button", { name: /문항 분석 시작/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/draft-workflow/plan"),
        expect.objectContaining({ method: "POST" })
      );
    });

    const body = getPlanCallBody(fetchMock);
    expect(body.experienceInput.portfolioText ?? "").not.toContain("제거될 첨부 파일 본문 텍스트입니다.");
  });

  it("disables draft generation when resume text is shorter than 10 characters", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    await confirmNewChat();

    const textarea = screen.getByPlaceholderText("메시지를 입력하세요...");
    fireEvent.change(textarea, { target: { value: "a" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    await screen.findByText(/답변이 조금 간결한 편입니다/);

    fireEvent.change(textarea, { target: { value: "b" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    const generateButton = await screen.findByRole("button", { name: /문항 분석 시작/i });
    expect(generateButton).toBeDisabled();
    expect(screen.getByText("자기소개 내용을 10자 이상 입력해야 분석할 수 있습니다.")).toBeInTheDocument();
  });

  it("renders draft workflow fields after a successful request", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    await submitUserResume();
    await runDraftWorkflowGeneration(fetchMock);

    expect(await screen.findByText(/Fallback \(사용 가능한 AI 없음\)/)).toBeInTheDocument();
    expect(screen.getAllByText("결과 수치가 확인되면 설득력이 더 높아집니다.").length).toBeGreaterThan(0);
    expect(screen.getAllByText("API 장애 대응 경험을 설명해 주세요.").length).toBeGreaterThan(0);
    expect(screen.getAllByText("프로젝트 경험을 문제 상황, 해결 방법, 결과 중심으로 작성하세요.").length).toBeGreaterThan(0);
    expect(await screen.findByText(/문제 상황에서 API 안정성을 확보하기 위해/)).toBeInTheDocument();
    expect(screen.getAllByText("74").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: "다음 질문 이어가기" }).querySelector("img")?.getAttribute("src")
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "다음 질문 이어가기" }).querySelector("img")
    ).toHaveAttribute("data-icon-name", "followUp");
  });

  it("shows an error message when draft workflow request fails", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL, _init?: RequestInit) => {
      const url = String(input);

      if (url.includes("/api/jobs/careercross-1591647")) {
        return apiResponse({ data: apiJob });
      }

      if (url.includes("/api/draft-workflow/providers")) {
        return apiResponse({ data: providerStatuses });
      }

      if (url.includes("/api/draft-workflow/plan")) {
        return errorResponse();
      }

      return errorResponse();
    });

    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    await submitUserResume();
    fireEvent.click(screen.getByRole("button", { name: /문항 분석 시작/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("문항 분석 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    expect(screen.queryByText(/Fallback \(사용 가능한 AI 없음\)/)).not.toBeInTheDocument();
  });

  it("clears stale draft results when a retry fails after a successful run", async () => {
    let draftAttempt = 0;

    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes("/api/jobs/careercross-1591647")) {
        return apiResponse({ data: apiJob });
      }

      if (url.includes("/api/draft-workflow/providers")) {
        return apiResponse({ data: providerStatuses });
      }

      if (url.includes("/api/draft-workflow/plan") && init?.method === "POST") {
        return apiResponse({ data: workflowPlanResult });
      }

      if (url.includes("/api/draft-workflow/draft") && init?.method === "POST") {
        draftAttempt += 1;
        if (draftAttempt === 1) {
          return apiResponse({ data: workflowDraftResult });
        }
        return errorResponse();
      }

      return errorResponse();
    });

    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    await submitUserResume();
    await runDraftWorkflowGeneration(fetchMock);
    expect(await screen.findByText(/문제 상황에서 API 안정성을 확보하기 위해/)).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes("/api/draft-workflow/draft")).length).toBe(1);

    const retryButton = await screen.findByRole("button", { name: /개요 확인 및 초안 생성/i });
    await waitFor(() => expect(retryButton).toBeEnabled());
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(fetchMock.mock.calls.filter(([url]) => String(url).includes("/api/draft-workflow/draft")).length).toBe(2);
    });
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("초안 생성 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    });
    await waitFor(() => {
      expect(screen.queryByText(/문제 상황에서 API 안정성을 확보하기 위해/)).not.toBeInTheDocument();
    });
  });

  it("clears previous draft results when the selected job changes", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    await submitUserResume();
    await runDraftWorkflowGeneration(fetchMock);
    expect(await screen.findByText(/Fallback \(사용 가능한 AI 없음\)/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "수정" }));
    fireEvent.click(screen.getByRole("button", { name: /네이트워크 테크/i }));

    await waitFor(() => {
      expect(screen.queryByText(/Fallback \(사용 가능한 AI 없음\)/)).not.toBeInTheDocument();
    });
    expect(screen.queryByText("결과 수치가 확인되면 설득력이 더 높아집니다.")).not.toBeInTheDocument();
  });

  it("ignores stale draft responses after the job changes during loading", async () => {
    let resolvePlan: ((value: Response) => void) | undefined;

    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes("/api/jobs/careercross-1591647")) {
        return apiResponse({ data: apiJob });
      }

      if (url.includes("/api/draft-workflow/providers")) {
        return apiResponse({ data: providerStatuses });
      }

      if (url.includes("/api/draft-workflow/plan") && init?.method === "POST") {
        return new Promise<Response>((resolve) => {
          resolvePlan = resolve;
        });
      }

      return errorResponse();
    });

    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    await submitUserResume();
    fireEvent.click(screen.getByRole("button", { name: /문항 분석 시작/i }));

    fireEvent.click(screen.getByRole("button", { name: "수정" }));
    fireEvent.click(screen.getByRole("button", { name: /네이트워크 테크/i }));

    resolvePlan?.(apiResponse({ data: workflowPlanResult }) as Response);

    await waitFor(() => {
      expect(screen.queryByText(/Fallback \(사용 가능한 AI 없음\)/)).not.toBeInTheDocument();
    });
    expect(screen.queryByText("결과 수치가 확인되면 설득력이 더 높아집니다.")).not.toBeInTheDocument();
  });

  it("clears draft results when the user sends a new message after success", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    await submitUserResume();
    await runDraftWorkflowGeneration(fetchMock);
    expect(await screen.findByText(/Fallback \(사용 가능한 AI 없음\)/)).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText("메시지를 입력하세요...");
    fireEvent.change(textarea, { target: { value: "추가로 캐시 최적화 경험도 있습니다." } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    await waitFor(() => {
      expect(screen.queryByText(/Fallback \(사용 가능한 AI 없음\)/)).not.toBeInTheDocument();
    });
  });

  it("drops ready state immediately when the user sends another message", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    await submitUserResume();

    expect(screen.getByRole("button", { name: /문항 분석 시작/i })).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText("메시지를 입력하세요...");
    fireEvent.change(textarea, {
      target: { value: "추가로 Docker 기반 배포 파이프라인을 운영한 경험도 있습니다." },
    });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    expect(screen.queryByRole("button", { name: /문항 분석 시작/i })).not.toBeInTheDocument();
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

    fetchMock = createDraftWorkflowFetchMock();

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
    expect(scoped.getByRole("button", { name: /AI provider 선택/i })).toBeInTheDocument();
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
    expect(getHiddenFileInput()).toHaveAttribute("accept", ".txt,.md,.pdf,.docx");
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

  it("updates the selected provider from the composer provider menu", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    fireEvent.click(screen.getByRole("button", { name: /AI provider 선택, 현재 자동/i }));

    fireEvent.click(screen.getByRole("menuitemradio", { name: /Fallback · 온라인/i }));

    expect(screen.getByRole("button", { name: /AI provider 선택, 현재 Fallback/i })).toBeInTheDocument();
    expect(screen.queryByRole("menu", { name: "AI provider 선택" })).not.toBeInTheDocument();
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

describe("AIDraftChatBuilder plan test plan coverage", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    window.history.pushState({}, "", "/ai-analysis?jobId=careercross-1591647");
    fetchMock = createDraftWorkflowFetchMock();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows provider online/offline status in the sidebar", async () => {
    render(<AIDraftChatBuilder />);

    expect(await screen.findByText(/Codex · 오프라인/)).toBeInTheDocument();
    expect(screen.getByText(/Gemini · 오프라인/)).toBeInTheDocument();
    expect(screen.getByText(/Local · 오프라인/)).toBeInTheDocument();
    expect(screen.getByText(/Fallback · 온라인/)).toBeInTheDocument();
  });

  it("uses auto routing by default in the plan payload", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    await submitUserResume();
    fireEvent.click(screen.getByRole("button", { name: /문항 분석 시작/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/draft-workflow/plan"),
        expect.objectContaining({ method: "POST" })
      );
    });

    const body = getPlanCallBody(fetchMock);
    expect(body.aiSelection).toEqual({ mode: "auto" });
  });

  it("switches to manual mode when a provider is selected", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    await submitUserResume();

    fireEvent.click(screen.getByRole("button", { name: /AI provider 선택, 현재 자동/i }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: /Gemini · 오프라인/i }));

    fireEvent.click(screen.getByRole("button", { name: /문항 분석 시작/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/draft-workflow/plan"),
        expect.objectContaining({ method: "POST" })
      );
    });

    const body = getPlanCallBody(fetchMock);
    expect(body.aiSelection.mode).toBe("manual");
    expect(body.aiSelection.providerId).toBe("gemini");
  });

  it("shows fallback badge with quota exceeded reason", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes("/api/draft-workflow/providers")) {
        return apiResponse({ data: providerStatuses });
      }

      if (url.includes("/api/jobs/careercross-1591647")) {
        return apiResponse({ data: apiJob });
      }

      if (url.includes("/api/draft-workflow/plan") && init?.method === "POST") {
        return apiResponse({
          data: {
            ...workflowPlanResult,
            aiMeta: {
              ...aiMeta,
              fallbackReason: "quota_exceeded" as const
            }
          }
        });
      }

      if (url.includes("/api/draft-workflow/draft") && init?.method === "POST") {
        return apiResponse({
          data: {
            ...workflowDraftResult,
            aiMeta: {
              ...aiMeta,
              fallbackReason: "quota_exceeded" as const
            }
          }
        });
      }

      return errorResponse();
    });

    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    await submitUserResume();
    await runDraftWorkflowGeneration(fetchMock);

    expect(await screen.findByText(/Fallback · Fallback \(할당량 초과\)/)).toBeInTheDocument();
  });

  it("renders experience cards, outline, draft, and review report in order", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes("/api/draft-workflow/providers")) {
        return apiResponse({ data: providerStatuses });
      }

      if (url.includes("/api/jobs/careercross-1591647")) {
        return apiResponse({ data: apiJob });
      }

      if (url.includes("/api/draft-workflow/plan") && init?.method === "POST") {
        return apiResponse({
          data: {
            ...workflowPlanResult,
            answerStrategy: {
              ...workflowPlanResult.answerStrategy,
              neededQuestions: [
                {
                  questionId: "gap-1",
                  slot: "result_metric",
                  priority: 1,
                  question: "정량 결과를 입력해 주세요.",
                  choices: ["사용자 1000명 증가", "매출 20% 상승"]
                }
              ]
            }
          }
        });
      }

      if (url.includes("/api/draft-workflow/draft") && init?.method === "POST") {
        return apiResponse({ data: workflowDraftResult });
      }

      return errorResponse();
    });

    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    await submitUserResume();

    fireEvent.click(screen.getByRole("button", { name: /문항 분석 시작/i }));

    expect(await screen.findByLabelText("경험 카드")).toBeInTheDocument();
    expect(screen.getByLabelText("개요")).toBeInTheDocument();
    expect(screen.getByText("정량 결과를 입력해 주세요.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "사용자 1000명 증가" }));

    const draftButton = screen.getByRole("button", { name: /개요 확인 및 초안 생성/i });
    await waitFor(() => expect(draftButton).toBeEnabled());
    fireEvent.click(draftButton);

    expect(await screen.findByText(/문제 상황에서 API 안정성을 확보하기 위해/)).toBeInTheDocument();
    expect(screen.getByLabelText("검수 이슈")).toBeInTheDocument();
    expect(screen.getAllByText("결과 수치가 확인되면 설득력이 더 높아집니다.").length).toBeGreaterThan(0);
  });

  it("marks fallback mode distinctly from real AI output", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    await submitUserResume();
    await runDraftWorkflowGeneration(fetchMock);

    expect(await screen.findByText(/Fallback \(사용 가능한 AI 없음\)/)).toBeInTheDocument();
    expect(document.querySelector(".aiDraftModeBadge.fallback")).toBeTruthy();
    expect(screen.getByText("FALLBACK")).toBeInTheDocument();
  });
});
