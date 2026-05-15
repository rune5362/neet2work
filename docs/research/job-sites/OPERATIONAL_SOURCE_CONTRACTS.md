# Operational Source Collection Contracts

Date: 2026-05-15

이 문서는 운영 배치 수집에 들어갈 수 있는 `GREEN` source의 계약만 고정한다.
넓은 후보군/과거 shortlist가 아니라, 현재 repo의 collector와 evidence로 검증된
운영 후보가 기준이다.

## Operating Rules

- 수집 방식은 공개 `HTTP request + HTML parsing`만 허용한다.
- 로그인, captcha, proxy, stealth, browser automation, undocumented internal API는 금지한다.
- Python collector는 JSON 산출물만 만들고 DB에 직접 쓰지 않는다.
- 운영 import는 `(source, sourceJobId)`를 안정 키로 본다.
- batch 수집 전에는 source별 계약이 현재 HTML과 맞는지 다시 확인한다.
- source drift가 확인되면 해당 source를 `YELLOW`로 내리고 batch matrix에서 제외한다.

## Current Operational GREEN Sources

| Source | Country | Public list URL pattern | Public detail URL pattern | `sourceJobId` rule | Initial role |
| --- | --- | --- | --- | --- | --- |
| `saramin` | KR | `https://www.saramin.co.kr/zf_user/jobs/list/job-category?cat_mcls=2` | `/zf_user/jobs/relay/view?rec_idx=<id>` | `rec_idx` query value | Korea broad collection |
| `jobkorea` | KR | `https://www.jobkorea.co.kr/Search/?stext=<keyword>` | `/Recruit/GI_Read/<id>` | numeric `GI_Read` path id | Korea broad collection |
| `linkareer` | KR | `https://linkareer.com/list/recruit`, `https://linkareer.com/list/intern` | `/activity/<id>` | numeric activity path id | Korean intern/junior/recruit collection |
| `mynavi_tenshoku` | JP | `https://tenshoku.mynavi.jp/list/o1G/` | `/jobinfo-<id-parts>/` | `jobinfo-...` path id parts | Japan broad collection |
| `daijob` | JP | `https://www.daijob.com/en/jobs/search` | `/en/jobs/detail/<id>` | numeric detail path id | Japan/global bilingual collection |
| `careercross` | JP | `https://www.careercross.com/en/` | `/en/job/detail-<id>` | numeric detail path id | Japan/global bilingual collection |
| `green_japan` | JP | `https://www.green-japan.com/search_key/01` | `/company/<companyId>/job/<jobId>` | `<companyId>-<jobId>` | Japan startup/tech-heavy collection |

## Downgrade Triggers

Any `GREEN` source must be removed from operational batch collection when one
of these appears in the current source behavior:

- public list or detail pages stop returning usable HTML
- required fields require login/session cookies
- captcha, bot wall, proxy, or stealth behavior becomes necessary
- source only works through undocumented internal API calls
- selector drift prevents stable `sourceJobId`, title, company, and URL extraction
- repeated HTTP failure spike makes a source crawl partial or unreliable
- public pages display explicit collection prohibition that conflicts with this use

## Per-Source Contract Details

### `saramin`

- Active-list evidence: public job-category listing exposes current posting cards.
- Required parsed fields: `sourceJobId`, `title`, `company`, `location`, `careerLevel`, `sourceUrl`.
- Optional parsed fields: `skills`, `educationLevel`, `employmentType`, `salaryText`, `deadlineText`, `companyInfo`.
- Closed-signal rules: Korean closed/deadline text such as `마감`, `접수마감`, `채용마감`, `지원마감`, `종료`, `접수종료`.
- Pagination rule: start from the default list URL; batch pagination must be added only after the first source-level review run.
- Request delay: detail requests use at least 1 second delay when collecting more than one posting.
- Downgrade notes: if list cards disappear or `rec_idx` is no longer visible in HTML, downgrade to `YELLOW`.

### `jobkorea`

