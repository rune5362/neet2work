import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { createDocument as createDocumentRequest } from "./api/documentClient";
import { createProfile as createProfileRequest } from "./api/profileClient";
import type { ApplicationSetItem } from "./types/applicationSet";
import type { DocumentDetail, DocumentListItem } from "./types/document";
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
  updatedAt: timestamp
};

const document: DocumentDetail = {
  id: "document-1",
  candidateKey: "demo-candidate",
  title: "프론트엔드 이력서",
  documentType: "resume",
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
  updatedAt: timestamp
};

const documentSet: ApplicationSetItem = {
  id: "set-1",
  candidateKey: "demo-candidate",
  title: "프론트엔드 지원 묶음",
  profileId: profile.id,
  profileTitle: profile.title,
  resumeDocumentId: document.id,
  resumeTitle: document.title,
  coverLetterDocumentId: null,
  coverLetterTitle: null,
  isArchived: false,
  createdAt: timestamp,
  updatedAt: timestamp
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

function setupFetchMock() {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const method = init?.method ?? "GET";
    const path = url.pathname;

    if (path === "/api/jobs") {
      return jsonResponse({ data: [job], count: 1 });
    }

    if (path === "/api/profiles" && method === "GET") {
      return jsonResponse({ data: [profile satisfies ProfileListItem], count: 1 });
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
      return jsonResponse({ data: [document satisfies DocumentListItem], count: 1 });
    }

    if (path === "/api/document-sets" && method === "GET") {
      return jsonResponse({ data: [documentSet], count: 1 });
    }

    if (path === "/api/document-sets/set-1" && method === "GET") {
      return jsonResponse({ data: documentSet });
    }

    if (path === "/api/document-sets/set-1" && method === "PATCH") {
      return jsonResponse({ data: documentSet });
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
    expect(await screen.findByRole("heading", { name: "문서 보관함" })).toBeInTheDocument();
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
    expect(await screen.findByRole("heading", { name: "문서 보관함" })).toBeInTheDocument();
    expect((await screen.findAllByText("프론트엔드 이력서")).length).toBeGreaterThan(0);
    expect(screen.queryByText("버전 관리")).not.toBeInTheDocument();
    cleanup();

    renderAt("/documents/new");
    await screen.findByText("프론트엔드 지원 프로필");
    fireEvent.change(screen.getByLabelText("문서 제목"), { target: { value: "테스트 문서" } });
    fireEvent.change(screen.getByLabelText("문서 본문"), { target: { value: "테스트 문서 본문" } });
    await createDocumentRequest({ title: "테스트 문서", documentType: "resume", content: "테스트 문서 본문" });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/documents"), expect.objectContaining({ method: "POST" })));
    cleanup();

    renderAt("/documents/document-1");
    expect(await screen.findByDisplayValue("초기 문서 본문")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "AI 분석하기" })).toBeDisabled();
    expect(screen.getByText("AI 분석 기능은 현재 연동 준비 중입니다.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("문서 본문"), { target: { value: "수정 문서 본문" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    expect(await screen.findByText("문서를 저장했습니다.")).toBeInTheDocument();
    cleanup();

    renderAt("/documents/sets/set-1");
    expect(await screen.findByDisplayValue("프론트엔드 지원 묶음")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "전체 저장" }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/document-sets/set-1"),
        expect.objectContaining({ method: "PATCH" })
      )
    );
  });
});
