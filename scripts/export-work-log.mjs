import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const KST_TIME_ZONE = 'Asia/Seoul';
const DEFAULT_WORK_LOG_PATH = resolve(process.cwd(), 'docs', 'work-log', 'WORK_LOG.md');

function readArg(name) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);

  const index = process.argv.indexOf(`--${name}`);
  if (index !== -1) return process.argv[index + 1];

  return null;
}

export function todayKstIso(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: KST_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function formatKstDisplayDate(isoDate) {
  const [, , month, day] = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/) ?? [];
  if (!month || !day) {
    throw new Error(`Invalid ISO date: ${isoDate}`);
  }

  return `${Number(month)}/${Number(day)}`;
}

function normalizeHeadingDate(heading, fallbackYear) {
  const value = heading.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const slashDate = value.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (slashDate) {
    return `${fallbackYear}-${slashDate[1].padStart(2, '0')}-${slashDate[2].padStart(2, '0')}`;
  }

  return null;
}

function extractDateSection(markdown, isoDate) {
  const fallbackYear = isoDate.slice(0, 4);
  const lines = markdown.split(/\r?\n/);
  let start = -1;
  let end = lines.length;

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^##\s+(.+?)\s*$/);
    if (!match) continue;

    const headingDate = normalizeHeadingDate(match[1], fallbackYear);
    if (headingDate === isoDate) {
      start = index + 1;
      continue;
    }

    if (start !== -1) {
      end = index;
      break;
    }
  }

  if (start === -1) return null;

  return lines.slice(start, end).join('\n').trim();
}

function extractNamedSection(section, headingName) {
  const lines = section.split(/\r?\n/);
  let start = -1;
  let end = lines.length;

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^###\s+(.+?)\s*$/);
    if (!match) continue;

    if (match[1].trim().toLowerCase() === headingName.toLowerCase()) {
      start = index + 1;
      continue;
    }

    if (start !== -1) {
      end = index;
      break;
    }
  }

  if (start === -1) return null;

  return lines.slice(start, end).join('\n').trim();
}

function extractFigmaLines(markdown) {
  return markdown
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => /^(\s*)-\s+/.test(line) || /^\s*#by Codex\b/.test(line));
}

export function buildWorkLogExport({
  date = todayKstIso(),
  workLogPath = DEFAULT_WORK_LOG_PATH,
} = {}) {
  const markdown = readFileSync(workLogPath, 'utf8');
  const dateSection = extractDateSection(markdown, date);

  if (!dateSection) {
    throw new Error(`No work log section found for ${date}. Add "## ${date}" to ${workLogPath}.`);
  }

  const figmaSection =
    extractNamedSection(dateSection, 'Figma Summary') ??
    extractNamedSection(dateSection, '피그마 요약') ??
    dateSection;
  const figmaLines = extractFigmaLines(figmaSection);

  if (figmaLines.length === 0) {
    throw new Error(`No bullet items found for ${date} in ${workLogPath}.`);
  }

  const displayDate = formatKstDisplayDate(date);

  return {
    date,
    displayDate,
    text: `${displayDate}\n\n${figmaLines.join('\n')}`,
  };
}

function runCli() {
  const date = readArg('date') ?? todayKstIso();
  const json = process.argv.includes('--json');
  const result = buildWorkLogExport({ date });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(result.text);
}

const currentModulePath = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === currentModulePath) {
  runCli();
}
