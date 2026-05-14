from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass(frozen=True)
class SourceJobLink:
    source: str
    source_job_id: str
    source_url: str
    title_hint: str | None = None
    company_hint: str | None = None
    hints: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class StandardJobPosting:
    id: str
    title: str
    company: str
    location: str
    careerLevel: str
    skills: list[str]
    description: str
    source: str
    sourceJobId: str
    sourceUrl: str
    country: str
    language: str
    employmentType: str | None = None
    educationLevel: str | None = None
    salaryText: str | None = None
    deadlineText: str | None = None
    applyMethod: str | None = None
    companyInfo: dict[str, Any] | None = None
    rawText: str | None = None
    rawJson: dict[str, Any] | None = field(default_factory=dict)
    collectedAt: str = field(default_factory=utc_now_iso)

    def to_json_dict(self) -> dict[str, Any]:
        return asdict(self)
