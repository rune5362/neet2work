import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const prismaDir = path.join(repoRoot, "apps", "backend", "prisma");
const modelDir = path.join(prismaDir, "models");
const outputDir = path.join(repoRoot, "docs", "generated", "database");

const erdGroups = [
  {
    fileName: "erd",
    title: "전체 Prisma ERD",
    models: undefined
  },
  {
    fileName: "erd-core",
    title: "핵심 도메인 ERD",
    models: ["User", "CandidateProfile", "ApplicationDocument", "ApplicationSet", "JobPosting", "ResumeAnalysis"]
  },
  {
    fileName: "erd-auth",
    title: "인증/감사 ERD",
    models: ["User", "RefreshToken", "AuditLog"]
  },
  {
    fileName: "erd-documents",
    title: "지원 문서 ERD",
    models: ["CandidateProfile", "ApplicationDocument", "ApplicationSet"]
  },
  {
    fileName: "erd-jobs",
    title: "채용공고/분석 ERD",
    models: ["JobPosting", "ResumeAnalysis"]
  }
];

function readPrismaSources() {
  const files = [path.join(prismaDir, "schema.prisma")];

  if (existsSync(modelDir)) {
    files.push(
      ...readdirSync(modelDir)
        .filter((fileName) => fileName.endsWith(".prisma"))
        .sort()
        .map((fileName) => path.join(modelDir, fileName))
    );
  }

  return files.map((filePath) => ({
    filePath,
    relativePath: path.relative(repoRoot, filePath).replace(/\\/g, "/"),
    text: readFileSync(filePath, "utf8")
  }));
}

function extractBlocks(source, kind) {
  const blocks = [];
  const pattern = new RegExp(`\\b${kind}\\s+(\\w+)\\s*\\{([\\s\\S]*?)\\n\\}`, "g");
  let match;

  while ((match = pattern.exec(source.text)) !== null) {
    blocks.push({
      name: match[1],
      body: match[2],
      sourcePath: source.relativePath
    });
  }

  return blocks;
}

function splitModelBody(body) {
  return body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("//"));
}

function parseAttributeList(attributeText, name) {
  const match = attributeText.match(new RegExp(`@${name}\\(([^)]*)\\)`));
  return match?.[1]?.trim();
}

function parseRelation(attributeText) {
  const relationArgs = parseAttributeList(attributeText, "relation");
  if (!relationArgs) {
    return undefined;
  }

  const fields = relationArgs.match(/fields:\s*\[([^\]]*)\]/)?.[1]
    ?.split(",")
    .map((field) => field.trim())
    .filter(Boolean);
  const references = relationArgs.match(/references:\s*\[([^\]]*)\]/)?.[1]
    ?.split(",")
    .map((field) => field.trim())
    .filter(Boolean);
  const name = relationArgs.match(/^"([^"]+)"/)?.[1];
  const onDelete = relationArgs.match(/onDelete:\s*(\w+)/)?.[1];

  return {
    name,
    fields: fields ?? [],
    references: references ?? [],
    onDelete
  };
}

function parseField(line) {
  if (line.startsWith("@@")) {
    return undefined;
  }

  const [name, type, ...rest] = line.split(/\s+/);
  if (!name || !type) {
    return undefined;
  }

  const attributes = rest.join(" ");
  return {
    name,
    type,
    isId: attributes.includes("@id"),
    isUnique: attributes.includes("@unique"),
    isOptional: type.endsWith("?"),
    isList: type.endsWith("[]"),
    mappedName: parseAttributeList(attributes, "map")?.replace(/^"|"$/g, ""),
    defaultValue: parseAttributeList(attributes, "default"),
    relation: parseRelation(attributes),
    raw: line
  };
}

function parseModel(block) {
  const lines = splitModelBody(block.body);
  const fields = lines.map(parseField).filter(Boolean);
  const blockAttributes = lines.filter((line) => line.startsWith("@@"));
  const mappedName = blockAttributes
    .find((line) => line.startsWith("@@map("))
    ?.match(/@@map\("([^"]+)"\)/)?.[1];

  return {
    name: block.name,
    sourcePath: block.sourcePath,
    tableName: mappedName ?? block.name,
    fields,
    indexes: blockAttributes.filter((line) => line.startsWith("@@index")),
    uniques: blockAttributes.filter((line) => line.startsWith("@@unique")),
    map: blockAttributes.find((line) => line.startsWith("@@map")),
    blockAttributes
  };
}

function parseEnum(block) {
  return {
    name: block.name,
    sourcePath: block.sourcePath,
    values: splitModelBody(block.body).filter((line) => !line.startsWith("@"))
  };
}

function parsePrismaSchema() {
  const sources = readPrismaSources();
  const models = sources.flatMap((source) => extractBlocks(source, "model")).map(parseModel);
  const enums = sources.flatMap((source) => extractBlocks(source, "enum")).map(parseEnum);

  return {
    models: models.sort((a, b) => a.name.localeCompare(b.name)),
    enums: enums.sort((a, b) => a.name.localeCompare(b.name))
  };
}

function isModelType(type, modelNames) {
  return modelNames.has(type.replace(/\?|\[\]/g, ""));
}

function normalizeMermaidType(type) {
  return type.replace(/\?/g, "").replace(/\[\]/g, "Array").replace(/[^\w]/g, "");
}

function buildFieldMarkers(field) {
  const markers = [];
  if (field.isId) {
    markers.push("PK");
  }
  if (field.isUnique) {
    markers.push("UK");
  }
  if (field.relation?.fields?.length > 0) {
    markers.push("FK");
  }
  return markers.join(",");
}

