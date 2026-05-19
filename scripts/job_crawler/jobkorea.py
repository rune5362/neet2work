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


DEFAULT_LIST_URL = "https://www.jobkorea.co.kr/Search/?stext=python"
SOURCE = "jobkorea"
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
    "MLOps",
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


def visible_chunks(markup: str) -> list[str]:
    chunks = re.findall(r">([^<>]{1,160})<", markup)
    return [normalize_space(chunk) for chunk in chunks if normalize_space(chunk)]


def clean_fragment(markup: str) -> str:
    return normalize_space(html_to_text(markup))


def source_job_id(url: str) -> str:
    match = re.search(r"/Recruit/GI_Read/(?P<id>\d+)", url)
    if match:
        return match.group("id")

    parsed = urlparse(url)
    fallback = re.sub(r"\W+", "-", parsed.path.strip("/"))
    return fallback or "unknown"


def canonical_detail_url(job_id: str) -> str:
    return f"https://www.jobkorea.co.kr/Recruit/GI_Read/{job_id}"


def list_jobs(list_url: str, limit: int) -> list[SourceJobLink]:
    result = fetch_text(list_url)
    if result.status >= 400:
        raise RuntimeError(f"JobKorea list request failed: HTTP {result.status}")

    jobs = parse_list_blocks(result.text, result.url, limit)
    if not jobs:
        raise RuntimeError("No public JobKorea detail links were found in the list page.")

    return jobs


def parse_list_blocks(markup: str, base_url: str, limit: int) -> list[SourceJobLink]:
    jobs: list[SourceJobLink] = []
    seen: set[str] = set()
    blocks = re.split(r'(?=<div class="w-full rounded-2xl[^"]*".*?data-sentry-component="CardJob")', markup)

    for block in blocks:
        href_match = re.search(r'href="(?P<href>[^"]*/Recruit/GI_Read/\d+[^"]*)"', block)
        if not href_match:
            continue

        url = urljoin(base_url, html.unescape(href_match.group("href")))
        job_id = source_job_id(url)
        if job_id in seen or job_id == "unknown":
            continue

        title_match = re.search(
            r'<span class="[^"]*truncate[^"]*font-semibold[^"]*text-typo-b1-18[^"]*">(?P<title>.*?)</span>',
            block,
            re.S,
        )
        logo_match = re.search(r'<img[^>]+alt="(?P<alt>[^"]+)\s+로고"', block)
        chunks = [chunk for chunk in visible_chunks(block) if chunk not in {"스크랩"}]

        title = clean_fragment(title_match.group("title")) if title_match else infer_title_from_chunks(chunks)
        company = normalize_space(logo_match.group("alt")) if logo_match else infer_after(chunks, title, 1)
        location = infer_after(chunks, company, 1) or "지역 확인 필요"
        sector_text = infer_after(chunks, location, 1)
        apply_method = infer_after(chunks, sector_text, 1) if sector_text else ""
        career_level = infer_after(chunks, apply_method, 1) if apply_method else ""
        skills = infer_sector_keywords(sector_text) + infer_skills(title)

        hints = {
            "location": location,
            "careerLevel": career_level or "경력 확인 필요",
            "skills": skills,
            "sectorText": sector_text,
            "applyMethod": apply_method,
            "listChunks": chunks[:12],
        }

        seen.add(job_id)
        jobs.append(
            SourceJobLink(
                source=SOURCE,
                source_job_id=job_id,
                source_url=url,
                title_hint=title or None,
                company_hint=company or None,
                hints={key: value for key, value in hints.items() if value},
            )
        )

        if len(jobs) >= limit:
            break

    return jobs


def infer_title_from_chunks(chunks: list[str]) -> str:
    for chunk in chunks:
        if "채용" in chunk or "개발" in chunk or "엔지니어" in chunk:
            return chunk
    return chunks[0] if chunks else "제목 확인 필요"


def infer_after(chunks: list[str], anchor: str | None, offset: int) -> str:
    if not anchor:
        return ""
    try:
        index = chunks.index(anchor)
    except ValueError:
        return ""
    target = index + offset
    return chunks[target] if 0 <= target < len(chunks) else ""


