import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const sourceDir = path.join(repoRoot, "docs", "diagrams");
const outputDir = path.join(repoRoot, "docs", "generated", "diagrams");
const classDiagramDir = path.join(repoRoot, "docs", "generated", "classes");
const databaseDiagramDir = path.join(repoRoot, "docs", "generated", "database");
const dependencyGraphDir = path.join(repoRoot, "docs", "generated", "dependencies");

function findChromeExecutable() {
  const explicitPath = process.env.MERMAID_CHROME_PATH?.trim();
  if (explicitPath && existsSync(explicitPath)) {
    return explicitPath;
  }

  if (process.platform === "win32") {
    const localAppData = process.env.LOCALAPPDATA;
    if (localAppData) {
      const playwrightRoot = path.join(localAppData, "ms-playwright");
      if (existsSync(playwrightRoot)) {
        const candidates = readdirSync(playwrightRoot, { withFileTypes: true })
          .filter((entry) => entry.isDirectory() && entry.name.startsWith("chromium-"))
          .map((entry) => path.join(playwrightRoot, entry.name, "chrome-win64", "chrome.exe"))
          .filter((candidate) => existsSync(candidate))
          .sort()
          .reverse();

        if (candidates[0]) {
          return candidates[0];
        }
      }
    }

    const chromeCandidates = [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
    ];
    const chromePath = chromeCandidates.find((candidate) => existsSync(candidate));
    if (chromePath) {
      return chromePath;
    }
  }

  return undefined;
}

const renderTargets = [];

if (existsSync(sourceDir)) {
  const diagramFiles = readdirSync(sourceDir)
    .filter((fileName) => fileName.endsWith(".mmd"))
    .sort();

  renderTargets.push(
    ...diagramFiles.map((fileName) => ({
      inputPath: path.join(sourceDir, fileName),
      outputPath: path.join(outputDir, fileName.replace(/\.mmd$/, ".svg"))
    }))
  );
}

if (existsSync(dependencyGraphDir)) {
  const dependencyGraphFiles = readdirSync(dependencyGraphDir)
    .filter((fileName) => fileName.endsWith(".mmd"))
    .sort();

  renderTargets.push(
    ...dependencyGraphFiles.map((fileName) => ({
      inputPath: path.join(dependencyGraphDir, fileName),
      outputPath: path.join(dependencyGraphDir, fileName.replace(/\.mmd$/, ".svg"))
    }))
  );
}

if (existsSync(classDiagramDir)) {
  const classDiagramFiles = readdirSync(classDiagramDir)
    .filter((fileName) => fileName.endsWith(".mmd"))
    .sort();

  renderTargets.push(
    ...classDiagramFiles.map((fileName) => ({
      inputPath: path.join(classDiagramDir, fileName),
      outputPath: path.join(classDiagramDir, fileName.replace(/\.mmd$/, ".svg"))
    }))
  );
}

if (existsSync(databaseDiagramDir)) {
  const databaseDiagramFiles = readdirSync(databaseDiagramDir)
    .filter((fileName) => fileName.endsWith(".mmd"))
    .sort();

  renderTargets.push(
    ...databaseDiagramFiles.map((fileName) => ({
      inputPath: path.join(databaseDiagramDir, fileName),
      outputPath: path.join(databaseDiagramDir, fileName.replace(/\.mmd$/, ".svg"))
    }))
  );
}

if (renderTargets.length === 0) {
  console.log("No Mermaid .mmd files found. Skipping Mermaid rendering.");
  process.exit(0);
}

mkdirSync(outputDir, { recursive: true });

const chromeExecutablePath = findChromeExecutable();
const tempDir = path.join(repoRoot, "node_modules", ".tmp");
const puppeteerConfigPath = path.join(tempDir, "mermaid-puppeteer-config.json");

if (!chromeExecutablePath) {
  console.error(
    [
      "Mermaid rendering needs a Chromium executable.",
      "Run `corepack pnpm run setup:playwright` or set MERMAID_CHROME_PATH to a local chrome.exe path."
    ].join("\n")
  );
  process.exit(1);
}

mkdirSync(tempDir, { recursive: true });
writeFileSync(
  puppeteerConfigPath,
  `${JSON.stringify(
    {
      executablePath: chromeExecutablePath,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    },
    null,
    2
  )}\n`
);

const mermaidCliPath = path.join(repoRoot, "node_modules", "@mermaid-js", "mermaid-cli", "src", "cli.js");

for (const { inputPath, outputPath } of renderTargets) {
  mkdirSync(path.dirname(outputPath), { recursive: true });
  const args = ["-i", inputPath, "-o", outputPath];

  args.push("--puppeteerConfigFile", puppeteerConfigPath);

  const result = spawnSync(process.execPath, [mermaidCliPath, ...args], {
    cwd: repoRoot,
    stdio: "inherit"
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
