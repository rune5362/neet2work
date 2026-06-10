# Neet2Work API Contract

This document is the current backend contract for the teammate frontend handoff.
The frontend should call the backend through `VITE_API_BASE_URL`, not a database
provider directly.

## Runtime

- Local backend base URL: `http://localhost:3000`
- Local frontend env: `VITE_API_BASE_URL=http://localhost:3000`
- Database path: frontend -> backend API -> Prisma/pg -> personal PostgreSQL DB
- Supported DB targets: PostgreSQL-compatible personal dev DBs such as
  Supabase Postgres, AWS RDS PostgreSQL, Docker PostgreSQL, or local PostgreSQL.
- Browser DB provider keys are not required by the current frontend contract.
- DB/API handoff details live in `docs/DB_API_TEAM_HANDOFF.md`.

## Health

### `GET /health`

Returns runtime dependency status.

```json
{
  "ok": true,
  "database": "connected",
  "ai": "mock",
  "storage": "local"
}
```

Fields:

| Field | Type | Values | Notes |
| --- | --- | --- | --- |
| `ok` | boolean | `true` | Express process is responding. |
| `database` | string | `connected`, `not_configured`, `unavailable` | `connected` means DB access is live. |
| `ai` | string | `mock` | Current analysis path is mock. `AI_API_KEY` alone does not switch the backend to real AI. |
| `storage` | string | `local` | R2 is optional and not wired into the current runtime path. |

## Jobs

### `GET /api/jobs`

Returns the public active job list. When DB is configured, the backend returns
the latest matching rows whose lifecycle `status` is `active`. If DB is not
configured or unavailable, it falls back to local sample jobs so the demo path
still renders. If DB is connected but has no matching active rows, it returns an
empty list. Query/schema errors are not hidden behind sample fallback.

Query params:

| Param | Type | Rule | Notes |
| --- | --- | --- | --- |
| `q` | string | optional | Case-insensitive text search over `title`, `company`, inferred `jobCategory`, `location`, `description`, and `skills`. |
| `source` | string | optional | Exact source match, such as `careercross` or `daijob`. |
| `country` | string | optional | Exact country match, such as `JP` or `KR`. |
| `language` | string | optional | Exact language match, such as `ja`, `en`, or `ko`. |
| `careerStage` | string | optional, `entry`, `junior`, `senior` | Public three-step career filter. Raw source labels such as `Mid Career`, `未経験歓迎`, and `경력8년↑` are normalized by the backend. |
| `employmentTypeCategory` | string | optional, `permanent`, `contract`, `intern`, `freelance`, `unspecified` | Public employment filter. `unspecified` keeps only jobs whose public employment category is still `null` even after checking `employmentType`, `title`, `careerLevel`, and `description`. |
| `jobCategory` | string | optional | Frontend-facing inferred job category such as `개발`, `AI/데이터`, `디자인`, `마케팅`, `보안`, `PM`. |
| `region1` | string | optional | Case-insensitive location substring filter for the first region depth. |
| `region2` | string | optional | Case-insensitive location substring filter for the second region depth. |
| `region3` | string | optional | Case-insensitive location substring filter for the third region depth. |
| `skill` | string | optional | Exact skill badge match. |
| `salaryVisibility` | string | optional, `disclosed`, `undisclosed` | Filters jobs by whether `salaryText` exists. |
| `deadlineType` | string | optional, `dated`, `rolling` | `rolling` keeps only `상시 채용`. `dated` keeps the remaining jobs. |
| `newOnly` | boolean | optional | Keeps only jobs whose public `postedAt` is within the last 3 days. |
| `page` | number | optional, >= 1 | 1-based page number. Out-of-range requests are clamped to the last available page. |
| `limit` | number | optional, 1-100 | Page size. Defaults to `9` on the paginated route. |

```json
{
  "data": [
    {
      "id": "job-id",
      "title": "Media Project Manager - Japan",
      "company": "Hotwire Global Pte Ltd",
      "location": "Available across Japan",
      "careerLevel": "Mid Career",
      "skills": ["Cloud", "AI", "Data"],
      "description": "Public job description text",
      "source": "careercross",
      "sourceJobId": "1590000",
      "sourceUrl": "https://example.com/job",
      "country": "JP",
      "language": "en",
      "employmentType": null,
      "careerStage": "junior",
      "employmentTypeCategory": null,
      "educationLevel": null,
      "salaryText": null,
      "deadlineText": null,
      "applyMethod": null,
      "postedAt": null,
      "collectedAt": "2026-05-19T06:00:00.000Z"
    }
  ],
  "count": 1,
  "total": 95,
  "page": 1,
  "limit": 9,
  "availableSkills": ["AI", "Cloud", "Data"]
}
```