def find_first(patterns: list[str], text: str, default: str) -> str:
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return normalize_space(match.group(1))
    return default


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


def collect_detail(link: SourceJobLink) -> StandardJobPosting:
    result = fetch_text(link.source_url)
    if result.status >= 400:
        raise RuntimeError(f"JobKorea detail request failed: HTTP {result.status} {link.source_url}")

    text = html_to_text(result.text)
    title = link.title_hint or find_first([r"채용\s*-\s*(.+?)\s*\|\s*잡코리아"], text, "제목 확인 필요")
    company = link.company_hint or find_first([r"^(.+?)\s+채용\s*-"], text, "회사명 확인 필요")
    location = link.hints.get("location") or find_first([r"근무지주소\s*([가-힣A-Za-z0-9·,\s()~.-]+?)\s*(?:지도보기|인근지하철)"], text, "지역 확인 필요")
    career_level = link.hints.get("careerLevel") or find_first([r"경력\s*([가-힣A-Za-z0-9·,\s/↑~+-]+?)\s*학력"], text, "경력 확인 필요")
    education_level = find_first([r"학력\s*([가-힣A-Za-z0-9·,\s/()]+?)\s*(?:스킬|우대조건|TOP|접수기간)"], text, "")
    employment_type = find_first([r"고용형태\s*([가-힣A-Za-z0-9·,\s/().~]+?)\s*(?:급여|근무시간|근무지)"], text, "")
    salary_text = find_first([r"급여\s*([가-힣A-Za-z0-9·,\s/()~]+?)\s*(?:근무시간|근무지|지원자격)"], text, "")
    deadline_text = extract_deadline_text(text)
    apply_method = link.hints.get("applyMethod") or find_first([r"(홈페이지 지원|즉시 지원|이메일 지원)"], text, "")
    skills = list(dict.fromkeys([*link.hints.get("skills", []), *infer_skills(title)]))[:12]
    company_info = extract_company_info(text)

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
        educationLevel=education_level or None,
        salaryText=salary_text or None,
        deadlineText=deadline_text or None,
        applyMethod=apply_method or None,
        companyInfo=company_info or None,
        rawText=text[:TEXT_LIMIT],
        rawJson=raw_json,
    )


def extract_company_info(text: str) -> dict[str, str]:
    fields = {
        "employeeCount": find_first([r"사원수\s*([가-힣A-Za-z0-9~\s]+?)\s*기업구분"], text, ""),
        "companyType": find_first([r"기업구분\s*([가-힣A-Za-z0-9()·\s]+?)\s*산업"], text, ""),
        "industry": find_first([r"산업\(업종\)\s*([가-힣A-Za-z0-9·,\s/()]+?)\s*(?:지도보기|위치)"], text, ""),
        "address": find_first([r"위치\s*([가-힣A-Za-z0-9·,\s()~.-]+?)\s*(?:TOP|궁금해요|💰|️💼)"], text, ""),
    }
    return {key: value for key, value in fields.items() if value}


def infer_sector_keywords(sector_text: str | None) -> list[str]:
    if not sector_text:
        return []
    return [part for part in (normalize_space(value) for value in sector_text.split(",")) if part][:8]


def extract_deadline_text(text: str) -> str:
    period_match = re.search(
        r"시작일\s*(?P<start>[0-9.()가-힣\s:]+?)\s*마감일\s*(?P<end>[0-9.()가-힣\s:]+?)(?:\s+이 기업|\s+합격자소서|\s+접수방법|\s+지원방법|$)",
        text,
    )
    if period_match:
        return normalize_space(f"{period_match.group('start')} ~ {period_match.group('end')}")

    return find_first(
        [r"마감일\s+(?!은)([0-9.()년월일\s:가-힣]+?)(?:\s+이 기업|\s+합격자소서|\s+접수방법|\s+지원방법|$)"],
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
    parser = argparse.ArgumentParser(description="Collect a tiny JobKorea sample into standard JobPosting JSON.")
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