function renderEntity(model, modelNames) {
  const scalarFields = model.fields.filter((field) => !isModelType(field.type, modelNames));
  const lines = [`  ${model.name} {`];

  for (const field of scalarFields) {
    const markers = buildFieldMarkers(field);
    lines.push(`    ${normalizeMermaidType(field.type)} ${field.name}${markers ? ` ${markers}` : ""}`);
  }

  lines.push("  }");
  return lines.join("\n");
}

function relationCardinality(field) {
  if (field.isList) {
    return "o{";
  }
  if (field.isOptional) {
    return "o|";
  }
  return "||";
}

function renderRelation(model, field) {
  const targetModelName = field.type.replace(/\?|\[\]/g, "");
  const sourceCardinality = relationCardinality(field);
  const labelParts = [field.name];
  if (field.relation?.onDelete) {
    labelParts.push(`onDelete:${field.relation.onDelete}`);
  }

  return `  ${model.name} ${sourceCardinality}--|| ${targetModelName} : "${labelParts.join(" ")}"`;
}

function renderMermaidErd(title, models) {
  const modelNames = new Set(models.map((model) => model.name));
  const lines = ["erDiagram", `  %% ${title}`];

  for (const model of models) {
    lines.push(renderEntity(model, modelNames));
  }

  for (const model of models) {
    for (const field of model.fields) {
      const targetModelName = field.type.replace(/\?|\[\]/g, "");
      if (
        modelNames.has(targetModelName) &&
        field.relation?.fields?.length > 0 &&
        field.relation?.references?.length > 0
      ) {
        lines.push(renderRelation(model, field));
      }
    }
  }

  return `${lines.join("\n")}\n`;
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`)
  ].join("\n");
}

function escapeMarkdown(value) {
  return String(value ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, " ");
}

function renderModelMarkdown(model) {
  const fieldRows = model.fields.map((field) => [
    escapeMarkdown(field.name),
    escapeMarkdown(field.type),
    field.isOptional ? "nullable" : "required",
    [
      field.isId ? "PK" : "",
      field.isUnique ? "unique" : "",
      field.relation ? "relation" : "",
      field.mappedName ? `map:${field.mappedName}` : "",
      field.defaultValue ? `default:${field.defaultValue}` : ""
    ]
      .filter(Boolean)
      .join(", ")
  ]);
  const relationRows = model.fields
    .filter((field) => field.relation)
    .map((field) => [
      escapeMarkdown(field.name),
      escapeMarkdown(field.type.replace(/\?|\[\]/g, "")),
      escapeMarkdown(field.relation.name ?? ""),
      escapeMarkdown(field.relation.fields.join(", ")),
      escapeMarkdown(field.relation.references.join(", ")),
      escapeMarkdown(field.relation.onDelete ?? "")
    ]);

  const sections = [
    `### ${model.name}`,
    "",
    `- Source: \`${model.sourcePath}\``,
    `- Table: \`${model.tableName}\``,
    "",
    markdownTable(["Field", "Type", "Required", "Notes"], fieldRows)
  ];

  if (relationRows.length > 0) {
    sections.push("", "Relations:", "", markdownTable(["Field", "Target", "Name", "Fields", "References", "onDelete"], relationRows));
  }

  if (model.uniques.length > 0) {
    sections.push("", "Unique constraints:", "", ...model.uniques.map((item) => `- \`${item}\``));
  }

  if (model.indexes.length > 0) {
    sections.push("", "Indexes:", "", ...model.indexes.map((item) => `- \`${item}\``));
  }

  return sections.join("\n");
}

function renderMarkdown({ models, enums }) {
  const modelSummaryRows = models.map((model) => [
    escapeMarkdown(model.name),
    escapeMarkdown(model.tableName),
    escapeMarkdown(model.sourcePath),
    String(model.fields.length)
  ]);
  const enumSummaryRows = enums.map((item) => [
    escapeMarkdown(item.name),
    escapeMarkdown(item.values.join(", ")),
    escapeMarkdown(item.sourcePath)
  ]);

  return [
    "# Prisma 모델 문서",
    "",
    "이 문서는 `apps/backend/prisma`의 Prisma schema와 model 파일에서 자동 생성됩니다.",
    "",
    "## Models",
    "",
    markdownTable(["Model", "Table", "Source", "Fields"], modelSummaryRows),
    "",
    "## Enums",
    "",
    enumSummaryRows.length > 0
      ? markdownTable(["Enum", "Values", "Source"], enumSummaryRows)
      : "등록된 enum이 없습니다.",
    "",
    "## Model Details",
    "",
    ...models.map(renderModelMarkdown)
  ].join("\n\n");
}

function selectModels(allModels, names) {
  if (!names) {
    return allModels;
  }

  const nameSet = new Set(names);
  return allModels.filter((model) => nameSet.has(model.name));
}

mkdirSync(outputDir, { recursive: true });

const schema = parsePrismaSchema();
writeFileSync(path.join(outputDir, "prisma-models.md"), `${renderMarkdown(schema)}\n`);

for (const group of erdGroups) {
  const models = selectModels(schema.models, group.models);
  writeFileSync(path.join(outputDir, `${group.fileName}.mmd`), renderMermaidErd(group.title, models));
}

console.log(`Generated Prisma docs for ${schema.models.length} models and ${schema.enums.length} enums.`);
