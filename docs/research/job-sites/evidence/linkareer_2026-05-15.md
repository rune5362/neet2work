# Linkareer Probe Evidence

Date: 2026-05-15
Source key: `linkareer`
Country: `KR`
Status: `GREEN`

## URLs Checked

- Homepage: `https://linkareer.com/`
- Intern list URL: `https://linkareer.com/list/intern`
- Recruit list URL: `https://linkareer.com/list/recruit`
- Detail URL: `https://linkareer.com/activity/320425`

## HTTP Result

- Homepage status: `200`
- Intern list status: `200`
- Intern list final URL: `https://linkareer.com/list/intern`
- Intern list HTML length: `257686`
- Intern list visible text length: `3137`
- Recruit list status: `200`
- Recruit list final URL: `https://linkareer.com/list/recruit`
- Recruit list HTML length: `257863`
- Recruit list visible text length: `2958`
- Detail status: `200`
- Detail final URL: `https://linkareer.com/activity/320425`
- Detail HTML length: `202156`
- Detail visible text length: `2111`

## Public HTML Fields

List fields observed:

- list category: yes, `intern` and `recruit` pages are separate
- total count: yes, for example `인턴 검색 결과 1052 건`, `채용 검색 결과 2694 건`
- company: yes, for example `대한항공`, `E1`, `한국해운조합`
- title: yes, for example `[E1] 2026년 채용연계형 하계인턴 채용`
- job categories: yes, for example `무역영업/해외영업`, `B2B영업/기술영업`
- employment type: yes, for example `인턴`, `계약직`, `신입`
- location: yes, for example `서울`, `해외`, `세종특별자치시`
- deadline: yes, for example `~ 05.25`, `채용 시 마감`
- detail URL: yes, `/activity/<id>`
- source job ID: yes, numeric activity ID

Detail fields observed:

- title: yes
- company: yes
- company type: yes, for example `대기업`
- application period: yes
- employment type: yes
- job category: yes
- location: yes
- homepage/application URL: yes
- detailed description: yes
- requirements/process text: yes when present in public body
- Q&A/study/user-stat sections: visible but not needed for normalization

## Risk Gates

- Login required: no for core list/detail job fields.
- Captcha or bot wall: no signal observed.
- JS-rendering-only: no. Public HTML contained list rows and detail text.
- Internal API required: no for the first collector slice.
- Official API/application required: no signal observed.
- Explicit scraping prohibition observed: no signal observed in checked text.
- Proxy/stealth would be required: no.
- Robots/terms/path risk note: not fully reviewed in this slice; keep small
  sample limits.

## Normalization Decision

- `sourceJobId` strategy: parse numeric ID from `/activity/<id>`.
- Required `JobPosting` fields available: yes.
- Category guard:
  - allowed list paths: `/list/intern`, `/list/recruit`
  - do not normalize `/list/activity`, contests, education, clubs, or community
    posts as normal jobs
- Fields kept in `rawJson`:
  - list category
  - list row chunks
  - detail status
  - detail final URL
  - parser version
- Fields kept in `companyInfo`:
  - company type and homepage when visible
- Fields intentionally not collected:
  - scrap/user statistics
  - chat room data
  - study 모집글
  - personalized user data

## Final Decision

- Status: `GREEN`
- Reason: `intern` and `recruit` public list pages expose enough static job
  rows, and public detail pages expose core job fields and detailed body text
  without login, captcha, browser rendering, or internal API reliance.
- Next action: implement a category-guarded `scripts/job_crawler/linkareer.py`
  in the next slice, then generate one sample JSON and run dry-run import.
- Collector file allowed: yes
