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
  status?: "active" | "closed" | "inactive" | "unknown";
  firstSeenAt?: string | null;
  lastSeenAt?: string | null;
  closedAt?: string | null;
  jobCategory?: string | null;
  careerStage?: string | null;
};

export type CollectedJobPosting = JobPosting & {
  companyInfo?: Record<string, unknown> | null;
  rawText?: string | null;
  rawJson?: Record<string, unknown> | null;
  crawlBatchId?: string | null;
  classifierMeta?: Record<string, unknown> | null;
};
