import type {
  CreateProfilePayload,
  ProfileDetail,
  ProfileListItem,
  UpdateProfileMetaPayload
} from "../types/profile";
import { getRequiredAccessToken } from "./authSession";

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

function buildQuery(params: Record<string, boolean | undefined>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      searchParams.set(key, String(value));
    }
  }

  return searchParams.toString();
}

async function authorizedFetch(path: string, init?: RequestInit) {
  const accessToken = await getRequiredAccessToken();
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);

  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers
  });
}

async function getJson<T>(path: string, fallbackMessage: string): Promise<T> {
  const response = await authorizedFetch(path);

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
  const response = await authorizedFetch(path, {
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

export async function getProfiles(options: { includeArchived?: boolean } = {}): Promise<ProfileListItem[]> {
  const query = buildQuery({
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
    payload,
    "프로필 생성에 실패했습니다."
  );

  return result.data;
}

export async function getProfile(profileId: string): Promise<ProfileDetail> {
  const query = buildQuery({});
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
    payload,
    "프로필 수정에 실패했습니다."
  );

  return result.data;
}

export async function archiveProfile(profileId: string): Promise<ProfileDetail> {
  const query = buildQuery({});
  const response = await authorizedFetch(`/api/profiles/${profileId}?${query}`, {
    method: "DELETE"
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "프로필 보관에 실패했습니다."));
  }

  const result = (await response.json()) as ApiItemResponse<ProfileDetail>;
  return result.data;
}

export async function restoreProfile(profileId: string): Promise<ProfileDetail> {
  return updateProfileMeta(profileId, { isArchived: false });
}

export async function copyProfile(profileId: string): Promise<ProfileDetail> {
  const result = await sendJson<ApiItemResponse<ProfileDetail>>(
    `/api/profiles/${profileId}/copy`,
    "POST",
    {},
    "프로필 복사에 실패했습니다."
  );

  return result.data;
}

export async function deleteProfile(profileId: string): Promise<ProfileDetail> {
  const result = await sendJson<ApiItemResponse<ProfileDetail>>(
    `/api/profiles/${profileId}/delete`,
    "POST",
    {},
    "프로필 삭제에 실패했습니다."
  );

  return result.data;
}
