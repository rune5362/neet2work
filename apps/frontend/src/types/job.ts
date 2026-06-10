export type CareerStage =
  | "intern"
  | "entry"
  | "junior"
  | "career_unspecified"
  | "mid"
  | "senior"
  | "lead_manager"
  | "unknown";

export type EmploymentTypeCategory = "permanent" | "contract" | "intern" | "freelance";

export type JobPostingStatus = "active" | "closed" | "inactive" | "unknown";

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
  employmentTypeCategory?: EmploymentTypeCategory | null;
  postedAt?: string | null;
  collectedAt?: string | null;
  status?: JobPostingStatus;
  firstSeenAt?: string | null;
  lastSeenAt?: string | null;
  closedAt?: string | null;
  jobCategory?: string | null;
};
