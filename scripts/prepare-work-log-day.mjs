import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { todayKstIso } from './export-work-log.mjs';

const DOCS_DIR = resolve(process.cwd(), 'docs');
const WORK_LOG_DIR = resolve(DOCS_DIR, 'work-log');
const ARCHIVE_DIR = resolve(WORK_LOG_DIR, 'archive');

const FILES = [
  {
    path: resolve(WORK_LOG_DIR, 'WORK_SESSIONS.md'),
    title: '# Work Sessions',
    template(date) {
      return [
        '# Work Sessions',
        '',
        '오늘 작업 상세 기록 원장이다.',
        '지난 날짜 기록은 `docs/work-log/archive/`에 보관한다.',
        '',
        `## ${date}`,
        '',
      ].join('\n');
    },
  },
  {
    path: resolve(WORK_LOG_DIR, 'WORK_LOG.md'),
    title: '# Work Log',
    template(date) {
      return [
        '# Work Log',
        '',
        `## ${date}`,
        '',
        '### Figma Summary',
        '',
        '<!-- 2 bullets preferred, 3 max. Keep details in WORK_SESSIONS.md. -->',
        '',
      ].join('\n');
    },
  },
];

function readArg(name) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);

  const index = process.argv.indexOf(`--${name}`);
  if (index !== -1) return process.argv[index + 1];

  return null;
}

function splitDateSections(markdown) {
  const lines = markdown.split(/\r?\n/);
  const sections = [];
  const firstDateIndex = lines.findIndex((line) => /^##\s+\d{4}-\d{2}-\d{2}\s*$/.test(line));
  const intro = firstDateIndex === -1 ? markdown.trimEnd() : lines.slice(0, firstDateIndex).join('\n').trimEnd();

  if (firstDateIndex === -1) {
    return { intro, sections };
  }

  let start = firstDateIndex;
  for (let index = firstDateIndex + 1; index <= lines.length; index += 1) {
    const isNextSection = index < lines.length && /^##\s+\d{4}-\d{2}-\d{2}\s*$/.test(lines[index]);
    const isEnd = index === lines.length;

    if (!isNextSection && !isEnd) continue;

    const sectionLines = lines.slice(start, index);
    const match = sectionLines[0].match(/^##\s+(\d{4}-\d{2}-\d{2})\s*$/);
    sections.push({
      date: match[1],
      text: sectionLines.join('\n').trimEnd(),
    });
    start = index;
  }

  return { intro, sections };
}

function sameContent(path, content) {
  return existsSync(path) && readFileSync(path, 'utf8') === content;
}

function uniqueArchivePath(targetPath) {
  if (!existsSync(targetPath)) return targetPath;

  const dotIndex = targetPath.lastIndexOf('.');
  const base = dotIndex === -1 ? targetPath : targetPath.slice(0, dotIndex);
  const extension = dotIndex === -1 ? '' : targetPath.slice(dotIndex);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');

  return `${base}-${stamp}${extension}`;
}

function writeFile(path, content, { dryRun, quiet }) {
  if (dryRun) {
    if (!quiet) console.log(`[dry-run] write ${path}`);
    return;
  }

  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, 'utf8');
}

function archiveSection({ fileConfig, section, dryRun, quiet }) {
  const targetDir = resolve(ARCHIVE_DIR, section.date);
  const archivePath = resolve(targetDir, basename(fileConfig.path));
  const content = `${fileConfig.title}\n\n${section.text}\n`;

  if (sameContent(archivePath, content)) {
    if (!quiet) console.log(`Archive already current: ${archivePath}`);
    return;
  }

  const targetPath = uniqueArchivePath(archivePath);
  writeFile(targetPath, content, { dryRun, quiet });
  if (!quiet) console.log(`Archived ${basename(fileConfig.path)} section ${section.date}`);
}

function buildActiveContent({ fileConfig, intro, todaySections, date }) {
  if (todaySections.length === 0) {
    return fileConfig.template(date);
  }

  const normalizedIntro = intro || fileConfig.title;
  return `${normalizedIntro}\n\n${todaySections.map((section) => section.text).join('\n\n')}\n`;
}

function prepareFile({ fileConfig, date, dryRun, quiet }) {
  if (!existsSync(fileConfig.path)) {
    writeFile(fileConfig.path, fileConfig.template(date), { dryRun, quiet });
    if (!quiet) console.log(`Initialized ${basename(fileConfig.path)} for ${date}`);
    return;
  }

  const markdown = readFileSync(fileConfig.path, 'utf8');
  const { intro, sections } = splitDateSections(markdown);

  if (sections.length === 0) {
    archiveSection({
      fileConfig,
      section: { date: 'undated', text: markdown.trimEnd() },
      dryRun,
      quiet,
    });
    writeFile(fileConfig.path, fileConfig.template(date), { dryRun, quiet });
    if (!quiet) console.log(`Reset undated ${basename(fileConfig.path)} for ${date}`);
    return;
  }

  const todaySections = sections.filter((section) => section.date === date);
  const archiveSections = sections.filter((section) => section.date !== date);

  archiveSections.forEach((section) => {
    archiveSection({ fileConfig, section, dryRun, quiet });
  });

  if (archiveSections.length > 0 || todaySections.length === 0) {
    writeFile(fileConfig.path, buildActiveContent({ fileConfig, intro, todaySections, date }), { dryRun, quiet });
    if (!quiet) console.log(`Prepared ${basename(fileConfig.path)} for ${date}`);
    return;
  }

  if (!quiet) console.log(`${basename(fileConfig.path)} already prepared for ${date}`);
}

export function prepareWorkLogDay({
  date = todayKstIso(),
  dryRun = false,
  quiet = false,
} = {}) {
  FILES.forEach((fileConfig) => {
    prepareFile({ fileConfig, date, dryRun, quiet });
  });
}

function runCli() {
  const date = readArg('date') || todayKstIso();
  const dryRun = process.argv.includes('--dry-run');
  const quiet = process.argv.includes('--quiet');

  prepareWorkLogDay({ date, dryRun, quiet });
}

if (resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  runCli();
}
