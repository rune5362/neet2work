from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from job_crawler.run_source import build_payload


RAW_POSTING = {
    "id": "saramin-1",
    "title": "서비스 기획 신입",
    "company": "샘플회사",
    "location": "서울",
    "careerLevel": "신입",
    "skills": ["Excel"],
    "description": "서비스 기획과 운영을 수행합니다.",
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


if __name__ == "__main__":
    unittest.main()
