# Mynavi Tenshoku Probe Evidence

Date: 2026-05-15
Source key: `mynavi_tenshoku`
Country: `JP`
Status: `GREEN`

## URLs Checked

- Homepage: `https://tenshoku.mynavi.jp/`
- List URL: `https://tenshoku.mynavi.jp/list/o1G/`
- Detail URL: `https://tenshoku.mynavi.jp/jobinfo-445402-5-2-1/`

## HTTP Result

- Homepage status: `200`
- Homepage final URL: `https://tenshoku.mynavi.jp/`
- Homepage HTML length: `198106`
- Homepage visible text length: `7210`
- List status: `200`
- List final URL: `https://tenshoku.mynavi.jp/list/o1G/`
- List HTML length: `518124`
- List visible text length: `30225`
- Static detail-link matches in list HTML: `348`
- First unique list detail path observed: `/jobinfo-256670-1-107-1/`
- Detail status: `200`
- Detail final URL: `https://tenshoku.mynavi.jp/jobinfo-445402-5-2-1/`
- Detail HTML length: `165392`
- Detail visible text length: `6544`

## Public HTML Fields

List fields observed:

- title: yes, for example `某有名ゲームやWebサイトの【テストエンジニア】＊未経験歓迎！`
- company: yes, for example `株式会社FunClock`
- location: yes, for example `勤務地 【転勤なし...】`
- career level: yes, partly through listing labels such as `未経験歓迎`
- education: yes when present, for example `学歴不問`
- employment type: yes, for example `正社員`
- salary: yes, for example `月給25万円〜80万円`
- deadline: yes, for example `掲載終了予定日`
- detail URL: yes, `/jobinfo-<id parts>/`
- source job ID: yes, parse `jobinfo-<id parts>` from detail path
- list count: yes, for example `該当の求人 941 件`

Detail fields observed:

- title: yes, for example `【Webエンジニア】経験者募集／リモート80％／年休120日`
- company: yes, `株式会社リゾーム`
- location: yes, `埼玉県、千葉県、東京都、神奈川県`
- salary: yes, `初年度年収 350万～600万円`
- employment type: yes, `雇用形態 正社員`
- description/responsibilities: yes, `仕事内容` section is visible
- requirements: yes, `対象となる方` section is visible
- preferred qualifications: partly visible inside requirements/body text
- skills: yes, public detail text includes `Java`, `PHP`, `Python`, `Go`,
  `TypeScript`, `Vue`, `React`
- company info: yes, company/detail profile sections are present in the page
  body
- application process: yes, public apply and posting-period text is visible
- deadline: yes, `掲載終了予定日：2026/06/18`
- update date: yes, `情報更新日：2026/05/12`

## Risk Gates

- Login required: no for core list/detail fields.
- Captcha or bot wall: no signal observed.
- JS-rendering-only: no. Public HTML contained list rows and detail text.
- Internal API required: no for this first collector slice.
- Official API/application required: no signal observed.
- Explicit scraping prohibition observed: no signal observed in checked text.
- Proxy/stealth would be required: no.
- Robots/terms/path risk note: not fully reviewed in this slice; keep small
  sample limits.

## Normalization Decision

- `sourceJobId` strategy: parse `jobinfo-<id parts>` from `/jobinfo-.../`.
- Required `JobPosting` fields available: yes.
- `country`: `JP`
- `language`: `ja`
- `salaryText`: preserve original salary text including Japanese amount units.
- `deadlineText`: use posting end date when visible.
- Fields kept in `rawJson`:
  - list path
  - update date
  - list count text
  - parser version
  - detail status
  - detail final URL
- Fields kept in `companyInfo`:
  - company profile values when safely parsed from the public detail body
- Fields intentionally not collected:
  - member-only saved-job data
  - personalized recommendation data
  - full raw HTML
  - browser-only state

## Final Decision

- Status: `GREEN`
- Reason: the IT/Web/Game list page and a real detail page both return stable
  public static HTML with enough fields for a standard JP/ja `JobPosting`.
- Collector verification:
  - `scripts/job_crawler/mynavi_tenshoku.py` created
  - `docs/research/job-sites/mynavi_tenshoku_sample_2026-05-15.json` generated
  - dry-run import passed with `Sources: {"mynavi_tenshoku":1}`
  - `corepack pnpm run crawl:mynavi:check` passed
- Next action: keep as the first JP/ja `GREEN` source for the later matrix.
- Collector file allowed: yes
