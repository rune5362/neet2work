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

/**
 * 지원 프로필의 구조화 원본 데이터입니다.
 *
 * @remarks
 * AI draft workflow는 이 구조와 `profileText`를 함께 받아 지원자 맥락을 구성합니다.
 */
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

/**
 * 프로필 목록과 상세 화면에서 공유하는 응답 항목입니다.
 */
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
  deletedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  deletedBy: string | null;
};

export type ProfileDetail = ProfileListItem;

/**
 * 지원 프로필 생성 요청 payload입니다.
 */
export type CreateProfilePayload = {
  title: string;
  targetRole?: string | null;
  targetCompany?: string | null;
  targetJobId?: string | null;
  isDefault?: boolean;
  profileJson: CandidateProfileJson;
};

/**
 * 지원 프로필 목표 정보, 기본 여부, 보호 상태 수정 요청 payload입니다.
 */
export type UpdateProfileMetaPayload = {
  title?: string;
  targetRole?: string | null;
  targetCompany?: string | null;
  targetJobId?: string | null;
  profileJson?: CandidateProfileJson;
  isDefault?: boolean;
  isArchived?: boolean;
};
