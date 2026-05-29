import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { createDocument as createDocumentRequest } from "./api/documentClient";
import { createProfile as createProfileRequest } from "./api/profileClient";
import type { DocumentDetail, DocumentListItem, DocumentVersion } from "./types/document";
import type { JobPosting } from "./types/job";
import type { CandidateProfileJson, ProfileDetail, ProfileListItem, ProfileVersion } from "./types/profile";

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
        result: "버전 관리 구현"
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

const profileVersion1: ProfileVersion = {
  id: "profile-version-1",
  profileId: "profile-1",
  candidateKey: "demo-candidate",
  versionNo: 1,
  title: "초기 프로필",
  memo: null,
  profileText: "김민준 React TypeScript",
  profileJson: profileJson(),
  schemaVersion: 1,
  source: "user",
  status: "active",
  parentVersionId: null,
  changeSummary: null,
  createdAt: timestamp,
  updatedAt: timestamp
};

const profileVersion2: ProfileVersion = {
  ...profileVersion1,
  id: "profile-version-2",
  versionNo: 2,
  title: "수정 프로필",
  changeSummary: "수정"
};

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
  currentVersionId: profileVersion1.id,
  currentVersionNo: 1,
  isDefault: true,
  isArchived: false,
  createdAt: timestamp,
  updatedAt: timestamp,
  currentVersion: profileVersion1
};

const documentVersion1: DocumentVersion = {
  id: "document-version-1",
  documentId: "document-1",
  candidateKey: "demo-candidate",
  versionNo: 1,
  title: "초기 문서",
  memo: null,
  content: "초기 문서 본문",
  contentJson: null,
  source: "user",
  status: "active",
  parentVersionId: null,
  profileSnapshotText: "김민준 React TypeScript",
  profileSnapshotJson: profileJson(),
  jobSnapshotJson: null,
  createdAt: timestamp,
  updatedAt: timestamp
};

const documentVersion2: DocumentVersion = {
  ...documentVersion1,
  id: "document-version-2",
  versionNo: 2,
  title: "수정 문서",
  content: "수정 문서 본문"
};

const document: DocumentDetail = {
  id: "document-1",
  candidateKey: "demo-candidate",
  title: "프론트엔드 이력서",
  documentType: "resume",
  profileId: profile.id,
  profileVersionId: profileVersion1.id,
  profileTitle: profile.title,
  jobId: "job-001",
  jobTitle: "프론트엔드 개발자",
  company: "샘플테크",
  currentVersionId: documentVersion1.id,
  currentVersionNo: 1,
  isArchived: false,
  createdAt: timestamp,
  updatedAt: timestamp,
  currentVersion: documentVersion1
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

    if (path === "/api/profiles/profile-1/versions" && method === "GET") {
      return jsonResponse({ data: [profileVersion2, profileVersion1], count: 2 });
    }

    if (path === "/api/profiles/profile-1/versions" && method === "POST") {
      return jsonResponse({ data: profileVersion2 });
    }

    if (path.startsWith("/api/profiles/profile-1/versions/") && method === "POST") {
      return jsonResponse({ data: profileVersion2 });
    }

    if (path === "/api/documents" && method === "GET") {
      return jsonResponse({ data: [document satisfies DocumentListItem], count: 1 });
    }

    if (path === "/api/documents" && method === "POST") {
      return jsonResponse({ data: { ...document, id: "created-document", title: "테스트 문서" } });
    }

    if (path === "/api/documents/document-1" && method === "GET") {
      return jsonResponse({ data: document });
    }

    if (path === "/api/documents/document-1/versions" && method === "GET") {
      return jsonResponse({ data: [documentVersion2, documentVersion1], count: 2 });
    }

    if (path === "/api/documents/document-1/versions" && method === "POST") {
      return jsonResponse({ data: documentVersion2 });
    }

    if (path.startsWith("/api/documents/document-1/versions/") && method === "POST") {
      return jsonResponse({ data: documentVersion2 });
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
    localStorage.setItem("neet2work.candidateKey", "demo-candidate");
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("프로필 목록/생성/상세 저장/버전 적용과 복원 화면이 동작한다", async () => {
    const fetchMock = setupFetchMock();

    renderAt("/profiles");
    expect(await screen.findByRole("heading", { name: "지원 프로필" })).toBeInTheDocument();
    expect(await screen.findByText("프론트엔드 지원 프로필")).toBeInTheDocument();
    cleanup();

    renderAt("/profiles/new");
    fireEvent.change(screen.getByLabelText("프로필 제목"), { target: { value: "테스트 프로필" } });
    fireEvent.change(screen.getByLabelText("이름"), { target: { value: "테스트" } });
    await createProfileRequest({ title: "테스트 프로필", profileJson: profileJson("테스트") });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/profiles"), expect.objectContaining({ method: "POST" })));
    cleanup();

    renderAt("/profiles/profile-1");
    expect(await screen.findByDisplayValue("프론트엔드 지원 프로필")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "새 버전으로 저장" }));
    expect(await screen.findByText("v2 새 버전을 저장했습니다.")).toBeInTheDocument();
    cleanup();

    renderAt("/profiles/profile-1/versions");
    expect(await screen.findByRole("heading", { name: "프론트엔드 지원 프로필" })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "복원" })[0]);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/restore"), expect.anything()));
  });

  it("문서 목록/생성/상세 저장/버전 적용과 AI 보류 안내가 동작한다", async () => {
    const fetchMock = setupFetchMock();

    renderAt("/documents");
    expect(await screen.findByRole("heading", { name: "문서 보관함" })).toBeInTheDocument();
    expect(await screen.findByText("프론트엔드 이력서")).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole("button", { name: "새 버전으로 저장" }));
    expect(await screen.findByText("v2 새 버전을 저장했습니다.")).toBeInTheDocument();
    cleanup();

    renderAt("/documents/document-1/versions");
    expect(await screen.findByRole("heading", { name: "프론트엔드 이력서" })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "복원" })[0]);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/restore"), expect.anything()));
  });
});
