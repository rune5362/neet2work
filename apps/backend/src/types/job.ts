export type JobPostingStatus = "active" | "closed" | "inactive" | "unknown";

export type CareerStage =
  | "intern"
  | "entry"
  | "junior"
  | "career_unspecified"
  | "mid"
  | "senior"
  | "lead_manager"
  | "unknown";

export type PublicCareerStage = Extract<CareerStage, "entry" | "junior" | "senior">;

export type PublicEmploymentTypeCategory = "permanent" | "contract" | "intern" | "freelance";

/**
 * 채용공고 목록과 상세 화면에서 공유하는 공개 채용공고 항목입니다.
 */
export type JobPosting = {
  id: string;
  title: string;
  company: string;
  location: string;
  careerLevel: string;
  skills: string[];
  description: string;
  source?: string;
  sourceJobId?: string | null;
  sourceUrl: string;
  country?: string;
  language?: string;
  employmentType?: string | null;
  educationLevel?: string | null;
  salaryText?: string | null;
  deadlineText?: string | null;
  applyMethod?: string | null;
  careerStage?: CareerStage | null;
  employmentTypeCategory?: PublicEmploymentTypeCategory | null;
  postedAt?: string | null;
  collectedAt?: string | null;
  status?: JobPostingStatus;
  firstSeenAt?: string | null;
  lastSeenAt?: string | null;
  closedAt?: string | null;
  jobCategory?: string | null;
};

/**
 * crawler/import pipeline이 수집 직후 보존하는 원천 채용공고 항목입니다.
 */
export type CollectedJobPosting = JobPosting & {
  crawlBatchId?: string | null;
  classifierMeta?: Record<string, unknown> | null;
  companyInfo?: Record<string, unknown> | null;
  rawText?: string | null;
  rawJson?: Record<string, unknown> | null;
};

/**
 * 채용공고 수집 batch 실행 결과와 품질 지표입니다.
 */
export type CollectedJobBatch = {
  schemaVersion: "job_batch_v1";
  source: string;
  mode: "sample" | "batch";
  crawlBatchId: string;
  collectedAt: string;
  sourceCap?: number | null;
  postings: CollectedJobPosting[];
  warnings?: string[];
  errors?: string[];
};
