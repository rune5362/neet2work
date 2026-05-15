# Rikunabi NEXT Probe Evidence

Date: 2026-05-15
Source key: `rikunabi_next`
Country: `JP`
Status: `RED`

## URLs Checked

- Homepage: `https://next.rikunabi.com/`
- IT/software list candidate:
  `https://next.rikunabi.com/tech_soft/lst_jb0600000000/`
- Detail URL: `https://next.rikunabi.com/viewjob/jk81a3669a7a6271fb/`

## HTTP Result

- Homepage GET result: `308 Permanent Redirect`
- IT/software list candidate result: `404`
- Detail GET result: `308 Permanent Redirect` through PowerShell
- Detail HEAD/redirect check through `curl.exe -L -I --max-time 30`:
  - `307 Temporary Redirect` to `/session/destroy?type=webSso`
  - `308 Permanent Redirect` to `/session/destroy/?type=webSso`
  - final `200 OK`
- Final detail body length after redirects: `14980`
- Final detail visible text length after script/style stripping: `0`
- Final detail body shape: Next.js shell, not static public job content

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
- detail URL: no stable list evidence
- source job ID: no stable list evidence

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

- Login required: not directly confirmed, but the checked detail URL redirects
  through session-destroy paths.
- Captcha or bot wall: no explicit captcha text observed.
- JS-rendering-only: yes for the checked public path. The final HTML is a
  Next.js shell without static job text.
- Internal API required: likely needed for real content, but not used and not
  allowed for this pipeline.
- Official API/application required: no approved official API was used.
- Explicit scraping prohibition observed: not evaluated because no useful
  static content was available.
- Proxy/stealth would be required: not attempted and not allowed.
- Robots/terms/path risk note: not fully reviewed in this slice.

## Normalization Decision

- `sourceJobId` strategy: none for this pipeline. The historical `jk...` ID is
  visible in the URL but no static job fields were available.
- Required `JobPosting` fields available: no.
- Fields kept in `rawJson`: none because no sample is generated.
- Fields kept in `companyInfo`: none because no sample is generated.
- Fields intentionally not collected:
  - session-bound content
  - browser-rendered content
  - internal API data
  - any data requiring proxy, stealth, or challenge bypass

## Final Decision

- Status: `RED`
- Reason: the checked detail path redirects through session cleanup and resolves
  to a JavaScript app shell without static job fields, while the checked list
  candidate does not expose usable public rows.
- Next action: exclude from collector scripts and final matrix.
- Collector file allowed: no
