from __future__ import annotations

import argparse
import html
import json
import re
import sys
import time
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urljoin, urlparse

if __package__ is None or __package__ == "":
    sys.path.append(str(Path(__file__).resolve().parents[1]))
    from job_crawler.http_client import fetch_text
    from job_crawler.models import SourceJobLink, StandardJobPosting
else:
    from .http_client import fetch_text
    from .models import SourceJobLink, StandardJobPosting


DEFAULT_LIST_URL = "https://www.saramin.co.kr/zf_user/jobs/list/job-category?cat_mcls=2"
SOURCE = "saramin"
TEXT_LIMIT = 5000
MAX_LIMIT = 5

SKILL_KEYWORDS = [
    "Python",
    "Java",
    "JavaScript",
    "TypeScript",
    "React",
    "Vue",
    "Node.js",
    "Spring",
    "SQL",
    "AWS",
    "Docker",
    "Kubernetes",
    "AI",
    "ML",
    "Data",
]


class LinkTextParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self._current_href: str | None = None
        self._chunks: list[str] = []
        self.links: list[tuple[str, str]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag != "a":
            return

        href = dict(attrs).get("href")
        if href and ("/zf_user/jobs/relay/view" in href or "rec_idx=" in href):
            self._current_href = href
            self._chunks = []

    def handle_data(self, data: str) -> None:
        if self._current_href:
            text = data.strip()
            if text:
                self._chunks.append(text)

    def handle_endtag(self, tag: str) -> None:
        if tag == "a" and self._current_href:
            self.links.append((self._current_href, normalize_space(" ".join(self._chunks))))
            self._current_href = None
            self._chunks = []


class VisibleTextParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self._skip_depth = 0
        self.chunks: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in {"script", "style", "noscript", "svg"}:
            self._skip_depth += 1

    def handle_endtag(self, tag: str) -> None:
        if tag in {"script", "style", "noscript", "svg"} and self._skip_depth:
            self._skip_depth -= 1

    def handle_data(self, data: str) -> None:
        if self._skip_depth:
            return
        text = data.strip()
        if text:
            self.chunks.append(text)

    def text(self) -> str:
        return normalize_space(" ".join(self.chunks))


def normalize_space(value: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(value)).strip()


def html_to_text(markup: str) -> str:
    parser = VisibleTextParser()
    parser.feed(markup)
    return parser.text()


def clean_fragment(markup: str) -> str:
    return normalize_space(html_to_text(markup))


def extract_meta(markup: str, key: str) -> str | None:
    escaped = re.escape(key)
    patterns = [
        rf'<meta[^>]+property=["\']{escaped}["\'][^>]+content=["\']([^"\']+)["\']',
        rf'<meta[^>]+name=["\']{escaped}["\'][^>]+content=["\']([^"\']+)["\']',
        rf'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']{escaped}["\']',
        rf'<meta[^>]+content=["\']([^"\']+)["\'][^>]+name=["\']{escaped}["\']',
    ]

    for pattern in patterns:
        match = re.search(pattern, markup, flags=re.IGNORECASE)
        if match:
            return normalize_space(match.group(1))

    return None


def source_job_id(url: str) -> str:
    parsed = urlparse(url)
    query = parse_qs(parsed.query)
    rec_idx = query.get("rec_idx", [None])[0]
    if rec_idx:
        return rec_idx

    fallback = re.sub(r"\W+", "-", parsed.path.strip("/"))
    return fallback or "unknown"


def canonical_detail_url(job_id: str) -> str:
    return f"https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx={job_id}"


def list_jobs(list_url: str, limit: int) -> list[SourceJobLink]:
    result = fetch_text(list_url)
    if result.status >= 400:
        raise RuntimeError(f"Saramin list request failed: HTTP {result.status}")

    block_jobs = parse_list_blocks(result.text, result.url, limit)
    if block_jobs:
        return block_jobs

    parser = LinkTextParser()
    parser.feed(result.text)

    seen: set[str] = set()
    jobs: list[SourceJobLink] = []
    for href, title_hint in parser.links:
        url = urljoin(result.url, href)
        job_id = source_job_id(url)
        if job_id in seen or job_id == "unknown":
            continue
        seen.add(job_id)
        jobs.append(
            SourceJobLink(
                source=SOURCE,
                source_job_id=job_id,
                source_url=url,
                title_hint=title_hint or None,
            )
        )
        if len(jobs) >= limit:
            break

    if not jobs:
        raise RuntimeError("No public Saramin detail links were found in the list page.")

    return jobs


def parse_list_blocks(markup: str, base_url: str, limit: int) -> list[SourceJobLink]:
    jobs: list[SourceJobLink] = []
    seen: set[str] = set()
    blocks = re.split(r'(?=<div class="item_recruit" value=")', markup)

    for block in blocks:
        id_match = re.match(r'<div class="item_recruit" value="(?P<id>\d+)"', block)
        if not id_match:
            continue

        job_id = id_match.group("id")
        if job_id in seen:
            continue

        href_match = re.search(r'href="(?P<href>[^"]*rec_idx=' + re.escape(job_id) + r'[^"]*)"', block)
        if not href_match:
            continue

        title_match = re.search(r'<h2 class="job_tit">.*?<a[^>]+title="(?P<title>[^"]+)"', block, re.S)
        company_match = re.search(r'<strong class="corp_name">(?P<company>.*?)</strong>', block, re.S)
        condition_match = re.search(r'<div class="job_condition">(?P<conditions>.*?)</div>', block, re.S)
        sector_match = re.search(r'<div class="job_sector">(?P<sector>.*?)</div>', block, re.S)
        date_match = re.search(r'<span class="date">(?P<date>[^<]+)</span>', block)

        conditions = (
            [clean_fragment(value) for value in re.findall(r"<span>(.*?)</span>", condition_match.group("conditions"), re.S)]
            if condition_match
            else []
        )
        keywords = (
            [clean_fragment(value) for value in re.findall(r"<a[^>]*>(.*?)</a>", sector_match.group("sector"), re.S)]
            if sector_match
            else []
        )

        hints = {
            "location": conditions[0] if len(conditions) > 0 else None,
            "careerLevel": conditions[1] if len(conditions) > 1 else None,
            "educationLevel": conditions[2] if len(conditions) > 2 else None,
            "employmentType": conditions[3] if len(conditions) > 3 else None,
            "skills": [keyword for keyword in keywords if keyword],
            "deadlineText": normalize_space(date_match.group("date")) if date_match else None,
        }

        seen.add(job_id)
        jobs.append(
            SourceJobLink(
                source=SOURCE,
                source_job_id=job_id,
                source_url=urljoin(base_url, html.unescape(href_match.group("href"))),
                title_hint=normalize_space(title_match.group("title")) if title_match else None,
                company_hint=clean_fragment(company_match.group("company")) if company_match else None,
                hints={key: value for key, value in hints.items() if value},
            )
        )

        if len(jobs) >= limit:
            break

    return jobs


def parse_title_company(markup: str, text: str, fallback_title: str | None) -> tuple[str, str]:
    title_source = extract_meta(markup, "og:title") or extract_meta(markup, "title")
    title_source = title_source or fallback_title or "제목 확인 필요"
    title_source = re.sub(r"\s*-\s*사람인\s*$", "", title_source)

    bracket_match = re.match(r"^\[(?P<company>[^\]]+)\]\s*(?P<title>.+)$", title_source)
    if bracket_match:
        return normalize_space(bracket_match.group("title")), normalize_space(bracket_match.group("company"))

    company_match = re.search(r"([가-힣A-Za-z0-9().\s]+)\s+채용", text)
    company = normalize_space(company_match.group(1)) if company_match else "회사명 확인 필요"
    return normalize_space(title_source), company


def find_first(patterns: list[str], text: str, default: str) -> str:
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return normalize_space(match.group(1))
    return default


def infer_skills(text: str) -> list[str]:
    lowered = text.lower()
    found = [skill for skill in SKILL_KEYWORDS if skill.lower() in lowered]
    return found[:12]


def collect_detail(link: SourceJobLink) -> StandardJobPosting:
    result = fetch_text(link.source_url)
    if result.status >= 400:
        raise RuntimeError(f"Saramin detail request failed: HTTP {result.status} {link.source_url}")

    text = html_to_text(result.text)
    title, company = parse_title_company(result.text, text, link.title_hint)
    company = link.company_hint or company
    location = link.hints.get("location") or find_first(
        [r"근무지역\s*([가-힣A-Za-z0-9·,\s]+?)\s*(?:근무형태|급여|학력|경력)"],
        text,
        "지역 확인 필요",
    )
    career_level = link.hints.get("careerLevel") or find_first(
        [r"경력\s*([가-힣A-Za-z0-9~·,\s]+?)\s*(?:학력|근무형태|급여)"],
        text,
        "경력 확인 필요",
    )
    employment_type = link.hints.get("employmentType") or find_first(
        [r"근무형태\s*([가-힣A-Za-z0-9·,\s/]+?)\s*(?:급여|근무지역|접수기간)"],
        text,
        "",
    )
    education_level = link.hints.get("educationLevel") or find_first(
        [r"학력\s*([가-힣A-Za-z0-9·,\s]+?)\s*(?:근무형태|급여|근무지역)"],
        text,
        "",
    )
    salary_text = find_first([r"급여\s*([가-힣A-Za-z0-9·,\s~/-]+?)\s*(?:근무지역|접수기간|직급)"], text, "")
    deadline_text = link.hints.get("deadlineText") or find_first(
        [r"접수기간\s*([가-힣A-Za-z0-9·,\s~:/()-]+?)\s*(?:접수방법|지원방법|제출서류)"],
        text,
        "",
    )
    skills = list(dict.fromkeys([*link.hints.get("skills", []), *infer_skills(text)]))[:12]
    description = normalize_space(
        f"{company}의 {title} 공고. {location} / {career_level}"
        + (f" / {education_level}" if education_level else "")
        + (f" / {employment_type}" if employment_type else "")
        + (f". 키워드: {', '.join(skills)}" if skills else "")
    )

    raw_json: dict[str, Any] = {
        "listTitleHint": link.title_hint,
        "listCompanyHint": link.company_hint,
        "listHints": link.hints,
        "detailStatus": result.status,
        "detailFinalUrl": canonical_detail_url(link.source_job_id),
        "detailTextLength": len(text),
        "parser": "stdlib-htmlparser-v1",
    }
    raw_text = description if "로그인 이 필요한 서비스입니다" in text else text[:TEXT_LIMIT]

    return StandardJobPosting(
        id=f"{SOURCE}-{link.source_job_id}",
        title=title,
        company=company,
        location=location,
        careerLevel=career_level,
        skills=skills,
        description=description,
        source=SOURCE,
        sourceJobId=link.source_job_id,
        sourceUrl=canonical_detail_url(link.source_job_id),
        country="KR",
        language="ko",
        employmentType=employment_type or None,
        educationLevel=education_level or None,
        salaryText=salary_text or None,
        deadlineText=deadline_text or None,
        rawText=raw_text,
        rawJson=raw_json,
    )


def run(list_url: str, limit: int, delay_seconds: float) -> list[dict[str, Any]]:
    if limit < 1 or limit > MAX_LIMIT:
        raise ValueError(f"limit must be between 1 and {MAX_LIMIT}")
    if delay_seconds < 0:
        raise ValueError("delay_seconds must be 0 or greater")

    links = list_jobs(list_url, limit)
    postings: list[dict[str, Any]] = []
    for index, link in enumerate(links):
        if index > 0 and delay_seconds > 0:
            time.sleep(delay_seconds)
        postings.append(collect_detail(link).to_json_dict())
    return postings


def main() -> int:
    parser = argparse.ArgumentParser(description="Collect a tiny Saramin sample into standard JobPosting JSON.")
    parser.add_argument("--list-url", default=DEFAULT_LIST_URL)
    parser.add_argument("--limit", type=int, default=1)
    parser.add_argument("--delay-seconds", type=float, default=1.0)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    try:
        postings = run(args.list_url, args.limit, args.delay_seconds)
    except ValueError as error:
        parser.error(str(error))
    payload = json.dumps(postings, ensure_ascii=False, indent=2)

    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(payload + "\n", encoding="utf-8")
    else:
        print(payload)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
