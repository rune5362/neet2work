import type {
  CreateProfilePayload,
  ProfileDetail,
  ProfileListItem,
  UpdateProfileMetaPayload
} from "../types/profile";
import { getCandidateKey } from "../utils/candidateKey";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

type ApiListResponse<T> = {
  data: T[];
  count: number;
};

type ApiItemResponse<T> = {
  data: T;
};

async function readErrorMessage(response: Response, fallbackMessage: string) {
  const result = (await response.json().catch(() => null)) as { message?: string } | null;
  return result?.message ?? fallbackMessage;
}

function buildQuery(params: Record<string, string | boolean | undefined>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      searchParams.set(key, String(value));
    }
  }

  return searchParams.toString();
}

async function getJson<T>(path: string, fallbackMessage: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, fallbackMessage));
  }

  return response.json() as Promise<T>;
}

async function sendJson<T>(
  path: string,
  method: "POST" | "PATCH" | "DELETE",
  payload: unknown,
  fallbackMessage: string
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, fallbackMessage));
  }

  return response.json() as Promise<T>;
}

export async function getProfiles(
  candidateKey = getCandidateKey(),
  options: { includeArchived?: boolean } = {}
): Promise<ProfileListItem[]> {
  const query = buildQuery({
    candidateKey,
    includeArchived: options.includeArchived
  });
  const result = await getJson<ApiListResponse<ProfileListItem>>(
    `/api/profiles?${query}`,
    "프로필 목록을 불러오지 못했습니다."
  );

  return result.data;
}

export async function createProfile(payload: CreateProfilePayload): Promise<ProfileDetail> {
  const result = await sendJson<ApiItemResponse<ProfileDetail>>(
    "/api/profiles",
    "POST",
    {
      ...payload,
      candidateKey: payload.candidateKey ?? getCandidateKey()
    },
    "프로필 생성에 실패했습니다."
  );

  return result.data;
}

export async function getProfile(profileId: string, candidateKey = getCandidateKey()): Promise<ProfileDetail> {
  const query = buildQuery({ candidateKey });
  const result = await getJson<ApiItemResponse<ProfileDetail>>(
    `/api/profiles/${profileId}?${query}`,
    "프로필 정보를 불러오지 못했습니다."
  );

  return result.data;
}

export async function updateProfileMeta(
  profileId: string,
  payload: UpdateProfileMetaPayload
): Promise<ProfileDetail> {
  const result = await sendJson<ApiItemResponse<ProfileDetail>>(
    `/api/profiles/${profileId}`,
    "PATCH",
    {
      ...payload,
      candidateKey: payload.candidateKey ?? getCandidateKey()
    },
    "프로필 수정에 실패했습니다."
  );

  return result.data;
}

export async function archiveProfile(profileId: string, candidateKey = getCandidateKey()): Promise<ProfileDetail> {
  const query = buildQuery({ candidateKey });
  const response = await fetch(`${API_BASE_URL}/api/profiles/${profileId}?${query}`, {
    method: "DELETE"
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "프로필 보관에 실패했습니다."));
  }

  const result = (await response.json()) as ApiItemResponse<ProfileDetail>;
  return result.data;
}

export async function copyProfile(profileId: string, candidateKey = getCandidateKey()): Promise<ProfileDetail> {
  const result = await sendJson<ApiItemResponse<ProfileDetail>>(
    `/api/profiles/${profileId}/copy`,
    "POST",
    { candidateKey },
    "프로필 복사에 실패했습니다."
  );

  return result.data;
}
