import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const outputDir = path.join(repoRoot, "docs", "generated", "dependencies");
const depCruiseCliPath = path.join(repoRoot, "node_modules", "dependency-cruiser", "bin", "dependency-cruise.mjs");
const configPath = path.join(repoRoot, ".dependency-cruiser.cjs");

const allSourceRoots = ["apps/backend/src", "apps/frontend/src"];

const graphs = [
  {
    fileName: "dependency-graph",
    sources: allSourceRoots,
    description: "전체 파일 단위 의존성 그래프"
  },
  {
    fileName: "overview",
    sources: allSourceRoots,
    description: "backend/frontend의 상위 폴더 구조 그래프",
    collapse: "^apps/[^/]+/src/[^/]+"
  },
  {
    fileName: "backend",
    sources: ["apps/backend/src"],
    description: "backend 앱 내부 의존성 그래프",
    collapse: "^apps/backend/src/(services/[^/]+|[^/]+)"
  },
  {
    fileName: "frontend",
    sources: ["apps/frontend/src"],
    description: "frontend 앱 내부 의존성 그래프",
    collapse: "^apps/frontend/src/(pages/[^/]+|components/[^/]+|api/[^/]+|types/[^/]+|[^/]+)"
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
