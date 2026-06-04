# AI Draft Worktree And Reference Plan

## Worktrees

The main worktree currently holds the integrated in-progress changes. For parallel follow-up work, use these isolated worktrees:

- `tmp/worktrees/chat-ui-layout`
  - Branch: `chat-ui-layout`
  - Scope: chat timeline layout, composer UI, attachment card visual polish.
- `tmp/worktrees/codex-deploy-readiness`
  - Branch: `codex-deploy-readiness`
  - Scope: Codex Bridge deploy checks, environment docs, provider fallback behavior.
- `tmp/worktrees/self-intro-reference`
  - Branch: `self-intro-reference`
  - Scope: self-introduction reference library, document-backed references, reference safety tests.

These worktrees were created under `tmp/`, which is already ignored by git. They start from `HEAD`; they do not automatically include the dirty changes in the main worktree.

## Codex Bridge Deployment Rule

The deployed frontend cannot use a user's local desktop Codex login by itself. The current implementation uses the backend server's Codex CLI/app-server session. A deployed server needs:

- stateful Node backend, not static frontend only
- `CODEX_BRIDGE_ENABLED=true`
- Codex CLI available to the backend process through `CODEX_BRIDGE_COMMAND`, `CODEX_CLI_PATH`, or `PATH`
- persistent `CODEX_BRIDGE_HOME` or `CODEX_HOME` mounted on the backend host
- backend-side Codex login completed for that home directory before real traffic depends on `codex_bridge`

Serverless or edge-style hosting is a poor fit because the bridge depends on spawning the Codex CLI and keeping server-side login state.

Deployment is considered Codex Bridge capable only when the backend can run `codex app-server --listen stdio://`, read the same persistent Codex home on every restart, and `account/read` reports a usable account. A browser session, desktop Codex app login, or local `~/.codex` on the end user's computer does not satisfy this requirement.

Non-capable deployments:

- static frontend-only hosting
- edge/serverless functions without a writable persistent Codex home
- backend containers that lose `CODEX_BRIDGE_HOME` on restart
- backend hosts where Codex CLI is missing from `PATH` and no explicit command path is configured
- any host where the configured Codex home has not completed backend-side login

Operational checks:

1. Set `CODEX_BRIDGE_ENABLED=true`.
2. Set `CODEX_BRIDGE_COMMAND` or `CODEX_CLI_PATH` if the backend process cannot find `codex` on `PATH`.
3. Set `CODEX_BRIDGE_HOME` to a persistent backend-side directory. Do not point this at a developer laptop home for production.
4. Run `pnpm codex:bridge:smoke` from the repo root on the backend host. It should print `ok: true`.
5. If not logged in, run `pnpm --filter @neet2work/backend run codex:bridge:smoke -- --start-login --wait-login` from an operator shell, complete the displayed OAuth flow, then rerun the smoke check.
6. Check `GET /api/draft-workflow/providers`; `codex_bridge` must be `configured: true` and `online: true`. If it reports `codex_not_logged_in`, the backend Codex home still needs login. If it reports `codex_app_server_unavailable`, the backend cannot spawn or talk to the Codex CLI app-server.

Fallback behavior remains intentional: in `auto` routing, unavailable Codex Bridge should fall through to Gemini, Local AI, and then the deterministic fallback according to `AI_PROVIDER_ORDER`. In `manual` routing, selecting `codex_bridge` still falls back to the deterministic provider rather than another paid provider.

## Self-Introduction Reference Strategy

The active reference store is:

- `apps/frontend/src/data/selfIntroReferenceLibrary.ts`

The library stores source URLs, extracted writing rules, and synthesized safe patterns. It intentionally does not copy full example essays. This avoids copyright issues and prevents reference facts from leaking into a user's draft.

The active learning path is request-time reference injection:

1. `AIDraftChatBuilder` calls `buildSelfIntroReferenceText()`.
2. The result is sent as `experienceInput.referenceSelfIntroText`.
3. The backend prompt already instructs the AI to use this field only as style and structure guidance.
4. User facts still must come from chat input, attachments, gap answers, or selected job context.

This is not model fine-tuning. It is a safer RAG-style reference context for each draft workflow run.

## Next Product Step

For a fuller reference product, reuse existing `ApplicationDocument` rows with `documentType = "cover_letter"` as user-owned reference documents. The frontend can load selected cover letters and merge their content into `referenceSelfIntroText`, while the backend should keep ownership checks in the document API rather than directly trusting arbitrary document IDs in the draft workflow API.
