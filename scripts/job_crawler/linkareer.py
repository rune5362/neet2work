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


DEFAULT_LIST_URL = "https://linkareer.com/list/intern"
ALLOWED_LIST_PATHS = {"/list/recruit", "/list/intern"}
SOURCE = "linkareer"
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

SHORT_SKILL_CONTEXTS = {
    "AI": [
        "AI 개발",
        "AI 개발자",
        "AI 엔지니어",
        "AI 서비스",
        "AI 모델",
        "인공지능 개발",
        "인공지능 모델",
        "인공지능 서비스",
        "인공지능 엔지니어",
    ],
    "ML": ["ML 개발", "ML 엔지니어", "ML 모델", "MLOps", "머신러닝"],
    "Data": [
        "Data Engineer",
        "Data Analyst",
        "Data Scientist",
        "데이터 분석",
        "데이터 엔지니어",
        "데이터 파이프라인",
    ],
}


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


def source_job_id(url: str) -> str:
    match = re.search(r"/activity/(?P<id>\d+)", url)
    if match:
        return match.group("id")

    parsed = urlparse(url)
    fallback = re.sub(r"\W+", "-", parsed.path.strip("/"))
    return fallback or "unknown"


def canonical_detail_url(job_id: str) -> str:
    return f"https://linkareer.com/activity/{job_id}"


def list_category(list_url: str) -> str:
    path = urlparse(list_url).path
    if path not in ALLOWED_LIST_PATHS:
        allowed = ", ".join(sorted(ALLOWED_LIST_PATHS))
        raise ValueError(f"Linkareer list URL must be one of: {allowed}")
    return path.rsplit("/", 1)[-1]


def list_jobs(list_url: str, limit: int) -> list[SourceJobLink]:
    category = list_category(list_url)
    result = fetch_text(list_url)
    if result.status >= 400:
        raise RuntimeError(f"Linkareer list request failed: HTTP {result.status}")

    jobs = parse_list_rows(result.text, result.url, category, limit)
    if not jobs:
        raise RuntimeError("No public Linkareer activity links were found in the list page.")

    return jobs


def parse_list_rows(markup: str, base_url: str, category: str, limit: int) -> list[SourceJobLink]:
    rows = re.findall(r'<tr[^>]+data-activityid="(?P<id>\d+)"[^>]*>(?P<row>.*?)</tr>', markup, flags=re.S)
    jobs: list[SourceJobLink] = []
    seen: set[str] = set()

    for job_id, row in rows:
        if job_id in seen:
            continue

        href = f"/activity/{job_id}"
        title = extract_class_text(row, "recruit-name") or "제목 확인 필요"
        company = extract_class_text(row, "company-name") or "회사명 확인 필요"
        sector_text = extract_class_text(row, "recruit-category")
        employment_type = extract_cell_text(row, "item-recruit-type")
        location = extract_cell_text(row, "item-location") or "지역 확인 필요"
        deadline_text = extract_cell_text(row, "item-recruit-close")
        career_level = infer_career_level(category, employment_type)
        skills = infer_sector_keywords(sector_text) + infer_skills(title)

        hints = {
            "category": category,
            "company": company,
            "location": location,
            "careerLevel": career_level,
            "employmentType": employment_type,
            "deadlineText": deadline_text,
            "sectorText": sector_text,
            "skills": list(dict.fromkeys(skills))[:12],
        }

        seen.add(job_id)
        jobs.append(
            SourceJobLink(
                source=SOURCE,
                source_job_id=job_id,
                source_url=urljoin(base_url, href),
                title_hint=title,
                company_hint=company,
                hints={key: value for key, value in hints.items() if value},
            )
        )

        if len(jobs) >= limit:
            break

    return jobs


def extract_class_text(markup: str, class_name: str) -> str:
    match = re.search(
        rf'<[^>]+class="[^"]*(?<![\w-]){re.escape(class_name)}(?![\w-])[^"]*"[^>]*>(?P<body>.*?)</[^>]+>',
        markup,
        flags=re.S,
    )
    return clean_fragment(match.group("body")) if match else ""


def extract_cell_text(markup: str, class_name: str) -> str:
    match = re.search(
        rf'<div class="{re.escape(class_name)}">(?P<body>.*?)</div>',
        markup,
        flags=re.S,
    )
    return clean_fragment(match.group("body")) if match else ""


