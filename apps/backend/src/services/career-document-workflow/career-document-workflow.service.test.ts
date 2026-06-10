import { describe, expect, it, vi } from "vitest";
import type { AiExecutionMeta, AiProvider, AiSelection } from "../../types/ai-routing.js";
import { CareerDocumentWorkflowService } from "./career-document-workflow.service.js";
import { AiRouter } from "../ai/ai-router.js";
import { HardcodedFallbackProvider } from "../ai/hardcoded-fallback.provider.js";
import { documentAnalysisService } from "./document-analysis.service.js";
import { draftGenerationService } from "./draft-generation.service.js";
import { evidenceVaultService } from "./evidence-vault.service.js";
import { gapInterviewService } from "./gap-interview.service.js";
import { GithubAnalysisService } from "./github-analysis.service.js";
import { PortfolioAnalysisService } from "./portfolio-analysis.service.js";

function jsonResponse(body: unknown, ok = true, status = ok ? 200 : 500, headers: Record<string, string> = {}) {
  const lowerHeaders = Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));

  return Promise.resolve({
    ok,
    status,
    headers: {
      get: (name: string) => lowerHeaders[name.toLowerCase()] ?? null
    },
    json: async () => body
  } as Response);
}

const testDocumentFormatting = {
  encoding: "UTF-8" as const,
  fontFamily: "Malgun Gothic" as const,
  fontDisplayName: "맑은 고딕" as const,
  lineSpacing: "normal" as const,
  normalizeWhitespace: true as const,
  forbidMojibake: true as const
};

function createService(fetchMock: ReturnType<typeof vi.fn>, router = createFallbackOnlyRouter()) {
  return new CareerDocumentWorkflowService(
    documentAnalysisService,
    new GithubAnalysisService(fetchMock),
    new PortfolioAnalysisService(vi.fn()),
    evidenceVaultService,
    gapInterviewService,
    draftGenerationService,
    router
  );
}

function createFallbackOnlyRouter() {
  return new AiRouter([new HardcodedFallbackProvider()]);
}

function createCodexDraftRouter(draftText: string) {
  return createCodexDraftDataRouter({
    mode: "ai" as const,
    state: "REVIEW_COMPLETED" as const,
    draftText,
    charCount: {
      withSpaces: draftText.length,
      withoutSpaces: draftText.replace(/\s/g, "").length,
      limit: 700
    },
    evidenceMap: [],
    documentFormatting: testDocumentFormatting,
    reviewReport: {
      scores: {
        promptFit: 90,
        jobFit: 88,
        specificity: 87,
        evidenceSafety: 92,
        koreanReadability: 89,
        aiLikenessRisk: 20,
        blindRisk: 0,
        interviewDefensibility: 86
      },
      issues: [],
      likelyInterviewQuestions: [],
      sensitiveWarnings: []
    },
    revisionOptions: []
  });
}

function createCodexDraftDataRouter(data: unknown) {
  const execute = vi.fn(async () => ({
    data,
    modelId: "codex-test-model",
    latencyMs: 1
  }));
  const provider: AiProvider = {
    id: "codex_bridge",
    label: "Codex Test",
    getStatus: async () => ({
      providerId: "codex_bridge",
      label: "Codex Test",
      online: true,
      configured: true,
      quotaExceeded: false,
      models: [{ modelId: "codex-test-model", label: "Codex Test", online: true, quotaExceeded: false }]
    }),
    execute
  };

  return {
    router: new AiRouter([provider, new HardcodedFallbackProvider()]),
    execute
  };
}

function createCodexQuestionRouter(questionText: string) {
  const aiMeta: AiExecutionMeta = {
    providerId: "codex_bridge",
    modelId: "codex-test-model",
    routingMode: "manual",
    usedFallback: false
  };
  const execute = vi.fn(async () => ({
    data: {
      mode: "ai" as const,
      state: "GAP_INTERVIEWING" as const,
      aiMeta,
      questionRubric: {
        intent: "지원 직무 프로젝트 경험을 검증하기 위한 부족 정보 확인",
        requiredEvidence: ["project_name"],
        mustAvoid: ["근거 없는 성과 단정"],
        blindRules: []
      },
      experienceCards: [],
      fitAssessments: [],
      answerStrategy: {
        mainClaim: "프로젝트 이름과 목적을 먼저 확인해야 합니다.",
        narrativePattern: "STAR" as const,
        primaryExperienceId: "gap-question-evidence",
        questionBudget: 700,
        neededQuestions: [
          {
            questionId: "project-name-check",
            slot: "project_name",
            priority: 1,
            question: questionText
          }
        ]
      },
      materialStore: {
        requirements: [],
        referenceRules: [],
        profile: {
          coreStrengths: [],
          tone: "",
          privateConstraints: []
        },
        experiences: [],
        sectionPlan: [],
        outputRules: testDocumentFormatting
      },
      outline: []
    },
    modelId: "codex-test-model",
    latencyMs: 1
  }));
  const provider: AiProvider = {
    id: "codex_bridge",
    label: "Codex Test",
    getStatus: async () => ({
      providerId: "codex_bridge",
      label: "Codex Test",
      online: true,
      configured: true,
      quotaExceeded: false,
      models: [{ modelId: "codex-test-model", label: "Codex Test", online: true, quotaExceeded: false }]
    }),
    execute
  };

  return {
    router: new AiRouter([provider, new HardcodedFallbackProvider()]),
    execute
  };
}

