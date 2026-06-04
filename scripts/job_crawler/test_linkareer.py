from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from job_crawler.linkareer import infer_skills


class LinkareerSkillInferenceTest(unittest.TestCase):
    def test_does_not_infer_ai_ml_or_data_from_site_chrome(self) -> None:
        skills = infer_skills("AI 자소서봇 data-activityid ML 추천교육")

        self.assertNotIn("AI", skills)
        self.assertNotIn("ML", skills)
        self.assertNotIn("Data", skills)

    def test_infers_explicit_short_skill_context(self) -> None:
        skills = infer_skills("인공지능 모델 개발 및 Data Analyst Python")

        self.assertIn("AI", skills)
        self.assertIn("Data", skills)
        self.assertIn("Python", skills)


if __name__ == "__main__":
    unittest.main()