def infer_career_level(category: str, employment_type: str) -> str:
    if "인턴" in employment_type or category == "intern":
        return "인턴"
    if "신입" in employment_type or category == "recruit":
        return "신입"
    if "경력" in employment_type:
        return "경력"
    return "신입/경력 확인 필요"


def infer_sector_keywords(sector_text: str | None) -> list[str]:
    if not sector_text:
        return []
    return [part for part in (normalize_space(value) for value in sector_text.split(",")) if part][:8]


def infer_skills(text: str) -> list[str]:
    lowered = text.lower()
    found: list[str] = []
    for skill in SKILL_KEYWORDS:
        if skill in SHORT_SKILL_CONTEXTS:
            if any(marker.lower() in lowered for marker in SHORT_SKILL_CONTEXTS[skill]):
                found.append(skill)
            continue

        pattern = rf"(?<![A-Za-z0-9]){re.escape(skill.lower())}(?![A-Za-z0-9])"
        if re.search(pattern, lowered):
            found.append(skill)
    return found[:12]


def find_first(patterns: list[str], text: str, default: str) -> str:
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return normalize_space(match.group(1))
    return default


def collect_detail(link: SourceJobLink) -> StandardJobPosting:
    result = fetch_text(link.source_url)
    if result.status >= 400:
        raise RuntimeError(f"Linkareer detail request failed: HTTP {result.status} {link.source_url}")

    text = html_to_text(result.text)
    title = link.title_hint or find_first([r"D-\d+\s*(.+?)\s+[가-힣A-Za-z0-9()㈜주식회사 ]+\s+스터디"], text, "제목 확인 필요")
    company = link.company_hint or link.hints.get("company") or "회사명 확인 필요"
    location = link.hints.get("location") or find_first([r"근무지역\s*([가-힣A-Za-z0-9·,\s]+?)\s*(?:홈페이지|공유하기)"], text, "지역 확인 필요")
    career_level = link.hints.get("careerLevel") or "신입/경력 확인 필요"
    employment_type = link.hints.get("employmentType") or find_first([r"채용형태\s*([가-힣A-Za-z0-9·,\s/]+?)\s*모집직무"], text, "")
    deadline_text = link.hints.get("deadlineText") or extract_detail_deadline(text)
    sector_text = link.hints.get("sectorText") or find_first([r"모집직무\s*([가-힣A-Za-z0-9·,\s/]+?)\s*근무지역"], text, "")
    skills = list(dict.fromkeys([*link.hints.get("skills", []), *infer_sector_keywords(sector_text), *infer_skills(title)]))[:12]
    company_info = extract_company_info(text)
    description_body = extract_detail_body(text)
    description = normalize_space(
        f"{company}의 {title} 공고. {location} / {career_level}"
        + (f" / {employment_type}" if employment_type else "")
        + (f". 키워드: {', '.join(skills)}" if skills else "")
        + (f". {description_body[:300]}" if description_body else "")
    )

    raw_json: dict[str, Any] = {
        "listCategory": link.hints.get("category"),
        "listTitleHint": link.title_hint,
        "listCompanyHint": link.company_hint,
        "listHints": link.hints,
        "detailStatus": result.status,
        "detailFinalUrl": result.url,
        "canonicalDetailUrl": canonical_detail_url(link.source_job_id),
        "detailTextLength": len(text),
        "parser": "stdlib-htmlparser-v1",
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
        country="KR",
        language="ko",
        employmentType=employment_type or None,
        deadlineText=deadline_text or None,
        companyInfo=company_info or None,
        rawText=text[:TEXT_LIMIT],
        rawJson=raw_json,
    )


def extract_detail_deadline(text: str) -> str:
    start = find_first([r"접수기간\s*시작일\s*([0-9.]+)"], text, "")
    end = find_first([r"마감일\s*([0-9.]+)"], text, "")
    if start and end:
        return f"{start} ~ {end}"
    return end


def extract_company_info(text: str) -> dict[str, str]:
    fields = {
        "companyType": find_first([r"기업형태\s*([가-힣A-Za-z0-9·,\s/]+?)\s*접수기간"], text, ""),
        "homepage": find_first([r"홈페이지\s*(https?://\S+)"], text, ""),
    }
    return {key: value for key, value in fields.items() if value}


def extract_detail_body(text: str) -> str:
    return find_first(
        [r"상세내용\s*(.+?)\s*(?:스터디 모집|합격자료|담당자Q&A|허위·과장|신고하기)"],
        text,
        "",
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
    parser = argparse.ArgumentParser(description="Collect a tiny Linkareer sample into standard JobPosting JSON.")
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
