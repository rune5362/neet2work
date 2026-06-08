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
    from job_crawler.http_client import FetchResult, fetch_text
    from job_crawler.models import SourceJobLink, StandardJobPosting
else:
    from .http_client import FetchResult, fetch_text
    from .models import SourceJobLink, StandardJobPosting


DEFAULT_LIST_URL = (
    "https://www.daijob.com/en/jobs/search?"
    "il%5B%5D=119&il%5B%5D=122&il%5B%5D=124"
)
ALLOWED_HOSTS = {"daijob.com", "www.daijob.com"}
SOURCE = "daijob"
TEXT_LIMIT = 5000
MAX_LIMIT = 5
DETAIL_LANGUAGE_PRIORITY = ("ja", "en")
CLOSED_DETAIL_PATTERNS = (
    "募集終了",
    "掲載終了",
    "受付終了",
    "応募終了",
    "closed",
    "expired",
    "no longer accepting",
    "ended",
)

FIELD_PATTERNS = {
    "en": {
        "title": [
            r"^(.*?)\s+:\s+.+?\s+:\s+Find jobs in Japan",
            r"Experience Welcome\s+Visa Support Available\s+(.+?)\s+Company Name",
            r"Urgent Hiring\s+(.+?)\s+Company Name",
        ],
        "company": [r"Company Name\s*(.+?)\s*Job Type"],
        "job_type": [r"Job Type\s*(.+?)\s*Industry"],
        "industry": [r"Industry\s*(.+?)\s*Location"],
        "location": [r"Location\s*(.+?)\s*Job Description"],
        "description": [r"Job Description\s*(.+?)\s*(?:Working Hours|Job Requirements|English Level)"],
        "requirements": [r"Job Requirements\s*(.+?)\s*English Level"],
        "salary": [r"Salary\s*(.+?)\s*(?:Other Salary Description|Holidays)"],
        "holidays": [r"Holidays\s*(.+?)\s*Job Contract Period"],
        "employment": [r"Job Contract Period\s*(.+?)\s*Nearest Station"],
        "english_level": [r"English Level\s*(.+?)\s*Japanese Level"],
        "japanese_level": [r"Japanese Level\s*(.+?)\s*Salary"],
    },
    "ja": {
        "title": [
            r"^(.*?)\s+\|\s+.+?\s+\|\s+外資系転職・求人サイト",
            r"新卒歓迎\s+(.+?)\s+企業名",
            r"急募\s+(.+?)\s+企業名",
        ],
        "company": [r"企業名\s*(.+?)\s*職種"],
        "job_type": [r"職種\s*(.+?)\s*業種"],
        "industry": [r"業種\s*(.+?)\s*勤務地"],
        "location": [r"勤務地\s*(.+?)\s*仕事内容"],
        "description": [r"仕事内容\s*(.+?)\s*(?:勤務時間|応募条件|英語能力)"],
        "requirements": [r"応募条件\s*(.+?)\s*英語能力"],
        "salary": [r"年収\s*(.+?)\s*(?:給与に関する説明|休日|契約期間)"],
        "holidays": [r"休日\s*(.+?)\s*契約期間"],
        "employment": [r"契約期間\s*(.+?)\s*最寄り駅"],
        "english_level": [r"英語能力\s*(.+?)\s*日本語能力"],
        "japanese_level": [r"日本語能力\s*(.+?)\s*年収"],
    },
}

CAREER_LEVEL_MARKERS = {
    "en": [
        ("Executive Level", "Executive Level"),
        ("Director/GM Level", "Director/GM Level"),
        ("Manager Level", "Manager Level"),
        ("Senior Level", "Senior Level"),
        ("Staff Level", "Staff Level"),
        ("Entry Level", "Entry Level"),
        ("Experience Welcome", "Experience welcome"),
    ],
    "ja": [
        ("エグゼクティブレベル", "Executive Level"),
        ("本部長・事業部長クラス", "Director/GM Level"),
        ("マネージャーレベル", "Manager Level"),
        ("シニアレベル", "Senior Level"),
        ("スタッフレベル", "Staff Level"),
        ("エントリーレベル", "Entry Level"),
        ("経験者優遇", "Experience welcome"),
    ],
}

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
    match = re.search(r"/(?:en/)?jobs/detail/(?P<id>\d+)", url)
    if match:
        return match.group("id")

    parsed = urlparse(url)
    fallback = re.sub(r"\W+", "-", parsed.path.strip("/"))
    return fallback or "unknown"


