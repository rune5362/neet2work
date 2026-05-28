import type {
  ApplicationDocumentType,
  CreateDocumentPayload,
  CreateDocumentVersionPayload,
  DocumentDetail,
  DocumentListItem,
  DocumentVersion,
  UpdateDocumentMetaPayload
} from "../types/document";
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

export async function getDocuments(
  candidateKey = getCandidateKey(),
  filters: { documentType?: ApplicationDocumentType; includeArchived?: boolean } = {}
): Promise<DocumentListItem[]> {
  const query = buildQuery({
    candidateKey,
    documentType: filters.documentType,
    includeArchived: filters.includeArchived
  });
  const result = await getJson<ApiListResponse<DocumentListItem>>(
    `/api/documents?${query}`,
    "문서 목록을 불러오지 못했습니다."
  );

  return result.data;
}

export async function createDocument(payload: CreateDocumentPayload): Promise<DocumentDetail> {
  const result = await sendJson<ApiItemResponse<DocumentDetail>>(
    "/api/documents",
    "POST",
    {
      ...payload,
      candidateKey: payload.candidateKey ?? getCandidateKey()
    },
    "문서 생성에 실패했습니다."
  );

  return result.data;
}

export async function getDocument(documentId: string, candidateKey = getCandidateKey()): Promise<DocumentDetail> {
  const query = buildQuery({ candidateKey });
  const result = await getJson<ApiItemResponse<DocumentDetail>>(
    `/api/documents/${documentId}?${query}`,
    "문서를 불러오지 못했습니다."
  );

  return result.data;
}

export async function updateDocumentMeta(
  documentId: string,
  payload: UpdateDocumentMetaPayload
): Promise<DocumentDetail> {
  const result = await sendJson<ApiItemResponse<DocumentDetail>>(
    `/api/documents/${documentId}`,
    "PATCH",
    {
      ...payload,
      candidateKey: payload.candidateKey ?? getCandidateKey()
    },
    "문서 수정에 실패했습니다."
  );

  return result.data;
}

export async function archiveDocument(documentId: string, candidateKey = getCandidateKey()): Promise<DocumentDetail> {
  const query = buildQuery({ candidateKey });
  const response = await fetch(`${API_BASE_URL}/api/documents/${documentId}?${query}`, {
    method: "DELETE"
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "문서 보관에 실패했습니다."));
  }

  const result = (await response.json()) as ApiItemResponse<DocumentDetail>;
  return result.data;
}

export async function getDocumentVersions(
  documentId: string,
  candidateKey = getCandidateKey(),
  options: { includeArchived?: boolean } = {}
): Promise<DocumentVersion[]> {
  const query = buildQuery({
    candidateKey,
    includeArchived: options.includeArchived
  });
  const result = await getJson<ApiListResponse<DocumentVersion>>(
    `/api/documents/${documentId}/versions?${query}`,
    "문서 버전 목록을 불러오지 못했습니다."
  );

  return result.data;
}

export async function createDocumentVersion(
  documentId: string,
  payload: CreateDocumentVersionPayload
): Promise<DocumentVersion> {
  const result = await sendJson<ApiItemResponse<DocumentVersion>>(
    `/api/documents/${documentId}/versions`,
    "POST",
    {
      ...payload,
      candidateKey: payload.candidateKey ?? getCandidateKey()
    },
    "문서 버전 생성에 실패했습니다."
  );

  return result.data;
}

export async function getDocumentVersion(
  documentId: string,
  versionId: string,
  candidateKey = getCandidateKey()
): Promise<DocumentVersion> {
  const query = buildQuery({ candidateKey });
  const result = await getJson<ApiItemResponse<DocumentVersion>>(
    `/api/documents/${documentId}/versions/${versionId}?${query}`,
    "문서 버전을 불러오지 못했습니다."
  );

  return result.data;
}

export async function applyDocumentVersion(
  documentId: string,
  versionId: string,
  candidateKey = getCandidateKey()
): Promise<DocumentVersion> {
  const result = await sendJson<ApiItemResponse<DocumentVersion>>(
    `/api/documents/${documentId}/versions/${versionId}/apply`,
    "POST",
    { candidateKey },
    "문서 버전 적용에 실패했습니다."
  );

  return result.data;
}

export async function restoreDocumentVersion(
  documentId: string,
  versionId: string,
  candidateKey = getCandidateKey()
): Promise<DocumentVersion> {
  const result = await sendJson<ApiItemResponse<DocumentVersion>>(
    `/api/documents/${documentId}/versions/${versionId}/restore`,
    "POST",
    { candidateKey },
    "문서 버전 복원에 실패했습니다."
  );

  return result.data;
}

export async function archiveDocumentVersion(
  documentId: string,
  versionId: string,
  candidateKey = getCandidateKey()
): Promise<DocumentVersion> {
  const result = await sendJson<ApiItemResponse<DocumentVersion>>(
    `/api/documents/${documentId}/versions/${versionId}`,
    "DELETE",
    { candidateKey },
    "문서 버전 보관에 실패했습니다."
  );

  return result.data;
}
