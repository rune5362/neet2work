# Merge conflict resolution - 2026-06-04

## Summary

- Current branch: `daegyune/page/home`
- Merged branch: `origin/sungho-merge-daegyune-page-home`
- Conflict files:
  - `apps/backend/src/config/ai-config.ts`
  - `apps/frontend/src/App.tsx`

## Conflict cause

### `apps/backend/src/config/ai-config.ts`

`daegyune/page/home` added explicit `.env` loading through `dotenv`, `fileURLToPath`, and backend/root env path resolution. The merged branch added filesystem-based Codex CLI discovery through `existsSync`, `readdirSync`, and `statSync`, while importing `join` from `node:path`.

The conflict happened because both branches changed the top import block and the same config module responsibilities at the same time.

### `apps/frontend/src/App.tsx`

`daegyune/page/home` kept direct page imports and removed the retired profile/document version flow. The merged branch converted page imports to `React.lazy`/`Suspense`, but also reintroduced routes and lazy imports for `ProfileVersions` and `DocumentVersions`.

The conflict happened because both branches changed the app routing entrypoint. The version-route part was incompatible with the current codebase because the version pages have already been removed.

## Resolution

### `apps/backend/src/config/ai-config.ts`

Kept both valid changes:

- Preserved root/backend `.env` loading.
- Preserved Codex bridge command/home auto-discovery.
- Consolidated path usage through the existing default `path` import instead of mixing `path` and named `join` imports.
- Prevented local `.env` values from changing Vitest expectations by skipping automatic `.env` loading when `NODE_ENV=test`.

### `apps/frontend/src/App.tsx`

Kept the route lazy-loading change and removed the incompatible version-route restoration:

- Preserved `React.lazy`, `Suspense`, and `DeferredPage`.
- Wrapped existing page returns with `DeferredPage`.
- Removed `ProfileVersions` and `DocumentVersions` imports/routes because those page modules do not exist and the version workflow is retired.

## Verification notes

Manual checks performed during conflict resolution:

- Confirmed no conflict markers remained in the two conflicted files.
- Confirmed `apps/frontend/src/pages/ProfileVersions.tsx` does not exist.
- Confirmed `apps/frontend/src/pages/DocumentVersions.tsx` does not exist.
- Confirmed no remaining `ProfileVersions` or `DocumentVersions` references in `apps/frontend/src`.

Follow-up test adjustment:

- Backend tests initially failed because local `.env` enabled Codex Bridge during Vitest, changing the expected disabled-provider response from `400` to `500`.
- The fix keeps runtime `.env` loading but skips it in `NODE_ENV=test`, so test behavior stays deterministic.

Commands executed after resolution:

- `corepack pnpm --filter @neet2work/frontend test`: passed, 85 tests.
- `corepack pnpm --filter @neet2work/backend test`: passed, 201 tests.
- `corepack pnpm --filter @neet2work/frontend build`: passed.
- `corepack pnpm --filter @neet2work/backend build`: passed.
