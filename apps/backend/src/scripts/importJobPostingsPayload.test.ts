import { describe, expect, it } from "vitest";
import { parseJobPayload, toPrismaData } from "../../prisma/importJobPostings.js";
import { PUBLIC_JOB_SELECT } from "../services/job.service.js";

const baseJob = {
  id: "saramin-123",
  title: "서비스 기획 인턴",
  company: "샘플컴퍼니",
  location: "서울",
  careerLevel: "신입/경력",
  skills: ["Excel", "Communication"],
  description: "운영과 기획을 함께 수행합니다.",
  source: "saramin",
  sourceJobId: "123",
  sourceUrl: "https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=123"
};

describe("parseJobPayload", () => {
  it("keeps legacy array payloads importable", () => {
    const payload = parseJobPayload([baseJob]);

    expect(payload.jobs).toEqual([baseJob]);
    expect(payload.batch).toBeUndefined();
  });

  it("parses job_batch_v1 envelopes and carries lifecycle metadata", () => {
    const payload = parseJobPayload({
      schemaVersion: "job_batch_v1",
      source: "saramin",
      mode: "batch",
      crawlBatchId: "saramin-20260515T080000Z",
      collectedAt: "2026-05-15T08:00:00.000Z",
      sourceCap: 100,
      postings: [
        {
          ...baseJob,
          status: "active",
          jobCategory: "product_planning",
          careerStage: "entry",
          classifierMeta: { rule: "title-keyword" }
        }
      ],
      warnings: []
    });

    expect(payload.batch?.crawlBatchId).toBe("saramin-20260515T080000Z");
    expect(toPrismaData(payload.jobs[0]!, payload.batch)).toMatchObject({
      status: "active",
      lastSeenAt: new Date("2026-05-15T08:00:00.000Z"),
      jobCategory: "product_planning",
      careerStage: "entry",
      crawlBatchId: "saramin-20260515T080000Z",
      classifierMeta: { rule: "title-keyword" }
    });
  });

  it("rejects batch payloads when a posting source drifts", () => {
    expect(() =>
      parseJobPayload({
        schemaVersion: "job_batch_v1",
        source: "saramin",
        mode: "batch",
        crawlBatchId: "saramin-20260515T080000Z",
        collectedAt: "2026-05-15T08:00:00.000Z",
        postings: [{ ...baseJob, source: "jobkorea" }]
      })
    ).toThrow("배치 source와 공고 source가 다릅니다");
  });

  it("rejects payloads without stable sourceJobId", () => {
    expect(() => parseJobPayload([{ ...baseJob, sourceJobId: "" }])).toThrow(
      "중복 방지용 원본 ID가 비어 있습니다"
    );
  });
});

describe("PUBLIC_JOB_SELECT", () => {
  it("does not expose raw crawl payload fields through the public job list", () => {
    expect(PUBLIC_JOB_SELECT).not.toHaveProperty("rawText");
    expect(PUBLIC_JOB_SELECT).not.toHaveProperty("rawJson");
    expect(PUBLIC_JOB_SELECT).not.toHaveProperty("companyInfo");
    expect(PUBLIC_JOB_SELECT).not.toHaveProperty("classifierMeta");
    expect(PUBLIC_JOB_SELECT).not.toHaveProperty("crawlBatchId");
  });
});
