from __future__ import annotations

import re
from collections import defaultdict
from dataclasses import replace
from typing import Any, Iterable

from .models import StandardJobPosting, utc_now_iso


JOB_BATCH_SCHEMA_VERSION = "job_batch_v1"
CAREER_STAGE_VALUES = {
    "intern",
    "entry",
    "junior",
    "career_unspecified",
    "mid",
    "senior",
    "lead_manager",
    "unknown",
}
JOB_CATEGORY_VALUES = {
    "software_engineering",
    "data_ai",
    "it_infrastructure_security",
    "qa_testing",
    "product_planning",
    "product_design",
    "technical_support",
    "solution_consulting",
    "other_it",
    "non_it",
}
IT_JOB_CATEGORY_VALUES = JOB_CATEGORY_VALUES - {"non_it"}
EARLY_CAREER_STAGES = {"intern", "entry", "junior", "career_unspecified"}
MID_CAREER_STAGES = {"mid", "unknown"}
SENIOR_CAREER_STAGES = {"senior", "lead_manager"}
DEFAULT_SOURCE_CAP = 50
DEFAULT_CATEGORY_CAP = 12
DEFAULT_CAREER_GROUP_CAPS = {
    "early": 35,
    "mid_unknown": 12,
    "senior_lead": 3,
}


def classify_career_stage(posting: StandardJobPosting) -> tuple[str, list[str]]:
    text = _combined_text(
        posting.careerLevel,
        posting.title,
        posting.employmentType,
        posting.description,
    )
    lowered = text.lower()

    if _has_any(text, ["인턴", "채용연계", "体験", "インターン"]) or _has_any(
        lowered, ["intern", "trainee"]
    ):
        return "intern", ["intern_keyword"]

    if _has_any(text, ["신입", "新卒", "未経験"]) or _has_any(
        lowered, ["entry level", "graduate", "no experience"]
    ):
        return "entry", ["entry_keyword"]

    if _has_any(text, ["주니어", "第二新卒"]) or _has_any(lowered, ["junior"]):
        return "junior", ["junior_keyword"]

    years = _extract_years(text)
    if years is not None:
        if years <= 3:
            return "junior", [f"years:{years}"]
        if years <= 7:
            return "mid", [f"years:{years}"]
        return "senior", [f"years:{years}"]

    if _has_any(text, ["경력무관", "경력 무관", "経験不問", "歓迎"]):
        return "career_unspecified", ["unspecified_keyword"]

    if _has_any(text, ["팀장", "리드", "관리자", "マネージャー"]) or _has_any(
        lowered, ["lead", "manager", "head of"]
    ):
        return "lead_manager", ["lead_manager_keyword"]

    if _has_any(text, ["시니어", "고급", "責任者"]) or _has_any(lowered, ["senior", "principal"]):
        return "senior", ["senior_keyword"]

    if _has_any(text, ["경력", "中途", "経験"]) or _has_any(lowered, ["experienced"]):
        return "mid", ["career_keyword"]

    return "unknown", ["no_clear_stage_evidence"]


def classify_job_category(
    title: str,
    skills: Iterable[str],
    description: str,
) -> tuple[str, list[str]]:
    text = _combined_text(title, " ".join(skills), description)
    lowered = text.lower()
    has_it_context = _has_it_context(text)

    rules: list[tuple[str, list[str], list[str]]] = [
        ("data_ai", ["데이터", "데이터 분석", "머신러닝", "인공지능", "BI"], ["data", "analytics", "ml", "ai", "bi"]),
        (
            "software_engineering",
            ["소프트웨어 개발", "웹 개발", "앱 개발", "시스템 개발", "서버 개발", "개발자", "프론트엔드", "백엔드", "풀스택", "모바일", "게임", "서버"],
            ["software", "backend", "frontend", "developer", "react", "spring"],
        ),
        (
            "it_infrastructure_security",
            ["인프라", "클라우드", "네트워크", "보안", "시스템 운영", "서버 운영"],
            [
                "cloud",
                "sre",
                "aws",
                "azure",
                "gcp",
                "network engineer",
                "networking",
                "tcp/ip",
                "ip-based",
                "security",
                "sysadmin",
            ],
        ),
        (
            "qa_testing",
            ["QA", "테스트", "테스터", "품질보증", "검증"],
            ["qa", "tester", "test automation", "jstqb"],
        ),
        (
            "product_planning",
            ["서비스기획", "서비스 기획", "프로덕트", "PM", "PO"],
            ["product manager", "product owner", "platform pm"],
        ),
        (
            "product_design",
            ["UX", "UI", "프로덕트 디자인", "웹디자인", "앱디자인"],
            ["ux", "ui", "product design"],
        ),
        (
            "technical_support",
            ["기술지원", "IT 헬프데스크", "헬프데스크", "솔루션 엔지니어", "SaaS CS"],
            ["technical support", "it helpdesk", "helpdesk", "support engineer", "solutions engineer"],
        ),
        (
            "solution_consulting",
            ["솔루션 영업", "기술영업", "클라우드 컨설턴트", "SI 컨설턴트", "ERP 컨설턴트"],
            ["solution sales", "technical sales", "cloud consultant", "erp consultant", "si consultant"],
        ),
    ]

    for category, ko_keywords, en_keywords in rules:
        matched = _first_match(text, ko_keywords) or _first_match(lowered, en_keywords)
        if matched:
            if category in {
                "it_infrastructure_security",
                "qa_testing",
                "product_planning",
                "product_design",
                "technical_support",
                "solution_consulting",
            } and not has_it_context:
                continue
            return category, [f"keyword:{matched}"]

    if has_it_context:
        return "other_it", ["it_context_keyword"]

    return "non_it", ["no_it_scope_evidence"]


