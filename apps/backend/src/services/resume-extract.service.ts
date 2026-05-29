import type { ResumeExtractResult } from "../types/resume-extract.js";
import { HttpError } from "../utils/http-error.js";

type ResumeExtractInput = {
  fileName: string;
  mimeType?: string;
  contentBase64: string;
};

const DOCUMENT_EXTENSIONS = new Set(["pdf", "doc", "docx"]);
const TEXT_EXTENSIONS = new Set(["txt", "md"]);

function getExtension(fileName: string) {
  const index = fileName.lastIndexOf(".");
  return index >= 0 ? fileName.slice(index + 1).toLowerCase() : "";
}

function decodeBase64Text(contentBase64: string) {
  return Buffer.from(contentBase64, "base64").toString("utf-8").trim();
}

export async function extractResumeFile(input: ResumeExtractInput): Promise<ResumeExtractResult> {
  const extension = getExtension(input.fileName);

  if (TEXT_EXTENSIONS.has(extension)) {
    const text = decodeBase64Text(input.contentBase64);
    if (text.length < 1) {
      throw new HttpError("텍스트 파일 내용이 비어 있습니다.");
    }

    return {
      fileName: input.fileName,
      text,
      mode: "mock"
    };
  }

  if (DOCUMENT_EXTENSIONS.has(extension)) {
    throw new HttpError("PDF/DOC/DOCX 파일은 아직 본문 추출을 지원하지 않습니다.");
  }

  if (input.mimeType?.startsWith("image/")) {
    throw new HttpError("이미지 파일은 본문 추출 대상이 아닙니다.");
  }

  throw new HttpError("지원하지 않는 파일 형식입니다.");
}
