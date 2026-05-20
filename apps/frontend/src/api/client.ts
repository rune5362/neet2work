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

export type JobsQuery = {
  q?: string;
  country?: string;
  location?: string;
  limit?: number;
};

function buildUrl(path: string, query?: Record<string, string | number | undefined>): string {
  const url = new URL(path, API_BASE_URL);

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && String(value).trim()) {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

export async function getJobs(query: JobsQuery = {}): Promise<JobPosting[]> {
  const response = await fetch(buildUrl("/api/jobs", query));

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
