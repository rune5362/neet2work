import type { ResumeExtractResult } from "../types/resume-extract.js";
import { HttpError } from "../utils/http-error.js";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

type ResumeExtractInput = {
  fileName: string;
  mimeType?: string;
  contentBase64: string;
};

const PDF_EXTENSIONS = new Set(["pdf"]);
const DOCX_EXTENSIONS = new Set(["docx"]);
const TEXT_EXTENSIONS = new Set(["txt", "md"]);

function getExtension(fileName: string) {
  const index = fileName.lastIndexOf(".");
  return index >= 0 ? fileName.slice(index + 1).toLowerCase() : "";
}

function decodeBase64Text(contentBase64: string) {
  return Buffer.from(contentBase64, "base64").toString("utf-8").trim();
}

function decodeBase64Buffer(contentBase64: string) {
  return Buffer.from(contentBase64, "base64");
}

function normalizeExtractedText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function assertExtractedText(fileName: string, text: string) {
  const normalized = normalizeExtractedText(text);
  if (!normalized) {
    throw new HttpError(`${fileName}에서 읽을 수 있는 텍스트를 찾지 못했습니다.`);
  }
  return normalized;
}

async function extractDocxText(input: ResumeExtractInput) {
  const result = await mammoth.extractRawText({ buffer: decodeBase64Buffer(input.contentBase64) });
  return assertExtractedText(input.fileName, result.value);
}

async function extractPdfText(input: ResumeExtractInput) {
  const parser = new PDFParse({ data: decodeBase64Buffer(input.contentBase64) });
  try {
    const result = await parser.getText();
    return assertExtractedText(input.fileName, result.text);
  } finally {
    await parser.destroy();
  }
}

export async function extractResumeFile(input: ResumeExtractInput): Promise<ResumeExtractResult> {
  const extension = getExtension(input.fileName);

  if (TEXT_EXTENSIONS.has(extension)) {
    return {
      fileName: input.fileName,
      text: assertExtractedText(input.fileName, decodeBase64Text(input.contentBase64)),
      mode: "mock"
    };
  }

  if (DOCX_EXTENSIONS.has(extension)) {
    return {
      fileName: input.fileName,
      text: await extractDocxText(input),
      mode: "mock"
    };
  }

  if (PDF_EXTENSIONS.has(extension)) {
    return {
      fileName: input.fileName,
      text: await extractPdfText(input),
      mode: "mock"
    };
  }

  if (extension === "doc") {
    throw new HttpError("DOC 파일은 지원하지 않습니다. DOCX/PDF/TXT/MD 파일로 업로드해 주세요.");
  }

  if (input.mimeType?.startsWith("image/")) {
    throw new HttpError("이미지 파일은 지원하지 않습니다. DOCX/PDF/TXT/MD 파일로 업로드해 주세요.");
  }

  throw new HttpError("지원하지 않는 파일 형식입니다. DOCX/PDF/TXT/MD 파일로 업로드해 주세요.");
}
