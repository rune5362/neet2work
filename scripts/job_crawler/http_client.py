from __future__ import annotations

import ipaddress
import ssl
import socket
import time
from collections.abc import Iterable
from dataclasses import dataclass
from urllib.parse import urlparse
from urllib.error import HTTPError, URLError
from urllib.request import HTTPRedirectHandler, HTTPSHandler, Request, build_opener


DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (compatible; neet2work-research/0.1; "
    "+https://github.com/rune5362/neet2work)"
)


@dataclass(frozen=True)
class FetchResult:
    url: str
    status: int
    text: str


class SafeRedirectHandler(HTTPRedirectHandler):
    def __init__(self, allowed_hosts: Iterable[str] | None) -> None:
        self._allowed_hosts = tuple(allowed_hosts or ())

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        try:
            validate_fetch_url(newurl, allowed_hosts=self._allowed_hosts)
        except ValueError as error:
            raise URLError(str(error)) from error
        return super().redirect_request(req, fp, code, msg, headers, newurl)


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


def validate_fetch_url(url: str, *, allowed_hosts: Iterable[str] | None = None) -> None:
    parsed = urlparse(url)
    hostname = (parsed.hostname or "").strip().lower().rstrip(".")
    allowed = tuple(host.strip().lower().rstrip(".") for host in allowed_hosts or ())

    if parsed.scheme != "https":
        raise ValueError("URL must use https")
    if not hostname:
        raise ValueError("URL hostname is required")
    if parsed.username or parsed.password:
        raise ValueError("URL credentials are not allowed")
    if parsed.port not in (None, 443):
        raise ValueError("URL port must be 443")
    if allowed and not _is_allowed_host(hostname, allowed):
        raise ValueError(f"URL host is not allowed: {hostname}")
    if _is_blocked_hostname(hostname):
        raise ValueError(f"URL host is not public: {hostname}")

    for address in _resolve_addresses(hostname):
        if not address.is_global:
            raise ValueError(f"URL host resolved to a non-public address: {address}")


def _is_allowed_host(hostname: str, allowed_hosts: Iterable[str]) -> bool:
    return any(hostname == allowed or hostname.endswith(f".{allowed}") for allowed in allowed_hosts)


def _is_blocked_hostname(hostname: str) -> bool:
    return (
        hostname in {"localhost", "localhost.", "0.0.0.0", "::", "::1"}
        or hostname.endswith(".localhost")
        or hostname.endswith(".local")
    )


def _resolve_addresses(hostname: str) -> list[ipaddress.IPv4Address | ipaddress.IPv6Address]:
    try:
        return [ipaddress.ip_address(hostname)]
    except ValueError:
        pass

    resolved = socket.getaddrinfo(hostname, 443, type=socket.SOCK_STREAM)
    addresses = []
    for item in resolved:
        address = ipaddress.ip_address(item[4][0])
        if address not in addresses:
            addresses.append(address)
    if not addresses:
        raise ValueError(f"URL host did not resolve: {hostname}")
    return addresses


def _open_url(request: Request, *, timeout: int, context: ssl.SSLContext, allowed_hosts: Iterable[str] | None):
    opener = build_opener(HTTPSHandler(context=context), SafeRedirectHandler(allowed_hosts))
    return opener.open(request, timeout=timeout)


def fetch_text(
    url: str,
    timeout: int = 15,
    retries: int = 2,
    retry_delay: float = 0.5,
    allowed_hosts: Iterable[str] | None = None,
) -> FetchResult:
    validate_fetch_url(url, allowed_hosts=allowed_hosts)
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
            with _open_url(
                request,
                timeout=timeout,
                context=create_ssl_context(),
                allowed_hosts=allowed_hosts,
            ) as response:
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