- Active-list evidence: public search results expose posting links and list-card fields.
- Required parsed fields: `sourceJobId`, `title`, `company`, `location`, `careerLevel`, `sourceUrl`.
- Optional parsed fields: `skills`, `educationLevel`, `employmentType`, `salaryText`, `deadlineText`, `companyInfo`.
- Closed-signal rules: Korean closed/deadline text such as `마감`, `접수마감`, `채용마감`, `지원마감`, `종료`, `접수종료`.
- Pagination rule: start from keyword search URL; do not widen keywords before one reviewed batch.
- Request delay: detail requests use at least 1 second delay when collecting more than one posting.
- Downgrade notes: login-only recommendation copy is ignored; if public `GI_Read` IDs vanish, downgrade.

### `linkareer`

- Active-list evidence: `/list/recruit` and `/list/intern` expose public activity/recruit rows.
- Required parsed fields: `sourceJobId`, `title`, `company`, `location`, `careerLevel`, `sourceUrl`.
- Optional parsed fields: `skills`, `employmentType`, `deadlineText`, `rawJson.category`.
- Closed-signal rules: Korean deadline/ended text such as `마감`, `접수종료`, `종료`.
- Pagination rule: only `/list/recruit` and `/list/intern` are allowed until a new contract is approved.
- Request delay: detail requests use at least 1 second delay when collecting more than one posting.
- Downgrade notes: if non-job activity categories dominate or category guard fails, downgrade or split source modes.

### `mynavi_tenshoku`

- Active-list evidence: public list pages expose `jobinfo-...` detail links.
- Required parsed fields: `sourceJobId`, `title`, `company`, `location`, `careerLevel`, `sourceUrl`.
- Optional parsed fields: `skills`, `employmentType`, `salaryText`, `deadlineText`, `companyInfo`.
- Closed-signal rules: Japanese closed text such as `募集終了`, `掲載終了`, `受付終了`, `応募終了`.
- Pagination rule: start from the current public list URL only; page expansion requires one reviewed batch.
- Request delay: detail requests use at least 1 second delay when collecting more than one posting.
- Downgrade notes: if detail pages become cache-dependent or JS-only, downgrade.

### `daijob`

- Active-list evidence: public search page exposes `/en/jobs/detail/<id>` links.
- Required parsed fields: `sourceJobId`, `title`, `company`, `location`, `careerLevel`, `sourceUrl`.
- Optional parsed fields: `skills`, `employmentType`, `salaryText`, `deadlineText`, `companyInfo`, language/visa hints in `rawJson`.
- Closed-signal rules: English/Japanese closed text such as `closed`, `expired`, `募集終了`, `掲載終了`.
- Pagination rule: start from public search page; no hidden filters or internal endpoints.
- Request delay: detail requests use at least 1 second delay when collecting more than one posting.
- Downgrade notes: external apply redirects are not collection targets; if detail text requires login, downgrade.

### `careercross`

- Active-list evidence: public pages expose `/en/job/detail-<id>` links.
- Required parsed fields: `sourceJobId`, `title`, `company`, `location`, `careerLevel`, `sourceUrl`.
- Optional parsed fields: `skills`, `employmentType`, `salaryText`, `deadlineText`, language/visa hints in `rawJson`.
- Closed-signal rules: English/Japanese closed text such as `closed`, `expired`, `募集終了`, `掲載終了`.
- Pagination rule: start from public entry/list pages; do not rely on member-only search state.
- Request delay: detail requests use at least 1 second delay when collecting more than one posting.
- Downgrade notes: login UI blocks are ignored only if public job body remains visible.

### `green_japan`

- Active-list evidence: public search key page exposes company/job path pairs.
- Required parsed fields: `sourceJobId`, `title`, `company`, `location`, `careerLevel`, `sourceUrl`.
- Optional parsed fields: `skills`, `employmentType`, `salaryText`, `deadlineText`, `companyInfo`, tech stack hints.
- Closed-signal rules: Japanese closed text such as `募集終了`, `掲載終了`, `受付終了`, `応募終了`.
- Pagination rule: start from `search_key/01`; broadening beyond the current path needs review.
- Request delay: detail requests use at least 1 second delay when collecting more than one posting.
- Downgrade notes: login-gated application conditions and selection process fields stay excluded.
