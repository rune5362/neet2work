from __future__ import annotations

import socket
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.append(str(Path(__file__).resolve().parents[1]))

from job_crawler.http_client import fetch_text


class FakeResponse:
    status = 200

    def __init__(self, body: bytes = b"ok") -> None:
        self.body = body
        self.headers = self

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def read(self) -> bytes:
        return self.body

    def get_content_charset(self):
        return "utf-8"

    def geturl(self) -> str:
        return "https://example.test/final"


class HttpClientTest(unittest.TestCase):
    def test_fetch_text_retries_transient_timeout(self):
        calls = {"count": 0}

        def fake_urlopen(*_args, **_kwargs):
            calls["count"] += 1
            if calls["count"] == 1:
                raise socket.timeout("timed out")
            return FakeResponse("정상".encode("utf-8"))

        with patch("job_crawler.http_client.urlopen", side_effect=fake_urlopen), patch(
            "job_crawler.http_client.time.sleep"
        ):
            result = fetch_text("https://example.test", retries=1, retry_delay=0)

        self.assertEqual(calls["count"], 2)
        self.assertEqual(result.status, 200)
        self.assertEqual(result.text, "정상")


if __name__ == "__main__":
    unittest.main()
