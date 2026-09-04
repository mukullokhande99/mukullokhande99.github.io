#!/usr/bin/env python3
"""Refresh the public Google Scholar metrics stored by the static website."""

from __future__ import annotations

import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen


PROFILE_ID = "qqAsAJ4AAAAJ"
METRICS_PATH = Path(__file__).resolve().parents[1] / "data" / "scholar-metrics.json"
SOURCE_URL = f"https://scholar.google.com/citations?user={PROFILE_ID}&hl=en&oi=ao"


def normalize_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", value.lower()).strip("_")


def extract_all_time_metrics(payload: dict) -> dict[str, int]:
    table = payload.get("cited_by", {}).get("table", [])
    found: dict[str, int] = {}

    for row in table:
        if not isinstance(row, dict):
            continue
        for raw_name, values in row.items():
            name = normalize_key(raw_name)
            if not isinstance(values, dict) or "all" not in values:
                continue
            if "i10" in name:
                metric = "i10_index"
            elif "citation" in name:
                metric = "citations"
            elif name in {"h_index", "index_h", "indice_h"} or ("index" in name and name.startswith("h")):
                metric = "h_index"
            else:
                continue
            found[metric] = int(values["all"])

    missing = {"citations", "h_index", "i10_index"} - found.keys()
    if missing:
        raise ValueError(f"SerpApi response is missing metrics: {', '.join(sorted(missing))}")
    if any(value < 0 for value in found.values()):
        raise ValueError("Scholar metrics must be non-negative integers")
    return found


def extract_articles(payload: dict) -> list[dict]:
    articles = []
    for article in payload.get("articles", []):
        if not isinstance(article, dict) or not article.get("title"):
            continue
        cited_by = article.get("cited_by") if isinstance(article.get("cited_by"), dict) else {}
        articles.append({
            "title": str(article["title"]).strip(),
            "citations": int(cited_by.get("value") or 0),
            "cited_by_url": cited_by.get("link", ""),
        })
    articles.sort(key=lambda article: article["title"].casefold())
    return articles


def fetch_scholar_data(api_key: str) -> tuple[dict[str, int], list[dict]]:
    query = urlencode({
        "engine": "google_scholar_author",
        "author_id": PROFILE_ID,
        "hl": "en",
        "num": 100,
        "api_key": api_key,
    })
    request = Request(
        f"https://serpapi.com/search.json?{query}",
        headers={"Accept": "application/json", "User-Agent": "mukullokhande99.github.io-metrics/1.0"},
    )
    with urlopen(request, timeout=45) as response:
        payload = json.load(response)

    if payload.get("error"):
        raise RuntimeError(f"SerpApi error: {payload['error']}")
    return extract_all_time_metrics(payload), extract_articles(payload)


def main() -> int:
    api_key = os.environ.get("SERPAPI_KEY", "").strip()
    if not api_key:
        print("SERPAPI_KEY is not configured as a repository secret.", file=sys.stderr)
        return 2

    current = json.loads(METRICS_PATH.read_text(encoding="utf-8"))
    refreshed, articles = fetch_scholar_data(api_key)
    metrics_unchanged = all(current.get(key) == value for key, value in refreshed.items())
    articles_unchanged = current.get("articles") == articles
    if metrics_unchanged and articles_unchanged:
        print("Google Scholar metrics are unchanged.")
        return 0

    output = {
        "profile_id": PROFILE_ID,
        **refreshed,
        "articles": articles,
        "updated_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "source_url": SOURCE_URL,
    }
    METRICS_PATH.write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
    print(
        "Updated Google Scholar metrics: "
        f"{output['citations']} citations, h-index {output['h_index']}, i10-index {output['i10_index']}."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
