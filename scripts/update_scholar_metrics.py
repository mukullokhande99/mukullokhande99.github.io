#!/usr/bin/env python3
"""Refresh the public Google Scholar metrics stored by the static website."""

from __future__ import annotations

import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo
from urllib.parse import urlencode
from urllib.request import Request, urlopen


PROFILE_ID = "qqAsAJ4AAAAJ"
METRICS_PATH = Path(__file__).resolve().parents[1] / "data" / "scholar-metrics.json"
HOMEPAGE_PATH = Path(__file__).resolve().parents[1] / "index.html"
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
    if not isinstance(payload.get("articles"), list) or not payload["articles"]:
        raise ValueError("SerpApi response contains no articles; refusing to overwrite the last valid snapshot.")
    return extract_all_time_metrics(payload), extract_articles(payload)


def build_snapshot(current: dict, refreshed: dict, articles: list[dict], synced_at: str) -> tuple[dict, bool]:
    """Record every successful sync, even if Scholar citation totals are unchanged.

    'synced_at' is the latest successful API check. 'updated_at' is the last
    observed data change, retained for backwards compatibility.
    """
    metrics_unchanged = all(current.get(key) == value for key, value in refreshed.items())
    articles_unchanged = current.get("articles") == articles
    data_changed = not (metrics_unchanged and articles_unchanged)
    updated_at = synced_at if data_changed else current.get("updated_at", synced_at)
    output = {
        "profile_id": PROFILE_ID,
        **refreshed,
        "articles": articles,
        "updated_at": updated_at,
        "synced_at": synced_at,
        "source_url": SOURCE_URL,
    }
    return output, data_changed


def render_homepage_metrics(html: str, snapshot: dict) -> str:
    """Keep the no-JavaScript homepage fallback identical to the saved Scholar snapshot."""

    def replace_once(pattern: str, replacement: str, content: str) -> str:
        result, count = re.subn(pattern, lambda _: replacement, content, count=1)
        if count != 1:
            raise ValueError(f"Missing or duplicate Scholar homepage marker: {pattern}")
        return result

    replacements = (
        ("citation-total", snapshot["citations"]),
        ("h-index-total", snapshot["h_index"]),
        ("i10-index-total", snapshot["i10_index"]),
    )
    for element_id, value in replacements:
        pattern = rf'<strong id="{re.escape(element_id)}">[^<]*</strong>'
        html = replace_once(pattern, f'<strong id="{element_id}">{value:,}</strong>', html)

    timestamp = datetime.fromisoformat(snapshot["synced_at"].replace("Z", "+00:00"))
    india = timestamp.astimezone(ZoneInfo("Asia/Kolkata"))
    formatted = f"{india.day} {india:%b %Y, %H:%M} IST"
    label = (
        '<small class="scholar-sync-status" id="scholar-updated-at">'
        f"Last synced {formatted}</small>"
    )
    html = replace_once(
        r'<small class="scholar-sync-status[^"]*" id="scholar-updated-at">[^<]*</small>',
        label, html
    )
    return html


def main() -> int:
    api_key = os.environ.get("SERPAPI_KEY", "").strip()
    if not api_key:
        print("SERPAPI_KEY is not configured as a repository secret.", file=sys.stderr)
        return 2

    current = json.loads(METRICS_PATH.read_text(encoding="utf-8"))
    refreshed, articles = fetch_scholar_data(api_key)
    synced_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    output, data_changed = build_snapshot(current, refreshed, articles, synced_at)
    METRICS_PATH.write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
    homepage = HOMEPAGE_PATH.read_text(encoding="utf-8")
    HOMEPAGE_PATH.write_text(render_homepage_metrics(homepage, output), encoding="utf-8")
    state = "changed" if data_changed else "unchanged"
    print(
        f"Google Scholar sync succeeded at {synced_at} (values {state}): "
        f"{output['citations']} citations, h-index {output['h_index']}, i10-index {output['i10_index']}."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
