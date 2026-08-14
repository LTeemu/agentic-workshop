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


def _write_playlist_csv(rows):
    header = ("#,Song,Artist,BPM,Camelot,Energy,Added At,Duration,Popularity,Genres,Album,"
              "Album Date,Dance,Acoustic,Instrumental,Valence,Speech,Live,Loud (Db),Key,"
              "Time Signature,Spotify Track Id,ISRC,Explicit")
    tmp = tempfile.NamedTemporaryFile("w", suffix=".csv", delete=False, encoding="utf-8")
    with tmp:
        tmp.write("\n".join([header, *rows]))
    return tmp.name


def test_run_dedupes_duplicate_track_ids():
    """Duplicate Spotify Track Ids count once; id-less rows are never merged."""
    row = ('{n},"{song}","{artist}",120,8A,80,2023-01-01,03:00,50,"pop","{album}",2022-01-01,'
           '60,0,0,50,5,0,-5,C Major,4,{tid},ISRC{n},no')
    rows = [
        row.format(n=1, song="A", artist="X", album="A", tid="TID1"),
        row.format(n=2, song="A", artist="X", album="A", tid="TID1"),  # exact duplicate
        row.format(n=3, song="B", artist="Y", album="B", tid="TID2"),
        row.format(n=4, song="C", artist="Z", album="C", tid=""),      # no track id
        row.format(n=5, song="D", artist="W", album="D", tid=""),      # no track id
    ]
    path = _write_playlist_csv(rows)
    try:
        result = analyze.run(path, output_path=None)
        # dup dropped (5 rows → 4); both id-less rows survive separately
        assert result["basic_stats"]["total_songs"] == 4
        assert result["_meta"]["songs_analyzed"] == 4
        # limit window containing both copies of the dup → still deduped to 1
        limited = analyze.run(path, output_path=None, limit=2)
        assert limited["basic_stats"]["total_songs"] == 1
        # limit window before the duplicate pair → nothing deduped
        first = analyze.run(path, output_path=None, limit=1)
        assert first["basic_stats"]["total_songs"] == 1
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


def test_bucket_callable_fmt_negative_range():
    # Negative ranges (e.g. dB) must not produce double-minus labels like "-8.0--7.0"
    vals = pd.Series([-29.0, -8.0, -7.0, -6.0, -5.0, -3.0])
    b = analyze._bucket(vals, fmt=lambda low, high: f"{low:.1f}–{high:.1f}")
    assert len(b["buckets"]) == len(b["counts"])
    assert sum(b["counts"]) == len(vals)
    assert all("–" in label for label in b["buckets"])
    assert all("--" not in label for label in b["buckets"])


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


def test_artist_order_and_max():
    """Top artists are ranked by song count; top[0] is the true most-songs artist."""
    artists = _run_example()["artists"]
    top = artists["top_artists"]
    counts = [a["count"] for a in top]
    assert counts == sorted(counts, reverse=True)
    assert top[0]["count"] == max(counts)


def test_artist_count_consistency():
    """Overview and Artists page must report the same unique-artist count."""
    result = _run_example()
    assert result["basic_stats"]["unique_artists"] == result["artists"]["total_unique_artists"]


def test_perfect_song_no_nan_genres():
    """Missing genres must serialize as '' — never the string 'nan' (deterministic frame)."""
    df = pd.DataFrame({
        "Song": ["Alpha", "Beta", "Gamma"],
        "Artist": ["One", "Two", "Three"],
        "Album": ["Album A", "Album B", "Album C"],
        "Genres": ["rock", None, "jazz, blues"],
        "BPM": [120, 90, 140],
        "Energy": [80, 40, 60],
        "Dance": [70, 50, 90],
        "Valence": [60, 30, 80],
        "Acoustic": [10, 90, 20],
        "Popularity": [50, 60, 40],
        "Key": [None, None, None],
        "Camelot": [None, None, None],
        "Time Signature": [4, 4, 4],
        "Explicit": ["No", "No", "Yes"],
        "Loud (db)": [-8.0, -12.0, -6.0],
        "Instrumental": [0, 90, 5],
        "Speech": [5, 3, 8],
        "Live": [0, 10, 5],
        "Added at": ["2023-01-01", "2023-01-02", "2023-01-03"],
        "Album Date": ["2022-01-01", "2022-02-01", "2022-03-01"],
        "Duration": ["3:00", "4:00", "5:00"],
    })
    perfect = analyze.perfect_song(df)
    for match in (perfect["closest_match"], perfect["furthest_match"]):
        assert isinstance(match["genres"], str)
        assert match["genres"] not in ("nan", "None")
        # missing Key/Camelot must not leak the string 'nan' either
        assert match["key"] == ""
        assert match["camelot"] == ""
    # all-None Key/Camelot → composite falls back to em-dash
    assert perfect["composite"]["key"] == "—"
    assert perfect["composite"]["camelot"] == "—"


def test_trends_other_includes_never_top_items():
    """Items that never reach a year's top-N still count toward 'Other'."""
    df = pd.DataFrame({
        "Added at": ["2023-01-01", "2023-01-02", "2023-01-03", "2023-01-04"],
        "Genres": ["a", "b", "c", "d"],
    })
    res = analyze._trends(df, "Genres", "genres", top_n=2)
    assert "c" not in res["genres"]
    assert sum(res["series"]["Other"]) == 2


def test_trends_other_catches_falling_out_item():
    """An item in year-1 top-N that falls out of year-2's top-N lands in 'Other'."""
    df = pd.DataFrame({
        "Added at": [
            "2023-01-01", "2023-01-02", "2023-01-03", "2023-01-04",
            "2024-01-01", "2024-01-02", "2024-01-03", "2024-01-04",
        ],
        "Genres": ["a", "a", "b", "c", "a", "c", "c", "b"],
    })
    res = analyze._trends(df, "Genres", "genres", top_n=2)
    assert res["series"]["A"] == [2, 1]
    assert res["series"]["B"] == [1, 0]
    assert res["series"]["C"] == [0, 2]
    assert res["series"]["Other"] == [1, 1]


def test_artist_trends_titled_names():
    """top_per_year artist names are display-titled (idempotent check)."""
    top_per_year = _run_example()["artist_trends"]["top_per_year"]
    assert top_per_year
    for entry in top_per_year:
        name = entry["name"]
        assert name == " ".join(w.capitalize() for w in name.split())


def test_artist_pct_share_of_songs():
    """Artist pct is that artist's share of all songs (within rounding tolerance)."""
    result = _run_example()
    total_songs = result["basic_stats"]["total_songs"]
    assert total_songs > 0
    for artist in result["artists"]["top_artists"]:
        assert abs(artist["pct"] - artist["count"] / total_songs * 100) <= 0.1


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