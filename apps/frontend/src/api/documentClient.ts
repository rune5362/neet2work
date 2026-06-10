import type {
  ApplicationDocumentType,
  CreateDocumentPayload,
  DocumentDetail,
  DocumentListItem,
  UpdateDocumentMetaPayload
} from "../types/document";
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

function buildQuery(params: Record<string, string | boolean | undefined>) {
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

/**
 * 로그인 사용자의 지원 문서 목록을 조회합니다.
 *
 * @param filters - 문서 유형과 보호된 문서 포함 여부입니다.
 */
export async function getDocuments(
  filters: { documentType?: ApplicationDocumentType; includeArchived?: boolean } = {}
): Promise<DocumentListItem[]> {
  const query = buildQuery({
    documentType: filters.documentType,
    includeArchived: filters.includeArchived
  });
  const result = await getJson<ApiListResponse<DocumentListItem>>(
    `/api/documents?${query}`,
    "문서 목록을 불러오지 못했습니다."
  );

  return result.data;
}

/**
 * 새 지원 문서를 생성합니다.
 */
export async function createDocument(payload: CreateDocumentPayload): Promise<DocumentDetail> {
  const result = await sendJson<ApiItemResponse<DocumentDetail>>(
    "/api/documents",
    "POST",
    payload,
    "문서 생성에 실패했습니다."
  );

  return result.data;
}

/**
 * 지원 문서 상세 정보를 조회합니다.
 */
export async function getDocument(documentId: string): Promise<DocumentDetail> {
  const query = buildQuery({});
  const result = await getJson<ApiItemResponse<DocumentDetail>>(
    `/api/documents/${documentId}?${query}`,
    "문서를 불러오지 못했습니다."
  );

  return result.data;
}

/**
 * 지원 문서의 제목, 연결 대상, 본문, 보호 상태를 수정합니다.
 */
export async function updateDocumentMeta(
  documentId: string,
  payload: UpdateDocumentMetaPayload
): Promise<DocumentDetail> {
  const result = await sendJson<ApiItemResponse<DocumentDetail>>(
    `/api/documents/${documentId}`,
    "PATCH",
    payload,
    "문서 수정에 실패했습니다."
  );

  return result.data;
}

/**
 * 지원 문서를 보호 상태로 전환해 기본 목록에서 숨깁니다.
 *
 * @remarks
 * 기존 archive 용어와 같은 backend lifecycle을 사용하지만, UI에서는 보호/해제 용어를 사용합니다.
 */
export async function protectDocument(documentId: string): Promise<DocumentDetail> {
  const query = buildQuery({});
  const response = await authorizedFetch(`/api/documents/${documentId}?${query}`, {
    method: "DELETE"
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "문서 보호에 실패했습니다."));
  }

  const result = (await response.json()) as ApiItemResponse<DocumentDetail>;
  return result.data;
}

/**
 * 보호 상태인 지원 문서를 다시 기본 목록에 노출합니다.
 */
export async function unprotectDocument(documentId: string): Promise<DocumentDetail> {
  return updateDocumentMeta(documentId, { isArchived: false });
}

export const archiveDocument = protectDocument;
export const restoreDocument = unprotectDocument;

/**
 * 기존 지원 문서를 복사해 새 문서로 생성합니다.
 */
export async function copyDocument(documentId: string): Promise<DocumentDetail> {
  const result = await sendJson<ApiItemResponse<DocumentDetail>>(
    `/api/documents/${documentId}/copy`,
    "POST",
    {},
    "문서 복사에 실패했습니다."
  );

  return result.data;
}

/**
 * 지원 문서를 삭제 lifecycle로 전환합니다.
 */
export async function deleteDocument(documentId: string): Promise<DocumentDetail> {
  const result = await sendJson<ApiItemResponse<DocumentDetail>>(
    `/api/documents/${documentId}/delete`,
    "POST",
    {},
    "문서 삭제에 실패했습니다."
  );

  return result.data;
}
