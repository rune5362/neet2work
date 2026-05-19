from __future__ import annotations

import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

sys.path.append(str(Path(__file__).resolve().parents[1]))

from job_crawler.models import SourceJobLink, StandardJobPosting
from job_crawler.run_source import build_payload, run_source


RAW_POSTING = {
    "id": "saramin-1",
    "title": "웹 서비스 기획 신입",
    "company": "샘플회사",
    "location": "서울",
    "careerLevel": "신입",
    "skills": ["Excel"],
    "description": "디지털 플랫폼 기획과 운영을 수행합니다.",
    "source": "saramin",
    "sourceJobId": "1",
    "sourceUrl": "https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=1",
    "country": "KR",
    "language": "ko",
    "collectedAt": "2026-05-15T08:00:00+00:00",
}


class RunnerPayloadTest(unittest.TestCase):
    def test_keeps_legacy_array_output_available(self) -> None:
        payload = build_payload(
            source="saramin",
            raw_postings=[RAW_POSTING],
            output_format="array",
            mode="sample",
        )

        self.assertEqual(payload, [RAW_POSTING])

    def test_wraps_collector_output_in_batch_contract(self) -> None:
        payload = build_payload(
            source="saramin",
            raw_postings=[RAW_POSTING],
            output_format="batch",
            mode="sample",
            source_cap=50,
        )

        self.assertEqual(payload["schemaVersion"], "job_batch_v1")
        self.assertEqual(payload["source"], "saramin")
        self.assertEqual(payload["mode"], "sample")
        self.assertEqual(payload["sourceCap"], 50)
        self.assertEqual(payload["postings"][0]["careerStage"], "entry")
        self.assertEqual(payload["postings"][0]["jobCategory"], "product_planning")

    def test_filters_non_it_postings_from_batch_payload(self) -> None:
        payload = build_payload(
            source="saramin",
            raw_postings=[
                {
                    **RAW_POSTING,
                    "id": "saramin-2",
                    "title": "브랜드 마케팅 인턴",
                    "description": "콘텐츠 운영과 브랜드 캠페인을 수행합니다.",
                    "sourceJobId": "2",
                }
            ],
            output_format="batch",
            mode="batch",
            source_cap=50,
        )

        self.assertEqual(payload["postings"], [])

    def test_batch_mode_uses_source_batch_path_beyond_sample_limit(self) -> None:
        links = [
            SourceJobLink(
                source="saramin",
                source_job_id=str(index),
                source_url=f"https://example.test/jobs/{index}",
            )
            for index in range(1, 21)
        ]

        def collect_detail(link: SourceJobLink) -> StandardJobPosting:
            return StandardJobPosting(
                id=f"saramin-{link.source_job_id}",
                title=f"백엔드 개발자 {link.source_job_id}",
                company="샘플회사",
                location="서울",
                careerLevel="신입",
                skills=["Python"],
                description="Python 기반 웹 플랫폼 개발을 수행합니다.",
                source="saramin",
                sourceJobId=link.source_job_id,
                sourceUrl=link.source_url,
                country="KR",
                language="ko",
            )

        module = SimpleNamespace(
            DEFAULT_LIST_URL="https://example.test/jobs",
            run=lambda *_args: (_ for _ in ()).throw(ValueError("limit must be between 1 and 5")),
            list_jobs=lambda _list_url, limit: links[:limit],
            collect_detail=collect_detail,
        )

        with patch("job_crawler.run_source.load_source_module", return_value=module):
            payload = run_source(
                source="saramin",
                list_url=None,
                limit=20,
                delay_seconds=0,
                output_format="batch",
                mode="batch",
                source_cap=20,
                category_cap=20,
            )

        self.assertEqual(payload["mode"], "batch")
        self.assertEqual(payload["sourceCap"], 20)
        self.assertEqual(len(payload["postings"]), 20)

    def test_batch_mode_records_detail_failures_as_warnings(self) -> None:
        links = [
            SourceJobLink(source="jobkorea", source_job_id="timeout", source_url="https://example.test/timeout"),
            SourceJobLink(source="jobkorea", source_job_id="ok", source_url="https://example.test/ok"),
        ]

        def collect_detail(link: SourceJobLink) -> StandardJobPosting:
            if link.source_job_id == "timeout":
                raise TimeoutError("read timed out")
            return StandardJobPosting(
                id="jobkorea-ok",
                title="백엔드 개발자",
                company="샘플회사",
                location="서울",
                careerLevel="신입",
                skills=["Python"],
                description="Python 기반 웹 플랫폼 개발을 수행합니다.",
                source="jobkorea",
                sourceJobId="ok",
                sourceUrl=link.source_url,
                country="KR",
                language="ko",
            )

        module = SimpleNamespace(
            DEFAULT_LIST_URL="https://example.test/jobs",
            run=lambda *_args: [],
            list_jobs=lambda _list_url, limit: links[:limit],
            collect_detail=collect_detail,
        )

        with patch("job_crawler.run_source.load_source_module", return_value=module):
            payload = run_source(
                source="jobkorea",
                list_url=None,
                limit=2,
                delay_seconds=0,
                output_format="batch",
                mode="batch",
                source_cap=20,
                category_cap=20,
            )

        self.assertEqual(len(payload["postings"]), 1)
        self.assertEqual(payload["warnings"], ["jobkorea/timeout skipped: TimeoutError: read timed out"])
        self.assertEqual(payload["errors"], [])

    def test_batch_mode_fails_after_five_consecutive_detail_failures(self) -> None:
        links = [
            SourceJobLink(source="linkareer", source_job_id=str(index), source_url=f"https://example.test/{index}")
            for index in range(1, 6)
        ]
        module = SimpleNamespace(
            DEFAULT_LIST_URL="https://example.test/jobs",
            run=lambda *_args: [],
            list_jobs=lambda _list_url, limit: links[:limit],
            collect_detail=lambda _link: (_ for _ in ()).throw(TimeoutError("read timed out")),
        )

        with patch("job_crawler.run_source.load_source_module", return_value=module):
            with self.assertRaisesRegex(RuntimeError, "5 consecutive detail failures"):
                run_source(
                    source="linkareer",
                    list_url=None,
                    limit=5,
                    delay_seconds=0,
                    output_format="batch",
                    mode="batch",
                    source_cap=20,
                    category_cap=20,
                )

    def test_batch_mode_fails_when_filters_remove_every_posting(self) -> None:
        links = [SourceJobLink(source="saramin", source_job_id="1", source_url="https://example.test/1")]

        def collect_detail(link: SourceJobLink) -> StandardJobPosting:
            return StandardJobPosting(
                id="saramin-1",
                title="브랜드 마케팅 인턴",
                company="샘플회사",
                location="서울",
                careerLevel="신입",
                skills=[],
                description="콘텐츠 운영과 브랜드 캠페인을 수행합니다.",
                source="saramin",
                sourceJobId=link.source_job_id,
                sourceUrl=link.source_url,
                country="KR",
                language="ko",
            )

        module = SimpleNamespace(
            DEFAULT_LIST_URL="https://example.test/jobs",
            run=lambda *_args: [],
            list_jobs=lambda _list_url, limit: links[:limit],
            collect_detail=collect_detail,
        )

        with patch("job_crawler.run_source.load_source_module", return_value=module):
            with self.assertRaisesRegex(RuntimeError, "0 postings after filters"):
                run_source(
                    source="saramin",
                    list_url=None,
                    limit=1,
                    delay_seconds=0,
                    output_format="batch",
                    mode="batch",
                    source_cap=20,
                    category_cap=20,
                )


if __name__ == "__main__":
    unittest.main()
