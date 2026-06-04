# Frontend UI vs DB Review

Date: 2026-05-20

This review compares the current frontend UI against the backend API contract and the
currently connected development database. It focuses on UI/UX gaps only, not backend
schema changes or implementation details.

## Evidence Checked

- Frontend screens:
  - `apps/frontend/src/pages/Home.tsx`
  - `apps/frontend/src/pages/Jobs.tsx`
  - `apps/frontend/src/pages/AIAnalysisFront.tsx`
  - `apps/frontend/src/pages/AIAnalysisDetails.tsx`
  - `apps/frontend/src/components/HomeTopNav.tsx`
  - `apps/frontend/src/components/HomeFooter.tsx`
- API contract:
  - `docs/API_CONTRACT.md`
- Backend/database surface:
  - `GET /health`
  - `GET /api/jobs?limit=100`
  - `GET /api/jobs/facets`
  - `POST /api/analyze`
  - `apps/backend/prisma/schema.prisma`
- Browser smoke check:
  - `/#home`
  - `/jobs`
  - `/ai-analysis`
  - `/ai-analysis/details`

## Current DB/API Shape Relevant To UI

Current local backend health:

| Area | Current value |
| --- | --- |
| Backend | responding |
| Database | connected |
| AI | mock |
| Storage | local |

Current active job data:

| Metric | Value |
| --- | ---: |
| Active public jobs | 95 |
| Sources | 7 |
| Countries | JP 55, KR 40 |
| Languages | ko 40, ja 35, en 20 |
| Jobs with salary text | 69 / 95 |
| Jobs with employment type | 57 / 95 |
| Jobs with education level | 50 / 95 |
| Jobs with deadline text | 30 / 95 |
| Jobs with apply method | 43 / 95 |
| Jobs with empty skills | 22 / 95 |
| Max skills on one job | 14 |
| Longest title observed | 159 chars |
| Longest description observed | 732 chars |

Implication: the UI must handle multilingual Korean/Japanese/English text, long titles,
optional fields, empty skill arrays, and dense metadata. The current UI is visually clean
but still behaves like a static landing/demo mock.

## Highest Priority UI Gaps

### P0 - Jobs List Must Become A Real Data Surface

Current UI:

- `Jobs.tsx` renders a local `const jobs` array.
- Header says `총 1,240개의 공고`.
- Filters are static `산업`, `경력 수준`, `근무 형태`.
- Pagination shows hardcoded page numbers.
- `상세 보기` links back to `/jobs`.

DB/API reality:

- Backend exposes 95 active jobs in the current DB.
- Backend filters are `q`, `source`, `country`, `language`, `limit`.
- Backend exposes facet counts through `/api/jobs/facets`.
- Backend does not expose pagination yet.

Needed UI additions:

| UI addition | Why |
| --- | --- |
| Data-backed result count | Replace fake `1,240` with actual count/loaded count. |
| Source/country/language filter controls | Match backend facets instead of static industry filters. |
| Search status summary | Show active filters, e.g. `JP · ja · green_japan`. |
| Loading skeleton for job cards | API data will not be instant. |
| Empty state | Needed when DB is connected but no jobs match filters. |
| Error/fallback banner | Needed when backend is unavailable or sample data is shown. |
| Remove or disable fake pagination | Backend only supports `limit`; page buttons imply unsupported behavior. |
| Result limit control | Until pagination exists, expose `24 / 50 / 100` style display limits. |

### P0 - Job Cards Need Real Metadata Layout

Current cards show:

- Mock icon
- Title
- Company
- Mock tags
- Short description
- Static actions

Actual job rows include:

- `source`, `sourceJobId`, `sourceUrl`
- `country`, `language`
- `location`, `careerLevel`
- `employmentType`, `educationLevel`
- `salaryText`, `deadlineText`, `applyMethod`
- `skills`, `collectedAt`

Needed UI additions:

| UI addition | Why |
| --- | --- |
| Source badge | Users need to know whether a job came from Saramin, JobKorea, Mynavi, etc. |
| Country/language badge | The DB mixes KR/JP and ko/ja/en jobs. |
| Salary row | Present on 69 / 95 jobs, high value for scanning. |
| Employment/career row | Present enough to matter, but optional enough to need fallback handling. |
| Deadline/apply method row | Useful when available; hide cleanly when null. |
| Skill chip overflow handling | Some jobs have 14 skills; show first few plus `+N`. |
| Long-title clamp | Longest title is 159 chars; cards need 2-line clamp. |
| Description clamp with detail escape | Longest description is 732 chars; cards should not carry full body. |
| Collected/new timestamp treatment | `collectedAt` exists for all active jobs; use for freshness. |

### P0 - Job Detail UI Is Missing

Current UI:

- No `/jobs/:id` route.
- `상세 보기` loops to `/jobs`.
- There is no detail drawer, modal, or page.

DB/API reality:

- Backend exposes `GET /api/jobs/:id`.
- Job details contain long descriptions and optional metadata that do not fit cards.

Needed UI additions:

| UI addition | Why |
| --- | --- |
| Job detail page or right-side drawer | Gives long descriptions and metadata a proper reading surface. |
| Metadata summary block | Salary, location, career, education, language, source. |
| Original posting CTA | Use `sourceUrl` for external source navigation. |
| Source provenance line | Show source and source job id for trust/debuggability. |
| `AI 적합도 분석` CTA | Detail is the natural handoff into analysis with `job.id`. |
| Missing-field fallback labels | Optional DB fields should disappear or show restrained placeholders. |

### P0 - AI Analysis Needs Selected Job Context

Current UI:

