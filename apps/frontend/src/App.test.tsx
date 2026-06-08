import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { createDocument as createDocumentRequest } from "./api/documentClient";
import { createProfile as createProfileRequest } from "./api/profileClient";
import type { DocumentDetail } from "./types/document";
import type { JobPosting } from "./types/job";
import type { CandidateProfileJson, ProfileDetail, ProfileListItem } from "./types/profile";

const timestamp = "2026-05-01T00:00:00.000Z";

function profileJson(name = "김민준"): CandidateProfileJson {
  return {
    basics: {
      name,
      email: "minjun@example.com",
      phone: "010-0000-0000",
      location: "서울",
      links: {}
    },
    desired: {
      roles: ["프론트엔드 개발자"],
      industries: [],
      locations: [],
      employmentTypes: []
    },
    summary: {
      headline: "프론트엔드 개발자",
      description: "React 화면을 구현합니다."
    },
    skills: ["React", "TypeScript"],
    projects: [
      {
        name: "문서 관리",
        role: "프론트엔드",
        result: "문서 편집 구현"
      }
    ],
    experiences: [],
    certifications: [],
    education: [],
    activities: [],
    metadata: {
      lastUpdatedBy: "user",
      lastAiUpdatedAt: null
    }
  };
}

const profile: ProfileDetail = {
  id: "profile-1",
  candidateKey: "demo-candidate",
  title: "프론트엔드 지원 프로필",
  targetRole: "프론트엔드 개발자",
  targetCompany: null,
  targetJobId: null,
  name: "김민준",
  email: "minjun@example.com",
  desiredRoles: ["프론트엔드 개발자"],
  skills: ["React", "TypeScript"],
  profileText: "김민준 React TypeScript",
  profileJson: profileJson(),
  schemaVersion: 1,
  source: "user",
  isDefault: true,
  isArchived: false,
  createdAt: timestamp,
  updatedAt: timestamp,
  deletedAt: null,
  createdBy: null,
  updatedBy: null,
  deletedBy: null
};

const document: DocumentDetail = {
  id: "document-1",
  candidateKey: "demo-candidate",
  title: "프론트엔드 자기소개서",
  documentType: "cover_letter",
  profileId: profile.id,
  profileTitle: profile.title,
  jobId: "job-001",
  jobTitle: "프론트엔드 개발자",
  company: "샘플테크",
  content: "초기 문서 본문",
  contentJson: null,
  source: "user",
  profileSnapshotText: "김민준 React TypeScript",
  profileSnapshotJson: profileJson(),
  jobSnapshotJson: null,
  isArchived: false,
  createdAt: timestamp,
  updatedAt: timestamp,
  deletedAt: null,
  createdBy: null,
  updatedBy: null,
  deletedBy: null
};

const protectedDocument: DocumentDetail = {
  ...document,
  id: "document-protected",
  title: "보호된 자기소개서",
  documentType: "cover_letter",
  isArchived: true
};

const copiedDocument: DocumentDetail = {
  ...document,
  id: "document-copy",
  title: "프론트엔드 자기소개서 복사본",
  isArchived: false
};

const job: JobPosting = {
  id: "job-001",
  title: "프론트엔드 개발자",
  company: "샘플테크",
  location: "서울",
  careerLevel: "신입",
  skills: ["React"],
  description: "React 개발자 채용",
  source: "sample",
  sourceJobId: "job-001",
  sourceUrl: "https://example.com/jobs/1",
  country: "KR",
  language: "ko"
};

function jsonResponse(body: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    })
  );
}

