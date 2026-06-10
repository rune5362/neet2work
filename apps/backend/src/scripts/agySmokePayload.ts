import type { DraftWorkflowPlanRequest } from "../types/draft-workflow.js";

export const agySmokePayload: Omit<DraftWorkflowPlanRequest, "aiSelection"> = {
  target: {
    company: "Smoke Test Company",
    role: "Backend Engineer",
    questionText: "지원 동기를 작성하세요.",
    charLimit: 600,
    charCountRule: "with_spaces",
    jobPostingText: "Node.js REST API and PostgreSQL backend service operations.",
    blindRecruitment: false,
    writingStyle: "담백한 실무형"
  },
  experienceInput: {
    profileContexts: [
      {
        profileId: "agy-smoke-profile",
        title: "Agy smoke profile",
        schemaVersion: 1,
        profileJson: {
          basics: {
            name: "Smoke User",
            email: "smoke@example.invalid",
            phone: "000-0000-0000",
            location: "Seoul",
            links: {}
          },
          desired: {
            roles: ["Backend Engineer"],
            industries: ["SaaS"],
            locations: ["Remote"],
            employmentTypes: ["Full-time"]
          },
          summary: {
            headline: "Backend API operations",
            description: "Operated Node.js APIs with PostgreSQL."
          },
          skills: ["Node.js", "PostgreSQL", "REST API"],
          projects: [
            {
              title: "API reliability project",
              role: "Backend developer",
              result: "Improved service reliability",
              impact: "Reduced repeated operational incidents",
              achievements: ["Documented failure handling steps"]
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
        },
        profileText: "Operated Node.js REST APIs backed by PostgreSQL and documented incident handling steps.",
        targetRole: "Backend Engineer",
        targetCompany: "Smoke Test Company",
        desiredRoles: ["Backend Engineer"],
        skills: ["Node.js", "PostgreSQL", "REST API"]
      }
    ]
  }
};
