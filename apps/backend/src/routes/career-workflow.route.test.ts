import type { AddressInfo } from "node:net";
import express from "express";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { careerWorkflowRouter } from "./career-workflow.route.js";
import { issueAccessToken } from "../services/token.service.js";
import { HttpError } from "../utils/http-error.js";

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

      if (err instanceof HttpError) {
        res.status(err.statusCode).json({ message: err.message });
        return;
      }

      res.status(500).json({ message: "서버 오류가 발생했습니다." });
    }
  );
  return app;
}

function authHeaders() {
  const { accessToken } = issueAccessToken({
    sub: "route-test-user",
    email: "route-test@example.com",
    status: "ACTIVE"
  });
  return `Bearer ${accessToken}`;
}

function withAuth(init?: RequestInit) {
  const headers = new Headers(init?.headers);
  if (!headers.has("Authorization")) {
    headers.set("Authorization", authHeaders());
  }

  return {
    ...init,
    headers
  };
}

async function request(
  path: string,
  init?: RequestInit,
  options: { auth?: boolean } = {}
): Promise<Response> {
  const app = createCareerWorkflowTestApp();
  const server = app.listen(0);
  const requestInit = options.auth === false ? init : withAuth(init);

  try {
    const address = server.address() as AddressInfo;
    return await fetch(`http://127.0.0.1:${address.port}${path}`, requestInit);
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
  beforeEach(() => {
    process.env.AI_RATE_LIMIT_MAX_REQUESTS = "1000";
    process.env.JWT_SECRET = "route-test-secret-that-is-long-enough";
  });

  afterEach(() => {
    delete process.env.AI_RATE_LIMIT_MAX_REQUESTS;
    delete process.env.JWT_SECRET;
  });

  it("requires authentication for workflow execution", async () => {
    const response = await request("/api/career-workflow/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sources: [
          {
            sourceType: "experience_text",
            text: "프로젝트에서 Node.js API를 구현했습니다."
          }
        ]
      })
    }, { auth: false });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.message).toBe("인증이 필요합니다.");
  });

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

  it("POST /document-session returns document analyses, evidence vault, interview, and draft envelopes", async () => {
    const response = await request("/api/career-workflow/document-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "백엔드 개발자 직무로 첨부 양식에 맞춰 초안 작성해줘.",
        target: {
          role: "백엔드 개발자"
        },
        attachments: [
          {
            fileName: "cover-letter-template.txt",
            text: "문항: 지원 직무와 관련된 프로젝트 경험을 작성해 주세요. 700자 이내.\n작성 규칙: 근거 없는 수치는 쓰지 마세요."
          }
        ]
      })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.stages.map((stage: { label: string }) => stage.label)).toEqual([
      "자료 수집",
      "근거 분석",
      "부족 정보 질문",
      "문항별 초안"
    ]);
    expect(body.data.documentAnalyses[0]).toMatchObject({
      classification: "self_intro_template"
    });
    expect(body.data.evidenceVault[0]).toEqual(
      expect.objectContaining({
        sourceId: expect.any(String),
        sourceType: expect.any(String),
        fact: expect.any(String),
        confidence: expect.any(String),
        allowedInDraft: expect.any(Boolean),
        privacyRisk: expect.any(String),
        needsUserConfirmation: expect.any(Boolean)
      })
    );
    expect(body.data.interview.questions.length).toBeGreaterThan(0);
    expect(body.data.drafts[0]).toMatchObject({
      status: "drafted",
      draftText: expect.any(String),
      missingEvidence: expect.arrayContaining([expect.any(String)])
    });
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
