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
from urllib.parse import urljoin, urlparse

if __package__ is None or __package__ == "":
    sys.path.append(str(Path(__file__).resolve().parents[1]))
    from job_crawler.http_client import fetch_text
    from job_crawler.models import SourceJobLink, StandardJobPosting
else:
    from .http_client import fetch_text
    from .models import SourceJobLink, StandardJobPosting


DEFAULT_LIST_URL = "https://www.green-japan.com/search_key/01"
SOURCE = "green_japan"
TEXT_LIMIT = 5000
MAX_LIMIT = 5

SKILL_KEYWORDS = [
    "SQL",
    "Python",
    "Django",
    "MySQL",
    "TensorFlow",
    "Azure",
    "Elasticsearch",
    "GCP",
    "Redis",
    "scikit-learn",
    "React",
    "TypeScript",
    "JavaScript",
    "Ruby",
    "Rails",
    "AI",
    "LLM",
    "BigQuery",
]


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


def source_job_id(url: str) -> str:
    match = re.search(r"/company/(?P<company_id>\d+)/job/(?P<job_id>\d+)", url)
    if match:
        return f"{match.group('company_id')}-{match.group('job_id')}"

    parsed = urlparse(url)
    fallback = re.sub(r"\W+", "-", parsed.path.strip("/"))
    return fallback or "unknown"


def canonical_detail_url(job_id: str) -> str:
    company_id, posting_id = job_id.split("-", 1)
    return f"https://www.green-japan.com/company/{company_id}/job/{posting_id}"


def list_jobs(list_url: str, limit: int) -> list[SourceJobLink]:
    result = fetch_text(list_url)
    if result.status >= 400:
        raise RuntimeError(f"Green Japan list request failed: HTTP {result.status}")

    jobs = parse_list_links(result.text, result.url, limit)
    if not jobs:
        raise RuntimeError("No public Green Japan detail links were found in the list page.")

    return jobs


def parse_list_links(markup: str, base_url: str, limit: int) -> list[SourceJobLink]:
    jobs: list[SourceJobLink] = []
    seen: set[str] = set()

    for match in re.finditer(r"/company/(?P<company_id>\d+)/job/(?P<job_id>\d+)", markup):
        source_id = f"{match.group('company_id')}-{match.group('job_id')}"
        if source_id in seen:
            continue

        seen.add(source_id)
        jobs.append(
            SourceJobLink(
                source=SOURCE,
                source_job_id=source_id,
                source_url=urljoin(base_url, f"/company/{match.group('company_id')}/job/{match.group('job_id')}"),
                hints={
                    "listUrl": base_url,
                    "companyId": match.group("company_id"),
                    "jobId": match.group("job_id"),
                },
            )
        )

        if len(jobs) >= limit:
            break

    return jobs


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


def extract_title_company(text: str) -> tuple[str, str]:
    match = re.search(r"^(?P<company>.+?)\s+\|\s+(?P<title>.+?)\s+\|", text)
    if match:
        return normalize_space(match.group("title")), normalize_space(match.group("company"))

    return "求人タイトル確認必要", "会社名確認必要"


def extract_top_fields(title: str, text: str) -> tuple[str, str, list[str], list[str]]:
    pattern = rf"{re.escape(title)}\s*(?P<salary>\d+万円〜\d+万円)\s*(?P<location>[^\s]+)\s*(?P<tail>.+?)\s*事業内容"
    match = re.search(pattern, text)
    if not match:
        return "", "勤務地確認必要", [], []

    salary = normalize_space(match.group("salary"))
    tail = normalize_space(f"{match.group('location')} {match.group('tail')}")
    skill_start = find_skill_start(tail)
    location = normalize_space(tail[:skill_start].strip(" ,")) if skill_start > 0 else "勤務地確認必要"
    stack_and_tags = tail[skill_start:] if skill_start >= 0 else ""
    if not stack_and_tags:
        return salary, location, [], []
    skill_part, _, tag_part = stack_and_tags.partition("週に")
    skills = [part for part in (normalize_space(value) for value in skill_part.split(",")) if part]
    tags = [part for part in (normalize_space(value) for value in f"週に{tag_part}".split(",")) if part] if tag_part else []
    return salary, location, skills, tags


def find_skill_start(value: str) -> int:
    indexes = [value.find(skill) for skill in SKILL_KEYWORDS if value.find(skill) >= 0]
    return min(indexes) if indexes else -1


def collect_detail(link: SourceJobLink) -> StandardJobPosting:
    result = fetch_text(link.source_url)
    if result.status >= 400:
        raise RuntimeError(
            f"Green Japan detail request failed: HTTP {result.status} {link.source_url}"
        )

    text = html_to_text(result.text)
    title, company = extract_title_company(text)
    salary_text, location, stack_skills, work_tags = extract_top_fields(title, text)
    company_intro = find_first([r"事業内容\s*(.+?)\s*仕事内容"], text, "")
    body = find_first([r"仕事内容\s*(.+?)\s*(?:この仕事で得られるもの|応募要件)"], text, "")
    benefits = find_first([r"待遇・福利厚生\s*(.+?)\s*休日・休暇"], text, "")
    holidays = find_first([r"休日・休暇\s*(.+?)\s*ビザスクの掲げる思い"], text, "")
    skills = list(dict.fromkeys([*stack_skills, *infer_skills(f"{title} {body}")]))[:14]
    career_level = "経験条件一部ログイン後"
    education_level = "学歴不問" if "学歴不問" in text else ""
    description = normalize_space(
        f"{company}の{title}求人。{location} / {career_level}"
        + (f". スキル: {', '.join(skills)}" if skills else "")
        + (f". {body[:360]}" if body else "")
    )

    raw_json: dict[str, Any] = {
        "listUrl": link.hints.get("listUrl"),
        "companyId": link.hints.get("companyId"),
        "jobId": link.hints.get("jobId"),
        "detailStatus": result.status,
        "detailFinalUrl": result.url,
        "canonicalDetailUrl": canonical_detail_url(link.source_job_id),
        "detailTextLength": len(text),
        "workStyleTags": work_tags,
        "benefits": benefits[:500] or None,
        "holidays": holidays[:500] or None,
        "loginGatedFields": ["application requirements", "expected salary", "selection process"],
        "parser": "stdlib-htmlparser-v1",
    }
    company_info = {
        "intro": company_intro[:700],
    }

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
        country="JP",
        language="ja",
        educationLevel=education_level or None,
        salaryText=salary_text or None,
        companyInfo={key: value for key, value in company_info.items() if value} or None,
        rawText=text[:TEXT_LIMIT],
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
    parser = argparse.ArgumentParser(description="Collect a tiny Green Japan sample into standard JobPosting JSON.")
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
