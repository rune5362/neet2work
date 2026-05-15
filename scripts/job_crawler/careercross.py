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


DEFAULT_LIST_URL = "https://www.careercross.com/en/"
SOURCE = "careercross"
TEXT_LIMIT = 5000
MAX_LIMIT = 5

SKILL_KEYWORDS = [
    "Software",
    "Cloud",
    "Oracle",
    "SQL",
    "PL/SQL",
    "AI",
    "Data",
    "Python",
    "Java",
    "JavaScript",
    "Project Management",
    "Customer",
    "System Engineering",
    "Operations",
    "Management",
    "Logistics",
    "Supply Chain",
    "Remote",
    "プロジェクト",
    "物流",
    "データ",
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
    match = re.search(r"/en/job/detail-(?P<id>\d+)", url)
    if match:
        return match.group("id")

    parsed = urlparse(url)
    fallback = re.sub(r"\W+", "-", parsed.path.strip("/"))
    return fallback or "unknown"


def canonical_detail_url(job_id: str) -> str:
    return f"https://www.careercross.com/en/job/detail-{job_id}"


def list_jobs(list_url: str, limit: int) -> list[SourceJobLink]:
    result = fetch_text(list_url)
    if result.status >= 400:
        raise RuntimeError(f"CareerCross list request failed: HTTP {result.status}")

    jobs = parse_list_links(result.text, result.url, limit)
    if not jobs:
        raise RuntimeError("No public CareerCross detail links were found in the list page.")

    return jobs


def parse_list_links(markup: str, base_url: str, limit: int) -> list[SourceJobLink]:
    jobs: list[SourceJobLink] = []
    seen: set[str] = set()

    for match in re.finditer(r"/en/job/detail-(?P<id>\d+)", markup):
        job_id = match.group("id")
        if job_id in seen:
            continue

        seen.add(job_id)
        jobs.append(
            SourceJobLink(
                source=SOURCE,
                source_job_id=job_id,
                source_url=urljoin(base_url, f"/en/job/detail-{job_id}"),
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
        [r"^(.+?)\s+Job Information", r"Date Updated\s*:\s*.+?\s+(.+?)\s+Location"],
        text,
        "Title unavailable",
    )


def extract_description(text: str) -> str:
    description = find_first([r"Job Description\s*(.+?)\s*General Requirements"], text, "")
    requirements = find_first([r"Required Skills\s*(.+?)\s*Job Location"], text, "")
    return normalize_space(f"{description} {requirements}")


def collect_detail(link: SourceJobLink) -> StandardJobPosting:
    result = fetch_text(link.source_url)
    if result.status >= 400:
        raise RuntimeError(
            f"CareerCross detail request failed: HTTP {result.status} {link.source_url}"
        )

    text = html_to_text(result.text)
    title = extract_title(text)
    location = find_first([r"Location\s*(.+?)\s*Job Type"], text, "Location unavailable")
    employment_type = find_first([r"Job Type\s*(.+?)\s*Salary"], text, "")
    salary_text = find_first([r"Salary\s*(.+?)\s*(?:Work Style|Job Description)"], text, "")
    remote_option = find_first([r"Work Style\s*(.+?)\s*Job Description"], text, "")
    career_level = find_first([r"Career Level\s*(.+?)\s*Minimum English Level"], text, "Career level unavailable")
    english_level = find_first([r"Minimum English Level\s*(.+?)\s*Minimum Japanese Level"], text, "")
    japanese_level = find_first([r"Minimum Japanese Level\s*(.+?)\s*Minimum Education Level"], text, "")
    education_level = find_first([r"Minimum Education Level\s*(.+?)\s*Visa Status"], text, "")
    visa_status = find_first([r"Visa Status\s*(.+?)\s*Required Skills"], text, "")
    industry = find_first([r"Industry\s*(.+?)\s*Job Category"], text, "")
    job_category = find_first([r"Job Category\s*(.+?)\s*Recruiter Company Information"], text, "")
    hiring_company = find_first([r"Hiring Company\s*(.+?)\s*Location"], text, "")
    recruiter_company = find_first([r"Recruiter Company Information\s*(.+?)\s*Company Description"], text, "")
    update_date = find_first([r"Date Updated\s*:\s*([A-Za-z0-9,\s]+?)\s+[^\s]+?\s+Location"], text, "")
    company = hiring_company or recruiter_company or "Company unavailable"
    description_body = extract_description(text)
    skills = infer_skills(f"{title} {industry} {job_category} {description_body}")
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
        "updateDate": update_date or None,
        "englishLevel": english_level or None,
        "japaneseLevel": japanese_level or None,
        "visaStatus": visa_status or None,
        "careerLevel": career_level,
        "industry": industry or None,
        "jobCategory": job_category or None,
        "remoteOption": remote_option or None,
        "parser": "stdlib-htmlparser-v1",
    }
    company_info = {
        "hiringCompany": hiring_company,
        "recruiterCompany": recruiter_company,
        "industry": industry,
        "jobCategory": job_category,
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
        educationLevel=education_level or None,
        salaryText=salary_text or None,
        applyMethod="CareerCross application" if "Send Application" in text else None,
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
    parser = argparse.ArgumentParser(description="Collect a tiny CareerCross sample into standard JobPosting JSON.")
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
