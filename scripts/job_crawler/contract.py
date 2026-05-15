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
    "product_planning",
    "design",
    "marketing_content",
    "sales_cs_operations",
    "hr_admin",
    "finance_accounting",
    "education_research",
    "manufacturing_engineering",
    "logistics_trade",
    "retail_service",
    "healthcare_bio",
    "legal_compliance",
    "media_translation_global",
    "other",
}
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

    rules: list[tuple[str, list[str], list[str]]] = [
        ("data_ai", ["데이터", "분석", "머신러닝", "인공지능"], ["data", "analytics", "ml", "ai", "bi"]),
        (
            "software_engineering",
            ["개발", "엔지니어", "프론트엔드", "백엔드", "클라우드"],
            ["software", "backend", "frontend", "developer", "devops", "react", "spring"],
        ),
        ("product_planning", ["서비스기획", "서비스 기획", "사업기획", "상품기획"], ["product", "pm", "po"]),
        ("design", ["디자인", "디자이너", "ux", "ui"], ["designer", "ux", "ui", "graphic"]),
        (
            "marketing_content",
            ["마케팅", "콘텐츠", "브랜드", "퍼포먼스"],
            ["marketing", "content", "brand", "growth"],
        ),
        (
            "sales_cs_operations",
            ["영업", "고객성공", "고객 성공", "고객지원", "영업 운영", "cs"],
            ["sales", "customer success", "customer support", "business operations"],
        ),
        ("hr_admin", ["인사", "채용", "총무", "사무"], ["hr", "recruiting", "admin"]),
        ("finance_accounting", ["재무", "회계", "급여", "세무"], ["finance", "accounting", "payroll"]),
        ("education_research", ["교육", "연구", "강사", "트레이닝"], ["education", "research", "training"]),
        (
            "manufacturing_engineering",
            ["제조", "품질", "기계", "전기", "공장", "설비"],
            ["manufacturing", "quality", "mechanical", "electrical", "plant"],
        ),
        (
            "logistics_trade",
            ["물류", "무역", "구매", "공급망"],
            ["logistics", "trade", "supply chain", "purchasing"],
        ),
        ("retail_service", ["리테일", "매장", "호텔", "서비스"], ["retail", "hospitality", "store"]),
        ("healthcare_bio", ["의료", "제약", "바이오", "임상"], ["healthcare", "pharma", "biotech", "clinical"]),
        ("legal_compliance", ["법무", "컴플라이언스", "감사", "리스크"], ["legal", "compliance", "audit", "risk"]),
        (
            "media_translation_global",
            ["번역", "현지화", "글로벌", "일본어", "영어"],
            ["translation", "localization", "global", "bilingual"],
        ),
    ]

    for category, ko_keywords, en_keywords in rules:
        matched = _first_match(text, ko_keywords) or _first_match(lowered, en_keywords)
        if matched:
            return category, [f"keyword:{matched}"]

    return "other", ["no_clear_category_evidence"]


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
) -> list[StandardJobPosting]:
    group_caps = career_group_caps or DEFAULT_CAREER_GROUP_CAPS
    enriched = [enrich_operational_fields(posting) for posting in postings]
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


def _extract_years(text: str) -> int | None:
    range_match = re.search(r"([0-9]+)\s*[~\-]\s*([0-9]+)\s*년", text)
    if range_match:
        return int(range_match.group(1))

    match = re.search(r"([0-9]+)\s*(?:년|years?)", text, flags=re.IGNORECASE)
    if match:
        return int(match.group(1))

    return None


def _compact_timestamp(value: str) -> str:
    return re.sub(r"[^0-9A-Za-z]", "", value)[:20]
