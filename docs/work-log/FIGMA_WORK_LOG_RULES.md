# Figma Work Log Rules

Use this file before editing or syncing the Figma work log.

## Files

- `docs/work-log/WORK_SESSIONS.md` is the current-day detailed session-note source.
- `docs/work-log/WORK_LOG.md` is the current-day short Figma-facing summary source.
- `docs/work-log/archive/YYYY-MM-DD/` stores archived daily snapshots.
- The Figma text layer is named `WORK_LOG`.
- The helper plugin lives in `tools/figma-work-log-plugin`.

## Recording Workflow

- Use KST dates.
- Before writing session notes, run `npm.cmd run worklog:prepare`.
- Active `docs/work-log/WORK_SESSIONS.md` and `docs/work-log/WORK_LOG.md`
  should contain only the current KST date. Older date sections belong in
  `docs/work-log/archive/`.
- Before the final response after any meaningful repo work, append a concise
  record of what changed and what was verified to
  `docs/work-log/WORK_SESSIONS.md`, unless the user explicitly asks not to.
- For multi-session or long-running work, keep an in-progress entry in
  `docs/work-log/WORK_SESSIONS.md` with:
  `thread`, `status`, `scope`, `latest checkpoint`, and `next step`.
- Update that entry when the work is paused, handed off, completed, or used for
  a Figma summary.
- Do not automatically backfill old work into `docs/work-log/WORK_SESSIONS.md`
  unless the user asks for it.
- Do not update `docs/work-log/WORK_LOG.md` just because session notes changed.
- When the user asks to summarize or sync to Figma, read
  `docs/work-log/WORK_SESSIONS.md`, preserve any manual
  `docs/work-log/WORK_LOG.md` entries, update the matching date's
  `Figma Summary` only as needed, then sync.
- Keep Figma summaries short. They are not full session logs.
- Add the author tag once per date section, not per bullet.
- Prefer the section-level tag style:

```txt
5/13

- Main work summary
  #by Codex
```

## Sync Rules

- Before syncing to Figma, make sure the local bridge is running from the repo
  root:

```bash
npm.cmd run figma:bridge
```

- Bridge URL: `http://localhost:3927`
- Bridge server script: `scripts/serve-figma-work-log.mjs`
- Figma plugin manifest:
  `tools/figma-work-log-plugin/manifest.json`
- Figma runner path:
  `Figma -> Plugins -> Development -> Neet2Work Work Log Sync`
- Keep the Figma plugin runner window open while syncing.
- After the bridge and runner are ready, sync with:

```bash
npm.cmd run figma:apply-log
```

- Replace the same display-date section instead of appending duplicate dates.
- Preserve existing Figma text outside the target date section.
- Preserve the current Figma text box width.
- Let text height grow naturally with content.
- Keep the current font as the default style.
- The `#by Codex` tag may be styled smaller than the main bullet text.

## Commands

```bash
npm.cmd run worklog:prepare
npm.cmd run worklog:export
npm.cmd run figma:bridge
npm.cmd run figma:apply-log
```
