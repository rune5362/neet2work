import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const outputDir = path.join(repoRoot, "docs", "generated", "dependencies");
const depCruiseCliPath = path.join(repoRoot, "node_modules", "dependency-cruiser", "bin", "dependency-cruise.mjs");
const configPath = path.join(repoRoot, ".dependency-cruiser.cjs");

const allSourceRoots = ["apps/backend/src", "apps/frontend/src"];

function renderOverviewGraph() {
  return `flowchart LR
  subgraph frontend["Frontend"]
    pages["pages"]
    components["components"]
    api["api clients"]
    frontendTypes["types"]
  end

  subgraph backend["Backend"]
    routes["routes"]
    middleware["middleware"]
    services["services"]
    backendTypes["types"]
    database["database"]
    prisma["Prisma Client"]
  end

  subgraph external["External"]
    postgres["PostgreSQL"]
    ai["AI Providers"]
  end

  pages --> components
  pages --> api
  components --> frontendTypes
  api --> routes
  routes --> middleware
  routes --> services
  services --> backendTypes
  services --> database
  database --> prisma
  prisma --> postgres
  services --> ai
`;
}

function renderBackendGraph() {
  return `flowchart LR
  routes["routes"]
  middleware["middleware"]
  services["services"]
  ai["services/ai"]
  workflows["workflow services"]
  types["types"]
  database["database"]
  scripts["operational scripts"]
  prisma["Prisma Client"]
  external["PostgreSQL / AI Providers / Crawlers"]

  routes --> middleware
  routes --> services
  services --> workflows
  services --> ai
  services --> types
  services --> database
  scripts --> services
  scripts --> database
  database --> prisma
  prisma --> external
  ai --> external
`;
}

function renderFrontendGraph() {
  return `flowchart LR
  app["App routes"]
  pages["pages"]
  components["components"]
  api["api clients"]
  authSession["authSession"]
  types["types"]
  utils["utils"]
  assets["assets"]
  backend["Backend API"]

  app --> pages
  pages --> components
  pages --> api
  pages --> utils
  components --> assets
  api --> authSession
  api --> types
  pages --> types
  api --> backend
`;
}

const graphs = [
  {
    fileName: "dependency-graph",
    sources: allSourceRoots,
    description: "전체 파일 단위 의존성 그래프"
  },
  {
    fileName: "draft-workflow",
    sources: allSourceRoots,
    description: "draft workflow 관심 영역 그래프",
    includeOnly:
      "^apps/(backend/src/(routes/draft-workflow|services/(draft-workflow|ai)|types/(draft-workflow|ai-routing|profile))|frontend/src/(pages/AIDraftChatBuilder|api/client|types/(draft-workflow|profile)))"
  },
  {
    fileName: "career-workflow",
    sources: allSourceRoots,
    description: "career workflow 관심 영역 그래프",
    includeOnly:
      "^apps/(backend/src/(routes/career-workflow|services/career-workflow|types/career-workflow)|frontend/src/(api/client|types/career-workflow))"
  },
  {
    fileName: "career-document-workflow",
    sources: allSourceRoots,
    description: "career document workflow 관심 영역 그래프",
    includeOnly:
      "^apps/(backend/src/(routes/career-workflow|services/(career-document-workflow|draft-workflow|ai)|types/(career-document-workflow|draft-workflow|ai-routing))|frontend/src/(api/client|types/(career-document-workflow|draft-workflow)))"
  },
  {
    fileName: "documents-profile",
    sources: allSourceRoots,
    description: "documents/profile 관심 영역 그래프",
    includeOnly:
      "^apps/(backend/src/(routes/(document|profile)|services/(document|profile)\\.service|types/(document|profile))|frontend/src/(api/(documentClient|profileClient)|types/(document|profile)|pages/(Documents|DocumentDetail|DocumentNew|Profiles|ProfileDetail|ProfileNew)))"
  },
  {
    fileName: "ai-providers",
    sources: ["apps/backend/src"],
    description: "AI provider adapter 관심 영역 그래프",
    includeOnly: "^apps/backend/src/(services/ai|types/ai-routing|config/ai-config)"
  },
  {
    fileName: "jobs",
    sources: allSourceRoots,
    description: "채용공고/jobs 관심 영역 그래프",
    includeOnly:
      "^apps/(backend/src/(routes/jobs|services/job\\.service|types/job|scripts/job|rpa/playwrightCollector)|frontend/src/(api/client|types/job|pages/Jobs))"
  },
  {
    fileName: "auth",
    sources: allSourceRoots,
    description: "인증/auth 관심 영역 그래프",
    includeOnly:
      "^apps/(backend/src/(routes/auth|services/(auth|token|password)\\.service|middleware/auth|utils/auth-session|types/analysis)|frontend/src/(api/(client|authSession)|pages/(Login|SignUp|MyAccount|AuthChoice)))"
  }
];

mkdirSync(outputDir, { recursive: true });
writeFileSync(path.join(outputDir, "overview.mmd"), renderOverviewGraph());
console.log("Generating overview.mmd - 사람이 읽는 상위 구조 요약 그래프");
writeFileSync(path.join(outputDir, "backend.mmd"), renderBackendGraph());
console.log("Generating backend.mmd - 사람이 읽는 backend 요약 그래프");
writeFileSync(path.join(outputDir, "frontend.mmd"), renderFrontendGraph());
console.log("Generating frontend.mmd - 사람이 읽는 frontend 요약 그래프");

for (const graph of graphs) {
  const outputPath = path.join(outputDir, `${graph.fileName}.mmd`);
  const args = [
    depCruiseCliPath,
    ...graph.sources,
    "--config",
    configPath,
    "--output-type",
    "mermaid",
    "--output-to",
    outputPath
  ];

  if (graph.includeOnly) {
    args.push("--include-only", graph.includeOnly);
  }

  if (graph.collapse) {
    args.push("--collapse", graph.collapse);
  }

  console.log(`Generating ${graph.fileName}.mmd - ${graph.description}`);
  const result = spawnSync(process.execPath, args, {
    cwd: repoRoot,
    stdio: "inherit"
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