- `/ai-analysis` has a generic job select with hardcoded job categories.
- The submit control is an anchor to `/ai-analysis/details`.
- `/ai-analysis/details` is a static result screen.

Backend/API reality:

- `POST /api/analyze` requires `jobId` and `resumeText`.
- Analysis output is tied to a selected job.

Needed UI additions:

| UI addition | Why |
| --- | --- |
| Selected job summary panel | Users need to see which posting the resume is being compared against. |
| Job picker/search fallback | Allows starting from AI Analysis without coming from a job card. |
| Disabled state until job is selected | Prevents invalid analysis requests. |
| Resume textarea validation | Backend requires `resumeText` length >= 10. |
| Character count and validation message | Makes the minimum requirement visible. |
| Analysis progress state | Mock today, AI later; both need feedback. |
| Analysis error state | Show validation/server errors without leaving the page. |

### P0 - Analysis Result Screen Must Map To API Fields

Current result UI shows fixed content:

- Static `94%`
- Static strengths
- Static optimization examples
- Static skill metric labels
- Static `Raw AI Insights`

Actual analysis response fields:

- `matchScore`
- `strengths`
- `weaknesses`
- `missingKeywords`
- `rewriteGuides`
- `suggestedSentences`
- `mode`

Needed UI additions:

| UI addition | Why |
| --- | --- |
| API-backed score module | Render `matchScore` instead of fixed 94%. |
| Strengths section | Directly maps to `strengths`. |
| Weaknesses/risks section | Directly maps to `weaknesses`; currently absent. |
| Missing keyword chips | Directly maps to `missingKeywords`; high-value UI. |
| Rewrite guide checklist | Directly maps to `rewriteGuides`. |
| Suggested sentence cards | Directly maps to `suggestedSentences`; add copy affordance later. |
| Mode badge | Show `mock` vs `ai` honestly. |
| Selected job recap | Result should still show the target job title/company. |

## Screen-By-Screen UI Additions

### Home

Current home is strong visually, but it contains static product claims that now conflict
with live DB state.

Add:

- Live-ish stats strip using backend-safe values:
  - active jobs
  - source count
  - KR/JP coverage
  - AI mode `mock`
- CTA routing clarity:
  - `채용공고 보기`
  - `AI 분석 시작`
- Backend status microcopy:
  - Useful in a mock-first app where DB may be connected, unavailable, or sample-backed.
- Replace unsupported claims:
  - `현재 12,402명의 청년이 이용 중` is not backed by current data.
  - `합격 자기소개서 5만 건` is not backed by current DB/API.

### Jobs

Add:

- Facet-driven filter bar:
  - source
  - country
  - language
  - search query
- Result count and active-filter chips.
- Card metadata rows:
  - location
  - career level
  - salary
  - employment type
  - deadline
  - source/country/language
- Detail drawer/page.
- Original source link.
- `AI 분석` CTA carrying `job.id`.
- Loading, empty, error, and fallback states.
- Long text safeguards:
  - title clamp
  - description clamp
  - `word-break`/overflow handling for English and Japanese strings.

### AI Analysis Entry

Add:

- Selected job card:
  - title
  - company
  - source
  - country/language
- Job search/select control when no job is selected.
- Resume textarea state:
  - min length validation
  - character count
  - submit disabled until valid
- Analysis pending state.
- Error panel for validation or server failure.
- Tone control either:
  - mark as visual-only for now, or
  - remove until backend supports tone.

### AI Analysis Details

Add:

- Result rendering from `AnalysisResult`.
- Job context header.
- Separate sections for:
  - score
  - strengths
  - weaknesses
  - missing keywords
  - rewrite guides
  - suggested sentences
- Empty-array handling:
  - e.g. if `weaknesses` is empty, show a positive compact state.
- Honest mode/status badge:
  - `mock analysis` now, `AI analysis` later.
- Disable or hide unsupported actions:
  - PDF download
  - resume auto-edit
  - instant apply

### Navigation And Footer

Add or adjust:

- `알림` and `계정` should not look live if no auth/notification backend exists.
- Footer legal/support links currently point to `#support`; either add real placeholder pages or style as disabled/upcoming.
- Navigation should support future job detail paths so active state remains correct under `/jobs/:id`.

## Interaction States Required Before Real API Integration

These are UI states, not backend work:

| State | Where needed |
| --- | --- |
| Loading skeleton | Jobs list, facets, job detail, analysis result |
| Empty state | Jobs list, filter result, optional analysis sections |
| Error state | Jobs API, facets API, analyze API |
| Sample/fallback state | Jobs list when backend is unavailable |
| Disabled state | Analyze button before job/resume are valid |
| Long content state | Job card/detail titles and descriptions |
| Optional metadata state | Salary, deadline, education, apply method |
| Multilingual text state | KR/JP/EN cards and detail body |

## Recommended UI Build Order

1. Replace static jobs header/card/filter UI with DB-shaped components, still allowed to render mock data.
2. Add job list loading/empty/error/fallback states.
3. Add job detail drawer or page.
4. Add selected-job context into AI Analysis.
5. Convert AI Analysis Details from static mock panels to `AnalysisResult` sections.
6. Add home status/stat strip once jobs UI has stable data formatting.
7. Clean up unsupported nav/footer/actions so they do not imply finished auth, notifications, PDF, auto-edit, or instant apply features.

## Non-Goals For This UI Pass

- Do not add frontend DB provider keys.
- Do not expose raw crawl fields.
- Do not design pagination as real pages until backend pagination exists.
- Do not imply real AI when `/health` reports `ai: "mock"`.
- Do not add auth/account/notification UI as if those systems exist.
