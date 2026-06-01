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
  profileText: string;
  profileJson: CandidateProfileJson | null;
  schemaVersion: number;
  source: "user" | "ai" | "system" | string;
  isDefault: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProfileDetail = ProfileListItem;

export type CreateProfilePayload = {
  title: string;
  targetRole?: string | null;
  targetCompany?: string | null;
  targetJobId?: string | null;
  isDefault?: boolean;
  profileJson: CandidateProfileJson;
};

export type UpdateProfileMetaPayload = {
  title?: string;
  targetRole?: string | null;
  targetCompany?: string | null;
  targetJobId?: string | null;
  profileJson?: CandidateProfileJson;
  isDefault?: boolean;
  isArchived?: boolean;
};
