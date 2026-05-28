import type { AnalysisResult } from "../types/analysis";
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
