import type { AnalysisResult } from "../types/analysis";
import type {
  AiProviderStatus,
  CodexBridgeLoginStatus,
  DraftWorkflowDraft,
  DraftWorkflowDraftRequest,
  DraftWorkflowPlan,
  DraftWorkflowPlanRequest,
  DraftWorkflowReviseRequest
} from "../types/draft-workflow";
import type {
  CareerWorkflowSession,
  CareerWorkflowSessionRequest
} from "../types/career-workflow";
import type { CareerStage, EmploymentTypeCategory, JobPosting } from "../types/job";

export type EmploymentTypeFilterValue = EmploymentTypeCategory | "unspecified";
export type SalaryVisibilityFilterValue = "disclosed" | "undisclosed";
export type DeadlineTypeFilterValue = "dated" | "rolling";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

export type JobListQuery = {
  q?: string;
  source?: string;
  country?: string;
  language?: string;
  careerStage?: CareerStage;
  employmentTypeCategory?: EmploymentTypeFilterValue;
  jobCategory?: string;
  region1?: string;
  region2?: string;
  region3?: string;
  skill?: string;
  salaryVisibility?: SalaryVisibilityFilterValue;
  deadlineType?: DeadlineTypeFilterValue;
  newOnly?: boolean;
  page?: number;
  limit?: number;
};

export type JobFacetOption = {
  value: string;
  count: number;
};

export type JobFacets = {
  sources: JobFacetOption[];
  countries: JobFacetOption[];
  languages: JobFacetOption[];
  total: number;
};

type ApiListResponse<T> = {
  data: T[];
  count: number;
  total: number;
  page: number;
  limit: number;
  availableSkills: string[];
};

type ApiItemResponse<T> = {
  data: T;
};

