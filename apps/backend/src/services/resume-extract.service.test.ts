import { beforeEach, describe, expect, it, vi } from "vitest";
import { HttpError } from "../utils/http-error.js";
import { extractResumeFile } from "./resume-extract.service.js";

const mocks = vi.hoisted(() => ({
  extractRawText: vi.fn(),
  convertToHtml: vi.fn(),
  getText: vi.fn(),
  destroy: vi.fn()
}));

vi.mock("mammoth", () => ({
  default: {
    extractRawText: mocks.extractRawText,
    convertToHtml: mocks.convertToHtml
  }
}));

vi.mock("pdf-parse", () => ({
  PDFParse: vi.fn().mockImplementation(() => ({
    getText: mocks.getText,
    destroy: mocks.destroy
  }))
}));

describe("extractResumeFile", () => {
  beforeEach(() => {
    mocks.extractRawText.mockReset();
    mocks.convertToHtml.mockReset();
    mocks.getText.mockReset();
    mocks.destroy.mockReset();
    mocks.destroy.mockResolvedValue(undefined);
  });

  it("decodes txt file content from base64", async () => {
    const contentBase64 = Buffer.from("첨부 텍스트 파일 본문입니다.", "utf-8").toString("base64");

    const result = await extractResumeFile({
      fileName: "resume.txt",
      mimeType: "text/plain",
      contentBase64
    });

    expect(result.text).toBe("첨부 텍스트 파일 본문입니다.");
    expect(result.mode).toBe("mock");
  });

  it("extracts docx file content", async () => {
    mocks.extractRawText.mockResolvedValue({ value: "DOCX 포트폴리오 본문입니다." });
    mocks.convertToHtml.mockResolvedValue({ value: "<p>DOCX 포트폴리오 본문입니다.</p>" });

    const result = await extractResumeFile({
      fileName: "portfolio.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      contentBase64: Buffer.from("docx", "utf-8").toString("base64")
    });

    expect(result.text).toBe("DOCX 포트폴리오 본문입니다.");
    expect(result.previewHtml).toBe("<p>DOCX 포트폴리오 본문입니다.</p>");
    expect(result.mode).toBe("mock");
    expect(mocks.extractRawText).toHaveBeenCalledWith({ buffer: expect.any(Buffer) });
    expect(mocks.convertToHtml).toHaveBeenCalledWith({ buffer: expect.any(Buffer) });
  });

  it("extracts pdf text-layer content", async () => {
    mocks.getText.mockResolvedValue({ text: "PDF 포트폴리오 본문입니다." });

    const result = await extractResumeFile({
      fileName: "portfolio.pdf",
      mimeType: "application/pdf",
      contentBase64: Buffer.from("%PDF-1.4", "utf-8").toString("base64")
    });

    expect(result.text).toBe("PDF 포트폴리오 본문입니다.");
    expect(result.mode).toBe("mock");
    expect(mocks.getText).toHaveBeenCalled();
    expect(mocks.destroy).toHaveBeenCalled();
  });

  it("rejects legacy doc files", async () => {
    await expect(
      extractResumeFile({
        fileName: "resume.doc",
        mimeType: "application/msword",
        contentBase64: Buffer.from("doc", "utf-8").toString("base64")
      })
    ).rejects.toMatchObject({
      message: "DOC 파일은 지원하지 않습니다. DOCX/PDF/TXT/MD 파일로 업로드해 주세요.",
      statusCode: 400
    } satisfies Partial<HttpError>);
  });

  it("rejects image files", async () => {
    await expect(
      extractResumeFile({
        fileName: "profile.png",
        mimeType: "image/png",
        contentBase64: Buffer.from("png", "utf-8").toString("base64")
      })
    ).rejects.toMatchObject({
      message: "이미지 파일은 지원하지 않습니다. DOCX/PDF/TXT/MD 파일로 업로드해 주세요.",
      statusCode: 400
    } satisfies Partial<HttpError>);
  });
});
