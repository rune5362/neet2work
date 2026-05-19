# Neet2Work API Contract

This document is the current backend contract for the teammate frontend handoff.
The frontend should call the backend through `VITE_API_BASE_URL`, not Supabase
directly.

## Runtime

- Local backend base URL: `http://localhost:3000`
- Local frontend env: `VITE_API_BASE_URL=http://localhost:3000`
- Database path: frontend -> backend API -> Prisma/pg -> Supabase Postgres
- Supabase browser keys are not required by the current frontend contract.

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
| `ai` | string | `configured`, `mock` | Current analysis path is mock unless `AI_API_KEY` exists. |
| `storage` | string | `configured`, `local` | R2 is optional for now. |

## Jobs

### `GET /api/jobs`

Returns the public active job list. When DB is configured, the backend returns
the latest matching rows whose lifecycle `status` is `active`. If DB is not
configured or unavailable, it falls back to local sample jobs so the demo path
still renders. Query/schema errors are not hidden behind sample fallback.

Query params:

| Param | Type | Rule | Notes |
| --- | --- | --- | --- |
| `q` | string | optional | Case-insensitive text search over `title`, `company`, and `description`. |
| `source` | string | optional | Exact source match, such as `careercross` or `daijob`. |
| `country` | string | optional | Exact country match, such as `JP` or `KR`. |
| `language` | string | optional | Exact language match, such as `ja`, `en`, or `ko`. |
| `limit` | number | optional, 1-100 | Defaults to `50`. |

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
      "educationLevel": null,
      "salaryText": null,
      "deadlineText": null,
      "applyMethod": null,
      "collectedAt": "2026-05-19T06:00:00.000Z"
    }
  ],
  "count": 50
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
| `educationLevel` | string | yes | Optional source value. |
| `salaryText` | string | yes | Optional display text. |
| `deadlineText` | string | yes | Optional display text. |
| `applyMethod` | string | yes | Optional display text. |
| `collectedAt` | string | yes | ISO timestamp or `null`. |

Not exposed:

- Raw crawl text/JSON
- Company info raw payload
- Classifier metadata
- Crawl batch ids
- Lifecycle internals such as `missingCount`

Current limitations:

- No pagination yet.
- List order is newest `collectedAt`, then newest `createdAt`.
- Closed, inactive, and unknown lifecycle rows are not exposed in this public list.
- `q` search is backed by the `public_job_search_indexes` migration once applied.

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
    "educationLevel": null,
    "salaryText": null,
    "deadlineText": null,
    "applyMethod": null,
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

## Frontend Handoff Checklist

When the teammate frontend arrives, check these first:

- Uses `VITE_API_BASE_URL` for backend calls.
- Does not require Supabase browser keys unless Auth/Realtime/Storage is added.
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
