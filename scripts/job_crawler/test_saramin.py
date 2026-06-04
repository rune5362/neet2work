from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from job_crawler.saramin import infer_skills


class SaraminSkillInferenceTest(unittest.TestCase):
    def test_does_not_infer_ai_from_site_chrome(self) -> None:
        skills = infer_skills("AI매칭 채용공고 드라이아이스공장 정규직채용 생산OP")

        self.assertNotIn("AI", skills)

    def test_does_not_infer_ai_from_recommendation_chrome(self) -> None:
        skills = infer_skills("사람인 인공지능 기술 기반으로 맞춤 공고를 추천해드리는 채용정보제공 서비스입니다.")

        self.assertNotIn("AI", skills)

    def test_does_not_infer_data_from_site_attribute_text(self) -> None:
        skills = infer_skills("data-sentry-component CardJob")

        self.assertNotIn("Data", skills)

    def test_infers_explicit_short_ai_skill_context(self) -> None:
        skills = infer_skills("인공지능 모델 개발 및 Python 기반 Data Engineer 업무")

        self.assertIn("AI", skills)
        self.assertIn("Data", skills)
        self.assertIn("Python", skills)


if __name__ == "__main__":
    unittest.main()
