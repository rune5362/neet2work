from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.append(str(Path(__file__).resolve().parents[1]))

from job_crawler import daijob
from job_crawler.http_client import FetchResult
from job_crawler.models import SourceJobLink

JA_DETAIL_HTML = """
<!DOCTYPE html>
<html lang="ja">
  <head>
    <title>文理・既卒不問【26秋卒】ITコンサルタント | インフォシス リミテッド | 外資系転職・求人サイト [Daijob.com]</title>
  </head>
  <body>
    求人詳細 更新日 2026-05-26 掲載開始日 2026-05-15 直接採用 エントリーレベル 新卒歓迎
    文理・既卒不問【26秋卒】ITコンサルタント 企業名 インフォシス リミテッド
    職種 コンサルティング - ITコンサルティング（その他） 業種 ITコンサルティング
    勤務地 アジア 日本 東京都 仕事内容 2026年卒生対象 新卒採用＜本選考＞のご案内
    勤務時間 9:00-18:00 応募条件 日本語がビジネスレベル以上の方
    英語能力 日常会話(TOEIC 475-730) 日本語能力 流暢（日本語能力試験1級又はN1)
    年収 日本・円 450万円 以上 給与に関する説明 福利厚生
    休日 完全週休2日制（土・日・祝祭日） 契約期間 正社員 最寄り駅 大手町駅（直通）
  </body>
</html>
"""

EN_DETAIL_HTML = """
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>[New Grads Oct 2026] IT consultant : Infosys Limited : Find jobs in Japan on Daijob.com</title>
  </head>
  <body>
    Job Details Updated 2026-05-26 Activated 2026-05-15 Entry Level New Graduates Welcome
    [New Grads Oct 2026] IT consultant Company Name Infosys Limited
    Job Type Consulting - IT Consulting (Other) Industry IT Consulting
    Location Asia Japan Tokyo Job Description New graduate recruitment information
    Working Hours 9:00-18:00 Job Requirements Business-level Japanese
    English Level Daily Conversation Level Japanese Level Fluent(JLPT Level 1 or N1)
    Salary JPY - Japanese Yen JPY 4500K Over Holidays Two days off per week
    Job Contract Period full-time employee Nearest Station Otemachi Station
  </body>
</html>
"""

CLOSED_DETAIL_HTML = """
<!DOCTYPE html>
<html lang="ja">
  <head>
    <title>掲載終了 | Daijob.com</title>
  </head>
  <body>
    求人詳細 この求人は掲載終了しました。
  </body>
</html>
"""


class DaijobCollectorTest(unittest.TestCase):
    def test_default_list_url_uses_public_it_industry_filters(self) -> None:
        self.assertTrue(daijob.DEFAULT_LIST_URL.startswith("https://www.daijob.com/en/jobs/search?"))
        self.assertIn("il%5B%5D=119", daijob.DEFAULT_LIST_URL)
        self.assertIn("il%5B%5D=122", daijob.DEFAULT_LIST_URL)
        self.assertIn("il%5B%5D=124", daijob.DEFAULT_LIST_URL)

    def test_source_job_id_supports_japanese_and_english_detail_paths(self) -> None:
        self.assertEqual(daijob.source_job_id("https://www.daijob.com/en/jobs/detail/1342339"), "1342339")
        self.assertEqual(daijob.source_job_id("https://www.daijob.com/jobs/detail/1342338"), "1342338")

    @patch("job_crawler.daijob.fetch_text")
    def test_collect_detail_prefers_japanese_detail_when_available(self, mock_fetch_text) -> None:
        mock_fetch_text.return_value = FetchResult(
            url="https://www.daijob.com/jobs/detail/1342338",
            status=200,
            text=JA_DETAIL_HTML,
        )
        link = SourceJobLink(
            source="daijob",
            source_job_id="1342339",
            source_url="https://www.daijob.com/en/jobs/detail/1342339",
        )

        posting = daijob.collect_detail(link)

        self.assertEqual(posting.language, "ja")
        self.assertEqual(posting.sourceUrl, "https://www.daijob.com/jobs/detail/1342338")
        self.assertEqual(posting.title, "文理・既卒不問【26秋卒】ITコンサルタント")
        self.assertEqual(posting.company, "インフォシス リミテッド")
        self.assertEqual(posting.salaryText, "日本・円 450万円 以上")

    @patch("job_crawler.daijob.fetch_text")
    def test_collect_detail_falls_back_to_english_detail(self, mock_fetch_text) -> None:
        mock_fetch_text.side_effect = [
            RuntimeError("Fetch failed for https://www.daijob.com/jobs/detail/1342339: 404"),
            FetchResult(
                url="https://www.daijob.com/en/jobs/detail/1342339",
                status=200,
                text=EN_DETAIL_HTML,
            ),
        ]
        link = SourceJobLink(
            source="daijob",
            source_job_id="1342339",
            source_url="https://www.daijob.com/en/jobs/detail/1342339",
        )

        posting = daijob.collect_detail(link)

        self.assertEqual(posting.language, "en")
        self.assertEqual(posting.sourceUrl, "https://www.daijob.com/en/jobs/detail/1342339")
        self.assertEqual(posting.title, "[New Grads Oct 2026] IT consultant")
        self.assertEqual(posting.company, "Infosys Limited")
        self.assertEqual(posting.salaryText, "JPY - Japanese Yen JPY 4500K Over")

    @patch("job_crawler.daijob.fetch_text")
    def test_collect_detail_raises_closed_page_resolution_error(self, mock_fetch_text) -> None:
        mock_fetch_text.side_effect = [
            FetchResult(
                url="https://www.daijob.com/jobs/detail/1526400",
                status=200,
                text=CLOSED_DETAIL_HTML,
            ),
            FetchResult(
                url="https://www.daijob.com/en/jobs/detail/1526401",
                status=200,
                text=CLOSED_DETAIL_HTML.replace('lang="ja"', 'lang="en"'),
            ),
        ]
        link = SourceJobLink(
            source="daijob",
            source_job_id="1526401",
            source_url="https://www.daijob.com/en/jobs/detail/1526401",
        )

        with self.assertRaisesRegex(RuntimeError, r"closed-page:掲載終了") as error:
            daijob.collect_detail(link)

        self.assertIn("closed-page:掲載終了", str(error.exception))


if __name__ == "__main__":
    unittest.main()
