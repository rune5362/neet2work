import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const sourceRoots = [path.join(repoRoot, "apps", "backend", "src"), path.join(repoRoot, "apps", "frontend", "src")];
const outputDir = path.join(repoRoot, "docs", "generated", "classes");

function walkFiles(directory) {
  if (!existsSync(directory)) {
    return [];
  }

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return walkFiles(entryPath);
    }
    if (/\.(test|spec)\.[tj]sx?$/.test(entry.name) || !/\.[tj]sx?$/.test(entry.name)) {
      return [];
    }
    return [entryPath];
  });
}

function findMatchingBrace(text, openIndex) {
  let depth = 0;
  for (let index = openIndex; index < text.length; index += 1) {
    const char = text[index];
    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }
  return -1;
}

function parseClassDeclaration(text, filePath) {
  const classes = [];
  const classPattern = /(?:export\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^{]+))?\s*\{/g;
  let match;

  while ((match = classPattern.exec(text)) !== null) {
    const openIndex = text.indexOf("{", match.index);
    const closeIndex = findMatchingBrace(text, openIndex);
    if (closeIndex === -1) {
      continue;
    }

    const body = text.slice(openIndex + 1, closeIndex);
    classes.push({
      name: match[1],
      extendsName: match[2],
      implementsNames: match[3]?.split(",").map((item) => item.trim()).filter(Boolean) ?? [],
      methods: parseMethods(body),
      filePath
    });
  }

  return classes;
}

function parseMethods(body) {
  const methods = [];
  const methodPattern = /^\s*(?:async\s+)?(?!if\b|for\b|while\b|switch\b|catch\b|function\b)(private\s+|protected\s+|public\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\{/gm;
  let match;

  while ((match = methodPattern.exec(body)) !== null) {
    const visibility = match[1]?.trim() ?? "+";
    if (visibility === "private") {
      continue;
    }
    const name = match[2];
    if (name === "constructor") {
      continue;
    }
    methods.push(name);
  }

  return [...new Set(methods)].sort();
}

function parseClasses() {
  return sourceRoots
    .flatMap(walkFiles)
    .flatMap((filePath) => parseClassDeclaration(readFileSync(filePath, "utf8"), filePath))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function escapeClassName(name) {
  return name.replace(/[^\w]/g, "");
}

function renderClassDiagram(classes) {
  const classNames = new Set(classes.map((item) => item.name));
  const lines = ["classDiagram", "  direction LR"];

  for (const item of classes) {
    const className = escapeClassName(item.name);
    lines.push(`  class ${className} {`);
    for (const method of item.methods) {
      lines.push(`    +${method}()`);
    }
    lines.push("  }");
  }

  for (const item of classes) {
    if (item.extendsName && classNames.has(item.extendsName)) {
      lines.push(`  ${escapeClassName(item.extendsName)} <|-- ${escapeClassName(item.name)}`);
    }
    for (const interfaceName of item.implementsNames) {
      lines.push(`  ${escapeClassName(interfaceName)} <|.. ${escapeClassName(item.name)}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

function renderMarkdown(classes) {
  const rows = classes.map((item) => {
    const relativePath = path.relative(repoRoot, item.filePath).replace(/\\/g, "/");
    return `| ${item.name} | ${item.extendsName ?? ""} | ${item.implementsNames.join(", ")} | ${item.methods.join(", ")} | \`${relativePath}\` |`;
  });

  return [
    "# TypeScript 클래스 다이어그램",
    "",
    "이 문서는 `apps/*/src`의 TypeScript class 선언에서 자동 생성됩니다.",
    "",
    "| Class | Extends | Implements | Public methods | Source |",
    "| --- | --- | --- | --- | --- |",
    ...rows
  ].join("\n");
}

mkdirSync(outputDir, { recursive: true });

const classes = parseClasses();
writeFileSync(path.join(outputDir, "class-services.mmd"), renderClassDiagram(classes));
writeFileSync(path.join(outputDir, "class-services.md"), `${renderMarkdown(classes)}\n`);

console.log(`Generated class diagram for ${classes.length} classes.`);
