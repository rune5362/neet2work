from __future__ import annotations

import argparse
import importlib
import json
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

if __package__ is None or __package__ == "":
    sys.path.append(str(Path(__file__).resolve().parents[1]))
    from job_crawler.contract import DEFAULT_CATEGORY_CAP, DEFAULT_SOURCE_CAP, apply_collection_caps, make_job_batch
    from job_crawler.models import StandardJobPosting
else:
    from .contract import DEFAULT_CATEGORY_CAP, DEFAULT_SOURCE_CAP, apply_collection_caps, make_job_batch
    from .models import StandardJobPosting


SUPPORTED_SOURCES = {
    "saramin",
    "jobkorea",
    "linkareer",
    "mynavi_tenshoku",
    "daijob",
    "careercross",
    "green_japan",
}


@dataclass(frozen=True)
class CollectionResult:
    postings: list[dict[str, Any]]
    warnings: list[str]


def load_source_module(source: str):
    if source not in SUPPORTED_SOURCES:
        raise ValueError(f"Unsupported source: {source}")
    return importlib.import_module(f"job_crawler.{source}")


def standard_posting_from_dict(value: dict[str, Any]) -> StandardJobPosting:
    allowed = StandardJobPosting.__dataclass_fields__
    return StandardJobPosting(**{key: item for key, item in value.items() if key in allowed})


def build_payload(
    *,
    source: str,
    raw_postings: list[dict[str, Any]],
    output_format: str,
    mode: str,
    source_cap: int | None = None,
    category_cap: int = DEFAULT_CATEGORY_CAP,
    warnings: list[str] | None = None,
) -> Any:
    if output_format == "array":
        return raw_postings
    if output_format != "batch":
        raise ValueError("format must be array or batch")

    postings = [standard_posting_from_dict(posting) for posting in raw_postings]
    effective_source_cap = source_cap if source_cap is not None else (
        DEFAULT_SOURCE_CAP if mode == "batch" else len(postings)
    )
    payload_source_cap = source_cap if source_cap is not None or mode == "batch" else None
    capped = apply_collection_caps(
        postings,
        source_cap=effective_source_cap,
        category_cap=category_cap,
    )
    return make_job_batch(
        source,
        capped,
        mode=mode,
        source_cap=payload_source_cap,
        warnings=warnings,
    )


def collect_raw_postings(
    *,
    module: Any,
    list_url: str,
    limit: int,
    delay_seconds: float,
    mode: str,
) -> CollectionResult:
    if mode != "batch":
        return CollectionResult(module.run(list_url, limit, delay_seconds), [])

    if limit < 1 or limit > DEFAULT_SOURCE_CAP:
        raise ValueError(f"batch limit must be between 1 and {DEFAULT_SOURCE_CAP}")
    if delay_seconds < 0:
        raise ValueError("delay_seconds must be 0 or greater")

    links = module.list_jobs(list_url, limit)
    postings: list[dict[str, Any]] = []
    warnings: list[str] = []
    consecutive_failures = 0
    for index, link in enumerate(links):
        if index > 0 and delay_seconds > 0:
            time.sleep(delay_seconds)
        try:
            postings.append(module.collect_detail(link).to_json_dict())
            consecutive_failures = 0
        except Exception as error:
            consecutive_failures += 1
            warnings.append(
                f"{link.source}/{link.source_job_id} skipped: {type(error).__name__}: {error}"
            )
            if consecutive_failures >= 5:
                raise RuntimeError("5 consecutive detail failures") from error
    return CollectionResult(postings, warnings)


def run_source(
    *,
    source: str,
    list_url: str | None,
    limit: int,
    delay_seconds: float,
    output_format: str,
    mode: str,
    source_cap: int | None,
    category_cap: int,
) -> Any:
    module = load_source_module(source)
    collection = collect_raw_postings(
        module=module,
        list_url=list_url or module.DEFAULT_LIST_URL,
        limit=limit,
        delay_seconds=delay_seconds,
        mode=mode,
    )
    payload = build_payload(
        source=source,
        raw_postings=collection.postings,
        output_format=output_format,
        mode=mode,
        source_cap=source_cap,
        category_cap=category_cap,
        warnings=collection.warnings,
    )
    if mode == "batch" and output_format == "batch" and len(payload["postings"]) == 0:
        raise RuntimeError("0 postings after filters")
    return payload


def main() -> int:
    parser = argparse.ArgumentParser(description="Run a job source collector and emit import-ready JSON.")
    parser.add_argument("--source", required=True, choices=sorted(SUPPORTED_SOURCES))
    parser.add_argument("--list-url")
    parser.add_argument("--limit", type=int, default=1)
    parser.add_argument("--delay-seconds", type=float, default=1.0)
    parser.add_argument("--format", choices=["array", "batch"], default="array")
    parser.add_argument("--mode", choices=["sample", "batch"], default="sample")
    parser.add_argument("--source-cap", type=int)
    parser.add_argument("--category-cap", type=int, default=DEFAULT_CATEGORY_CAP)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    if args.mode == "batch" and args.format != "batch":
        parser.error("--mode batch requires --format batch")

    try:
        payload = run_source(
            source=args.source,
            list_url=args.list_url,
            limit=args.limit,
            delay_seconds=args.delay_seconds,
            output_format=args.format,
            mode=args.mode,
            source_cap=args.source_cap,
            category_cap=args.category_cap,
        )
    except ValueError as error:
        parser.error(str(error))

    text = json.dumps(payload, ensure_ascii=False, indent=2)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(text + "\n", encoding="utf-8")
    else:
        print(text)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