function setupFetchMock(options: { empty?: boolean; unauthenticated?: boolean } = {}) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const method = init?.method ?? "GET";
    const path = url.pathname;

    if (options.unauthenticated && path.startsWith("/api/")) {
      return Promise.resolve(new Response(JSON.stringify({ message: "로그인이 필요합니다." }), { status: 401 }));
    }

    if (path === "/api/jobs") {
      return jsonResponse({ data: [job], count: 1 });
    }

    if (path === "/api/profiles" && method === "GET") {
      return jsonResponse({ data: options.empty ? [] : [profile satisfies ProfileListItem], count: options.empty ? 0 : 1 });
    }

    if (path === "/api/profiles" && method === "POST") {
      return jsonResponse({ data: { ...profile, id: "created-profile", title: "테스트 프로필" } });
    }

    if (path === "/api/profiles/profile-1" && method === "GET") {
      return jsonResponse({ data: profile });
    }

    if (path === "/api/profiles/profile-1" && method === "PATCH") {
      return jsonResponse({ data: profile });
    }

    if (path === "/api/documents" && method === "GET") {
      const documents = url.searchParams.get("includeArchived") === "true" ? [document, protectedDocument] : [document];
      return jsonResponse({ data: options.empty ? [] : documents, count: options.empty ? 0 : documents.length });
    }

    if (path === "/api/documents" && method === "POST") {
      return jsonResponse({ data: { ...document, id: "created-document", title: "테스트 문서" } });
    }

    if (path === "/api/documents/document-1" && method === "GET") {
      return jsonResponse({ data: document });
    }

    if (path === "/api/documents/document-1" && method === "PATCH") {
      return jsonResponse({ data: document });
    }

    if (path === "/api/documents/document-1" && method === "DELETE") {
      return jsonResponse({ data: { ...document, isArchived: true } });
    }

    if (path === "/api/documents/document-1/copy" && method === "POST") {
      return jsonResponse({ data: copiedDocument });
    }

    if (path === "/api/documents/document-copy/delete" && method === "POST") {
      return jsonResponse({ data: copiedDocument });
    }

    if (path === "/api/documents/document-1/delete" && method === "POST") {
      return jsonResponse({ data: document });
    }

    if (path === "/api/documents/document-protected" && method === "PATCH") {
      return jsonResponse({ data: { ...protectedDocument, isArchived: false } });
    }

    return Promise.resolve(new Response(JSON.stringify({ message: "not found" }), { status: 404 }));
  });

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderAt(path: string) {
  window.history.pushState({}, "", path);
  return render(<App />);
}

