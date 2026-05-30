import type { AddressInfo } from "node:net";
import express from "express";
import { afterEach, describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { draftWorkflowRouter } from "./draft-workflow.route.js";
import { HttpError } from "../utils/http-error.js";

function createDraftWorkflowTestApp() {
  const app = express();
  app.use(express.json({ limit: "2mb" }));
  app.use("/api/draft-workflow", draftWorkflowRouter);
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

async function request(path: string, init?: RequestInit): Promise<Response> {
  const app = createDraftWorkflowTestApp();
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

const validTarget = {
  company: "Backend Bridge",
  role: "백엔드 엔지니어",
  questionText: "협업 경험을 구체적으로 작성하세요.",
  charLimit: 800,
  charCountRule: "with_spaces",
  jobPostingText: "Node.js PostgreSQL REST API 경험자 우대",
  blindRecruitment: false
};

describe("draft workflow routes", () => {
  afterEach(() => {
    delete process.env.AI_PROVIDER_ORDER;
  });

  it("GET /providers includes fallback provider", async () => {
    const response = await request("/api/draft-workflow/providers");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.some((item: { providerId: string; online: boolean }) => item.providerId === "fallback" && item.online)).toBe(true);
  });

  it("POST /plan returns 400 when required target fields are missing", async () => {
    const response = await request("/api/draft-workflow/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        aiSelection: { mode: "auto" },
        target: { company: "", role: "", questionText: "짧음", charCountRule: "unknown", jobPostingText: "짧음", blindRecruitment: false },
        experienceInput: { manualExperienceText: "충분히 긴 경험 입력 텍스트입니다." }
      })
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toContain("요청 데이터 형식");
  });

  it("POST /plan returns 400 when experience input is empty", async () => {
    const response = await request("/api/draft-workflow/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        aiSelection: { mode: "auto" },
        target: validTarget,
        experienceInput: {}
      })
    });

    expect(response.status).toBe(400);
  });

  it("POST /plan returns plan envelope fields", async () => {
    const response = await request("/api/draft-workflow/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        aiSelection: { mode: "auto" },
        target: validTarget,
        experienceInput: {
          manualExperienceText: "Node.js와 PostgreSQL로 REST API 서버를 구축하고 운영했습니다."
        }
      })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.experienceCards.length).toBeGreaterThan(0);
    expect(body.data.fitAssessments.length).toBeGreaterThan(0);
    expect(body.data.answerStrategy).toBeTruthy();
    expect(body.data.outline.length).toBeGreaterThan(0);
    expect(body.data.aiMeta).toBeTruthy();
  });

  it("POST /draft returns draft envelope fields", async () => {
    const planResponse = await request("/api/draft-workflow/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        aiSelection: { mode: "auto" },
        target: validTarget,
        experienceInput: {
          manualExperienceText: "Node.js와 PostgreSQL로 REST API 서버를 구축하고 운영했습니다."
        }
      })
    });
    const planBody = await planResponse.json();

    const response = await request("/api/draft-workflow/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        aiSelection: { mode: "auto" },
        target: validTarget,
        experienceInput: {
          manualExperienceText: "Node.js와 PostgreSQL로 REST API 서버를 구축하고 운영했습니다."
        },
        plan: planBody.data
      })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.draftText.length).toBeGreaterThan(20);
    expect(body.data.evidenceMap.length).toBeGreaterThan(0);
    expect(body.data.reviewReport).toBeTruthy();
    expect(body.data.revisionOptions.length).toBeGreaterThan(0);
    expect(body.data.aiMeta).toBeTruthy();
  });
});
