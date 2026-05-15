# GPT Review Reconciliation: Job Collection Pipeline

Date: 2026-05-15
Review target: `planning-brief.md`
Review channel: ChatGPT via `chrome@openai-bundled`, Chrome extension backend

## Browser And Model Evidence

- selected browser: Chrome
- backend type: extension
- trusted browser-client path:
  `C:\Users\pc07-00\.codex\.tmp\bundled-marketplaces\openai-bundled\plugins\chrome\scripts\browser-client.mjs`
- ChatGPT menu evidence:
  - menu header showed `최신 • 5.5`
  - `Pro • 확장` was checked
  - input control showed `Pro 확장 모드`
- first GPT response tried to use external search-style behavior and was not
  usable as the architectural review artifact.
- a stricter follow-up prompt instructed GPT to avoid browsing and use only the
  supplied repo facts; the final full response was then used for reconciliation.

## GPT Review Themes

The useful parts of the final GPT review were:

- Treat every source as a release-gated candidate, not an approved target.
- Keep `saramin` as the baseline before touching `jobkorea`.
- Use `GREEN`, `YELLOW`, and `RED` status gates.
- Implement collectors only for `GREEN` sources.
- Keep `YELLOW` and `RED` sources as evidence notes, not brittle scripts.
- Add explicit legal/anti-bot gates before a source can be `GREEN`.
- Reject login, captcha, proxy, stealth, browser automation, JS-only rendering,
  and internal API paths.
- Keep Python collectors JSON-only and DB-write-free.
- Do not expose `rawText`, `rawJson`, or `companyInfo` through public API
  responses.
- Avoid schema migration until Japanese/global sample evidence proves the
  current contract is insufficient.
- Final scripts should cover only approved `GREEN` sources.

## Accepted Into The Plan

- Phase 0 must freeze the collector/import/API contract before adding any new
  source.
- Current `saramin` check must pass, or any failure must be documented as a
  public-site/network blocker before continuing.
- Source probe evidence must exist before each new collector.
- The source status gate is:
  - `GREEN`: implement and include in final scripts.
  - `YELLOW`: keep evidence, exclude from final scripts for now.
  - `RED`: document blocker and drop from final script set.
- `KOREC` stays excluded from the first final script set.
- `indeed_kr` stays auxiliary even if it passes a tiny sample check.
- `jobplanet`, `mynavi_tenshoku`, `doda`, and similar high-value but
  risk-sensitive sources need current probe evidence before implementation.
- Multi-detail collection must keep delay and max-limit safety.
- The matrix/final script should run approved sources only.

## Adjusted For Repo Reality

GPT suggested a `scripts/job_crawler/source_status.md` file. This repo already
groups collection research under `docs/research/job-sites/`, so status evidence
should live under:

- `docs/research/job-sites/evidence/<source>_2026-05-15.md`

GPT suggested a Python `scripts/job_crawler/run.py` runner. This repo already
has a TypeScript dry-run import boundary and a Saramin-specific TypeScript
runner:

- `apps/backend/src/scripts/saraminImportCheck.ts`

Therefore the plan should not create a Python orchestration runner first. The
repo-aligned sequence is:

1. keep source-specific Python collectors for output,
2. validate output through the existing TypeScript import validator,
3. add a small TypeScript check runner after a second `GREEN` source proves the
   repeated command shape,
4. add a matrix check only after several `GREEN` sources exist.

GPT suggested generic Unix `/tmp` examples and plain `pnpm` commands. This repo
standard is Corepack + pnpm 11, so final commands should use:

- `corepack pnpm ...`
- repo-local `tmp/<source>_import_check.json`
- existing script names such as `crawl:saramin:check` and
  `db:import:jobs`

GPT's static grep examples are useful as safety checks, but they must be scoped
so they do not confuse the backend's existing `apps/backend/src/rpa`
Playwright placeholder with Python crawler policy. The hard ban applies to:

- `scripts/job_crawler/**`

## Rejected Or Deferred

- Do not add browser automation for collection.
- Do not add captcha/proxy/stealth handling.
- Do not rely on undocumented internal APIs.
- Do not create official API application flows in this plan.
- Do not add scheduler, queue, worker, or production crawling infrastructure.
- Do not add a schema migration only to fit site-specific fields that can stay
  in `rawJson` during proof.
- Do not implement collectors for `YELLOW` or `RED` sources.
- Do not migrate Japanese/global fields to public API until real samples and UI
  need prove the requirement.

## Final Reconciliation Decision

The final plan should be stricter than the original target-list plan:

1. first verify the current contract and Saramin baseline,
2. create a reusable evidence template,
3. probe `jobkorea`,
4. implement `jobkorea` only if it is `GREEN`,
5. finish all Korean source probes and `GREEN` collectors before moving to
   Japan,
6. run a Japanese field-gap review before any Japanese script,
7. probe each Japanese source before implementation,
8. build final scripts only around `GREEN` sources,
9. preserve downgrade evidence for every excluded or deferred source.