def canonical_detail_url(job_id: str, language: str = "en") -> str:
    if language == "ja":
        return f"https://www.daijob.com/jobs/detail/{job_id}"
    return f"https://www.daijob.com/en/jobs/detail/{job_id}"


def list_jobs(list_url: str, limit: int) -> list[SourceJobLink]:
    result = fetch_text(list_url, allowed_hosts=ALLOWED_HOSTS)
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


def extract_html_lang(markup: str) -> str:
    match = re.search(r"<html[^>]+lang=[\"'](?P<lang>[a-zA-Z-]+)[\"']", markup)
    return (match.group("lang").split("-", 1)[0].lower() if match else "").strip() or "en"


def looks_like_detail_page(text: str, language: str) -> bool:
    if language == "ja":
        return "求人詳細" in text and "仕事内容" in text
    return "Job Details" in text and "Job Description" in text


def resolve_detail_result(job_id: str) -> tuple[FetchResult, str, str]:
    errors: list[str] = []

    for language in DETAIL_LANGUAGE_PRIORITY:
        url = canonical_detail_url(job_id, language)
        try:
            result = fetch_text(url, allowed_hosts=ALLOWED_HOSTS)
        except RuntimeError as error:
            errors.append(f"{language}:{error}")
            continue

        if result.status >= 400:
            errors.append(f"{language}:HTTP {result.status}")
            continue

        page_language = extract_html_lang(result.text)
        text = html_to_text(result.text)
        if language == "ja" and page_language == "ja" and looks_like_detail_page(text, "ja"):
            return result, text, "ja"
        if language == "en" and page_language == "en" and looks_like_detail_page(text, "en"):
            return result, text, "en"
        closed_signal = find_closed_detail_signal(text)
        if closed_signal:
            errors.append(f"{language}:closed-page:{closed_signal}")
            continue
        errors.append(f"{language}:unexpected-page:{page_language}")

    joined_errors = "; ".join(errors) if errors else "unknown detail resolution failure"
    raise RuntimeError(f"Daijob detail resolution failed for {job_id}: {joined_errors}")


def extract_field(text: str, language: str, field: str, default: str = "") -> str:
    return find_first(FIELD_PATTERNS[language][field], text, default)


def find_closed_detail_signal(text: str) -> str | None:
    lowered = text.lower()
    for pattern in CLOSED_DETAIL_PATTERNS:
        if pattern.lower() in lowered:
            return pattern
    return None


def extract_title(text: str, language: str) -> str:
    return extract_field(text, language, "title", "Title unavailable")


def extract_description(text: str, language: str) -> str:
    body = extract_field(text, language, "description", "")
    requirements = extract_field(text, language, "requirements", "")
    return normalize_space(f"{body} {requirements}")


def extract_salary_text(text: str, language: str) -> str:
    value = extract_field(text, language, "salary", "")
    if language == "ja":
        return value[:180]

    match = re.search(r"(JPY\s*-\s*Japanese Yen\s*JPY\s*\d+K\s*-\s*JPY\s*\d+K)", value)
    if match:
        return normalize_space(match.group(1))
    return value[:180]


def extract_career_level(text: str, language: str) -> str:
    for marker, normalized in CAREER_LEVEL_MARKERS[language]:
        if marker in text:
            return normalized
    return "Experience not specified"


def collect_detail(link: SourceJobLink) -> StandardJobPosting:
    result, text, language = resolve_detail_result(link.source_job_id)
    title = extract_title(text, language)
    company = extract_field(text, language, "company", "Company unavailable")
    job_type = extract_field(text, language, "job_type", "")
    industry = extract_field(text, language, "industry", "")
    location = extract_field(text, language, "location", "Location unavailable")
    salary_text = extract_salary_text(text, language)
    holidays = extract_field(text, language, "holidays", "")
    employment_type = extract_field(text, language, "employment", "")
    english_level = extract_field(text, language, "english_level", "")
    japanese_level = extract_field(text, language, "japanese_level", "")
    description_body = extract_description(text, language)
    skills = infer_skills(f"{title} {job_type} {description_body}")
    career_level = extract_career_level(text, language)
    visa_support = "Visa Support Available" in text or "ビザサポート" in text
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
        "detailRequestedUrlJa": canonical_detail_url(link.source_job_id, "ja"),
        "detailRequestedUrlEn": canonical_detail_url(link.source_job_id, "en"),
        "detailFinalUrl": result.url,
        "detailLanguage": language,
        "canonicalDetailUrl": canonical_detail_url(link.source_job_id, language),
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
        sourceUrl=result.url,
        country="JP",
        language=language,
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
