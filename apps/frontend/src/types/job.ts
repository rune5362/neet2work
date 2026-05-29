export type CareerStage = "entry" | "junior" | "senior";
export type EmploymentTypeCategory = "permanent" | "contract" | "intern" | "freelance";

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
};
