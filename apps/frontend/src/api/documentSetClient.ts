import type {
  ApplicationSetItem,
  CreateApplicationSetPayload,
  UpdateApplicationSetPayload
} from "../types/applicationSet";
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
  method: "POST" | "PATCH",
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

/**
 * 로그인 사용자의 지원 문서 묶음 목록을 조회합니다.
 */
export async function getDocumentSets(options: { includeArchived?: boolean } = {}): Promise<ApplicationSetItem[]> {
  const query = buildQuery({
    includeArchived: options.includeArchived
  });
  const result = await getJson<ApiListResponse<ApplicationSetItem>>(
    `/api/document-sets?${query}`,
    "문서 묶음 목록을 불러오지 못했습니다."
  );

  return result.data;
}

/**
 * 지원 문서 묶음을 새로 생성합니다.
 */
export async function createDocumentSet(payload: CreateApplicationSetPayload): Promise<ApplicationSetItem> {
  const result = await sendJson<ApiItemResponse<ApplicationSetItem>>(
    "/api/document-sets",
    "POST",
    payload,
    "문서 묶음 생성에 실패했습니다."
  );

  return result.data;
}

/**
 * 지원 문서 묶음 상세 정보를 조회합니다.
 */
export async function getDocumentSet(setId: string): Promise<ApplicationSetItem> {
  const query = buildQuery({});
  const result = await getJson<ApiItemResponse<ApplicationSetItem>>(
    `/api/document-sets/${setId}?${query}`,
    "문서 묶음을 불러오지 못했습니다."
  );

  return result.data;
}

/**
 * 지원 문서 묶음의 제목, 연결 문서, 보관 상태를 수정합니다.
 */
export async function updateDocumentSet(
  setId: string,
  payload: UpdateApplicationSetPayload
): Promise<ApplicationSetItem> {
  const result = await sendJson<ApiItemResponse<ApplicationSetItem>>(
    `/api/document-sets/${setId}`,
    "PATCH",
    payload,
    "문서 묶음 수정에 실패했습니다."
  );

  return result.data;
}

/**
 * 지원 문서 묶음을 보관 상태로 전환합니다.
 */
export async function archiveDocumentSet(setId: string): Promise<ApplicationSetItem> {
  const query = buildQuery({});
  const response = await authorizedFetch(`/api/document-sets/${setId}?${query}`, {
    method: "DELETE"
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "문서 묶음 보관에 실패했습니다."));
  }

  const result = (await response.json()) as ApiItemResponse<ApplicationSetItem>;
  return result.data;
}

/**
 * 보관 상태인 지원 문서 묶음을 다시 기본 목록에 노출합니다.
 */
export async function restoreDocumentSet(setId: string): Promise<ApplicationSetItem> {
  return updateDocumentSet(setId, { isArchived: false });
}