Public job fields:

| Field | Type | Nullable | Notes |
| --- | --- | --- | --- |
| `id` | string | no | Internal DB id. Use this for `/api/analyze`. |
| `title` | string | no | Job title. |
| `company` | string | no | May be fallback text such as `Company unavailable`. |
| `location` | string | no | Source-normalized display text. |
| `careerLevel` | string | no | Human-readable career label. |
| `skills` | string[] | no | Can be empty. Render as badges when present. |
| `description` | string | no | Public description. May be compact. |
| `source` | string | yes | Example: `careercross`, `daijob`, `green_japan`, `mynavi_tenshoku`, `sample`. |
| `sourceJobId` | string | yes | Source-side stable id when available. |
| `sourceUrl` | string | no | External source URL. |
| `country` | string | yes | Example: `JP`, `KR`. |
| `language` | string | yes | Example: `ja`, `en`, `ko`. |
| `employmentType` | string | yes | Optional source value. |
| `careerStage` | string | yes | Public normalized career stage: `entry`, `junior`, `senior`, or `null` when source data is too vague. |
| `employmentTypeCategory` | string | yes | Public normalized employment type: `permanent`, `contract`, `intern`, `freelance`, or `null` when source data is too vague even after checking `employmentType`, `title`, `careerLevel`, and `description`. |
| `educationLevel` | string | yes | Optional source value. |
| `salaryText` | string | yes | Optional display text. |
| `deadlineText` | string | yes | Optional display text. |
| `applyMethod` | string | yes | Optional display text. |
| `postedAt` | string | yes | ISO timestamp or `null`. Best-effort public posting date. Prefers the source posting-period start when available, otherwise source update date. |
| `collectedAt` | string | yes | ISO timestamp or `null`. |

List envelope fields:

| Field | Type | Notes |
| --- | --- | --- |
| `count` | number | Current page item count. |
| `total` | number | Full filtered result count before page slicing. |
| `page` | number | 1-based current page after backend clamping. |
| `limit` | number | Applied page size. |
| `availableSkills` | string[] | Unique skills across the full filtered result set, sorted ascending. |

Not exposed:

- Raw crawl text/JSON
- Company info raw payload
- Classifier metadata
- Crawl batch ids
- Lifecycle internals such as `missingCount`

Current limitations:

- Pagination is page-number based rather than cursor based.
- List order is newest `collectedAt`, then newest `createdAt`.
- Closed, inactive, and unknown lifecycle rows are not exposed in this public list.
- Some public filters such as `jobCategory` are inferred from public text rather than stored DB enums.
- `postedAt` is best-effort and may be `null` when the source does not expose a reliable public posting date.

### `GET /api/jobs/facets`

Returns filter metadata for the public active job list.

```json
{
  "data": {
    "sources": [
      {
        "value": "careercross",
        "count": 4
      }
    ],
    "countries": [
      {
        "value": "JP",
        "count": 95
      }
    ],
    "languages": [
      {
        "value": "en",
        "count": 20
      }
    ],
    "total": 95
  }
}
```

Facet fields:

| Field | Type | Notes |
| --- | --- | --- |
| `sources` | `{ value: string, count: number }[]` | Job source options sorted by count desc, then value asc. |
| `countries` | `{ value: string, count: number }[]` | Country filter options sorted by count desc, then value asc. |
| `languages` | `{ value: string, count: number }[]` | Language filter options sorted by count desc, then value asc. |
| `total` | number | Total jobs included in the facet counts. |

Notes:

- This endpoint is for building filter controls before calling `GET /api/jobs`.
- Falls back to local sample metadata when DB is not configured or unavailable.
- Counts include only rows whose lifecycle `status` is `active`.

### `GET /api/jobs/:id`

Returns one public job by internal `id`.

```json
{
  "data": {
    "id": "job-id",
    "title": "Media Project Manager - Japan",
    "company": "Hotwire Global Pte Ltd",
    "location": "Available across Japan",
    "careerLevel": "Mid Career",
    "skills": ["Cloud", "AI", "Data"],
    "description": "Public job description text",
    "source": "careercross",
    "sourceJobId": "1590000",
    "sourceUrl": "https://example.com/job",
    "country": "JP",
    "language": "en",
    "employmentType": null,
    "careerStage": "junior",
    "employmentTypeCategory": null,
    "educationLevel": null,
    "salaryText": null,
    "deadlineText": null,
    "applyMethod": null,
    "postedAt": null,
    "collectedAt": "2026-05-19T06:00:00.000Z"
  }
}
```

Not found response:

```json
{
  "message": "채용공고를 찾을 수 없습니다."
}
```

Notes:

