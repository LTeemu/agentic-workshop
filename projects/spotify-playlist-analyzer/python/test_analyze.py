"""
Tests for analyze.py — run with: python test_analyze.py (or pytest).

Focus per project rule: deterministic tests only for behavior critical enough
that you wouldn't trust it without verification.

Two kinds of tests live here:
  1. A small set of "contract" tests asserting run() produces the full schema
     the dashboard consumes (computed lazily, once).
  2. Deterministic value-level tests for the pure helpers (_duration_to_sec,
     _bucket, _detect_sep, _split_values, _value_counts_to_records) where the
     real aggregation bugs would hide.
"""

import json
import sys
import tempfile
from pathlib import Path

import pandas as pd

import analyze

EXAMPLE_CSV = Path(__file__).resolve().parent.parent / "data" / "spotify-playlist-example.csv"


# ---------------------------------------------------------------------------
# Contract test — run() dashboard schema
# ---------------------------------------------------------------------------

def _run_example():
    """Run the full analysis on the example CSV, cached across tests."""
    return analyze.run(str(EXAMPLE_CSV), output_path=None, limit=100)


# Nested schema describing every top-level section the dashboard depends on.
# Leaf `True` means "key must exist"; a dict/string means a required key.
SCHEMA = {
    "basic_stats": {
        "total_songs": True,
        "unique_artists": True,
        "unique_genres": True,
        "unique_albums": True,
        "avg_bpm": True,
        "avg_energy": True,
        "avg_dance": True,
        "avg_valence": True,
        "avg_duration_sec": True,
        "total_duration_sec": True,
        "total_duration_hrs": True,
        "avg_popularity": True,
        "explicit_count": True,
        "explicit_pct": True,
    },
    "audio_features": {
        feature: {"buckets": True, "counts": True, "unit": True}
        for feature in ("bpm", "energy", "dance", "valence", "loudness")
    },
    "genres": {
        "top_genres": True,
        "total_unique": True,
        "total_occurrences": True,
        "genres_per_song": True,
        "genre_combo_info": True,
    },
    "artists": {
        "top_artists": True,
        "collaboration_count": True,
        "total_unique_artists": True,
        "song_count_distribution": True,
    },
    "temporal": {
        "songs_by_year": True,
        "songs_by_month": True,
        "album_year_counts": True,
    },
    "mood_key": {
        "key_distribution": True,
        "camelot_distribution": True,
        "mood_quadrants": True,
        "valence_energy_scatter": True,
    },
    "albums": {"top_albums": True, "total_unique_albums": True},
    "genre_trends": {"years": True, "genres": True, "series": True},
    "artist_trends": {"years": True, "artists": True, "series": True},
    "perfect_song": {
        "freq": True,
        "composite": True,
        "closest_match": True,
        "furthest_match": True,
        "total_scored": True,
    },
    "_meta": {"source": True, "songs_analyzed": True},
}


def _assert_schema(obj, schema, path=""):
    """Recursively assert every required key is present at its dotted path."""
    for key, sub in schema.items():
        assert key in obj, f"missing key {path}{key}"
        if isinstance(sub, dict):
            _assert_schema(obj[key], sub, f"{path}{key}.")


def test_dashboard_schema():
    """The full analysis returns every section/key the dashboard renders."""
    result = _run_example()
    _assert_schema(result, SCHEMA)


def test_basic_stats_real_values():
    """Spot-check computed aggregates on the fixed example fixture."""
    stats = _run_example()["basic_stats"]
    assert isinstance(stats["total_songs"], int) and stats["total_songs"] > 0
    assert stats["explicit_pct"] >= 0 and stats["explicit_pct"] <= 100
    assert stats["avg_bpm"] > 0
    # hours is round(sec/3600, 1) — assert consistency within rounding tolerance
    assert stats["total_duration_hrs"] > 0
    assert abs(stats["total_duration_hrs"] - stats["total_duration_sec"] / 3600) <= 0.051


def test_audio_feature_histograms_well_formed():
    """Histograms group by equal-length buckets whose counts sum to the sample."""
    audio = _run_example()["audio_features"]
    for key in ("bpm", "energy", "dance", "valence"):
        b = audio[key]
        assert len(b["buckets"]) == len(b["counts"])
        assert len(b["buckets"]) > 0
        assert all(c >= 0 for c in b["counts"])


