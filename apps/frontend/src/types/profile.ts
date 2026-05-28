export type ProfileLinkSet = {
  github?: string;
  portfolio?: string;
  blog?: string;
};

export type ProfileProject = {
  name?: string;
  title?: string;
  role?: string;
  result?: string;
  impact?: string;
  achievements?: string[];
};

export type CandidateProfileJson = {
  basics: {
    name: string;
    email: string;
    phone: string;
    location: string;
    links: ProfileLinkSet;
  };
  desired: {
    roles: string[];
    industries: string[];
    locations: string[];
    employmentTypes: string[];
  };
  summary: {
    headline: string;
    description: string;
  };
  skills: string[];
  projects: ProfileProject[];
  experiences: unknown[];
  certifications: unknown[];
  education: unknown[];
  activities: unknown[];
  metadata: {
    lastUpdatedBy: "user" | "ai" | "system";
    lastAiUpdatedAt: string | null;
  };
};

export type ProfileListItem = {
  id: string;
  candidateKey: string;
  title: string;
  targetRole: string | null;
  targetCompany: string | null;
  targetJobId: string | null;
  name: string | null;
  email: string | null;
  desiredRoles: string[];
  skills: string[];
  currentVersionId: string | null;
  currentVersionNo: number | null;
  isDefault: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProfileVersion = {
  id: string;
  profileId: string;
  candidateKey: string;
  versionNo: number;
  title: string | null;
  memo: string | null;
  profileText: string;
  profileJson: CandidateProfileJson;
  schemaVersion: number;
  source: "user" | "ai" | "system";
  status: "draft" | "active" | "archived";
  parentVersionId: string | null;
  changeSummary: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProfileDetail = ProfileListItem & {
  currentVersion: ProfileVersion | null;
};

export type CreateProfilePayload = {
  candidateKey?: string;
  title: string;
  targetRole?: string | null;
  targetCompany?: string | null;
  targetJobId?: string | null;
  isDefault?: boolean;
  profileJson: CandidateProfileJson;
  versionTitle?: string | null;
  memo?: string | null;
};

export type UpdateProfileMetaPayload = {
  candidateKey?: string;
  title?: string;
  targetRole?: string | null;
  targetCompany?: string | null;
  targetJobId?: string | null;
  isDefault?: boolean;
  isArchived?: boolean;
};

export type CreateProfileVersionPayload = {
  candidateKey?: string;
  profileJson: CandidateProfileJson;
  title?: string | null;
  memo?: string | null;
  source?: "user" | "ai" | "system";
  status?: "draft" | "active" | "archived";
  changeSummary?: string | null;
  makeCurrent?: boolean;
};
