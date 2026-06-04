from __future__ import annotations

import ssl
import socket
import time
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


def _is_retryable_fetch_error(error: BaseException) -> bool:
    reason = error.reason if isinstance(error, URLError) else error

    if isinstance(reason, (TimeoutError, socket.timeout)):
        return True

    message = str(reason).lower()
    return "timed out" in message or "timeout" in message


def _fetch_error_reason(error: BaseException) -> object:
    return error.reason if isinstance(error, URLError) else error


def fetch_text(
    url: str,
    timeout: int = 15,
    retries: int = 2,
    retry_delay: float = 0.5,
) -> FetchResult:
    request = Request(
        url,
        headers={
            "User-Agent": DEFAULT_USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.6,en;q=0.5",
        },
    )

    max_retries = max(0, retries)

    for attempt in range(max_retries + 1):
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
        except (URLError, TimeoutError, socket.timeout, OSError) as error:
            if attempt < max_retries and _is_retryable_fetch_error(error):
                if retry_delay > 0:
                    time.sleep(retry_delay)
                continue
            raise RuntimeError(
                f"Fetch failed for {url}: {_fetch_error_reason(error)}"
            ) from error

    raise RuntimeError(f"Fetch failed for {url}")