export type SignUpPayload = {
  email: string;
  password: string;
  name?: string;
  nickname?: string;
  profileImageUrl?: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  nickname: string | null;
  profileImageUrl: string | null;
  status: string;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AccountSecuritySummary = {
  previousLoginIpAddress: string | null;
};

export type LoginResult = {
  user: AuthUser;
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  refreshToken: string;
  refreshTokenExpiresIn: number;
};

function buildApiUrl(
  path: string,
  query: Record<string, string | number | boolean | undefined> = {}
) {
  const url = new URL(path, API_BASE_URL);

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

export async function getJobs(query: JobListQuery = {}): Promise<ApiListResponse<JobPosting>> {
  const response = await fetch(buildApiUrl("/api/jobs", query));

  if (!response.ok) {
    throw new Error("채용공고 조회에 실패했습니다.");
  }

  return (await response.json()) as ApiListResponse<JobPosting>;
}

export async function getJobFacets(): Promise<JobFacets> {
  const response = await fetch(buildApiUrl("/api/jobs/facets"));

  if (!response.ok) {
    throw new Error("채용공고 필터 조회에 실패했습니다.");
  }

  const result = (await response.json()) as ApiItemResponse<JobFacets>;
  return result.data;
}

export async function getJobById(id: string): Promise<JobPosting> {
  const response = await fetch(buildApiUrl(`/api/jobs/${encodeURIComponent(id)}`));

  if (!response.ok) {
    throw new Error("채용공고 상세 조회에 실패했습니다.");
  }

  const result = (await response.json()) as ApiItemResponse<JobPosting>;
  return result.data;
}

export async function analyzeResume(payload: {
  resumeText: string;
  jobId: string;
}): Promise<AnalysisResult> {
  const response = await fetch(`${API_BASE_URL}/api/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("자기소개서 분석에 실패했습니다.");
  }

  const result = (await response.json()) as ApiItemResponse<AnalysisResult>;
  return result.data;
}

export async function extractResumeFile(payload: {
  fileName: string;
  mimeType?: string;
  contentBase64: string;
}): Promise<{ fileName: string; text: string; mode: "mock" | "ai" }> {
  const response = await fetch(`${API_BASE_URL}/api/resume/extract`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("첨부 파일 본문 추출에 실패했습니다.");
  }

  const result = (await response.json()) as ApiItemResponse<{
    fileName: string;
    text: string;
    mode: "mock" | "ai";
  }>;
  return result.data;
}

export async function getDraftWorkflowProviders(): Promise<AiProviderStatus[]> {
  const response = await fetch(`${API_BASE_URL}/api/draft-workflow/providers`);

  if (!response.ok) {
    throw new Error("AI provider 상태 조회에 실패했습니다.");
  }

  const result = (await response.json()) as ApiItemResponse<AiProviderStatus[]>;
  return result.data;
}

export async function createCareerWorkflowSession(
  payload: CareerWorkflowSessionRequest
): Promise<CareerWorkflowSession> {
  const response = await fetch(`${API_BASE_URL}/api/career-workflow/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("커리어 문서 세션 분석에 실패했습니다.");
  }

  const result = (await response.json()) as ApiItemResponse<CareerWorkflowSession>;
  return result.data;
}

export async function startCodexBridgeLogin(): Promise<CodexBridgeLoginStatus> {
  const response = await fetch(`${API_BASE_URL}/api/draft-workflow/providers/codex/login`, {
    method: "POST"
  });

  if (!response.ok) {
    throw new Error("Codex 연결 시작에 실패했습니다.");
  }

  const result = (await response.json()) as ApiItemResponse<CodexBridgeLoginStatus>;
  return result.data;
}

export async function getCodexBridgeLoginStatus(loginId: string): Promise<CodexBridgeLoginStatus> {
  const response = await fetch(`${API_BASE_URL}/api/draft-workflow/providers/codex/login/${encodeURIComponent(loginId)}`);

  if (!response.ok) {
    throw new Error("Codex 연결 상태 확인에 실패했습니다.");
  }

  const result = (await response.json()) as ApiItemResponse<CodexBridgeLoginStatus>;
  return result.data;
}

export async function createDraftWorkflowPlan(
  payload: DraftWorkflowPlanRequest
): Promise<DraftWorkflowPlan> {
  const response = await fetch(`${API_BASE_URL}/api/draft-workflow/plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("문항 분석 및 계획 생성에 실패했습니다.");
  }

  const result = (await response.json()) as ApiItemResponse<DraftWorkflowPlan>;
  return result.data;
}

export async function createDraftWorkflowDraft(
  payload: DraftWorkflowDraftRequest
): Promise<DraftWorkflowDraft> {
  const response = await fetch(`${API_BASE_URL}/api/draft-workflow/draft`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("초안 생성에 실패했습니다.");
  }

  const result = (await response.json()) as ApiItemResponse<DraftWorkflowDraft>;
  return result.data;
}

export async function reviseDraftWorkflowDraft(
  payload: DraftWorkflowReviseRequest
): Promise<DraftWorkflowDraft> {
  const response = await fetch(`${API_BASE_URL}/api/draft-workflow/revise`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("초안 수정에 실패했습니다.");
  }

  const result = (await response.json()) as ApiItemResponse<DraftWorkflowDraft>;
  return result.data;
}

export async function signUp(payload: SignUpPayload): Promise<AuthUser> {
  const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const fallbackMessage = "회원가입에 실패했습니다.";
    const result = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(result?.message ?? fallbackMessage);
  }

  const result = (await response.json()) as ApiItemResponse<AuthUser>;
  return result.data;
}

export async function login(payload: LoginPayload): Promise<LoginResult> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const fallbackMessage = "로그인에 실패했습니다.";
    const result = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(result?.message ?? fallbackMessage);
  }

  const result = (await response.json()) as ApiItemResponse<LoginResult>;
  return result.data;
}

export async function refreshSession(refreshToken: string): Promise<LoginResult> {
  const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ refreshToken })
  });

  if (!response.ok) {
    const fallbackMessage = "세션 갱신에 실패했습니다.";
    const result = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(result?.message ?? fallbackMessage);
  }

  const result = (await response.json()) as ApiItemResponse<LoginResult>;
  return result.data;
}

export async function logout(refreshToken: string): Promise<{ revoked: boolean }> {
  const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ refreshToken })
  });

  if (!response.ok) {
    const fallbackMessage = "로그아웃에 실패했습니다.";
    const result = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(result?.message ?? fallbackMessage);
  }

  const result = (await response.json()) as ApiItemResponse<{ revoked: boolean }>;
  return result.data;
}

export async function updateProfile(
  accessToken: string,
  payload: Partial<Pick<AuthUser, "name" | "nickname" | "profileImageUrl">>
): Promise<AuthUser> {
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const fallbackMessage = "프로필 수정에 실패했습니다.";
    const result = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(result?.message ?? fallbackMessage);
  }

  const result = (await response.json()) as ApiItemResponse<AuthUser>;
  return result.data;
}

export async function getAccountSecuritySummary(accessToken: string): Promise<AccountSecuritySummary> {
  const response = await fetch(`${API_BASE_URL}/api/auth/me/security`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const fallbackMessage = "계정 보안 정보를 불러오지 못했습니다.";
    const result = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(result?.message ?? fallbackMessage);
  }

  const result = (await response.json()) as ApiItemResponse<AccountSecuritySummary>;
  return result.data;
}
