# Job Site Probe Evidence

채용 사이트별 collector 구현 전에 남기는 수집 가능성 검증 기록이다.

목표는 모든 후보를 억지로 구현하는 것이 아니라, 현재 공개
`HTTP request + HTML parsing`으로 안전하게 수집 가능한 사이트만
`GREEN`으로 승격하는 것이다.

## Status

| Status | Meaning | Action |
| --- | --- | --- |
| `GREEN` | 공개 HTTP + 정적 HTML로 표준 `JobPosting` 샘플 생성 가능 | collector 구현, sample JSON 저장, dry-run import 포함 |
| `YELLOW` | 일부 데이터는 가능하지만 불안정하거나 리스크가 큼 | evidence만 저장, final script 제외 |
| `RED` | login, captcha, JS-only, internal API, 명시적 금지, 필드 부족 | collector 금지, final script 제외 |

## Required Evidence Template

새 probe 파일은 `docs/research/job-sites/evidence/<source>_YYYY-MM-DD.md`
형식으로 만든다.

```md
# <source> Probe Evidence

Date: YYYY-MM-DD
Source key: `<source>`
Country: `KR` or `JP`
Status: `GREEN` / `YELLOW` / `RED`

## URLs Checked

- List URL:
- Detail URL:
- Final URL after request:

## HTTP Result

- List status:
- Detail status:
- Redirects:
- Encoding:

## Public HTML Fields

List fields observed:

- title:
- company:
- location:
- career level:
- education:
- employment type:
- salary:
- deadline:
- detail URL:
- source job ID:

Detail fields observed:

- title:
- company:
- description/responsibilities:
- requirements:
- preferred qualifications:
- skills:
- company info:
- application process:

## Risk Gates

- Login required:
- Captcha or bot wall:
- JS-rendering-only:
- Internal API required:
- Official API/application required:
- Explicit scraping prohibition observed:
- Proxy/stealth would be required:
- Robots/terms/path risk note:

## Normalization Decision

- `sourceJobId` strategy:
- Required `JobPosting` fields available:
- Fields kept in `rawJson`:
- Fields kept in `companyInfo`:
- Fields intentionally not collected:

## Final Decision

- Status:
- Reason:
- Next action:
- Collector file allowed: yes/no
```

## Probe Rules

- Probe first, implement later.
- Do not use login, session cookies, captcha solving, proxying, or stealth
  behavior.
- Do not use browser automation as a collection path.
- Do not rely on undocumented internal API endpoints.
- Do not create collector files for `YELLOW` or `RED` sources.
- Do not write to DB from Python collectors.
- Keep samples small: default `1`, maximum `5`.
- Preserve uncertain source-specific fields in `rawJson` or `companyInfo`.
- Keep public API responses free of `rawText`, `rawJson`, and `companyInfo`.
