from __future__ import annotations

import ssl
from dataclasses import dataclass
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (compatible; neet2work-research/0.1; "
    "+https://github.com/rune5362/neet2work)"
)


@dataclass(frozen=True)
class FetchResult:
    url: str
    status: int
    text: str


def create_ssl_context() -> ssl.SSLContext:
    try:
        import certifi
    except ImportError:
        return ssl.create_default_context()

    return ssl.create_default_context(cafile=certifi.where())


def fetch_text(url: str, timeout: int = 15) -> FetchResult:
    request = Request(
        url,
        headers={
            "User-Agent": DEFAULT_USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.6,en;q=0.5",
        },
    )

    try:
        with urlopen(request, timeout=timeout, context=create_ssl_context()) as response:
            raw = response.read()
            charset = response.headers.get_content_charset() or "utf-8"
            return FetchResult(
                url=response.geturl(),
                status=response.status,
                text=raw.decode(charset, errors="replace"),
            )
    except HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        return FetchResult(url=url, status=error.code, text=body)
    except URLError as error:
        raise RuntimeError(f"Fetch failed for {url}: {error.reason}") from error
