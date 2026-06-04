# JobPlanet Probe Evidence

Date: 2026-05-15
Source key: `jobplanet`
Country: `KR`
Status: `RED`

## URLs Checked

- List URL: `https://www.jobplanet.co.kr/job`
- Detail/search URL: `https://www.jobplanet.co.kr/job/search?posting_ids%5B%5D=1304060`

## HTTP Result

- List status: `403`
- Detail/search status: `403`
- Redirects: none observed because both requests failed with `403`
- Encoding: not applicable; response body was not available through the checked
  public HTTP path

## Public HTML Fields

List fields observed:

- title: no
- company: no
- location: no
- career level: no
- education: no
- employment type: no
- salary: no
- deadline: no
- detail URL: no
- source job ID: no

Detail fields observed:

- title: no
- company: no
- description/responsibilities: no
- requirements: no
- preferred qualifications: no
- skills: no
- company info: no
- application process: no

## Risk Gates

- Login required: not confirmed, but public HTTP access did not expose usable
  fields.
- Captcha or bot wall: yes risk. The checked public paths returned `403`
  instead of stable static HTML.
- JS-rendering-only: not evaluated after the HTTP block because browser
  rendering is not an allowed collection path for this project.
- Internal API required: not used and not allowed for this pipeline.
- Official API/application required: no official collection API was checked in
  this slice.
- Explicit scraping prohibition observed: not evaluated because the public
  pages were blocked.
- Proxy/stealth would be required: likely for this HTTP path, therefore
  disallowed.
- Robots/terms/path risk note: not fully reviewed in this slice; the direct
  `403` block is already enough to reject a collector.

## Normalization Decision

- `sourceJobId` strategy: none. No stable public static source ID was available
  through the checked HTTP paths.
- Required `JobPosting` fields available: no.
- Fields kept in `rawJson`: none.
- Fields kept in `companyInfo`: none.
- Fields intentionally not collected:
  - login/session-only fields
  - browser-rendered fields
  - internal API data
  - any data requiring proxy, stealth, or challenge bypass

## Final Decision

- Status: `RED`
- Reason: both checked public HTTP paths returned `403`, so JobPlanet cannot be
  collected by the allowed `HTTP request + static HTML parsing` path.
- Next action: exclude from final collector scripts and matrix checks unless a
  stable official or public static HTML path is approved later.
- Collector file allowed: no
