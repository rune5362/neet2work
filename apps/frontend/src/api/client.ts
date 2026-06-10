import type { AnalysisResult } from "../types/analysis";
import type {
  AiSelection,
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
import type {
  CareerDocumentWorkflowAnswerRequest,
  CareerDocumentWorkflowSession,
  CareerDocumentWorkflowSessionRequest
} from "../types/career-document-workflow";
import type { CareerStage, EmploymentTypeCategory, JobPosting } from "../types/job";

export type EmploymentTypeFilterValue = EmploymentTypeCategory | "unspecified";
export type SalaryVisibilityFilterValue = "disclosed" | "undisclosed";
export type DeadlineTypeFilterValue = "dated" | "rolling";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

/**
 * 채용공고 목록 화면의 검색, 필터, 페이지네이션 조건입니다.
 */
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

/**
 * 채용공고 필터 UI에 표시할 facet 집계입니다.
 */
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

/**
 * 이메일 기반 회원가입 요청 payload입니다.
 */
export type SignUpPayload = {
  email: string;
  password: string;
  name?: string;
  nickname?: string;
  profileImageUrl?: string;
};

/**
 * 이메일 기반 로그인 요청 payload입니다.
 */
export type LoginPayload = {
  email: string;
  password: string;
};

/**
 * 인증 API가 반환하는 현재 사용자 계정 정보입니다.
 */
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

/**
 * 로그인과 세션 갱신에서 공통으로 반환되는 token bundle입니다.
 */
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

function jsonHeaders(accessToken?: string) {
  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  return headers;
}

function authHeaders(accessToken: string) {
  const headers = new Headers();
  headers.set("Authorization", `Bearer ${accessToken}`);
  return headers;
}

/**
 * 공개 채용공고 목록을 조회합니다.
 *
 * @param query - 검색어, facet 필터, 페이지 조건입니다.
 * @returns 목록 데이터와 페이지 메타데이터입니다.
 */
export async function getJobs(query: JobListQuery = {}): Promise<ApiListResponse<JobPosting>> {
  const response = await fetch(buildApiUrl("/api/jobs", query));

  if (!response.ok) {
    throw new Error("채용공고 조회에 실패했습니다.");
  }

  return (await response.json()) as ApiListResponse<JobPosting>;
}

/**
 * 채용공고 목록 필터에 필요한 facet 집계를 조회합니다.
 */
export async function getJobFacets(): Promise<JobFacets> {
  const response = await fetch(buildApiUrl("/api/jobs/facets"));

  if (!response.ok) {
    throw new Error("채용공고 필터 조회에 실패했습니다.");
  }

  const result = (await response.json()) as ApiItemResponse<JobFacets>;
  return result.data;
}

/**
 * 채용공고 상세 정보를 조회합니다.
 *
 * @param id - backend가 발급한 채용공고 id입니다.
 */
export async function getJobById(id: string): Promise<JobPosting> {
  const response = await fetch(buildApiUrl(`/api/jobs/${encodeURIComponent(id)}`));

  if (!response.ok) {
    throw new Error("채용공고 상세 조회에 실패했습니다.");
  }

  const result = (await response.json()) as ApiItemResponse<JobPosting>;
  return result.data;
}

/**
 * 자기소개서 본문과 채용공고를 기준으로 AI 분석을 요청합니다.
 *
 * @param payload - 분석할 본문, 채용공고 id, 선택한 AI provider 정보입니다.
 * @param accessToken - 보호된 AI route 호출에 필요한 bearer token입니다.
 */
export async function analyzeResume(
  payload: {
    resumeText: string;
    jobId: string;
    aiSelection?: AiSelection;
  },
  accessToken: string
): Promise<AnalysisResult> {
  const response = await fetch(`${API_BASE_URL}/api/analyze`, {
    method: "POST",
    headers: jsonHeaders(accessToken),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("자기소개서 분석에 실패했습니다.");
  }

  const result = (await response.json()) as ApiItemResponse<AnalysisResult>;
  return result.data;
}

/**
 * 업로드한 이력서/문서 파일의 본문 텍스트 추출을 요청합니다.
 *
 * @param payload - 파일명, MIME type, base64 인코딩된 파일 내용입니다.
 * @param accessToken - 보호된 추출 route 호출에 필요한 bearer token입니다.
 */
export async function extractResumeFile(
  payload: {
    fileName: string;
    mimeType?: string;
    contentBase64: string;
  },
  accessToken: string
): Promise<{ fileName: string; text: string; previewHtml?: string; mode: "mock" | "ai" }> {
  const response = await fetch(`${API_BASE_URL}/api/resume/extract`, {
    method: "POST",
    headers: jsonHeaders(accessToken),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("첨부 파일 본문 추출에 실패했습니다.");
  }

  const result = (await response.json()) as ApiItemResponse<{
    fileName: string;
    text: string;
    previewHtml?: string;
    mode: "mock" | "ai";
  }>;
  return result.data;
}

/**
 * draft workflow에서 선택 가능한 AI provider와 모델 상태를 조회합니다.
 */
export async function getDraftWorkflowProviders(): Promise<AiProviderStatus[]> {
  const response = await fetch(`${API_BASE_URL}/api/draft-workflow/providers`);

  if (!response.ok) {
    throw new Error("AI provider 상태 조회에 실패했습니다.");
  }

  const result = (await response.json()) as ApiItemResponse<AiProviderStatus[]>;
  return result.data;
}

/**
 * 자료 분석과 보완 질문 생성을 위한 커리어 workflow 세션을 생성합니다.
 *
 * @param payload - 목표 정보와 사용자가 제공한 자료입니다.
 * @param accessToken - 보호된 AI route 호출에 필요한 bearer token입니다.
 */
export async function createCareerWorkflowSession(
  payload: CareerWorkflowSessionRequest,
  accessToken: string
): Promise<CareerWorkflowSession> {
  const response = await fetch(`${API_BASE_URL}/api/career-workflow/session`, {
    method: "POST",
    headers: jsonHeaders(accessToken),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("커리어 문서 세션 분석에 실패했습니다.");
  }

  const result = (await response.json()) as ApiItemResponse<CareerWorkflowSession>;
  return result.data;
}

/**
 * 통합 커리어 문서 작성 세션을 생성하고 초기 초안 패키지를 받습니다.
 *
 * @param payload - 사용자 메시지, 첨부 자료, 목표 정보, 프로필 컨텍스트입니다.
 * @param accessToken - 보호된 AI route 호출에 필요한 bearer token입니다.
 */
export async function createCareerDocumentWorkflowSession(
  payload: CareerDocumentWorkflowSessionRequest,
  accessToken: string
): Promise<CareerDocumentWorkflowSession> {
  const response = await fetch(`${API_BASE_URL}/api/career-workflow/document-session`, {
    method: "POST",
    headers: jsonHeaders(accessToken),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("커리어 문서 작성 세션 생성에 실패했습니다.");
  }

  const result = (await response.json()) as ApiItemResponse<CareerDocumentWorkflowSession>;
  return result.data;
}

/**
 * 통합 커리어 문서 workflow의 보완 질문 답변을 제출합니다.
 *
 * @param payload - 기존 세션과 답변 대상 질문, 답변 내용입니다.
 * @param accessToken - 보호된 AI route 호출에 필요한 bearer token입니다.
 */
export async function answerCareerDocumentWorkflowQuestion(
  payload: CareerDocumentWorkflowAnswerRequest,
  accessToken: string
): Promise<CareerDocumentWorkflowSession> {
  const response = await fetch(`${API_BASE_URL}/api/career-workflow/document-session/answer`, {
    method: "POST",
    headers: jsonHeaders(accessToken),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("보완 답변 저장에 실패했습니다.");
  }

  const result = (await response.json()) as ApiItemResponse<CareerDocumentWorkflowSession>;
  return result.data;
}

/**
 * Codex bridge provider 사용을 위한 로그인 세션을 시작합니다.
 *
 * @param accessToken - 보호된 AI route 호출에 필요한 bearer token입니다.
 */
export async function startCodexBridgeLogin(accessToken: string): Promise<CodexBridgeLoginStatus> {
  const response = await fetch(`${API_BASE_URL}/api/draft-workflow/providers/codex/login`, {
    method: "POST",
    headers: authHeaders(accessToken)
  });

  if (!response.ok) {
    throw new Error("Codex 연결 시작에 실패했습니다.");
  }

  const result = (await response.json()) as ApiItemResponse<CodexBridgeLoginStatus>;
  return result.data;
}

/**
 * Codex bridge 로그인 세션의 현재 상태를 조회합니다.
 *
 * @param loginId - 로그인 시작 API가 반환한 세션 id입니다.
 * @param accessToken - 보호된 AI route 호출에 필요한 bearer token입니다.
 */
export async function getCodexBridgeLoginStatus(
  loginId: string,
  accessToken: string
): Promise<CodexBridgeLoginStatus> {
  const response = await fetch(`${API_BASE_URL}/api/draft-workflow/providers/codex/login/${encodeURIComponent(loginId)}`, {
    headers: authHeaders(accessToken)
  });

  if (!response.ok) {
    throw new Error("Codex 연결 상태 확인에 실패했습니다.");
  }

  const result = (await response.json()) as ApiItemResponse<CodexBridgeLoginStatus>;
  return result.data;
}

/**
 * 자기소개서 문항 분석과 작성 계획 생성을 요청합니다.
 *
 * @param payload - 목표 문항, 경험 입력, AI provider 선택값입니다.
 * @param accessToken - 보호된 AI route 호출에 필요한 bearer token입니다.
 */
export async function createDraftWorkflowPlan(
  payload: DraftWorkflowPlanRequest,
  accessToken: string
): Promise<DraftWorkflowPlan> {
  const response = await fetch(`${API_BASE_URL}/api/draft-workflow/plan`, {
    method: "POST",
    headers: jsonHeaders(accessToken),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("문항 분석 및 계획 생성에 실패했습니다.");
  }

  const result = (await response.json()) as ApiItemResponse<DraftWorkflowPlan>;
  return result.data;
}

/**
 * 확정된 계획과 보완 답변을 바탕으로 자기소개서 초안을 생성합니다.
 *
 * @param payload - 계획, 목표 문항, 경험 입력, 선택 outline입니다.
 * @param accessToken - 보호된 AI route 호출에 필요한 bearer token입니다.
 */
export async function createDraftWorkflowDraft(
  payload: DraftWorkflowDraftRequest,
  accessToken: string
): Promise<DraftWorkflowDraft> {
  const response = await fetch(`${API_BASE_URL}/api/draft-workflow/draft`, {
    method: "POST",
    headers: jsonHeaders(accessToken),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("초안 생성에 실패했습니다.");
  }

  const result = (await response.json()) as ApiItemResponse<DraftWorkflowDraft>;
  return result.data;
}

/**
 * 기존 자기소개서 초안을 사용자 수정 요청에 맞게 재작성합니다.
 *
 * @param payload - 원 계획, 기존 초안, 수정 지시입니다.
 * @param accessToken - 보호된 AI route 호출에 필요한 bearer token입니다.
 */
export async function reviseDraftWorkflowDraft(
  payload: DraftWorkflowReviseRequest,
  accessToken: string
): Promise<DraftWorkflowDraft> {
  const response = await fetch(`${API_BASE_URL}/api/draft-workflow/revise`, {
    method: "POST",
    headers: jsonHeaders(accessToken),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("초안 수정에 실패했습니다.");
  }

  const result = (await response.json()) as ApiItemResponse<DraftWorkflowDraft>;
  return result.data;
}

/**
 * 새 사용자 계정을 생성합니다.
 *
 * @param payload - 가입할 이메일, 비밀번호, 선택 프로필 정보입니다.
 */
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

/**
 * 이메일과 비밀번호로 로그인하고 access/refresh token을 받습니다.
 */
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

/**
 * refresh token으로 새 access token bundle을 발급받습니다.
 */
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

/**
 * refresh token을 폐기해 현재 세션을 로그아웃 처리합니다.
 */
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

/**
 * 현재 로그인 사용자의 계정 프로필 정보를 수정합니다.
 *
 * @param accessToken - 현재 사용자 확인에 필요한 bearer token입니다.
 * @param payload - 변경할 표시 이름, 닉네임, 프로필 이미지 URL입니다.
 */
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

/**
 * 현재 계정의 보안 요약 정보를 조회합니다.
 *
 * @param accessToken - 현재 사용자 확인에 필요한 bearer token입니다.
 */
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
