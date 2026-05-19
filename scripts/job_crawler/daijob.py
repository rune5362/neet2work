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


DEFAULT_LIST_URL = (
    "https://www.daijob.com/en/jobs/search?"
    "il%5B%5D=119&il%5B%5D=122&il%5B%5D=124"
)
SOURCE = "daijob"
TEXT_LIMIT = 5000
MAX_LIMIT = 5

SKILL_KEYWORDS = [
    "Technical Support",
    "Customer Support",
    "Security",
    "Networking",
    "Network",
    "Software",
    "Hardware",
    "Cloud",
    "CCNA",
    "SQL",
    "AWS",
    "Linux",
    "Project Management",
    "Account Management",
    "Operations",
    "Management",
    "Finance",
    "Hospitality",
    "Troubleshooting",
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
    match = re.search(r"/en/jobs/detail/(?P<id>\d+)", url)
    if match:
        return match.group("id")

    parsed = urlparse(url)
    fallback = re.sub(r"\W+", "-", parsed.path.strip("/"))
    return fallback or "unknown"


def canonical_detail_url(job_id: str) -> str:
    return f"https://www.daijob.com/en/jobs/detail/{job_id}"


def list_jobs(list_url: str, limit: int) -> list[SourceJobLink]:
    result = fetch_text(list_url)
    if result.status >= 400:
        raise RuntimeError(f"Daijob list request failed: HTTP {result.status}")

    jobs = parse_list_links(result.text, result.url, limit)
    if not jobs:
        raise RuntimeError("No public Daijob detail links were found in the list page.")

    return jobs


def parse_list_links(markup: str, base_url: str, limit: int) -> list[SourceJobLink]:
    jobs: list[SourceJobLink] = []
    seen: set[str] = set()

    for match in re.finditer(r"/en/jobs/detail/(?P<id>\d+)", markup):
        job_id = match.group("id")
        if job_id in seen:
            continue

        seen.add(job_id)
        jobs.append(
            SourceJobLink(
                source=SOURCE,
                source_job_id=job_id,
                source_url=urljoin(base_url, f"/en/jobs/detail/{job_id}"),
                hints={"listUrl": base_url},
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


def extract_title(text: str) -> str:
    return find_first(
        [
            r"^(.*?)\s+:\s+.+?\s+:\s+Find jobs in Japan",
            r"Experience Welcome\s+Visa Support Available\s+(.+?)\s+Company Name",
            r"Urgent Hiring\s+(.+?)\s+Company Name",
        ],
        text,
        "Title unavailable",
    )


def extract_description(text: str) -> str:
    body = find_first(
        [r"Job Description\s*(.+?)\s*(?:Working Hours|Job Requirements|English Level)"],
        text,
        "",
    )
    requirements = find_first([r"Job Requirements\s*(.+?)\s*English Level"], text, "")
    return normalize_space(f"{body} {requirements}")


def extract_salary_text(text: str) -> str:
    value = find_first([r"Salary\s*(.+?)\s*Holidays"], text, "")
    match = re.search(r"(JPY\s*-\s*Japanese Yen\s*JPY\s*\d+K\s*-\s*JPY\s*\d+K)", value)
    if match:
        return normalize_space(match.group(1))
    return value[:180]


def collect_detail(link: SourceJobLink) -> StandardJobPosting:
    result = fetch_text(link.source_url)
    if result.status >= 400:
        raise RuntimeError(f"Daijob detail request failed: HTTP {result.status} {link.source_url}")

    text = html_to_text(result.text)
    title = extract_title(text)
    company = find_first([r"Company Name\s*(.+?)\s*Job Type"], text, "Company unavailable")
    job_type = find_first([r"Job Type\s*(.+?)\s*Industry"], text, "")
    industry = find_first([r"Industry\s*(.+?)\s*Location"], text, "")
    location = find_first([r"Location\s*(.+?)\s*Job Description"], text, "Location unavailable")
    salary_text = extract_salary_text(text)
    holidays = find_first([r"Holidays\s*(.+?)\s*Job Contract Period"], text, "")
    employment_type = find_first([r"Job Contract Period\s*(.+?)\s*Nearest Station"], text, "")
    english_level = find_first([r"English Level\s*(.+?)\s*Japanese Level"], text, "")
    japanese_level = find_first([r"Japanese Level\s*(.+?)\s*Salary"], text, "")
    description_body = extract_description(text)
    skills = infer_skills(f"{title} {job_type} {description_body}")
    career_level = "Experience welcome" if "Experience Welcome" in text else "Experience not specified"
    visa_support = "Visa Support Available" in text
    apply_method = "Daijob AGENT" if "Daijob AGENT" in text else ""
    description = normalize_space(
        f"{company} {title}. {location} / {career_level}"
        + (f" / {employment_type}" if employment_type else "")
        + (f". Skills: {', '.join(skills)}" if skills else "")
        + (f". {description_body[:340]}" if description_body else "")
    )

    raw_json: dict[str, Any] = {
        "listUrl": link.hints.get("listUrl"),
        "detailStatus": result.status,
        "detailFinalUrl": result.url,
        "canonicalDetailUrl": canonical_detail_url(link.source_job_id),
        "detailTextLength": len(text),
        "jobType": job_type or None,
        "industry": industry or None,
        "englishLevel": english_level or None,
        "japaneseLevel": japanese_level or None,
        "holidays": holidays or None,
        "visaSupport": visa_support,
        "parser": "stdlib-htmlparser-v1",
    }
    company_info = {
        "industry": industry,
        "hiringChannel": "Daijob AGENT" if apply_method else "",
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
        language="en",
        employmentType=employment_type or None,
        salaryText=salary_text or None,
        applyMethod=apply_method or None,
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
    parser = argparse.ArgumentParser(description="Collect a tiny Daijob sample into standard JobPosting JSON.")
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
