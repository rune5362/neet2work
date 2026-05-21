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
  collectedAt?: string | null;
};

export type CollectedJobPosting = JobPosting & {
  status?: JobPostingStatus;
  firstSeenAt?: string | null;
  lastSeenAt?: string | null;
  closedAt?: string | null;
  jobCategory?: string | null;
  careerStage?: CareerStage | null;
  crawlBatchId?: string | null;
  classifierMeta?: Record<string, unknown> | null;
  companyInfo?: Record<string, unknown> | null;
  rawText?: string | null;
  rawJson?: Record<string, unknown> | null;
};

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
