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


DEFAULT_LIST_URL = "https://tenshoku.mynavi.jp/list/o1G/"
SOURCE = "mynavi_tenshoku"
TEXT_LIMIT = 5000
MAX_LIMIT = 5

SKILL_KEYWORDS = [
    "Java",
    "PHP",
    "Python",
    "Go",
    "C#",
    "JavaScript",
    "TypeScript",
    "React",
    "ReactNative",
    "Vue",
    "Swift",
    "Flutter",
    "AWS",
    "Azure",
    "GCP",
    "Docker",
    "Kubernetes",
    "SQL",
    "Web",
    "QA",
    "テスト",
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
    match = re.search(r"/jobinfo-(?P<id>[0-9A-Za-z-]+)/?", url)
    if match:
        return match.group("id")

    parsed = urlparse(url)
    fallback = re.sub(r"\W+", "-", parsed.path.strip("/"))
    return fallback or "unknown"


def canonical_detail_url(job_id: str) -> str:
    return f"https://tenshoku.mynavi.jp/jobinfo-{job_id}/"


def list_jobs(list_url: str, limit: int) -> list[SourceJobLink]:
    result = fetch_text(list_url)
    if result.status >= 400:
        raise RuntimeError(f"Mynavi Tenshoku list request failed: HTTP {result.status}")

    jobs = parse_list_links(result.text, result.url, limit)
    if not jobs:
        raise RuntimeError("No public Mynavi Tenshoku jobinfo links were found in the list page.")

    return jobs


def parse_list_links(markup: str, base_url: str, limit: int) -> list[SourceJobLink]:
    jobs: list[SourceJobLink] = []
    seen: set[str] = set()

    for match in re.finditer(r"/jobinfo-(?P<id>[0-9A-Za-z-]+)/?", markup):
        job_id = match.group("id")
        if job_id in seen:
            continue

        seen.add(job_id)
        jobs.append(
            SourceJobLink(
                source=SOURCE,
                source_job_id=job_id,
                source_url=urljoin(base_url, f"/jobinfo-{job_id}/"),
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


def extract_title_company(text: str) -> tuple[str, str]:
    match = re.search(r"(?P<company>[^。]+?)の求人情報／(?P<title>.+?)\s+\(\d+\)\s+\|", text)
    if match:
        return normalize_space(match.group("title")), normalize_space(match.group("company"))

    return (
        find_first([r"辞退する\s*(.+?)\s+勤務地"], text, "タイトル確認必要"),
        find_first([r"(.+?)\s+勤務地"], text, "会社名確認必要"),
    )


def infer_career_level(title: str, text: str) -> str:
    probe = f"{title} {text[:1200]}"
    if "未経験" in probe:
        return "未経験歓迎"
    if "経験者" in probe:
        return "経験者"
    if "経験" in probe:
        return "経験条件あり"
    return "経験条件確認必要"


def extract_education_level(text: str) -> str:
    if "学歴不問" in text:
        return "学歴不問"
    return find_first([r"(?:応募条件|対象となる方).*?(高卒以上|大卒以上|専門卒以上)"], text, "")


def extract_employment_type(text: str) -> str:
    return find_first(
        [
            r"雇用形態\s*(正社員|契約社員|業務委託|人材紹介|パート・アルバイト|一般派遣|紹介予定派遣|FCオーナー)"
        ],
        text,
        "",
    )


def extract_detail_body(text: str) -> str:
    responsibilities = find_first([r"仕事内容\s*(.+?)\s*対象となる方"], text, "")
    requirements = find_first([r"対象となる方\s*(.+?)\s*募集要項"], text, "")
    return normalize_space(f"{responsibilities} {requirements}")


def collect_detail(link: SourceJobLink) -> StandardJobPosting:
    result = fetch_text(link.source_url)
    if result.status >= 400:
        raise RuntimeError(
            f"Mynavi Tenshoku detail request failed: HTTP {result.status} {link.source_url}"
        )

    text = html_to_text(result.text)
    title, company = extract_title_company(text)
    location = find_first(
        [
            r"勤務地\s*(.+?)\s*(?:もっと見る\s*)?初年度年収",
            r"勤務地\s*(.+?)\s*(?:給与|勤務時間)",
        ],
        text,
        "勤務地確認必要",
    )
    salary_text = find_first(
        [r"初年度年収\s*(.+?)\s*雇用形態", r"給与\s*(.+?)\s*(?:初年度年収|昇給|賞与|勤務地)"],
        text,
        "",
    )
    employment_type = extract_employment_type(text)
    deadline_text = find_first([r"掲載終了予定日：?\s*([0-9/]+)"], text, "")
    update_date = find_first([r"情報更新日：?\s*([0-9/]+)"], text, "")
    education_level = extract_education_level(text)
    detail_body = extract_detail_body(text)
    skills = infer_skills(f"{title} {detail_body}")
    career_level = infer_career_level(title, text)
    apply_method = "応募フォームへ進む" if "応募フォームへ進む" in text else ""
    description = normalize_space(
        f"{company}の{title}求人。{location} / {career_level}"
        + (f" / {employment_type}" if employment_type else "")
        + (f". スキル: {', '.join(skills)}" if skills else "")
        + (f". {detail_body[:320]}" if detail_body else "")
    )

    raw_json: dict[str, Any] = {
        "listUrl": link.hints.get("listUrl"),
        "detailStatus": result.status,
        "detailFinalUrl": result.url,
        "canonicalDetailUrl": canonical_detail_url(link.source_job_id),
        "detailTextLength": len(text),
        "updateDate": update_date or None,
        "parser": "stdlib-htmlparser-v1",
    }

    company_info = {
        "postingSource": "mynavi_tenshoku",
        "updateDate": update_date,
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
        employmentType=employment_type or None,
        educationLevel=education_level or None,
        salaryText=salary_text or None,
        deadlineText=deadline_text or None,
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
    parser = argparse.ArgumentParser(
        description="Collect a tiny Mynavi Tenshoku sample into standard JobPosting JSON."
    )
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