- Uses the same public field set as `GET /api/jobs`.
- Returns `404` when no active DB row or sample fallback row matches.
- Falls back to local sample data only when DB is not configured or unavailable.

## Analysis

### `POST /api/analyze`

Analyzes a resume/self-introduction against a selected job id. The current
implementation returns deterministic mock analysis unless an AI path is wired.

Request:

```json
{
  "jobId": "job-id",
  "resumeText": "React와 TypeScript를 활용한 웹 프로젝트 경험이 있습니다..."
}
```

Validation:

| Field | Type | Rule |
| --- | --- | --- |
| `jobId` | string | required, length >= 1 |
| `resumeText` | string | required, length >= 10 |

Response:

```json
{
  "data": {
    "jobId": "job-id",
    "matchScore": 90,
    "strengths": ["React 경험이 채용공고의 핵심 기술과 잘 맞습니다."],
    "weaknesses": [],
    "missingKeywords": [],
    "rewriteGuides": ["프로젝트 경험을 문제 상황, 해결 방법, 결과 중심으로 작성하세요."],
    "suggestedSentences": [
      "React 기반 프로젝트에서 사용자 입력 데이터를 API와 연동하여 분석 결과를 시각화한 경험이 있습니다."
    ],
    "mode": "mock"
  }
}
```

Fields:

| Field | Type | Notes |
| --- | --- | --- |
| `jobId` | string | Echoes request `jobId`. |
| `matchScore` | number | 0-100 style score, currently mock heuristic. |
| `strengths` | string[] | Positive fit points. |
| `weaknesses` | string[] | Gaps or risks. |
| `missingKeywords` | string[] | Keywords to consider adding. |
| `rewriteGuides` | string[] | Rewrite advice. |
| `suggestedSentences` | string[] | Candidate copy. |
| `mode` | string | `mock` or `ai`. |

Validation error shape:

```json
{
  "message": "요청 데이터 형식이 올바르지 않습니다.",
  "issues": [],
  "fallback": true
}
```

Server error shape:

```json
{
  "message": "서버 오류가 발생했습니다.",
  "fallback": true
}
```

## Resume File Extract

### `POST /api/resume/extract`

Extracts text from uploaded resume, portfolio, or application files before the
draft workflow sends them as `experienceInput.portfolioText`.

Supported formats:

- `.txt`, `.md`: decoded as UTF-8 text.
- `.docx`: extracted with Mammoth.
- `.pdf`: extracts text-layer content with pdf-parse. Image-only/scanned PDFs
  are unsupported when no text can be extracted.

Unsupported formats:

- `.doc`: ask the user to convert to DOCX.
- Images such as `.png`, `.jpg`, `.jpeg`, `.webp`.

Required request body:

| Field | Type | Notes |
| --- | --- | --- |
| `fileName` | string | Original file name. |
| `mimeType` | optional string | Browser-provided MIME type. |
| `contentBase64` | string | Base64 encoded file bytes. |

Response:

```json
{
  "data": {
    "fileName": "portfolio.pdf",
    "text": "extracted text...",
    "mode": "mock"
  }
}
```

## Career Workflow

The `/api/career-workflow` endpoints are the MVP routing layer for the AI career
document coach. They do not generate final prose. They classify source material,
build an Evidence Vault, and return the next best Socratic question.

### `POST /api/career-workflow/session`

Creates a stateless local session from optional document type, target context,
and source inputs.

Source types include `empty`, `experience_text`, `blank_cover_letter_template`,
`resume`, `career_description`, `portfolio`, `github_url`, `job_posting`,
`project_text`, and `reference_pattern`.

Response includes:

- `documentType` and `documentTypeReason`
- `sources` with extracted signals and confirmation requirements
- `templateAnalysis.questions`
- `evidenceVault`
- `completion`
- `nextQuestion`

Evidence Vault items carry `status`, `confirmedByUser`, resume/cover-letter/
career-description usability flags, and blind/privacy risk flags. GitHub source
material is confirmation-required and is not treated as proof of user
contribution until the user answers.

### `POST /api/career-workflow/next-question`

Accepts a prior `session` and returns the current `nextQuestion`. The question
contains `question`, `whyAsking`, `targetDocument`, `targetSection`,
`expectedAnswerType`, `priority`, `canSkip`, and `targetSlot`.

### `POST /api/career-workflow/answer-question`

Accepts a prior `session`, `questionId`, and user `answer`. The response returns
an updated stateless `session`, an `acceptedEvidence` item with
`status=user_provided`, and the next question if more required slots are empty.

## Draft Workflow

The `/ai-analysis` page uses these endpoints instead of `POST /api/analyze` for
self-introduction drafting. Legacy `POST /api/analyze` remains available for fit
analysis demos.

