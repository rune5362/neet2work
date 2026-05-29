import { describe, expect, it } from "vitest";
import { HttpError } from "../utils/http-error.js";
import { extractResumeFile } from "./resume-extract.service.js";

describe("extractResumeFile", () => {
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

  it("rejects pdf files until real parsing is available", async () => {
    await expect(
      extractResumeFile({
        fileName: "resume.pdf",
        mimeType: "application/pdf",
        contentBase64: Buffer.from("%PDF-1.4", "utf-8").toString("base64")
      })
    ).rejects.toMatchObject({
      message: "PDF/DOC/DOCX 파일은 아직 본문 추출을 지원하지 않습니다.",
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
      message: "이미지 파일은 본문 추출 대상이 아닙니다.",
      statusCode: 400
    } satisfies Partial<HttpError>);
  });
});
