import type { AnalysisResult } from "../types/analysis";
import type { JobPosting } from "../types/job";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

type ApiListResponse<T> = {
  data: T[];
  count: number;
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

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  nickname: string | null;
  profileImageUrl: string | null;
  status: string;
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function getJobs(): Promise<JobPosting[]> {
  const response = await fetch(`${API_BASE_URL}/api/jobs`);

  if (!response.ok) {
    throw new Error("채용공고 조회에 실패했습니다.");
  }

  const result = (await response.json()) as ApiListResponse<JobPosting>;
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
