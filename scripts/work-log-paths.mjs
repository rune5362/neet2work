import { execFileSync } from 'node:child_process';
import { existsSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';

const CANONICAL_BRANCHES = new Set(['refs/heads/sungho', 'refs/heads/main', 'refs/heads/master']);

function readArg(name) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);

  const index = process.argv.indexOf(`--${name}`);
  if (index !== -1) return process.argv[index + 1];

  return null;
}

function maybeRealpath(path) {
  return existsSync(path) ? realpathSync.native(path) : resolve(path);
}

function git(args, cwd) {
  return execFileSync('git', ['-c', 'safe.directory=*', ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
}

function parseWorktrees(output) {
  const worktrees = [];
  let current = null;

  for (const line of output.split(/\r?\n/)) {
    if (!line.trim()) {
      if (current) worktrees.push(current);
      current = null;
      continue;
    }

    const [key, ...rest] = line.split(' ');
    const value = rest.join(' ');

    if (key === 'worktree') {
      if (current) worktrees.push(current);
      current = { path: value };
      continue;
    }

    if (!current) continue;

    if (key === 'branch') current.branch = value;
    if (key === 'detached') current.detached = true;
  }

  if (current) worktrees.push(current);
  return worktrees;
}

export function resolveRepoRoot(cwd = process.cwd()) {
  try {
    return maybeRealpath(git(['rev-parse', '--show-toplevel'], cwd));
  } catch {
    return maybeRealpath(cwd);
  }
}

export function resolveCanonicalRepoRoot({
  cwd = process.cwd(),
  explicitRoot = readArg('work-log-root') ?? process.env.NEET2WORK_WORK_LOG_ROOT,
} = {}) {
  if (explicitRoot) {
    return maybeRealpath(resolve(explicitRoot));
  }

  const repoRoot = resolveRepoRoot(cwd);

  try {
    const worktrees = parseWorktrees(git(['worktree', 'list', '--porcelain'], repoRoot));
    const canonical =
      worktrees.find((worktree) => CANONICAL_BRANCHES.has(worktree.branch)) ??
      worktrees.find((worktree) => !worktree.detached) ??
      worktrees[0];

    return canonical?.path ? maybeRealpath(canonical.path) : repoRoot;
  } catch {
    return repoRoot;
  }
}

export function resolveWorkLogDir(options = {}) {
  return resolve(resolveCanonicalRepoRoot(options), 'docs', 'work-log');
}