Frontend must not send provider API keys or Codex tokens. All routing happens on
the backend.

### `GET /api/draft-workflow/providers`

Returns provider availability for the AI selection UI.

```json
{
  "data": [
    {
      "providerId": "fallback",
      "label": "Fallback Demo",
      "online": true,
      "configured": true,
      "quotaExceeded": false,
      "models": [
        {
          "modelId": "hardcoded-demo",
          "label": "Demo Fallback",
          "online": true,
          "quotaExceeded": false,
          "recommended": true
        }
      ]
    }
  ]
}
```

Routing policy:

- Default mode is `auto`.
- Auto order: `codex_bridge -> gemini -> local -> fallback`.
- Manual mode uses the selected provider only; on failure it falls back to
  `fallback`, not another paid provider.
- Invalid provider JSON/schema output is treated as `invalid_output` and retried
  through `fallback`.
- Fallback responses include `aiMeta.usedFallback=true` and `fallbackReason`.

### `POST /api/draft-workflow/plan`

Analyzes the question, builds a requirement-first material store, normalizes
experience cards, creates evidence-locked claim ledgers, matches experiences to
the question, and returns answer strategy plus outline. Does not generate draft
body text.

Required body fields:

| Field | Type | Notes |
| --- | --- | --- |
| `aiSelection.mode` | `auto` or `manual` | Default UI mode is `auto`. |
| `aiSelection.providerId` | optional provider id | Required for manual mode. |
| `target.company` | string | Target company. |
| `target.role` | string | Target role. |
| `target.questionText` | string | Application question text. |
| `target.jobPostingText` | string | Pasted posting text. |
| `target.blindRecruitment` | boolean | Blind hiring constraint flag. |
| `target.writingStyle` | optional string | UI-selected tone such as 담백한 실무형. |
| `target.sectionName` | optional string | Current application section, such as 자기소개 or 직무역량. |
| `target.requirementSourceText` | optional string | Extracted application instructions. When present, these rules outrank job posting text and references. |
| `target.previousDraftText` | optional string | Existing section drafts used only to reduce repetition. |
| `experienceInput` | object | At least one of portfolio/manual/additional text. |
| `experienceInput.referenceSelfIntroText` | optional string | Learned/reference self-introduction examples. Used only when no attached requirement text exists and never as factual evidence about the user. |

Response includes `experienceCards`, `fitAssessments`, `answerStrategy`,
`materialStore`, `outline`, and `aiMeta`.

`materialStore` is the central planning JSON. It keeps attached-document
requirements, reference rules, user strengths, private constraints, experience
facts, section-specific plans, and document output rules together so `/draft`
does not invent facts outside the plan.

### `POST /api/draft-workflow/draft`

Generates the evidence-locked draft, evidence map, document formatting metadata,
review report, and revision options from a prior plan.

Required body fields:

| Field | Type | Notes |
| --- | --- | --- |
| `plan` | object | Prior `POST /plan` response body. |
| `gapAnswers` | optional array | Answers to missing-slot questions. |
| `confirmedOutline` | optional array | User-confirmed outline override. |

Response includes `draftText`, `charCount`, `evidenceMap`,
`documentFormatting`, `reviewReport`, `revisionOptions`, and `aiMeta`.

`documentFormatting` is fixed to UTF-8-safe Korean output and Malgun Gothic
document export metadata:

```json
{
  "encoding": "UTF-8",
  "fontFamily": "Malgun Gothic",
  "fontDisplayName": "맑은 고딕",
  "lineSpacing": "normal",
  "normalizeWhitespace": true,
  "forbidMojibake": true
}
```

### `POST /api/draft-workflow/revise`

Applies a user revision request to an existing draft. Review and rewrite are
separated on the backend contract; the rewriter only changes approved inputs.

Required body fields:

| Field | Type | Notes |
| --- | --- | --- |
| `plan` | object | Prior `POST /plan` response body used for evidence-lock validation. |
| `draft` | object | Prior draft payload. |
| `revisionRequest` | string | User revision instruction. |

## Frontend Handoff Checklist

When the teammate frontend arrives, check these first:

- Uses `VITE_API_BASE_URL` for backend calls.
- Does not require DB provider browser keys unless Auth/Realtime/Storage is added.
- Handles optional/null public job fields.
- Handles an empty or loading job list.
- Uses `job.id` when calling `POST /api/analyze`.
- Uses `GET /api/jobs/:id` for detail screens.
- Uses `GET /api/jobs/facets` for source/country/language filter options.
- Does not depend on raw crawl fields.
- Confirms whether it needs filters, pagination, or more detail fields.

Likely next backend additions:

- Cursor pagination for `GET /api/jobs`
- Optional selected-job context in `POST /api/analyze`
