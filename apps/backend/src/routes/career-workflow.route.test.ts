import type { AddressInfo } from "node:net";
import express from "express";
import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { careerWorkflowRouter } from "./career-workflow.route.js";

function createCareerWorkflowTestApp() {
  const app = express();
  app.use(express.json({ limit: "2mb" }));
  app.use("/api/career-workflow", careerWorkflowRouter);
  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      if (err instanceof ZodError) {
        res.status(400).json({
          message: "요청 데이터 형식이 올바르지 않습니다.",
          issues: err.issues
        });
        return;
      }

      res.status(500).json({ message: "서버 오류가 발생했습니다." });
    }
  );
  return app;
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  const app = createCareerWorkflowTestApp();
  const server = app.listen(0);

  try {
    const address = server.address() as AddressInfo;
    return await fetch(`http://127.0.0.1:${address.port}${path}`, init);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
}

describe("career workflow routes", () => {
  it("POST /session routes blank templates into specified cover-letter workflow", async () => {
    const response = await request("/api/career-workflow/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target: {
          role: "백엔드 엔지니어",
          questionText: "지원 직무와 관련된 프로젝트 경험을 구체적으로 작성해 주세요. 700자 이내."
        },
        sources: [
          {
            sourceType: "blank_cover_letter_template",
            text: "지원 직무와 관련된 프로젝트 경험을 구체적으로 작성해 주세요. 700자 이내."
          },
          {
            sourceType: "experience_text",
            text: "지원자 관리 웹서비스 프로젝트에서 React와 Node.js API를 연동하고 PostgreSQL 관계 오류를 수정했습니다."
          }
        ]
      })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.documentType).toBe("specified_cover_letter");
    expect(body.data.templateAnalysis.questions[0].charLimit).toBe(700);
    expect(body.data.evidenceVault.some((item: { status: string }) => item.status === "user_provided")).toBe(true);
    expect(body.data.nextQuestion).toMatchObject({
      whyAsking: expect.any(String),
      targetSection: expect.any(String),
      canSkip: expect.any(Boolean)
    });
  });

  it("POST /session keeps GitHub facts as confirmation-required source material", async () => {
    const response = await request("/api/career-workflow/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sources: [
          {
            url: "https://github.com/example/applicant-tracker"
          }
        ]
      })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.sources[0]).toMatchObject({
      sourceType: "github_url",
      requiresUserConfirmation: true
    });
    expect(body.data.evidenceVault[0]).toMatchObject({
      usableForCoverLetter: false,
      confirmedByUser: true
    });
    expect(body.data.evidenceVault[0].claim).toContain("본인 기여");
  });

  it("POST /answer-question records the answer as user-provided evidence", async () => {
    const sessionResponse = await request("/api/career-workflow/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentType: "specified_cover_letter",
        sources: [
          {
            sourceType: "experience_text",
            text: "프로젝트에서 Node.js API를 구현했습니다."
          }
        ]
      })
    });
    const sessionBody = await sessionResponse.json();
    const nextQuestion = sessionBody.data.nextQuestion;

    const response = await request("/api/career-workflow/answer-question", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session: sessionBody.data,
        questionId: nextQuestion.questionId,
        answer: "백엔드 API 명세 정리와 지원자 상태 변경 로직 수정을 직접 맡았습니다."
      })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.acceptedEvidence).toMatchObject({
      status: "user_provided",
      confirmedByUser: true
    });
    expect(body.data.session.answeredQuestions).toHaveLength(1);
    expect(body.data.session.completion.progress).toBeGreaterThan(sessionBody.data.completion.progress);
  });

  it("POST /session returns 400 for invalid source URL", async () => {
    const response = await request("/api/career-workflow/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sources: [
          {
            url: "not-a-url"
          }
        ]
      })
    });

    expect(response.status).toBe(400);
  });
});
