from __future__ import annotations

import socket
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.append(str(Path(__file__).resolve().parents[1]))

from job_crawler.http_client import fetch_text


PUBLIC_ADDRINFO = [
    (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 443)),
]


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

        with patch("job_crawler.http_client.socket.getaddrinfo", return_value=PUBLIC_ADDRINFO), patch(
            "job_crawler.http_client._open_url", side_effect=fake_urlopen
        ), patch("job_crawler.http_client.time.sleep"):
            result = fetch_text("https://example.test", retries=1, retry_delay=0)

        self.assertEqual(calls["count"], 2)
        self.assertEqual(result.status, 200)
        self.assertEqual(result.text, "정상")

    def test_fetch_text_rejects_private_ip_without_network_request(self):
        with patch("job_crawler.http_client._open_url") as open_mock:
            with self.assertRaisesRegex(ValueError, "non-public address"):
                fetch_text("https://127.0.0.1/admin")

        open_mock.assert_not_called()

    def test_fetch_text_rejects_private_dns_without_network_request(self):
        private_addrinfo = [
            (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("10.0.0.10", 443)),
        ]

        with patch("job_crawler.http_client.socket.getaddrinfo", return_value=private_addrinfo), patch(
            "job_crawler.http_client._open_url"
        ) as open_mock:
            with self.assertRaisesRegex(ValueError, "non-public address"):
                fetch_text("https://jobs.example.test")

        open_mock.assert_not_called()

    def test_fetch_text_rejects_off_allowlist_hosts_without_network_request(self):
        with patch("job_crawler.http_client._open_url") as open_mock:
            with self.assertRaisesRegex(ValueError, "not allowed"):
                fetch_text("https://evil.invalid.test", allowed_hosts={"example.test"})

        open_mock.assert_not_called()

    def test_fetch_text_allows_public_allowlisted_hosts(self):
        with patch("job_crawler.http_client.socket.getaddrinfo", return_value=PUBLIC_ADDRINFO), patch(
            "job_crawler.http_client._open_url",
            return_value=FakeResponse("정상".encode("utf-8")),
        ):
            result = fetch_text("https://jobs.example.test", allowed_hosts={"example.test"})

        self.assertEqual(result.status, 200)
        self.assertEqual(result.text, "정상")


if __name__ == "__main__":
    unittest.main()