describe("career document workflow service", () => {
  it("extracts template requirements and uses fetched GitHub facts instead of the bare URL", async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url.includes("/languages")) {
        return jsonResponse({ TypeScript: 1200, JavaScript: 400 });
      }

      if (url.includes("/readme")) {
        return jsonResponse({
          encoding: "base64",
          content: Buffer.from("Applicant tracker API with resume status automation.", "utf8").toString("base64")
        });
      }

      return jsonResponse({
        full_name: "example/applicant-tracker",
        description: "지원자 상태를 관리하는 ATS API",
        language: "TypeScript",
        updated_at: "2026-06-01T00:00:00Z"
      });
    });
    const service = createService(fetchMock);

    const session = await service.createSession({
      message: "백엔드 개발자 직무로 https://github.com/example/applicant-tracker 보고 첨부 양식에 맞춰 초안 작성해줘.",
      target: { role: "백엔드 개발자" },
      attachments: [
        {
          fileName: "self-intro-template.txt",
          text: "1. 지원 직무와 관련된 프로젝트 경험을 구체적으로 작성해 주세요. 700자 이내.\n작성 규칙: 두괄식으로 작성하고 근거 없는 수치는 쓰지 마세요."
        }
      ]
    });

    expect(session.documentAnalyses[0]).toMatchObject({
      classification: "self_intro_template"
    });
    expect(session.documentAnalyses[0].template?.questions[0]).toMatchObject({
      charLimit: 700,
      charCountRule: "unknown"
    });
    expect(session.githubAnalyses[0]).toMatchObject({
      status: "fetched",
      repo: "applicant-tracker"
    });
    expect(session.evidenceVault).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceType: "github_readme",
          confidence: "medium",
          allowedInDraft: true
        })
      ])
    );
    expect(session.evidenceVault.some((item) => item.fact.includes("https://github.com/example/applicant-tracker"))).toBe(false);
    expect(session.state).toBe("INTERVIEW_REQUIRED");
    expect(session.interview.questions.some((question) => question.slot === "user_role")).toBe(true);
    expect(session.completion).toMatchObject({
      status: "provisional"
    });
    expect(session.drafts[0]).toMatchObject({
      status: "needs_more_evidence",
      draftText: expect.any(String),
      usedEvidenceFacts: expect.arrayContaining([
        expect.stringContaining("Applicant tracker API")
      ])
    });
    expect(session.drafts[0].draftText).not.toContain("https://github.com/example/applicant-tracker");
  });

  it("inspects GitHub repository tree and manifest files to infer tech stack beyond README text", async () => {
    const packageJson = {
      dependencies: {
        "@prisma/client": "latest",
        express: "latest",
        pg: "latest",
        react: "latest",
        zod: "latest"
      },
      devDependencies: {
        "@vitejs/plugin-react": "latest",
        playwright: "latest",
        prisma: "latest",
        typescript: "latest",
        vite: "latest",
        vitest: "latest"
      }
    };
    const fetchMock = vi.fn((url: string) => {
      if (url.includes("/languages")) {
        return jsonResponse({ TypeScript: 2400, JavaScript: 600 });
      }

      if (url.includes("/readme")) {
        return jsonResponse({
          encoding: "base64",
          content: Buffer.from("짧은 프로젝트 소개만 있는 README입니다.", "utf8").toString("base64")
        });
      }

      if (url.includes("/git/trees/main")) {
        return jsonResponse({
          tree: [
            { path: "package.json", type: "blob" },
            { path: "vite.config.ts", type: "blob" },
            { path: "prisma/schema.prisma", type: "blob" },
            { path: "Dockerfile", type: "blob" },
            { path: ".github/workflows/test.yml", type: "blob" },
            { path: "src/server.ts", type: "blob" },
            { path: "src/App.tsx", type: "blob" },
            { path: "src/db/schema.sql", type: "blob" }
          ]
        });
      }

      if (url.includes("/contents/package.json")) {
        return jsonResponse({
          encoding: "base64",
          content: Buffer.from(JSON.stringify(packageJson), "utf8").toString("base64"),
          size: 1024
        });
      }

      if (url.includes("/contents/prisma/schema.prisma")) {
        return jsonResponse({
          encoding: "base64",
          content: Buffer.from('datasource db { provider = "postgresql" url = env("DATABASE_URL") }', "utf8").toString("base64"),
          size: 128
        });
      }

      if (url.includes("/contents/Dockerfile")) {
        return jsonResponse({
          encoding: "base64",
          content: Buffer.from("FROM node:22-alpine", "utf8").toString("base64"),
          size: 64
        });
      }

      if (url.includes("/contents/vite.config.ts")) {
        return jsonResponse({
          encoding: "base64",
          content: Buffer.from("import react from '@vitejs/plugin-react';", "utf8").toString("base64"),
          size: 64
        });
      }

      return jsonResponse({
        full_name: "example/fullstack-career-app",
        description: "커리어 분석 풀스택 앱",
        language: "TypeScript",
        updated_at: "2026-06-01T00:00:00Z",
        default_branch: "main"
      });
    });
    const service = createService(fetchMock);

    const session = await service.createSession({
      message: "백엔드 개발자 직무로 https://github.com/example/fullstack-career-app 보고 첨부 양식에 맞춰 초안 작성해줘.",
      target: { role: "백엔드 개발자" },
      attachments: [
        {
          fileName: "template.txt",
          text: "문항: 지원 직무와 관련된 프로젝트 경험을 작성해 주세요."
        }
      ]
    });
    const githubFacts = session.githubAnalyses[0].facts.map((fact) => fact.fact).join("\n");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/git/trees/main?recursive=1"),
      expect.any(Object)
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/contents/package.json?ref=main"),
      expect.any(Object)
    );
    expect(githubFacts).toContain("감지 기술스택");
    expect(githubFacts).toContain("React");
    expect(githubFacts).toContain("Vite");
    expect(githubFacts).toContain("Express");
    expect(githubFacts).toContain("Prisma");
    expect(githubFacts).toContain("PostgreSQL");
    expect(githubFacts).toContain("Docker");
    expect(githubFacts).toContain("GitHub Actions");
    expect(githubFacts).toContain("기술스택 근거 파일");
    expect(githubFacts).toContain("주요 소스 구성");
    expect(session.evidenceVault).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceType: "github_repo_metadata",
          fact: expect.stringContaining("감지 기술스택")
        })
      ])
    );
    expect(session.drafts[0]).toMatchObject({
      status: "needs_more_evidence",
      draftText: expect.any(String),
      usedEvidenceFacts: expect.arrayContaining([
        expect.stringContaining("감지 기술스택")
      ]),
      missingEvidence: expect.arrayContaining(["본인 역할"])
    });
    expect(session.interview.questions.length).toBeGreaterThan(0);
    expect(session.completion.status).toBe("provisional");
  });

  it("strips Korean suffix words from GitHub profile URLs and deep-reads recent repositories", async () => {
    const packageJson = {
      dependencies: {
        express: "latest",
        react: "latest"
      },
      devDependencies: {
        "@vitejs/plugin-react": "latest",
        typescript: "latest",
        vite: "latest",
        vitest: "latest"
      }
    };
    const fetchMock = vi.fn((url: string) => {
      if (url.includes("/users/r2gul4r/repos")) {
        return jsonResponse([
          {
            name: "neet2work",
            full_name: "r2gul4r/neet2work",
            description: "AI 자소서 분석 커리어 앱",
            language: "TypeScript",
            updated_at: "2026-06-06T00:00:00Z",
            default_branch: "main"
          }
        ]);
      }

      if (url.includes("/users/r2gul4r")) {
        return jsonResponse({
          login: "r2gul4r",
          bio: "풀스택 개발자",
          public_repos: 1
        });
      }

      if (url.includes("/repos/r2gul4r/neet2work/languages")) {
        return jsonResponse({ TypeScript: 2400, JavaScript: 500 });
      }

      if (url.includes("/repos/r2gul4r/neet2work/readme")) {
        return jsonResponse({
          encoding: "base64",
          content: Buffer.from("README에는 프로젝트 개요만 짧게 적혀 있습니다.", "utf8").toString("base64")
        });
      }

      if (url.includes("/repos/r2gul4r/neet2work/git/trees/main")) {
        return jsonResponse({
          tree: [
            { path: "package.json", type: "blob" },
            { path: "vite.config.ts", type: "blob" },
            { path: "src/server.ts", type: "blob" },
            { path: "src/App.tsx", type: "blob" }
          ]
        });
      }

      if (url.includes("/repos/r2gul4r/neet2work/contents/package.json")) {
        return jsonResponse({
          encoding: "base64",
          content: Buffer.from(JSON.stringify(packageJson), "utf8").toString("base64"),
          size: 1024
        });
      }

      if (url.includes("/repos/r2gul4r/neet2work/contents/vite.config.ts")) {
        return jsonResponse({
          encoding: "base64",
          content: Buffer.from("import react from '@vitejs/plugin-react';", "utf8").toString("base64"),
          size: 64
        });
      }

      return jsonResponse({});
    });
    const github = new GithubAnalysisService(fetchMock);

    const [analysis] = await github.analyzeFromText("https://github.com/r2gul4r보고 분석해서 작성해줘");
    const githubFacts = analysis.facts.map((fact) => fact.fact).join("\n");

    expect(analysis).toMatchObject({
      owner: "r2gul4r",
      status: "fetched"
    });
    expect(analysis.url).toBe("https://github.com/r2gul4r");
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining("r2gul4r%EB%A5%BC"), expect.any(Object));
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining("r2gul4r를"), expect.any(Object));
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining("r2gul4r%EB%B3%B4%EA%B3%A0"), expect.any(Object));
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining("r2gul4r보고"), expect.any(Object));
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/repos/r2gul4r/neet2work/git/trees/main?recursive=1"),
      expect.any(Object)
    );
    expect(githubFacts).toContain("감지 기술스택");
    expect(githubFacts).toContain("React");
    expect(githubFacts).toContain("Vite");
    expect(githubFacts).toContain("Express");
    expect(githubFacts).toContain("Vitest");
  });

  it("selects GitHub profile repositories by career context instead of newest-first order", async () => {
    const backendPackageJson = {
      dependencies: {
        "@prisma/client": "latest",
        express: "latest",
        pg: "latest"
      },
      devDependencies: {
        prisma: "latest",
        typescript: "latest",
        vitest: "latest"
      }
    };
    const fetchMock = vi.fn((url: string) => {
      if (url.includes("/users/candidate/repos")) {
        return jsonResponse([
          {
            name: "personal-site",
            full_name: "candidate/personal-site",
            description: "Static portfolio landing page",
            language: "HTML",
            updated_at: "2026-06-07T00:00:00Z",
            pushed_at: "2026-06-07T00:00:00Z",
            default_branch: "main"
          },
          {
            name: "photo-gallery",
            full_name: "candidate/photo-gallery",
            description: "Image gallery UI",
            language: "JavaScript",
            updated_at: "2026-06-06T00:00:00Z",
            pushed_at: "2026-06-06T00:00:00Z",
            default_branch: "main"
          },
          {
            name: "applicant-api",
            full_name: "candidate/applicant-api",
            description: "Node.js REST API for applicant status workflow with PostgreSQL",
            language: "TypeScript",
            topics: ["backend", "api", "postgresql"],
            updated_at: "2024-01-01T00:00:00Z",
            pushed_at: "2024-01-01T00:00:00Z",
            default_branch: "main"
          },
          {
            name: "inventory-backend",
            full_name: "candidate/inventory-backend",
            description: "Express API server with Prisma database models",
            language: "TypeScript",
            topics: ["backend", "express"],
            updated_at: "2024-02-01T00:00:00Z",
            pushed_at: "2024-02-01T00:00:00Z",
            default_branch: "main"
          },
          {
            name: "batch-scheduler",
            full_name: "candidate/batch-scheduler",
            description: "PostgreSQL batch scheduler for API operations",
            language: "TypeScript",
            topics: ["postgresql", "scheduler"],
            updated_at: "2024-03-01T00:00:00Z",
            pushed_at: "2024-03-01T00:00:00Z",
            default_branch: "main"
          }
        ]);
      }

      if (url.includes("/users/candidate")) {
        return jsonResponse({
          login: "candidate",
          public_repos: 5
        });
      }

      if (url.includes("/languages")) {
        return jsonResponse({ TypeScript: 2400, SQL: 300 });
      }

      if (url.includes("/readme")) {
        return jsonResponse({
          encoding: "base64",
          content: Buffer.from("Backend API project README.", "utf8").toString("base64")
        });
      }

      if (url.includes("/git/trees/main")) {
        return jsonResponse({
          tree: [
            { path: "package.json", type: "blob" },
            { path: "prisma/schema.prisma", type: "blob" },
            { path: "src/server.ts", type: "blob" }
          ]
        });
      }

      if (url.includes("/contents/package.json")) {
        return jsonResponse({
          encoding: "base64",
          content: Buffer.from(JSON.stringify(backendPackageJson), "utf8").toString("base64"),
          size: 1024
        });
      }

      if (url.includes("/contents/prisma/schema.prisma")) {
        return jsonResponse({
          encoding: "base64",
          content: Buffer.from('datasource db { provider = "postgresql" url = env("DATABASE_URL") }', "utf8").toString("base64"),
          size: 128
        });
      }

      return jsonResponse({});
    });
    const service = createService(fetchMock);

    const session = await service.createSession({
      message: "https://github.com/candidate 프로필을 보고 자소서에 맞게 작성해줘.",
      target: {
        role: "백엔드 개발자",
        jobPostingText: "Node.js REST API와 PostgreSQL 운영 경험을 우대합니다.",
        questionText: "지원 직무와 관련된 프로젝트 경험을 구체적으로 작성해 주세요."
      },
      attachments: [
        {
          fileName: "technical-resume.md",
          text: "기술 이력서: Express API와 PostgreSQL 상태 이력 테이블을 구현했습니다."
        }
      ]
    });
    const calls = fetchMock.mock.calls.map(([url]) => String(url));
    const repositoryOrder = session.githubAnalyses[0].repositories.map((repository) => repository.fullName);
    const githubFacts = session.githubAnalyses[0].facts.map((fact) => fact.fact).join("\n");

    expect(repositoryOrder.slice(0, 3)).toEqual([
      "candidate/applicant-api",
      "candidate/inventory-backend",
      "candidate/batch-scheduler"
    ]);
    expect(calls.some((url) => url.includes("/repos/candidate/personal-site/git/trees"))).toBe(false);
    expect(calls.some((url) => url.includes("/repos/candidate/applicant-api/git/trees/main?recursive=1"))).toBe(true);
    expect(calls.some((url) => url.includes("/repos/candidate/inventory-backend/git/trees/main?recursive=1"))).toBe(true);
    expect(calls.some((url) => url.includes("/repos/candidate/batch-scheduler/git/trees/main?recursive=1"))).toBe(true);
    expect(githubFacts).toContain("지원 맥락 관련도");
    expect(githubFacts).toContain("candidate/applicant-api");
    expect(githubFacts).toContain("감지 기술스택");
    expect(githubFacts).toContain("PostgreSQL");
  });

  it("caches GitHub profile reads across repeated analyses to protect shared server quota", async () => {
    const packageJson = {
      dependencies: {
        express: "latest"
      },
      devDependencies: {
        typescript: "latest"
      }
    };
    const fetchMock = vi.fn((url: string) => {
      if (url.includes("/users/cache-user/repos")) {
        return jsonResponse([
          {
            name: "backend-api",
            full_name: "cache-user/backend-api",
            description: "Express REST API server",
            language: "TypeScript",
            topics: ["backend", "api"],
            updated_at: "2026-06-01T00:00:00Z",
            pushed_at: "2026-06-01T00:00:00Z",
            default_branch: "main"
          }
        ]);
      }

      if (url.includes("/users/cache-user")) {
        return jsonResponse({
          login: "cache-user",
          public_repos: 1
        });
      }

      if (url.includes("/repos/cache-user/backend-api/languages")) {
        return jsonResponse({ TypeScript: 1000 });
      }

      if (url.includes("/repos/cache-user/backend-api/readme")) {
        return jsonResponse({
          encoding: "base64",
          content: Buffer.from("Backend API README", "utf8").toString("base64")
        });
      }

      if (url.includes("/repos/cache-user/backend-api/git/trees/main")) {
        return jsonResponse({
          tree: [
            { path: "package.json", type: "blob" },
            { path: "src/server.ts", type: "blob" }
          ]
        });
      }

      if (url.includes("/repos/cache-user/backend-api/contents/package.json")) {
        return jsonResponse({
          encoding: "base64",
          content: Buffer.from(JSON.stringify(packageJson), "utf8").toString("base64"),
          size: 256
        });
      }

      return jsonResponse({});
    });
    const github = new GithubAnalysisService(fetchMock);

    const [firstAnalysis] = await github.analyzeFromText(
      "백엔드 개발자 Node.js API https://github.com/cache-user 프로필 분석"
    );
    const firstCallCount = fetchMock.mock.calls.length;
    const [secondAnalysis] = await github.analyzeFromText(
      "백엔드 개발자 Node.js API https://github.com/cache-user 프로필 분석"
    );

    expect(firstAnalysis.status).toBe("fetched");
    expect(secondAnalysis.status).toBe("fetched");
    expect(firstCallCount).toBeGreaterThan(0);
    expect(fetchMock.mock.calls.length).toBe(firstCallCount);
    expect(secondAnalysis.repositories[0].fullName).toBe("cache-user/backend-api");
  });

  it("turns saved interview answers into high-confidence evidence and then drafts from allowed facts", async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url.includes("/languages")) {
        return jsonResponse({ TypeScript: 1200 });
      }
      if (url.includes("/readme")) {
        return jsonResponse({
          encoding: "base64",
          content: Buffer.from("지원자 관리 API. 상태 변경 자동화와 PostgreSQL 기반 이력 관리를 제공합니다.", "utf8").toString("base64")
        });
      }
      return jsonResponse({
        full_name: "example/applicant-tracker",
        description: "지원자 상태 관리 API",
        language: "TypeScript",
        updated_at: "2026-06-01T00:00:00Z"
      });
    });
    const service = createService(fetchMock);
    let session = await service.createSession({
      message: "백엔드 개발자 직무로 https://github.com/example/applicant-tracker 보고 작성해줘.",
      target: { role: "백엔드 개발자" },
      attachments: [
        {
          fileName: "template.txt",
          text: "문항: 지원 직무와 관련된 문제 해결 경험을 작성해 주세요. 800자 이내."
        }
      ]
    });

    for (let index = 0; index < 8 && session.interview.questions.length > 0; index += 1) {
      const question = session.interview.questions[0];
      session = await service.answerQuestion({
        session,
        questionId: question.questionId,
        answer: answerForSlot(question.slot)
      });
    }

    expect(session.state).toBe("DRAFT_READY");
    expect(session.completion).toMatchObject({
      status: "submission_ready",
      score: 100
    });
    expect(session.evidenceVault).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceType: "interview_answer",
          confidence: "high",
          allowedInDraft: true,
          needsUserConfirmation: false
        })
      ])
    );
    expect(session.drafts[0]).toMatchObject({
      status: "drafted",
      missingEvidence: []
    });
    expect(session.drafts[0].draftText).toContain("백엔드");
    expect(session.drafts[0].usedEvidenceFacts.length).toBeGreaterThan(0);
  });

  it("carries selected profile skills into document packages without using personal basics as draft evidence", async () => {
    const service = createService(vi.fn());

    const session = await service.createSession({
      message:
        "시연용 개발자 프로필을 기반으로 Neet2Work 문서함 연동 경험을 백엔드 개발자 자기소개서와 이력서로 정리해줘.",
      target: {
        role: "백엔드 개발자",
        questionText: "지원 직무와 관련된 프로젝트 경험을 작성해 주세요.",
        charLimit: 700,
        charCountRule: "with_spaces"
      },
      profileContexts: [
        {
          profileId: "profile-demo",
          title: "시연용 개발자 프로필",
          schemaVersion: 1,
          targetRole: "백엔드 개발자",
          targetCompany: null,
          desiredRoles: ["백엔드 개발자", "풀스택 개발자"],
          skills: ["TypeScript", "React", "Node.js", "Express", "Prisma", "PostgreSQL"],
          profileText: "문서함과 AI 자소서 분석 흐름을 연결한 시연용 개발자 프로필입니다.",
          profileJson: {
            basics: {
              name: "시연용 개발자",
              email: "demo@example.test",
              phone: "010-0000-0000",
              location: "Seoul",
              links: {
                github: "https://github.com/r2gul4r"
              }
            },
            desired: {
              roles: ["백엔드 개발자", "풀스택 개발자"],
              industries: [],
              locations: [],
              employmentTypes: []
            },
            summary: {
              headline: "AI 자소서 문서함 연동을 다루는 개발자",
              description: "React와 Express 기반 커리어 문서 워크플로우를 구현했습니다."
            },
            skills: ["TypeScript", "React", "Node.js", "Express", "Prisma", "PostgreSQL"],
            projects: [
              {
                name: "Neet2Work",
                role: "AI 자소서 페이지와 문서함 저장 JSON 연동 구현",
                result: "프로필 기술스택, 자기소개서, 이력서 저장 흐름을 연결"
              }
            ],
            experiences: [],
            certifications: [],
            education: [],
            activities: [],
            metadata: {
              lastUpdatedBy: "user",
              lastAiUpdatedAt: null
            }
          }
        }
      ]
    });
    const profileEvidence = session.evidenceVault.filter((item) => item.sourceType === "profile_context");
    const coverLetterPackage = session.documentPackages.find((item) => item.documentType === "cover_letter");
    const resumePackage = session.documentPackages.find((item) => item.documentType === "resume");

    expect(profileEvidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceId: "profile-demo",
          fact: expect.stringContaining("TypeScript"),
          targetSlots: expect.arrayContaining(["skills"])
        })
      ])
    );
    expect(session.evidenceVault.some((item) => item.fact.includes("demo@example.test"))).toBe(false);
    expect(session.evidenceVault.some((item) => item.fact.includes("010-0000-0000"))).toBe(false);
    expect(coverLetterPackage).toMatchObject({
      profileId: "profile-demo",
      documentType: "cover_letter",
      contentJson: {
        source: {
          workflow: "career-document-workflow"
        },
        profileSnapshot: {
          profileId: "profile-demo",
          skills: expect.arrayContaining(["TypeScript", "PostgreSQL"])
        }
      }
    });
    expect(coverLetterPackage?.content).toContain("TypeScript");
    expect(coverLetterPackage?.content).toContain("Neet2Work");
    expect(coverLetterPackage?.content).not.toContain("사용자 입력");
    expect(coverLetterPackage?.content).not.toContain("선택 프로필");
    expect(resumePackage).toMatchObject({
      profileId: "profile-demo",
      documentType: "resume"
    });
    expect(resumePackage?.content).toContain("[기술 스택]");
    expect(resumePackage?.content).toContain("기술 스택: TypeScript");
    expect(resumePackage?.content).toContain("Neet2Work");
    expect(resumePackage?.content).not.toContain("선택 프로필");
    expect(resumePackage?.content).not.toContain("GitHub 프로필");
    expect(resumePackage?.content).not.toContain("메타데이터");
    expect(resumePackage?.contentJson.profileSnapshot?.skills).toEqual(
      expect.arrayContaining(["TypeScript", "React", "Node.js", "Express", "Prisma", "PostgreSQL"])
    );
  });

  it("suggests verified GitHub skills for an empty selected profile and keeps resume content polished", async () => {
    const packageJson = {
      dependencies: {
        express: "latest",
        react: "latest"
      },
      devDependencies: {
        "@vitejs/plugin-react": "latest",
        typescript: "latest",
        vite: "latest"
      }
    };
    const fetchMock = vi.fn((url: string) => {
      if (url.includes("/users/r2gul4r/repos")) {
        return jsonResponse([
          {
            name: "photoEditer",
            full_name: "r2gul4r/photoEditer",
            description: "Local photo correction tool for analyzing real photos and suggesting mood-based edits.",
            language: "TypeScript",
            updated_at: "2026-06-06T00:00:00Z",
            pushed_at: "2026-06-06T00:00:00Z",
            default_branch: "main"
          }
        ]);
      }

      if (url.includes("/users/r2gul4r")) {
        return jsonResponse({
          login: "r2gul4r",
          public_repos: 13
        });
      }

      if (url.includes("/repos/r2gul4r/photoEditer/languages")) {
        return jsonResponse({ TypeScript: 2400, JavaScript: 700, Python: 500, CSS: 200, HTML: 100 });
      }

      if (url.includes("/repos/r2gul4r/photoEditer/readme")) {
        return jsonResponse({
          encoding: "base64",
          content: Buffer.from("사진 분석과 분위기 기반 보정 제안 도구입니다.", "utf8").toString("base64")
        });
      }

      if (url.includes("/repos/r2gul4r/photoEditer/git/trees/main")) {
        return jsonResponse({
          tree: [
            { path: "package.json", type: "blob" },
            { path: "src/App.tsx", type: "blob" },
            { path: "vite.config.ts", type: "blob" }
          ]
        });
      }

      if (url.includes("/repos/r2gul4r/photoEditer/contents/package.json")) {
        return jsonResponse({
          encoding: "base64",
          content: Buffer.from(JSON.stringify(packageJson), "utf8").toString("base64"),
          size: 1024
        });
      }

      return jsonResponse({});
    });
    const service = createService(fetchMock);

    const session = await service.createSession({
      message: "https://github.com/r2gul4r 보고 풀스택 개발자 자소서와 이력서를 작성해줘.",
      target: {
        role: "풀스택 개발자",
        questionText: "지원 직무와 관련된 프로젝트 경험을 작성해 주세요."
      },
      profileContexts: [
        {
          profileId: "profile-empty-skills",
          title: "임시 프로필 - 기술스택 없음",
          schemaVersion: 1,
          targetRole: "풀스택 개발자",
          targetCompany: null,
          desiredRoles: ["풀스택 개발자", "백엔드 개발자"],
          skills: [],
          profileText: "지원 문서 흐름을 정리하는 개발자입니다.",
          profileJson: {
            basics: {
              name: "임시 지원자",
              email: "temp-demo@neet2work.local",
              phone: "010-1111-2222",
              location: "Seoul",
              links: {
                github: "https://github.com/r2gul4r"
              }
            },
            desired: {
              roles: ["풀스택 개발자", "백엔드 개발자"],
              industries: [],
              locations: [],
              employmentTypes: []
            },
            summary: {
              headline: "",
              description: "사용자 경험을 정리하고 지원 문서로 연결하는 서비스를 만들고 싶은 개발자입니다."
            },
            skills: [],
            projects: [
              {
                name: "Neet2Work",
                role: "지원 문서 작성 흐름을 정리하고 부족한 근거를 질문으로 확인하는 과정 설계",
                result: "가초안과 보완 질문을 통해 완성도를 높이는 흐름 검증"
              }
            ],
            experiences: [],
            certifications: [],
            education: [],
            activities: [],
            metadata: {
              lastUpdatedBy: "user",
              lastAiUpdatedAt: null
            }
          }
        }
      ]
    });
    const resumePackage = session.documentPackages.find((item) => item.documentType === "resume");
    const coverLetterPackage = session.documentPackages.find((item) => item.documentType === "cover_letter");

    expect(session.profileSkillSuggestions).toEqual([
      expect.objectContaining({
        profileId: "profile-empty-skills",
        skills: expect.arrayContaining(["TypeScript", "JavaScript", "React", "Vite", "Node.js", "Express", "Python"])
      })
    ]);
    expect(resumePackage?.content).toContain("[기술 스택]");
    expect(resumePackage?.content).toContain("GitHub 프로젝트: r2gul4r/photoEditer");
    expect(resumePackage?.content).not.toContain("public repository");
    expect(resumePackage?.content).not.toContain("메타데이터");
    expect(resumePackage?.content).not.toContain("우선 분석");
    expect(resumePackage?.content).not.toContain("사용 언어:");
    expect(coverLetterPackage?.content).not.toMatch(/했습니다\.을|CSS을|Tailwind CSS을/);
  });

  it("maps a saved answer back to the answered question slot even when answer text lacks slot keywords", async () => {
    const service = createService(vi.fn());
    const session = await service.createSession({
      message: "첨부한 양식에 맞춰 초안 작성해줘.",
      target: { role: "백엔드 개발자" },
      attachments: [
        {
          fileName: "template.txt",
          text: "문항: 지원 직무와 관련된 프로젝트 경험을 작성해 주세요."
        }
      ]
    });
    const userRoleQuestion = session.interview.questions.find((question) => question.slot === "user_role");

    expect(userRoleQuestion).toBeDefined();
    const answeredSession = await service.answerQuestion({
      session,
      questionId: userRoleQuestion?.questionId ?? "",
      answer: "API design, route implementation, tests"
    });
    const answerEvidence = answeredSession.evidenceVault.find(
      (item) => item.sourceType === "interview_answer" && item.fact.includes("API design")
    );

    expect(answerEvidence?.targetSlots).toContain("user_role");
    expect(answeredSession.interview.questions.some((question) => question.slot === "user_role")).toBe(false);
    expect(answeredSession.drafts[0].missingEvidence).not.toContain("본인 역할");
  });

  it("keeps asking for user-specific evidence after GitHub context and a broad role answer", async () => {
    const packageJson = {
      dependencies: {
        react: "latest"
      },
      devDependencies: {
        typescript: "latest",
        vite: "latest",
        vitest: "latest"
      }
    };
    const fetchMock = vi.fn((url: string) => {
      if (url.includes("/users/r2gul4r/repos")) {
        return jsonResponse([
          {
            name: "photoEditer",
            full_name: "r2gul4r/photoEditer",
            description: "Local photo correction tool for analyzing real photos and suggesting mood-based edits.",
            language: "TypeScript",
            updated_at: "2026-06-06T00:00:00Z",
            pushed_at: "2026-06-06T00:00:00Z",
            default_branch: "main"
          }
        ]);
      }

      if (url.includes("/users/r2gul4r")) {
        return jsonResponse({
          login: "r2gul4r",
          public_repos: 13
        });
      }

      if (url.includes("/repos/r2gul4r/photoEditer/languages")) {
        return jsonResponse({ TypeScript: 2400, JavaScript: 700, Python: 500 });
      }

      if (url.includes("/repos/r2gul4r/photoEditer/readme")) {
        return jsonResponse({
          encoding: "base64",
          content: Buffer.from("사진 분석과 분위기 기반 보정 제안 도구입니다.", "utf8").toString("base64")
        });
      }

      if (url.includes("/repos/r2gul4r/photoEditer/git/trees/main")) {
        return jsonResponse({
          tree: [
            { path: "package.json", type: "blob" },
            { path: "src/App.tsx", type: "blob" },
            { path: "backend/ai_preview_judge.py", type: "blob" },
            { path: "tests/test_recommendations.py", type: "blob" }
          ]
        });
      }

      if (url.includes("/repos/r2gul4r/photoEditer/contents/package.json")) {
        return jsonResponse({
          encoding: "base64",
          content: Buffer.from(JSON.stringify(packageJson), "utf8").toString("base64"),
          size: 1024
        });
      }

      return jsonResponse({});
    });
    const service = createService(fetchMock);
    const session = await service.createSession({
      message: "https://github.com/r2gul4r 분석해서 자소서 작성해줘.",
      target: {
        role: "파이썬 백엔드 개발자",
        jobPostingText: "파이썬(Python, AWS, OCR) 경력 개발자 채용",
        questionText: "지원 직무와 관련된 프로젝트 경험을 작성해 주세요."
      }
    });
    const userRoleQuestion = session.interview.questions.find((question) => question.slot === "user_role");

    expect(userRoleQuestion).toBeDefined();
    const answeredSession = await service.answerQuestion({
      session,
      questionId: userRoleQuestion?.questionId ?? "",
      answer: "전부 내가 했어."
    });
    const remainingSlots = answeredSession.interview.questions.map((question) => question.slot);

    expect(answeredSession.completion.status).toBe("provisional");
    expect(remainingSlots).toEqual(expect.arrayContaining(["actions", "technical_choice", "result"]));
    expect(answeredSession.drafts[0].missingEvidence).toEqual(
      expect.arrayContaining(["해결 과정", "기술 선택 이유", "성과와 피드백"])
    );
  });

  it("keeps unavailable GitHub URLs out of evidence and explains API rate limits", async () => {
    const fetchMock = vi.fn(() =>
      jsonResponse({ message: "rate limited" }, false, 403, {
        "x-ratelimit-remaining": "0",
        "x-ratelimit-reset": "1780812623"
      })
    );
    const service = createService(fetchMock);

    const session = await service.createSession({
      message: "https://github.com/example/private-ish 이 GitHub 보고 초안 작성해줘.",
      attachments: [
        {
          fileName: "template.txt",
          text: "문항: 프로젝트 경험을 구체적으로 작성해 주세요."
        }
      ]
    });

    expect(session.githubAnalyses[0]).toMatchObject({
      status: "unavailable",
      fallbackMessage: expect.stringContaining("GitHub API rate limit이 소진")
    });
    expect(session.evidenceVault.some((item) => item.sourceType.startsWith("github"))).toBe(false);
    expect(session.interview.questions[0]).toMatchObject({
      slot: "github_context",
      whyAsking: expect.stringContaining("GitHub API rate limit이 소진")
    });
    expect(session.missingEvidence.some((item) => item.includes("GITHUB_TOKEN"))).toBe(true);
  });

  it("uses the selected self-introduction format when no template is attached", async () => {
    const service = createService(vi.fn());

    const session = await service.createSession({
      message: "Node.js API 서버를 구현하고 PostgreSQL로 상태 이력 테이블을 설계했습니다.",
      target: {
        role: "백엔드 개발자",
        formatLabel: "지원동기",
        questionText: "지원 동기와 입사 후 기여 계획을 작성해 주세요.",
        charLimit: 700,
        charCountRule: "with_spaces"
      }
    });

    expect(session.drafts[0]).toMatchObject({
      questionText: "지원 동기와 입사 후 기여 계획을 작성해 주세요.",
      charLimit: 700
    });
    expect(session.interview.questions.every((question) => question.targetQuestionIds.includes("selected-format-q1"))).toBe(true);
  });

  it("defaults unspecified cover-letter length to a one-page target and stores a single answer without a question heading", async () => {
    const service = createService(vi.fn());
    let session = await service.createSession({
      message: "Neet2Work에서 AI 자기소개서 작성 흐름을 만들고 문서함 저장까지 연결했습니다.",
      target: {
        role: "풀스택 개발자",
        questionText: "지원 직무와 관련된 프로젝트 경험을 구체적으로 작성해 주세요.",
        charCountRule: "with_spaces"
      }
    });

    expect(session.drafts[0]).toMatchObject({
      questionText: "지원 직무와 관련된 프로젝트 경험을 구체적으로 작성해 주세요.",
      charLimit: 900
    });

    session = await answerUntilReady(service, session);
    const coverLetterPackage = session.documentPackages.find((item) => item.documentType === "cover_letter");

    expect(coverLetterPackage?.content).toBe(session.drafts[0].draftText);
    expect(coverLetterPackage?.content).not.toMatch(/^문항 1\./);
    expect(coverLetterPackage?.contentJson.sections[0]).toMatchObject({
      title: "지원 직무와 관련된 프로젝트 경험을 구체적으로 작성해 주세요."
    });
  });

  it("extracts the practical role-competency cover-letter template into clean section titles", async () => {
    const service = createService(vi.fn());
    const templateText = [
      "Self-introduction (자기소개서)",
      "1. 자기소개",
      "- 소제목을 작성하고, 첫 문장은 두괄식으로 자신을 표현하는 한 문장으로 시작해 주세요.",
      "- 강점, 가치관, 태도는 직접 체험한 경험과 근거로 뒷받침하고 타인과 비교하는 표현은 쓰지 마세요.",
      "- 220자 내외.",
      "",
      "2. 성장과정",
      "- 지원 분야에 관심을 가진 계기부터 기술을 익히기 위해 노력한 과정을 직무 관점으로 작성해 주세요.",
      "- 220자 내외.",
      "",
      "3. 성격소개",
      "- 장점과 단점을 함께 쓰되, 단점은 실제로 보완하려고 한 노력과 업무 상황에 적용할 수 있는 방식으로 작성해 주세요.",
      "- 180자 내외.",
      "",
      "4. 직무역량",
      "- 프로젝트 수행 경험을 중심으로 맡은 역할, 사용 기술, 문제 해결 행동, 결과를 작성해 주세요.",
      "- 320자 내외.",
      "",
      "5. 지원동기 및 포부",
      "- 자신의 목표를 회사나 직무의 방향성과 연결하고, 입사 후 기여할 구체적 행동을 작성해 주세요.",
      "- 260자 내외."
    ].join("\n");
    let session = await service.createSession({
      message: "Neet2Work 프로젝트로 실무형 자소서를 작성해줘.",
      target: {
        role: "풀스택 개발자",
        company: "지원 기업",
        formatLabel: "실무형/직무역량 중심 자소서 양식"
      },
      attachments: [
        {
          fileName: "실무형_직무역량_중심_자소서_양식.txt",
          text: templateText
        }
      ]
    });
    const questions = session.documentAnalyses[0].template?.questions ?? [];

    expect(questions.map((question) => question.text)).toEqual([
      "자기소개",
      "성장과정",
      "성격소개",
      "직무역량",
      "지원동기 및 포부"
    ]);
    expect(questions.map((question) => question.charLimit)).toEqual([220, 220, 180, 320, 260]);

    session = await answerUntilReady(service, session);
    const coverLetterPackage = session.documentPackages.find((item) => item.documentType === "cover_letter");

    expect(coverLetterPackage?.contentJson.sections).toHaveLength(5);
    expect(coverLetterPackage?.content).toContain("자기소개\n\n");
    expect(coverLetterPackage?.content).toContain("직무역량\n\n");
    expect(coverLetterPackage?.content).not.toContain("문항 1.");
  });

  it("extracts composite resume, self-intro, skills, and portfolio sections from one attached template", async () => {
    const questionRouter = createCodexQuestionRouter("포트폴리오 카드에 넣을 대표 프로젝트명과 본인 기여를 알려줘.");
    const service = createService(vi.fn(), questionRouter.router);
    const templateText = [
      "통합 입사지원서 양식",
      "[이력서]",
      "- 희망 직무, 경력 요약, 학력, 자격증을 표에 맞춰 작성해 주세요.",
      "",
      "[Self-introduction (자기소개서)]",
      "1. 자기소개",
      "- 소제목 1줄과 본문 3~5줄로 작성해 주세요.",
      "2. 성장과정",
      "- 지원 분야에 관심을 가진 계기를 작성해 주세요.",
      "3. 직무역량",
      "- 대표 프로젝트에서 맡은 역할, 기술 선택, 결과를 작성해 주세요.",
      "",
      "[기술스택]",
      "- Python, AWS, OCR 관련 보유 기술과 사용 근거를 작성해 주세요.",
      "",
      "[포트폴리오]",
      "- 프로젝트 카드마다 프로젝트명, 핵심 기능, 본인 기여, 링크를 작성해 주세요.",
      "",
      "공통 작성 규칙",
      "- 1페이지 목표는 글자를 빽빽하게 채우지 말고 표와 칸이 자연스럽게 차는 정도로 작성해 주세요.",
      "- 첨부 DOCX 표 레이아웃과 항목 순서를 우선해 주세요."
    ].join("\n");

    const session = await service.createSession({
      message: "첨부한 통합 양식에 맞춰 오토패스 지원 문서를 작성해줘.",
      target: {
        role: "파이썬(Python, AWS, OCR) 경력 개발자",
        company: "오토패스",
        formatLabel: "첨부 통합 입사지원서 양식"
      },
      attachments: [
        {
          fileName: "통합_입사지원서_양식.docx",
          mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          text: templateText
        }
      ],
      aiSelection: { mode: "manual", providerId: "codex_bridge" }
    });

    const analysis = session.documentAnalyses[0];
    const template = analysis.template;
    const sectionKinds = template?.sections.map((section) => section.kind) ?? [];
    const templateRulesText = [
      ...(template?.layoutRules ?? []),
      ...(template?.writingRules ?? [])
    ].join("\n");
    const planCall = questionRouter.execute.mock.calls.find((call) => call[0].operation === "plan");
    const planPayloadText = JSON.stringify(planCall?.[0].payload ?? {});

    expect(analysis.classification).toBe("self_intro_template");
    expect(sectionKinds).toEqual(expect.arrayContaining(["resume", "self_intro", "skills", "portfolio", "common_rules"]));
    expect(analysis.summary).toContain("감지 섹션");
    expect(templateRulesText).toContain("글자를 빽빽하게 채우는 것이 아니라");
    expect(templateRulesText).toContain("첨부 복합 양식 섹션");
    expect(session.evidenceVault).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceType: "self_intro_template",
          fact: expect.stringContaining("첨부 양식 섹션: 기술스택")
        }),
        expect.objectContaining({
          sourceType: "self_intro_template",
          fact: expect.stringContaining("첨부 양식 섹션: 포트폴리오")
        })
      ])
    );
    expect(planPayloadText).toContain("이력서, 자기소개서, 기술스택, 포트폴리오");
    expect(planPayloadText).toContain("시각적 밀도");
    expect(planPayloadText).toContain("portfolio");
  });

  it("keeps README project documents as reference material even when they mention self-intro workflow terms", async () => {
    const service = createService(vi.fn());

    const session = await service.createSession({
      message: "자소서 양식에 맞춰 작성해줘. README 두 개는 프로젝트 참고자료로 써줘.",
      target: { role: "백엔드 개발자" },
      attachments: [
        {
          fileName: "자소서 양식.txt",
          text: "문항: 지원 직무와 관련된 프로젝트 경험을 구체적으로 작성해 주세요. 800자 이내."
        },
        {
          fileName: "README.md",
          text:
            "# 일했음 청년(Neet2Work) 2026 final project\n" +
            "## 프로젝트 소개\n" +
            "생성형 AI 자기소개서 분석을 결합한 맞춤형 커리어 컨설팅 서비스입니다.\n" +
            "## 주요 기능\n" +
            "- 소크라테스식 보완 질문 기반 자기소개서 작성 워크플로우\n" +
            "- API provider 라우팅과 Mock-first 구조"
        },
        {
          fileName: "README.md",
          text:
            "<p align=\"right\">project docs</p>\n" +
            "## 기술 스택\n" +
            "React TypeScript Node.js Express PostgreSQL API DB workflow repository"
        }
      ]
    });
    const readmeAnalyses = session.documentAnalyses.filter((analysis) => analysis.fileName === "README.md");

    expect(session.documentAnalyses[0]).toMatchObject({ classification: "self_intro_template" });
    expect(readmeAnalyses).toHaveLength(2);
    expect(readmeAnalyses.every((analysis) => analysis.classification === "reference_material")).toBe(true);
    expect(readmeAnalyses.every((analysis) => !analysis.template)).toBe(true);
    expect(session.documentAnalyses.flatMap((analysis) => analysis.template?.questions ?? [])).toHaveLength(1);
    expect(
      session.evidenceVault.some(
        (item) => item.sourceType === "self_intro_template" && item.fact.includes("일했음 청년")
      )
    ).toBe(false);
    expect(
      session.evidenceVault.some(
        (item) => item.sourceType === "reference_material" && item.fact.includes("일했음 청년")
      )
    ).toBe(true);
  });

  it("extracts portfolio page skills into evidence", async () => {
    const portfolioFetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        text: async () =>
          "<html><head><title>ATS Portfolio</title></head><body>React TypeScript Node.js REST API applicant tracker project</body></html>"
      } as Response)
    );
    const service = new CareerDocumentWorkflowService(
      documentAnalysisService,
      new GithubAnalysisService(vi.fn()),
      new PortfolioAnalysisService(portfolioFetchMock),
      evidenceVaultService,
      gapInterviewService,
      draftGenerationService,
      createFallbackOnlyRouter()
    );

    const session = await service.createSession({
      message: "포트폴리오 https://portfolio.example.dev 내용을 보고 백엔드 개발자 자소서에 녹여줘.",
      target: {
        role: "백엔드 개발자",
        questionText: "지원 직무와 관련된 프로젝트 경험을 작성해 주세요."
      }
    });

    expect(session.portfolioAnalyses[0]).toMatchObject({
      status: "fetched",
      title: "ATS Portfolio",
      detectedSkills: expect.arrayContaining(["React", "TypeScript", "Node.js", "REST API"])
    });
    expect(session.evidenceVault).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceType: "portfolio_page",
          fact: expect.stringContaining("포트폴리오 기술스택"),
          allowedInDraft: true,
          needsUserConfirmation: false
        })
      ])
    );
  });

  it("[simulation 1] drafts from an attached blank template and fetched GitHub facts after gap answers", async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url.includes("/languages")) {
        return jsonResponse({ TypeScript: 1600, SQL: 300 });
      }
      if (url.includes("/readme")) {
        return jsonResponse({
          encoding: "base64",
          content: Buffer.from("지원자 상태 관리 API. PostgreSQL 상태 이력과 관리자 자동화를 제공합니다.", "utf8").toString("base64")
        });
      }
      return jsonResponse({
        full_name: "example/applicant-tracker",
        description: "지원자 상태 관리 백엔드",
        language: "TypeScript",
        updated_at: "2026-06-01T00:00:00Z"
      });
    });
    const service = createService(fetchMock);
    let session = await service.createSession({
      message: "백엔드 개발자 직무로 https://github.com/example/applicant-tracker 내용을 보고 첨부 양식에 맞춰 작성해줘.",
      target: {
        role: "백엔드 개발자",
        jobPostingText: "Node.js API, PostgreSQL, 운영 자동화 경험을 우대합니다.",
        writingStyle: "담백한 실무형"
      },
      attachments: [
        {
          fileName: "blank-cover-letter-template.txt",
          text: "문항: 지원 직무와 관련된 문제 해결 경험을 작성해 주세요. 700자 이내.\n작성 규칙: 두괄식으로 작성하고 근거 없는 수치는 쓰지 마세요."
        }
      ]
    });

    session = await answerUntilReady(service, session);

    expect(session.state).toBe("DRAFT_READY");
    expect(session.documentAnalyses[0].classification).toBe("self_intro_template");
    expect(session.githubAnalyses[0].status).toBe("fetched");
    expect(session.drafts[0].draftText).toBeTruthy();
    expect(session.drafts[0].draftText).not.toContain("https://github.com/example/applicant-tracker");
    expect(session.drafts[0].usedEvidenceFacts.join("\n")).toContain("TypeScript");
    expect(session.drafts[0].charCount?.withSpaces ?? 0).toBeLessThanOrEqual(700);
  });

  it("[simulation 2] folds a technical resume and portfolio page skills into the draft without copying raw URLs", async () => {
    const portfolioFetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        text: async () =>
          "<html><head><title>현장실습 매칭 포트폴리오</title></head><body>React TypeScript Node.js REST API PostgreSQL 기반 현장실습 매칭 서비스. 지원 상태 추적과 관리자 검수 화면을 구현했습니다.</body></html>"
      } as Response)
    );
    const service = new CareerDocumentWorkflowService(
      documentAnalysisService,
      new GithubAnalysisService(vi.fn()),
      new PortfolioAnalysisService(portfolioFetchMock),
      evidenceVaultService,
      gapInterviewService,
      draftGenerationService,
      createFallbackOnlyRouter()
    );
    let session = await service.createSession({
      message: "포트폴리오 https://portfolio.example.dev 내용을 분석해서 직무역량 자소서에 녹여줘.",
      target: {
        role: "풀스택 개발자",
        questionText: "지원 직무와 관련된 프로젝트 경험을 구체적으로 작성해 주세요.",
        charLimit: 800,
        formatLabel: "직무역량"
      },
      attachments: [
        {
          fileName: "technical-resume.md",
          text: "기술 이력서: React와 TypeScript로 화면을 만들고 Node.js REST API와 PostgreSQL 상태 이력 테이블을 직접 구현했습니다. 관리자 검수 시간을 줄이기 위해 상태 변경 로그를 자동화했습니다."
        }
      ]
    });

    session = await answerUntilReady(service, session);

    const allEvidence = session.evidenceVault.map((item) => item.fact).join("\n");
    expect(session.state).toBe("DRAFT_READY");
    expect(session.portfolioAnalyses[0]).toMatchObject({
      status: "fetched",
      detectedSkills: expect.arrayContaining(["React", "TypeScript", "Node.js", "REST API", "PostgreSQL"])
    });
    expect(allEvidence).not.toContain("https://portfolio.example.dev");
    expect(session.drafts[0].draftText).not.toContain("https://portfolio.example.dev");
    expect(session.drafts[0].usedEvidenceFacts.join("\n")).toContain("포트폴리오 기술스택");
  });

  it("[simulation 3] follows a selected motivation format without drifting into a project-experience prompt", async () => {
    const service = createService(vi.fn());
    let session = await service.createSession({
      message: "운영 중 생긴 문제를 정리하고 팀이 재사용할 수 있는 체크리스트를 만들었습니다.",
      target: {
        role: "백엔드 개발자",
        formatLabel: "지원동기",
        questionText: "지원 동기와 입사 후 기여 계획을 작성해 주세요.",
        charLimit: 700,
        charCountRule: "with_spaces",
        jobPostingText: "데이터 기반으로 운영 문제를 해결하고 안정적인 API를 만드는 백엔드 개발자를 찾습니다."
      }
    });

    expect(session.interview.questions.map((question) => question.slot)).not.toContain("project_name");
    expect(session.drafts[0]).toMatchObject({
      questionText: "지원 동기와 입사 후 기여 계획을 작성해 주세요.",
      charLimit: 700
    });

    session = await answerUntilReady(service, session);

    expect(session.state).toBe("DRAFT_READY");
    expect(session.drafts[0].draftText).toContain("지원 동기");
    expect(session.drafts[0].draftText).not.toContain("확인된 프로젝트 경험");
  });

  it("routes completed document-session drafts through the selected AI provider", async () => {
    const aiDraftText = "AI 라우터가 생성한 지원 직무 프로젝트 경험 초안입니다.";
    const { router, execute } = createCodexDraftRouter(aiDraftText);
    const routerExecute = vi.spyOn(router, "execute");
    const service = createService(vi.fn(), router);
    const aiSelection: AiSelection = { mode: "manual", providerId: "codex_bridge" };
    let session = await service.createSession({
      message: "지원자 상태 관리 API 프로젝트에서 백엔드 API 명세와 PostgreSQL 이력 테이블 구현을 담당했습니다.",
      target: {
        role: "백엔드 개발자",
        questionText: "지원 직무와 관련된 프로젝트 경험을 작성해 주세요.",
        charLimit: 700
      },
      aiSelection
    });

    session = await answerUntilReady(service, session, aiSelection);

    expect(routerExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: "draft",
        aiSelection
      })
    );
    expect(execute).toHaveBeenCalledWith(expect.objectContaining({ operation: "draft", timeoutMs: 300_000 }));
    const providerDraftInput = execute.mock.calls[0]?.[0] as { payload?: { plan?: { materialStore?: { referenceRules?: string[] } } } };
    expect(providerDraftInput.payload?.plan?.materialStore?.referenceRules?.join("\n")).toContain("STAR");
    expect(providerDraftInput.payload?.plan?.materialStore?.referenceRules?.join("\n")).toContain("Source:");
    expect(session.aiMeta).toMatchObject({
      providerId: "codex_bridge",
      modelId: "codex-test-model",
      usedFallback: false
    });
    expect(session.drafts[0].draftText).toBe(aiDraftText);
    expect(session.drafts[0].risks).not.toContain("AI 초안 응답 형식을 보정해 사용했습니다.");
  });

  it("keeps Codex draftText-only responses out of fallback mode", async () => {
    const aiDraftText = "Neet2Work에서 자소서 작성 흐름을 정리하고 보완 질문으로 근거를 확인한 경험을 중심으로 작성한 초안입니다.";
    const { router } = createCodexDraftDataRouter({ draftText: aiDraftText });
    const service = createService(vi.fn(), router);
    const aiSelection: AiSelection = { mode: "manual", providerId: "codex_bridge" };
    let session = await service.createSession({
      message: "Neet2Work에서 자소서 AI 로직을 세팅하고 사용자 피드백을 반영해 결과를 개선했습니다.",
      target: {
        role: "풀스택 개발자",
        questionText: "지원 직무와 관련된 프로젝트 경험을 작성해 주세요.",
        charLimit: 700
      },
      aiSelection
    });

    session = await answerUntilReady(service, session, aiSelection);

    expect(session.aiMeta).toMatchObject({
      providerId: "codex_bridge",
      modelId: "codex-test-model",
      usedFallback: false
    });
    expect(session.drafts[0].draftText).toBe(aiDraftText);
    expect(session.drafts[0].risks).toContain("AI 초안 응답 형식을 보정해 사용했습니다.");
  });

  it("uses AI-generated gap questions when the selected provider can plan the session", async () => {
    const aiQuestion = "이 프로젝트의 이름, 목적, 그리고 지원 직무와 가장 직접 연결되는 기능을 한 번에 설명해 줄 수 있나요?";
    const { router, execute } = createCodexQuestionRouter(aiQuestion);
    const service = createService(vi.fn(), router);
    const aiSelection: AiSelection = { mode: "manual", providerId: "codex_bridge" };

    const session = await service.createSession({
      message: "첨부한 양식에 맞춰 자소서를 작성해줘.",
      target: {
        role: "백엔드 개발자",
        questionText: "지원 직무와 관련된 프로젝트 경험을 작성해 주세요."
      },
      attachments: [
        {
          fileName: "template.txt",
          text: "문항: 지원 직무와 관련된 프로젝트 경험을 구체적으로 작성해 주세요. 700자 이내."
        }
      ],
      aiSelection
    });

    expect(execute).toHaveBeenCalledWith(expect.objectContaining({ operation: "plan", timeoutMs: 300_000 }));
    const providerPlanInput = execute.mock.calls[0]?.[0] as { payload?: { plan?: { materialStore?: { referenceRules?: string[] } } } };
    expect(providerPlanInput.payload?.plan?.materialStore?.referenceRules?.join("\n")).toContain("STAR");
    expect(providerPlanInput.payload?.plan?.materialStore?.referenceRules?.join("\n")).toContain("Source:");
    expect(session.aiMeta).toMatchObject({
      providerId: "codex_bridge",
      modelId: "codex-test-model",
      usedFallback: false
    });
    expect(session.interview.questions[0]).toMatchObject({
      questionId: "ai-project-name-check",
      slot: "project_name",
      question: aiQuestion,
      whyAsking: expect.stringContaining("AI가")
    });
    expect(session.interview.questions[0].question).not.toContain("근거가 아직 부족");
  });
});

