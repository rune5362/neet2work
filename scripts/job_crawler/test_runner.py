from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from job_crawler.run_source import build_payload


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


if __name__ == "__main__":
    unittest.main()