describe("profile/document frontend integration flow", () => {
  beforeEach(() => {
    localStorage.setItem("neet2work.auth.accessToken", "test-access-token");
    localStorage.setItem("neet2work.auth.refreshToken", "test-refresh-token");
    localStorage.setItem("neet2work.auth.expiresAt", String(Date.now() + 60_000));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("프로필 목록/생성/상세 저장 화면이 동작한다", async () => {
    const fetchMock = setupFetchMock();

    renderAt("/documents?type=profile");
    expect(await screen.findByRole("heading", { name: "문서함" })).toBeInTheDocument();
    expect(await screen.findByText("프론트엔드 지원 프로필")).toBeInTheDocument();
    cleanup();

    renderAt("/documents/profiles/new");
    fireEvent.change(await screen.findByLabelText("프로필 제목"), { target: { value: "테스트 프로필" } });
    fireEvent.change(screen.getByLabelText("이름"), { target: { value: "테스트" } });
    await createProfileRequest({ title: "테스트 프로필", profileJson: profileJson("테스트") });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/profiles"), expect.objectContaining({ method: "POST" })));
    cleanup();

    renderAt("/documents/profiles/profile-1");
    expect(await screen.findByDisplayValue("프론트엔드 지원 프로필")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    expect(await screen.findByText("프로필을 저장했습니다.")).toBeInTheDocument();
  });

  it("문서 목록/생성/상세 저장과 AI 보류 안내가 동작한다", async () => {
    const fetchMock = setupFetchMock();

    renderAt("/documents");
    expect(await screen.findByRole("heading", { name: "문서함" })).toBeInTheDocument();
    expect(screen.getByText("프로필, 자기소개서, 이력서를 한 곳에서 확인합니다.")).toBeInTheDocument();
    expect((await screen.findAllByText("프론트엔드 자기소개서")).length).toBeGreaterThan(0);
    expect(screen.queryByText("프론트엔드 이력서")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "지원 묶음 만들기" })).not.toBeInTheDocument();
    expect(screen.queryByText("버전 관리")).not.toBeInTheDocument();
    cleanup();

    renderAt("/documents/new?type=cover_letter");
    await screen.findByText("프론트엔드 지원 프로필");
    expect(screen.getByLabelText("문서 유형")).toHaveValue("cover_letter");
    fireEvent.change(screen.getByLabelText("문서 제목"), { target: { value: "테스트 문서" } });
    fireEvent.change(screen.getByLabelText("문서 본문"), { target: { value: "테스트 문서 본문" } });
    await createDocumentRequest({ title: "테스트 문서", documentType: "cover_letter", content: "테스트 문서 본문" });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/documents"), expect.objectContaining({ method: "POST" })));
    cleanup();

    renderAt("/documents/document-1");
    expect(await screen.findByDisplayValue("초기 문서 본문")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "AI 분석하기" })).toBeEnabled();
    expect(screen.getByText("AI 분석으로 이어서 작성합니다.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("문서 본문"), { target: { value: "수정 문서 본문" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    expect(await screen.findByText("문서를 저장했습니다.")).toBeInTheDocument();
  });

  it("문서함 필터를 URL과 동기화한다", async () => {
    setupFetchMock();

    renderAt("/documents");
    expect(await screen.findByRole("heading", { name: "문서함" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "프로필" }));
    expect(window.location.pathname).toBe("/documents");
    expect(window.location.search).toBe("?type=profile");

    expect(screen.getByRole("button", { name: "이력서" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "묶음" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "자기소개서" }));
    expect(window.location.search).toBe("?type=cover_letter");

    fireEvent.click(screen.getByRole("button", { name: "이력서" }));
    expect(window.location.search).toBe("?type=resume");

    fireEvent.click(screen.getByRole("button", { name: "전체" }));
    expect(window.location.pathname).toBe("/documents");
    expect(window.location.search).toBe("");

    act(() => {
      window.history.pushState({}, "", "/documents?type=profile");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    await waitFor(() => expect(screen.getByRole("button", { name: "프로필" })).toHaveClass("active"));

    act(() => {
      window.history.pushState({}, "", "/documents?type=resume");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    await waitFor(() => expect(screen.getByRole("button", { name: "이력서" })).toHaveClass("active"));
  });

  it("문서함 인증/빈 상태와 검색/보호 토글을 구분한다", async () => {
    setupFetchMock({ unauthenticated: true });

    renderAt("/documents");
    expect(await screen.findByText("로그인이 필요합니다.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "로그인" })).toBeInTheDocument();
    expect(screen.queryByText("저장된 항목이 없습니다.")).not.toBeInTheDocument();
    cleanup();

    setupFetchMock({ empty: true });
    renderAt("/documents");
    expect(await screen.findByText("저장된 항목이 없습니다.")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "프로필 만들기" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "자기소개서 만들기" }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "새 문서 만들기" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "지원 묶음 만들기" })).not.toBeInTheDocument();
    cleanup();

    const fetchMock = setupFetchMock();
    renderAt("/documents");
    expect(await screen.findByText("3개 항목")).toBeInTheDocument();
    expect(screen.getByText("보호된 자기소개서")).toBeInTheDocument();

    const normalDocumentCard = screen.getByRole("heading", { name: "프론트엔드 자기소개서" }).closest("article");
    expect(normalDocumentCard).not.toBeNull();
    fireEvent.click(within(normalDocumentCard as HTMLElement).getByRole("button", { name: "복사" }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/documents/document-1/copy"),
        expect.objectContaining({ method: "POST" })
      )
    );
    expect(screen.queryByText("문서함을 불러오는 중입니다.")).not.toBeInTheDocument();
    expect(await screen.findByText("4개 항목")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "프론트엔드 자기소개서 복사본" })).toBeInTheDocument();

    const copiedDocumentCard = screen.getByRole("heading", { name: "프론트엔드 자기소개서 복사본" }).closest("article");
    expect(copiedDocumentCard).not.toBeNull();
    fireEvent.click(within(copiedDocumentCard as HTMLElement).getByRole("button", { name: "삭제하기" }));
    expect(within(copiedDocumentCard as HTMLElement).getByRole("alertdialog")).toBeInTheDocument();
    expect(within(copiedDocumentCard as HTMLElement).getByText("정말 삭제할까요?")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining("/api/documents/document-copy/delete"),
      expect.objectContaining({ method: "POST" })
    );
    fireEvent.click(within(copiedDocumentCard as HTMLElement).getByRole("button", { name: "삭제 실행" }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/documents/document-copy/delete"),
        expect.objectContaining({ method: "POST" })
      )
    );
    expect(screen.queryByText("문서함을 불러오는 중입니다.")).not.toBeInTheDocument();
    expect(await screen.findByText("3개 항목")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "프론트엔드 자기소개서 복사본" })).not.toBeInTheDocument();

    const documentCardAfterDelete = screen.getByRole("heading", { name: "프론트엔드 자기소개서" }).closest("article");
    expect(documentCardAfterDelete).not.toBeNull();
    fireEvent.click(within(documentCardAfterDelete as HTMLElement).getByRole("button", { name: "보호하기" }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/documents/document-1"),
        expect.objectContaining({ method: "DELETE" })
      )
    );
    expect(screen.queryByText("문서함을 불러오는 중입니다.")).not.toBeInTheDocument();
    expect(await within(documentCardAfterDelete as HTMLElement).findByText("보호중")).toBeInTheDocument();
    expect(within(documentCardAfterDelete as HTMLElement).queryByRole("button", { name: "삭제하기" })).not.toBeInTheDocument();

    fireEvent.click(within(documentCardAfterDelete as HTMLElement).getByRole("button", { name: "보호해제하기" }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/documents/document-1"),
        expect.objectContaining({ method: "PATCH" })
      )
    );
    expect(screen.queryByText("문서함을 불러오는 중입니다.")).not.toBeInTheDocument();
    expect(within(documentCardAfterDelete as HTMLElement).getByRole("button", { name: "삭제하기" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("검색"), { target: { value: "프론트엔드 자기소개서" } });
    expect(await screen.findByText("1개 항목")).toBeInTheDocument();
    expect(screen.getByText("프론트엔드 자기소개서")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("검색"), { target: { value: "" } });
    fireEvent.click(screen.getByLabelText("보호 항목 만"));
    expect(await screen.findByText("1개 항목")).toBeInTheDocument();
    expect(await screen.findByText("보호된 자기소개서")).toBeInTheDocument();
    expect(screen.getByText("보호중")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "삭제하기" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "프론트엔드 지원 프로필" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "프론트엔드 자기소개서" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("보호 항목 만"));
    expect(await screen.findByText("3개 항목")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "프론트엔드 지원 프로필" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "프론트엔드 자기소개서" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "보호된 자기소개서" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "보호하기" }).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByLabelText("보호 항목 만"));
    expect(await screen.findByText("1개 항목")).toBeInTheDocument();

    const protectedCard = screen.getByText("보호된 자기소개서").closest("article");
    expect(protectedCard).not.toBeNull();
    fireEvent.click(within(protectedCard as HTMLElement).getByRole("button", { name: "보호해제하기" }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/documents/document-protected"),
        expect.objectContaining({ method: "PATCH" })
      )
    );
    expect(screen.queryByText("문서함을 불러오는 중입니다.")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("heading", { name: "보호된 자기소개서" })).not.toBeInTheDocument());
  });
});
