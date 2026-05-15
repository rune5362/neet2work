# Green Japan Probe Evidence

Date: 2026-05-15
Source key: `green_japan`
Country: `JP`
Status: `GREEN`

## URLs Checked

- Homepage: `https://www.green-japan.com/`
- Search URL: `https://www.green-japan.com/search_key/01`
- Detail URL: `https://www.green-japan.com/company/4275/job/297008`

## HTTP Result

- Homepage status: `200`
- Homepage final URL: `https://www.green-japan.com/`
- Homepage HTML length: `248790`
- Homepage visible text length: `5090`
- Homepage static detail-link matches: `20`
- Search status: `200`
- Search final URL: `https://www.green-japan.com/search`
- Search HTML length: `412941`
- Search visible text length: `6497`
- Search static detail-link matches: `122`
- Detail status: `200`
- Detail final URL: `https://www.green-japan.com/company/4275/job/297008`
- Detail HTML length: `198417`
- Detail visible text length: `5478`

## Public HTML Fields

List fields observed:

- title: yes
- company: yes
- salary: yes, for example `750万円〜2000万円`
- location: yes, for example `東京都`
- detail URL: yes, `/company/<companyId>/job/<jobId>`
- source job ID: yes, combine company ID and job ID
- tech/company row count: yes, many static links on homepage/search

Detail fields observed:

- title: yes, `AI・検索エンジニア（国内事業）`
- company: yes, `株式会社ビザスク`
- company description: yes
- location: yes, `東京都`
- salary: yes, `600万円〜1000万円`
- skills: yes, `SQL`, `Python`, `Django`, `MySQL`, `TensorFlow`, `Azure`,
  `Elasticsearch`, `GCP`, `Redis`, `scikit-learn`
- work style tags: yes, remote, side job, flex time, no transfer
- description/responsibilities: yes, `仕事内容`
- requirements: partly visible. Some application requirements and selection
  process details are behind login/registration guidance.
- benefits: yes, `待遇・福利厚生`
- holidays: yes, `休日・休暇`
- workplace address/access: yes

## Risk Gates

- Login required: no for core title/company/location/salary/skills/body fields.
  Some application requirements, expected salary, headcount, and selection
  process details are behind login/registration guidance.
- Captcha or bot wall: no signal observed.
- JS-rendering-only: no. Public HTML contained list links and detail text.
- Internal API required: no for this first collector slice.
- Official API/application required: no signal observed.
- Explicit scraping prohibition observed: no signal observed in checked text.
- Proxy/stealth would be required: no.
- Robots/terms/path risk note: not fully reviewed in this slice; keep small
  sample limits.

## Normalization Decision

- `sourceJobId` strategy: combine company/job path as `<companyId>-<jobId>`.
- Required `JobPosting` fields available: yes.
- `country`: `JP`
- `language`: `ja`
- `salaryText`: preserve original salary range text.
- Fields kept in `rawJson`:
  - company ID
  - job ID
  - work style tags
  - parser version
  - detail status and final URL
- Fields kept in `companyInfo`:
  - company intro/description when safely parsed
- Fields intentionally not collected:
  - login-gated application conditions
  - login-gated selection process fields
  - member-only saved-job data
  - personalized recommendation data
  - full raw HTML

## Final Decision

- Status: `GREEN`
- Reason: Green Japan search/detail pages expose static IT/Web job fields with
  strong skill data and enough public body text for a JP/ja standard sample.
- Collector verification:
  - `scripts/job_crawler/green_japan.py` created
  - `docs/research/job-sites/green_japan_sample_2026-05-15.json` generated
  - dry-run import passed with `Sources: {"green_japan":1}`
  - `corepack pnpm run crawl:green:check` passed
- Next action: keep as a JP/ja `GREEN` source for the later matrix.
- Collector file allowed: yes
