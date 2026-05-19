# Neet2Work AGENTS.md

## Project Contract

`neet2work` is a mock-first career consulting app for job postings,
self-introduction analysis, and future AI/RPA/DB integrations.

Keep the demo path stable even when real external services are unavailable.

## Source Of Truth

- Root `package.json`: workspace commands and Node/pnpm requirements
- `README.md`: product scope and stack
- `.env.example`: environment variable contract
- `docs/work-log/FIGMA_WORK_LOG_RULES.md`: Figma work log workflow rules
- `docs/work-log/WORK_SESSIONS.md`: current-day detailed session notes
- `docs/work-log/WORK_LOG.md`: current-day Figma-facing work log summaries
- `docs/work-log/archive/`: archived daily work log snapshots
- `docs/research/job-sites/`: job site collection research notes
- `docs/runbooks/CHROME_GPT_REVIEW_RULES.md`: Chrome/ChatGPT review
  workflow rules

Do not read, print, or commit `.env` values. When explicitly verifying
automation, check only whether required keys exist.

## Supabase Operating Path

- For this repository, use the Supabase plugin/connector as the default path
  for project database reads and approved writes.
- Do not block approved Supabase work solely because local `DATABASE_URL` is
  unavailable. Treat the local Prisma/`DATABASE_URL` path as a fallback only
  when the user explicitly asks for it or the plugin path is unavailable.
- Treat the configured Supabase project database as the user's project DB; do
  not call it a shared DB unless the current task provides evidence for that.
- Once the user explicitly approves Supabase plugin use for a concrete scope in
  the current session, do not ask again merely to use the plugin for further
  steps inside that same approved scope.
- Still require explicit approval before any new or materially broader
  persistent database mutation, migration, destructive change, production write,
  or scope expansion. A session plugin approval is not blanket authorization
  for unrelated writes.

## Chrome And ChatGPT Review Workflow

- When a task uses `@chrome`, the Chrome plugin, ChatGPT, GPT Pro, or
  browser-based model review, read
  `docs/runbooks/CHROME_GPT_REVIEW_RULES.md` before deciding tool
  availability or selecting a model.
- Do not decide Chrome is unavailable from the active MCP tool list alone.
- For ChatGPT Pro review, verify both the model and the Pro submode shown in
  the UI, such as `표준` or `확장`.

## Encoding

- Read and write docs, scripts, and config files as UTF-8.
- If Korean text looks broken in PowerShell, re-check with
  `Get-Content -Encoding UTF8` before assuming file corruption.
- Do not preserve or reuse mojibake text when patching Korean content.

## Repository Shape

- `apps/frontend`: React 19 + Vite 7 + TypeScript UI
- `apps/backend`: Express 5 + TypeScript API, RPA, storage, analysis services
- `scripts`: setup, work log, Figma helper scripts
- `tools/figma-work-log-plugin`: Figma work log helper plugin

Prefer source and helper files over generated output. Do not edit
`node_modules` or `dist` as source files.

## Work Log Workflow

- For Figma work log tasks, read `docs/work-log/FIGMA_WORK_LOG_RULES.md` first.
- Before writing work session notes, run `corepack pnpm run worklog:prepare`.
- Before the final response after any meaningful repo work, append a concise
  record of what changed and what was verified to
  `docs/work-log/WORK_SESSIONS.md`, unless the user explicitly asks not to.
- For multi-session or long-running work, record an in-progress entry in
  `docs/work-log/WORK_SESSIONS.md` with the thread link, scope, latest
  checkpoint, and status.
- Keep detailed session notes in `docs/work-log/WORK_SESSIONS.md`.
- Keep short Figma-facing summaries in `docs/work-log/WORK_LOG.md`.
- Do not rewrite `docs/work-log/WORK_LOG.md` from session notes unless the user
  asks to summarize or sync the work log.

## Verification

- Figma target check: `corepack pnpm run figma:check`
- Figma work log export check: `corepack pnpm run worklog:export`
- For broader code changes, use relevant root commands such as
  `corepack pnpm run lint`, `corepack pnpm run test`, or
  `corepack pnpm run build`.