function answerForSlot(slot: string) {
  switch (slot) {
    case "user_role":
      return "백엔드 API 명세 정리, 상태 변경 로직 구현, PostgreSQL 이력 테이블 설계를 직접 맡았습니다.";
    case "problem_context":
      return "지원자 상태가 잘못 변경되는 문제와 변경 이력 추적이 어려운 상황이 있었습니다.";
    case "actions":
      return "상태 변경 API를 구현하고 예외 처리를 정리한 뒤 테스트로 주요 흐름을 검증했습니다.";
    case "technical_choice":
      return "상태 이력 조회가 필요해서 PostgreSQL 관계형 테이블과 TypeScript API 구조를 선택했습니다.";
    case "result":
      return "상태 변경 오류를 줄이고 QA 피드백에서 추적이 쉬워졌다는 평가를 받았습니다.";
    case "learning":
      return "상태 전이를 데이터로 남겨야 운영 중 문제를 빠르게 확인할 수 있다는 점을 배웠습니다.";
    case "target_role":
      return "백엔드 개발자 직무를 기준으로 작성해 주세요.";
    default:
      return "지원자 관리 API 프로젝트에서 백엔드 구현과 검증을 직접 담당했습니다.";
  }
}

async function answerUntilReady(
  service: CareerDocumentWorkflowService,
  session: Awaited<ReturnType<CareerDocumentWorkflowService["createSession"]>>,
  aiSelection?: AiSelection
) {
  let nextSession = session;
  for (let index = 0; index < 10 && nextSession.interview.questions.length > 0; index += 1) {
    const question = nextSession.interview.questions[0];
    nextSession = await service.answerQuestion({
      session: nextSession,
      questionId: question.questionId,
      answer: answerForSlot(question.slot),
      aiSelection
    });
  }

  return nextSession;
}