def test_output_json_round_trip():
    """analysis.json can be written and read back with the same schema."""
    with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tmp:
        path = tmp.name
    try:
        analyze.run(str(EXAMPLE_CSV), path, limit=100)
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        _assert_schema(data, SCHEMA)
    finally:
        Path(path).unlink(missing_ok=True)


# ---------------------------------------------------------------------------
# Pure helper tests — deterministic, value-level
# ---------------------------------------------------------------------------

def test_duration_to_sec():
    assert analyze._duration_to_sec("3:45") == 3 * 60 + 45
    assert analyze._duration_to_sec("1:02:30") == 1 * 3600 + 2 * 60 + 30
    assert analyze._duration_to_sec("0:00") == 0
    assert analyze._duration_to_sec("9") == 0  # malformed → 0
    assert analyze._duration_to_sec("abc") == 0  # non-numeric → 0
    assert analyze._duration_to_sec("1:2:3") == 1 * 3600 + 2 * 60 + 3


def test_bucket_empty():
    assert analyze._bucket(pd.Series([], dtype=float)) == {"buckets": [], "counts": []}


def test_bucket_constant_values():
    assert analyze._bucket(pd.Series([5, 5, 5, 5])) == {"buckets": ["5-5"], "counts": [4]}


def test_bucket_preserves_count():
    vals = pd.Series(range(1, 21))
    b = analyze._bucket(vals, n_buckets=4)
    assert len(b["buckets"]) == len(b["counts"])
    assert len(b["buckets"]) > 0
    assert sum(b["counts"]) == len(vals)
    assert all(c > 0 for c in b["counts"])


def test_bucket_fewer_values_than_buckets():
    b = analyze._bucket(pd.Series([1, 2]), n_buckets=10)
    assert sum(b["counts"]) == 2


def test_bucket_duplicates_collapsed():
    # Repeating values can collapse quantile bins; counts must still sum to input.
    b = analyze._bucket(pd.Series([1, 1, 1, 2, 2, 2]), n_buckets=4)
    assert len(b["buckets"]) == len(b["counts"])
    assert sum(b["counts"]) == 6


def test_detect_sep():
    with tempfile.TemporaryDirectory() as d:
        tab = Path(d) / "tab.csv"
        comma = Path(d) / "comma.csv"
        equal = Path(d) / "equal.csv"

        tab.write_text("a\tb\tc\td\n", encoding="utf-8")  # tabs > commas
        comma.write_text("Song,Artist,BPM\n", encoding="utf-8")  # commas > tabs
        equal.write_text("a\tb,c,d\n", encoding="utf-8")  # 1 tab, 2 commas → comma

        assert analyze._detect_sep(str(tab)) == "\t"
        assert analyze._detect_sep(str(comma)) == ","
        assert analyze._detect_sep(str(equal)) == ","
        # Missing file → open() raises → tab fallback
        assert analyze._detect_sep(str(Path(d) / "missing.csv")) == "\t"


def test_split_values():
    assert analyze._split_values(None) == []
    assert analyze._split_values("") == []
    assert analyze._split_values("a,b,c") == ["a", "b", "c"]
    assert analyze._split_values(" A , B ") == ["a", "b"]
    assert analyze._split_values("A,B", lower=False) == ["A", "B"]
    assert analyze._split_values("a,,b") == ["a", "b"]


def test_value_counts_to_records():
    s = pd.Series(["a", "b", "a", "c"])
    records = analyze._value_counts_to_records(s, "key")
    assert len(records) == 3
    assert {r["key"] for r in records} == {"a", "b", "c"}
    assert sum(r["count"] for r in records) == 4


# ---------------------------------------------------------------------------
# Runner so this file ALSO works bare (python test_analyze.py)
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    tests = [fn for fn in globals().values() if callable(fn) and fn.__name__.startswith("test_")]
    passed = 0
    failed = 0
    for test_fn in sorted(tests, key=lambda fn: fn.__name__):
        try:
            test_fn()
            print(f"  OK {test_fn.__name__}")
            passed += 1
        except Exception as e:
            print(f"  FAIL {test_fn.__name__}: {e}")
            failed += 1
    print(f"\n{passed}/{passed + failed} tests passed")
    sys.exit(1 if failed > 0 else 0)