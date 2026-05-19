from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from job_crawler import daijob


class DaijobCollectorTest(unittest.TestCase):
    def test_default_list_url_uses_public_it_industry_filters(self) -> None:
        self.assertTrue(daijob.DEFAULT_LIST_URL.startswith("https://www.daijob.com/en/jobs/search?"))
        self.assertIn("il%5B%5D=119", daijob.DEFAULT_LIST_URL)
        self.assertIn("il%5B%5D=122", daijob.DEFAULT_LIST_URL)
        self.assertIn("il%5B%5D=124", daijob.DEFAULT_LIST_URL)


if __name__ == "__main__":
    unittest.main()
