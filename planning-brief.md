# Neet2Work Job Collection Pipeline Planning Brief

Date: 2026-05-15
Workspace: `C:\lsh\git\neet2work`
Branch observed: `playground`
Package manager: `pnpm@11.1.1` via Corepack

## Goal

Plan the path from Korean job-site collection to Japanese job-site collection,
ending in final scripts that can:

- verify whether each candidate site is currently collectable through public
  `HTTP request + HTML parsing`,
- collect a small sample from approved sites,
- normalize samples to the existing `JobPosting` JSON contract,
- validate that JSON through the TypeScript dry-run import boundary,
- keep the mock-first demo path stable when external sites, DBs, or optional
  services are unavailable.

The implementation order is Korean sites first, then Japanese sites. A site is
not approved just because it appears in the target list. Each site must pass a
current probe before a collector script is added to the final set.

## Current Repo Shape

- `apps/frontend`: React 19 + Vite 7 + TypeScript UI.
- `apps/backend`: Express 5 + TypeScript API, Prisma 7, PostgreSQL adapter,
  import validator, mock fallback services.
- `scripts/job_crawler`: Python collector skeleton and Saramin proof.
- `docs/research/job-sites`: source audits, schema notes, risk review, and
  sample output.
- `docs/work-log`: current work-log files and Figma sync workflow.
- `docs/runbooks/CHROME_GPT_REVIEW_RULES.md`: Chrome/ChatGPT review rules.

Important existing files:

- `scripts/job_crawler/models.py`: shared `SourceJobLink` and
  `StandardJobPosting` dataclasses.
- `scripts/job_crawler/http_client.py`: shared HTTP client and user-agent.
- `scripts/job_crawler/saramin.py`: first working source-specific collector.
- `scripts/job_crawler/README.md`: collector safety and execution contract.
- `apps/backend/prisma/importJobPostings.ts`: standard JSON validator and DB
  upsert command.
- `apps/backend/src/scripts/saraminImportCheck.ts`: current Saramin-specific
  check runner.
- `apps/backend/src/services/job.service.ts`: public API field boundary.
- `apps/backend/src/types/job.ts`: backend public and collected job types.
- `apps/frontend/src/types/job.ts`: frontend public job type.
- `docs/research/job-sites/JOB_POSTING_COLLECTION_SCHEMA.md`: standard
  collection schema.
- `docs/research/job-sites/FINAL_JOB_SITE_COLLECTION_TARGETS.md`: current
  candidate queue and exclusions.
- `docs/research/job-sites/COLLECTION_STRATEGY_RISK_REVIEW.md`: current risk
  policy and remaining gaps.

## Current Constraints

- Default collection method is `HTTP request + HTML parsing`.
- JS-rendering-only, login-gated, captcha-gated, internal-API-only, explicit
  scraping-prohibited, or official-API-application-required sources are not
  first-class targets.
- Python collectors must not write to the DB directly.
- Collectors output standard JSON first; import is a separate explicit step.
- Default sample size stays `1`; hard maximum stays `5` unless risk policy is
  explicitly changed.
- Two or more detail requests require delay.
- `rawText` may keep a bounded public text excerpt; full HTML must not be
  stored.
- Public API and frontend types must not expose `rawText`, `rawJson`, or
  `companyInfo`.
- `.env` values must not be read, printed, or committed.
- Real DB mutation commands require explicit user intent and current
  `DATABASE_URL`; dry-run import is allowed.
- Docker is optional, not a required dev path.
- Prisma schema and migrations are guarded. Avoid schema changes until a
  verified Japanese/global source proves current fields cannot carry required
  information.

## Current Dirty Worktree Scope

Known current-session changes before implementation:

- `AGENTS.md`: Chrome/GPT runbook rule and pnpm command correction.
- `planning-brief.md`: this planning brief.
- `docs/plans/2026-05-15-job-collection-pipeline.md`: main plan target.
- `docs/plans/2026-05-15-job-collection-pipeline-gpt-review.md`: GPT review
  reconciliation target.
- `docs/runbooks/CHROME_GPT_REVIEW_RULES.md`: Chrome/GPT review runbook.
- `docs/work-log/WORK_SESSIONS.md` and `docs/work-log/WORK_LOG.md`: current
  work-log entries.
- `docs/work-log/archive/2026-05-14/**`: date rollover archive created by the
  work-log prepare script.

Do not overwrite unrelated user changes if new dirty files appear.

## Current Target Queue

Treat this as a probe queue, not as an approved implementation list.

Korean phase:

1. `saramin` - implemented proof and baseline.
2. `jobkorea` - next candidate; list-first collection may be acceptable.
3. `catch` - company/job-detail enrichment candidate.
4. `linkareer` - category-limited intern/newcomer candidate.
5. `jobplanet` - guarded candidate because public list exposure was previously
   weak.
6. `indeed_kr` - auxiliary/small-sample only because of captcha, duplication,
   and external-source risk.

Japanese phase:

1. `mynavi_tenshoku`
2. `doda`
3. `rikunabi_next`
4. `daijob`
5. `careercross`
6. `green_japan`

Excluded from first final script set:

- `KOREC`: JS rendering, internal API, and login-modal risk.
- `LinkedIn`: login and blocking risk.
- `Hello Work`: official API/application candidate, not crawler target.
- sources with explicit scraping prohibition or reliable public HTML failure.

## Modification Boundaries

