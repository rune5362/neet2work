import type {
  ApplicationSetItem,
  CreateApplicationSetPayload,
  UpdateApplicationSetPayload
} from "../types/applicationSet";
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
  method: "POST" | "PATCH",
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

export async function getDocumentSets(
  candidateKey = getCandidateKey(),
  options: { includeArchived?: boolean } = {}
): Promise<ApplicationSetItem[]> {
  const query = buildQuery({
    candidateKey,
    includeArchived: options.includeArchived
  });
  const result = await getJson<ApiListResponse<ApplicationSetItem>>(
    `/api/document-sets?${query}`,
    "문서 묶음 목록을 불러오지 못했습니다."
  );

  return result.data;
}

export async function createDocumentSet(payload: CreateApplicationSetPayload): Promise<ApplicationSetItem> {
  const result = await sendJson<ApiItemResponse<ApplicationSetItem>>(
    "/api/document-sets",
    "POST",
    {
      ...payload,
      candidateKey: payload.candidateKey ?? getCandidateKey()
    },
    "문서 묶음 생성에 실패했습니다."
  );

  return result.data;
}

export async function getDocumentSet(setId: string, candidateKey = getCandidateKey()): Promise<ApplicationSetItem> {
  const query = buildQuery({ candidateKey });
  const result = await getJson<ApiItemResponse<ApplicationSetItem>>(
    `/api/document-sets/${setId}?${query}`,
    "문서 묶음을 불러오지 못했습니다."
  );

  return result.data;
}

export async function updateDocumentSet(
  setId: string,
  payload: UpdateApplicationSetPayload
): Promise<ApplicationSetItem> {
  const result = await sendJson<ApiItemResponse<ApplicationSetItem>>(
    `/api/document-sets/${setId}`,
    "PATCH",
    {
      ...payload,
      candidateKey: payload.candidateKey ?? getCandidateKey()
    },
    "문서 묶음 수정에 실패했습니다."
  );

  return result.data;
}

export async function archiveDocumentSet(setId: string, candidateKey = getCandidateKey()): Promise<ApplicationSetItem> {
  const query = buildQuery({ candidateKey });
  const response = await fetch(`${API_BASE_URL}/api/document-sets/${setId}?${query}`, {
    method: "DELETE"
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "문서 묶음 보관에 실패했습니다."));
  }

  const result = (await response.json()) as ApiItemResponse<ApplicationSetItem>;
  return result.data;
}