def enrich_operational_fields(
    posting: StandardJobPosting,
    *,
    crawl_batch_id: str | None = None,
    observed_at: str | None = None,
) -> StandardJobPosting:
    collected_at = observed_at or posting.collectedAt or utc_now_iso()
    career_stage, career_evidence = classify_career_stage(posting)
    job_category, category_evidence = classify_job_category(
        posting.title,
        posting.skills,
        posting.description,
    )
    classifier_meta = dict(posting.classifierMeta or {})
    classifier_meta.update(
        {
            "version": "deterministic-v1",
            "careerStageEvidence": career_evidence,
            "jobCategoryEvidence": category_evidence,
        }
    )

    return replace(
        posting,
        status=posting.status or "active",
        lastSeenAt=posting.lastSeenAt or collected_at,
        jobCategory=posting.jobCategory or job_category,
        careerStage=posting.careerStage or career_stage,
        crawlBatchId=posting.crawlBatchId or crawl_batch_id,
        classifierMeta=classifier_meta,
    )


def make_job_batch(
    source: str,
    postings: Iterable[StandardJobPosting],
    *,
    mode: str = "sample",
    crawl_batch_id: str | None = None,
    collected_at: str | None = None,
    source_cap: int | None = None,
    warnings: list[str] | None = None,
    errors: list[str] | None = None,
) -> dict[str, Any]:
    if mode not in {"sample", "batch"}:
        raise ValueError("mode must be sample or batch")

    batch_collected_at = collected_at or utc_now_iso()
    batch_id = crawl_batch_id or f"{source}-{_compact_timestamp(batch_collected_at)}"
    enriched: list[StandardJobPosting] = []

    for posting in postings:
        if posting.source != source:
            raise ValueError(f"posting source drifted: {posting.source} != {source}")
        enriched.append(
            enrich_operational_fields(
                posting,
                crawl_batch_id=batch_id,
                observed_at=batch_collected_at,
            )
        )

    return {
        "schemaVersion": JOB_BATCH_SCHEMA_VERSION,
        "source": source,
        "mode": mode,
        "crawlBatchId": batch_id,
        "collectedAt": batch_collected_at,
        "sourceCap": source_cap,
        "postings": [posting.to_json_dict() for posting in enriched],
        "warnings": warnings or [],
        "errors": errors or [],
    }


def apply_collection_caps(
    postings: Iterable[StandardJobPosting],
    *,
    source_cap: int = DEFAULT_SOURCE_CAP,
    category_cap: int = DEFAULT_CATEGORY_CAP,
    career_group_caps: dict[str, int] | None = None,
    it_only: bool = True,
) -> list[StandardJobPosting]:
    group_caps = career_group_caps or DEFAULT_CAREER_GROUP_CAPS
    enriched = [enrich_operational_fields(posting) for posting in postings]
    if it_only:
        enriched = [posting for posting in enriched if posting.jobCategory in IT_JOB_CATEGORY_VALUES]
    category_counts: dict[str, int] = defaultdict(int)
    group_counts: dict[str, int] = defaultdict(int)
    selected: list[StandardJobPosting] = []

    for group in ("early", "mid_unknown", "senior_lead"):
        for posting in enriched:
            if len(selected) >= source_cap:
                return selected
            if _career_group(posting.careerStage) != group:
                continue
            if posting in selected:
                continue
            category = posting.jobCategory or "other"
            if category_counts[category] >= category_cap:
                continue
            if group_counts[group] >= group_caps.get(group, 0):
                continue
            selected.append(posting)
            category_counts[category] += 1
            group_counts[group] += 1

    return selected


def _career_group(stage: str | None) -> str:
    if stage in EARLY_CAREER_STAGES:
        return "early"
    if stage in SENIOR_CAREER_STAGES:
        return "senior_lead"
    return "mid_unknown"


def _combined_text(*parts: str | None) -> str:
    return " ".join(part for part in parts if part)


def _has_any(text: str, keywords: Iterable[str]) -> bool:
    return any(keyword in text for keyword in keywords)


def _first_match(text: str, keywords: Iterable[str]) -> str:
    for keyword in keywords:
        if keyword.isascii():
            pattern = rf"(?<![a-z0-9]){re.escape(keyword)}(?![a-z0-9])"
            if re.search(pattern, text):
                return keyword
            continue
        if keyword in text:
            return keyword
    return ""


def _has_it_context(text: str) -> bool:
    lowered = text.lower()
    ko_keywords = [
        "IT",
        "개발자",
        "웹",
        "앱",
        "플랫폼",
        "소프트웨어",
        "시스템",
        "데이터",
        "AI",
        "인공지능",
        "클라우드",
        "정보보안",
        "사이버보안",
        "서버",
        "네트워크",
        "모바일",
        "게임",
        "SaaS",
        "UX",
        "UI",
    ]
    en_keywords = [
        "software",
        "web",
        "app",
        "platform",
        "saas",
        "cloud",
        "data",
        "ai",
        "cybersecurity",
        "server",
        "network engineer",
        "networking",
        "tcp/ip",
        "ip-based",
        "developer",
        "mobile",
        "game",
        "ux",
        "ui",
    ]
    return _has_any(text, ko_keywords) or bool(_first_match(lowered, en_keywords))


def _extract_years(text: str) -> int | None:
    range_match = re.search(r"([0-9]+)\s*[~\-]\s*([0-9]+)\s*년", text)
    if range_match:
        years = int(range_match.group(1))
        return years if years <= 40 else None

    match = re.search(r"([0-9]+)\s*(?:년|years?)", text, flags=re.IGNORECASE)
    if match:
        years = int(match.group(1))
        return years if years <= 40 else None

    return None


def _compact_timestamp(value: str) -> str:
    return re.sub(r"[^0-9A-Za-z]", "", value)[:20]