Allowed write set for the planned implementation:

- `scripts/job_crawler/**`
- `apps/backend/src/scripts/**`
- `apps/backend/src/scripts/*.test.ts`
- `apps/backend/package.json`
- root `package.json`
- `docs/research/job-sites/**`
- `docs/plans/**`
- `docs/work-log/WORK_SESSIONS.md`
- `docs/work-log/WORK_LOG.md`

Guarded write set:

- `apps/backend/prisma/schema.prisma`
- `apps/backend/prisma/migrations/**`
- `apps/backend/src/services/job.service.ts`
- `apps/backend/src/types/job.ts`
- `apps/frontend/src/types/job.ts`
- `apps/frontend/**`

Do not edit:

- `.env` or secret-bearing local config
- `node_modules/**`
- `dist/**`
- `apps/backend/src/generated/prisma/**`
- archived work logs except when a work-log archival script creates them

## Verification Commands

Baseline:

```bash
git status --short
corepack pnpm run crawl:saramin:check
corepack pnpm --filter @neet2work/backend test
corepack pnpm --filter @neet2work/backend lint
.\apps\backend\node_modules\.bin\tsc.CMD --noEmit -p apps\backend\tsconfig.json
rg -n "rawText|rawJson|companyInfo" apps/backend/src apps/frontend/src
git diff --check
```

Python collector checks:

```bash
python -m py_compile scripts/job_crawler/*.py
python scripts/job_crawler/<source>.py --limit 1 --output docs/research/job-sites/<source>_sample_YYYY-MM-DD.json
```

Dry-run import check:

```bash
corepack pnpm --filter @neet2work/backend run db:import:jobs --dry-run ../../docs/research/job-sites/<source>_sample_YYYY-MM-DD.json
```

Existing source check:

```bash
corepack pnpm run crawl:saramin:check
```

Full repo check after source-specific checks are stable:

```bash
corepack pnpm run check
```

Work-log checks:

```bash
corepack pnpm run worklog:prepare
corepack pnpm run worklog:export
```

## GPT-5.5 Pro Extended Review Request

Use `@chrome` through the Chrome extension backend. Required evidence:

- selected browser name: Chrome
- backend type: extension
- ChatGPT model label: GPT-5.5 Pro or visible equivalent
- Pro submode: `확장` checked

Submit the following prompt to ChatGPT. GPT's role is only strict PM,
architecture, and risk review. GPT output is external review, not repo truth.

```text
You are a strict PM, backend architect, and scraping-risk reviewer.

Review this Neet2Work implementation planning brief. Be intentionally hard on
scope, sequencing, safety, rollback risk, and overengineering.

Project goal:
Build a verified, standardized job-posting collection pipeline from Korean job
sites first, then Japanese job sites, ending with final scripts that can probe
collectability, collect small public samples, normalize to the current
JobPosting JSON contract, and dry-run import validation.

Hard collection rule:
Use only public HTTP requests plus HTML parsing. Exclude or downgrade sources
requiring login, captcha bypass, stealth/proxy behavior, JS-rendering-only
collection, internal API reliance, official API application, or explicit
scraping prohibition.

Current repo facts:
- Package manager is pnpm 11 through Corepack.
- Python collectors live in scripts/job_crawler.
- Existing shared files are models.py and http_client.py.
- Existing proof collector is saramin.py.
- Existing TypeScript import validator is apps/backend/prisma/importJobPostings.ts.
- Existing runner is apps/backend/src/scripts/saraminImportCheck.ts.
- Public API boundary is apps/backend/src/services/job.service.ts.
- Standard JSON fields include id, title, company, location, careerLevel,
  skills, description, source, sourceJobId, sourceUrl, country, language,
  employmentType, educationLevel, salaryText, deadlineText, applyMethod,
  companyInfo, rawText, rawJson, collectedAt.
- Collectors must output JSON first and must not write to DB directly.
- Default limit is 1, max limit is 5, and multi-detail collection needs delay.
- Keep mock fallback stable.
- Do not expose rawText/rawJson/companyInfo via public API responses.
- Avoid schema changes until Japanese/global samples prove current fields are
  insufficient.

Target queue:
Korea: saramin, jobkorea, catch, linkareer, jobplanet, indeed_kr.
Japan: mynavi_tenshoku, doda, rikunabi_next, daijob, careercross, green_japan.
KOREC is excluded from the first final script set because it appears
JS/internal-API/login-modal dependent.

Please strengthen the plan with:
1. phase ordering,
2. architecture boundaries,
3. per-site acceptance checks,
4. rollback risks,
5. verification commands,
6. anti-bot/legal risk gates,
7. what to avoid overengineering,
8. criteria for dropping or downgrading a site,
9. exact final execution checklist format with write set, acceptance checks,
   rollback risks, and verification commands.

Return concrete execution checklist content, not generic advice.
```

## Codex Reconciliation Rule

After GPT returns a review, Codex must:

1. save the review summary to
   `docs/plans/2026-05-15-job-collection-pipeline-gpt-review.md`,
2. reread that file and the repo source-of-truth files,
3. accept only advice compatible with current files, constraints, and tests,
4. reject or defer advice that requires browser automation, internal APIs,
   schema changes without proof, production crawling infrastructure, or public
   raw-field exposure,
5. update `docs/plans/2026-05-15-job-collection-pipeline.md` into the final
   execution checklist.
