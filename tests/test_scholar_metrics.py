"""Unit tests for Google Scholar snapshot freshness and count accuracy."""
import importlib.util
import unittest
from pathlib import Path

MODULE = Path(__file__).resolve().parents[1] / "scripts" / "update_scholar_metrics.py"
spec = importlib.util.spec_from_file_location("update_scholar_metrics", MODULE)
scholar = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scholar)


class ScholarSyncTests(unittest.TestCase):
    def setUp(self):
        self.base = {
            "profile_id": "qqAsAJ4AAAAJ",
            "citations": 199,
            "h_index": 6,
            "i10_index": 5,
            "articles": [{"title": "Paper A", "citations": 3, "cited_by_url": ""}],
            "updated_at": "2026-11-16T11:32:40Z",
            "synced_at": "2026-11-16T11:32:40Z",
        }
        self.stats = {"citations": 199, "h_index": 6, "i10_index": 5}
        self.check = "2026-11-21T03:17:00Z"

    def test_sync_timestamp_changes_even_when_counts_do_not(self):
        result, changed = scholar.build_snapshot(self.base, self.stats, self.base["articles"], self.check)
        self.assertFalse(changed)
        self.assertEqual(result["synced_at"], self.check)
        self.assertEqual(result["updated_at"], self.base["updated_at"])
        self.assertEqual(result["citations"], 199)

    def test_metric_change_updates_both_timestamps(self):
        new = dict(self.stats, citations=200)
        result, changed = scholar.build_snapshot(self.base, new, self.base["articles"], self.check)
        self.assertTrue(changed)
        self.assertEqual(result["synced_at"], self.check)
        self.assertEqual(result["updated_at"], self.check)
        self.assertEqual(result["citations"], 200)

    def test_article_count_change_is_not_hidden(self):
        new_articles = [{"title": "Paper A", "citations": 4, "cited_by_url": ""}]
        result, changed = scholar.build_snapshot(self.base, self.stats, new_articles, self.check)
        self.assertTrue(changed)
        self.assertEqual(result["updated_at"], self.check)

    def test_all_time_metrics_from_serpapi(self):
        payload = {"cited_by": {"table": [
            {"citations": {"all": 199, "since_2021": 197}},
            {"h_index": {"all": 6}},
            {"i10_index": {"all": 5}},
        ]}}
        self.assertEqual(scholar.extract_all_time_metrics(payload), self.stats)

    def test_profile_snapshot_missing_metric_rejected(self):
        with self.assertRaises(ValueError):
            scholar.extract_all_time_metrics({"cited_by": {"table": [{"citations": {"all": 199}}]}})


if __name__ == "__main__":
    unittest.main()
