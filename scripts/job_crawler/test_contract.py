from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from job_crawler.contract import (
    apply_collection_caps,
    classify_career_stage,
    classify_job_category,
    make_job_batch,
)
from job_crawler.models import StandardJobPosting


def posting(
    job_id: str,
    *,
    title: str,
    career_level: str = "신입",
    skills: list[str] | None = None,
    description: str = "",
) -> StandardJobPosting:
    return StandardJobPosting(
        id=f"saramin-{job_id}",
        title=title,
        company="샘플회사",
        location="서울",
        careerLevel=career_level,
        skills=skills or [],
        description=description or title,
        source="saramin",
        sourceJobId=job_id,
        sourceUrl=f"https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx={job_id}",
        country="KR",
        language="ko",
        collectedAt="2026-05-15T08:00:00+00:00",
    )


class ContractTest(unittest.TestCase):
    def test_classifies_career_stage_conservatively(self) -> None:
        self.assertEqual(classify_career_stage(posting("1", title="채용연계형 인턴"))[0], "intern")
        self.assertEqual(classify_career_stage(posting("2", title="주니어 PM", career_level="1~3년"))[0], "junior")
        self.assertEqual(classify_career_stage(posting("3", title="경력 기획자", career_level="5년"))[0], "mid")
        self.assertEqual(classify_career_stage(posting("4", title="운영 팀장", career_level="경력"))[0], "lead_manager")

    def test_classifies_non_it_job_categories(self) -> None:
        self.assertEqual(classify_job_category("브랜드 마케팅 인턴", [], "콘텐츠 운영")[0], "marketing_content")
        self.assertEqual(classify_job_category("재무 회계 담당자", [], "급여와 세무 지원")[0], "finance_accounting")
        self.assertEqual(classify_job_category("무역 물류 운영", [], "공급망 구매 보조")[0], "logistics_trade")
        self.assertEqual(classify_job_category("Retail service crew", [], "store operation")[0], "retail_service")

    def test_makes_job_batch_v1_with_operational_fields(self) -> None:
        batch = make_job_batch(
            "saramin",
            [posting("1", title="서비스 기획 신입", skills=["Excel"])],
            mode="batch",
            crawl_batch_id="saramin-20260515T080000Z",
            collected_at="2026-05-15T08:00:00+00:00",
            source_cap=50,
        )

        self.assertEqual(batch["schemaVersion"], "job_batch_v1")
        self.assertEqual(batch["source"], "saramin")
        self.assertEqual(batch["crawlBatchId"], "saramin-20260515T080000Z")
        self.assertEqual(batch["postings"][0]["status"], "active")
        self.assertEqual(batch["postings"][0]["careerStage"], "entry")
        self.assertEqual(batch["postings"][0]["jobCategory"], "product_planning")
        self.assertEqual(batch["postings"][0]["crawlBatchId"], "saramin-20260515T080000Z")
        self.assertEqual(batch["postings"][0]["lastSeenAt"], "2026-05-15T08:00:00+00:00")
        self.assertIn("careerStageEvidence", batch["postings"][0]["classifierMeta"])

    def test_applies_source_category_and_career_caps_in_priority_order(self) -> None:
        postings = [
            posting("senior", title="시니어 개발자", career_level="8년", skills=["Python"]),
            posting("entry-1", title="서비스 기획 신입"),
            posting("entry-2", title="서비스 기획 신입"),
            posting("mid", title="경력 마케팅", career_level="5년"),
        ]

        selected = apply_collection_caps(
            postings,
            source_cap=3,
            category_cap=1,
            career_group_caps={"early": 2, "mid_unknown": 1, "senior_lead": 1},
        )

        self.assertEqual([item.sourceJobId for item in selected], ["entry-1", "mid", "senior"])


if __name__ == "__main__":
    unittest.main()
