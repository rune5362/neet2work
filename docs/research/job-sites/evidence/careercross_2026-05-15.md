# CareerCross Probe Evidence

Date: 2026-05-15
Source key: `careercross`
Country: `JP`
Status: `GREEN`

## URLs Checked

- Homepage: `https://www.careercross.com/en/`
- Job search URL: `https://www.careercross.com/en/job-search`
- Detail URL: `https://www.careercross.com/en/job/detail-1589796`

## HTTP Result

- Homepage status: `200`
- Homepage final URL: `https://www.careercross.com/en/`
- Homepage HTML length: `535991`
- Homepage visible text length: `8662`
- Homepage static detail-link matches: `6`
- Job search status: `200`
- Job search final URL: `https://www.careercross.com/en/job-search`
- Job search HTML length: `533715`
- Job search visible text length: `11323`
- Job search static detail-link matches: `0` in the checked raw HTML
- Detail status: `200`
- Detail final URL: `https://www.careercross.com/en/job/detail-1589796`
- Detail HTML length: `558088`
- Detail visible text length: `6364`

## Public HTML Fields

List fields observed:

- title: yes on homepage featured/new job links
- company: partly visible around homepage job cards
- detail URL: yes, `/en/job/detail-<id>`
- source job ID: yes, numeric detail ID
- job-search page: visible search UI, but checked raw HTML did not expose
  static detail links; use homepage list links for the first tiny collector

Detail fields observed:

- Job ID: yes, for example `1589796`
- update date: yes, `May 8th, 2026`
- title: yes, `Software Engineer`
- location: yes, `Tokyo - 23 Wards`
- employment type: yes, `Permanent Full-time`
- salary: yes, `7 million yen ~ 10 million yen`
- description/responsibilities: yes, `Job Description`
- requirements: yes, `Required Skills`
- career level: yes, `Mid Career`
- English level: yes, `Daily Conversation`
- Japanese level: yes, `Daily Conversation`
- education level: yes, `Technical/Vocational College`
- visa status: yes, `Permission to work in Japan required`
- industry/category: yes, `Software`, `IT, Web and Communication`
- recruiter/direct signal: yes, recruiter company information is visible

## Risk Gates

- Login required: no for core detail fields.
- Captcha or bot wall: no signal observed.
- JS-rendering-only: no for homepage links and detail text.
- Internal API required: no for this first collector slice.
- Official API/application required: no signal observed.
- Explicit scraping prohibition observed: no signal observed in checked text.
- Proxy/stealth would be required: no.
- Robots/terms/path risk note: not fully reviewed in this slice; keep small
  sample limits.

## Normalization Decision

- `sourceJobId` strategy: parse numeric ID from `/en/job/detail-<id>`.
- Required `JobPosting` fields available: yes.
- `country`: `JP`
- `language`: `en`
- `salaryText`: preserve original salary text.
- Fields kept in `rawJson`:
  - update date
  - English level
  - Japanese level
  - visa status
  - career level
  - industry/category
  - parser version
  - detail status and final URL
- Fields kept in `companyInfo`:
  - recruiter/direct hiring signal when visible
  - industry/category when safely parsed
- Fields intentionally not collected:
  - member-only saved-job data
  - personalized recommendation data
  - full raw HTML
  - browser-only state

## Final Decision

- Status: `GREEN`
- Reason: CareerCross homepage and detail pages expose enough static HTML for a
  JP/en bilingual source sample, even though the checked job-search page itself
  did not expose static detail rows.
- Collector verification:
  - `scripts/job_crawler/careercross.py` created
  - `docs/research/job-sites/careercross_sample_2026-05-15.json` generated
  - dry-run import passed with `Sources: {"careercross":1}`
  - `corepack pnpm run crawl:careercross:check` passed
- Next action: keep as a JP/en `GREEN` source for the later matrix.
- Collector file allowed: yes
