"""
Tests for analyze.py — run with: python test_analyze.py

Uses the example CSV so tests work without a real playlist export.
Analysis runs once and results are shared across all tests.
"""

import json
import sys
from pathlib import Path

import analyze

EXAMPLE_CSV = Path(__file__).resolve().parent.parent / "data" / "spotify-playlist-example.csv"

# Run analysis once — shared across all tests
print(f"Analyzing {EXAMPLE_CSV}...", file=sys.stderr)
RESULT = analyze.run(str(EXAMPLE_CSV), output_path=None, limit=100)
print("Analysis complete.", file=sys.stderr)


def test_basic_stats():
    stats = RESULT["basic_stats"]
    assert stats["total_songs"] > 0, "No songs loaded"
    assert isinstance(stats["unique_artists"], int)
    assert isinstance(stats["avg_bpm"], (int, float))
    assert 0 <= stats["explicit_pct"] <= 100


def test_audio_features():
    audio = RESULT["audio_features"]
    for key in ("bpm", "energy", "dance", "valence"):
        assert key in audio, f"Missing audio feature: {key}"
        assert "buckets" in audio[key]
        assert "counts" in audio[key]
        assert len(audio[key]["buckets"]) > 0


def test_genres():
    genres = RESULT["genres"]
    assert "top_genres" in genres
    assert len(genres["top_genres"]) > 0
    assert genres["total_unique"] > 0
    for g in genres["top_genres"]:
        assert "name" in g
        assert "count" in g
        assert "pct" in g


def test_artists():
    artists = RESULT["artists"]
    assert "top_artists" in artists
    assert len(artists["top_artists"]) > 0
    assert artists["total_unique_artists"] > 0
    for a in artists["top_artists"]:
        assert "name" in a
        assert "genres" in a  # genre inference ran
        assert isinstance(a["genres"], list)


def test_genre_trends():
    gt = RESULT["genre_trends"]
    assert "years" in gt
    assert "genres" in gt
    assert "series" in gt
    assert len(gt["years"]) > 0
    assert "Other" in gt["series"]


def test_artist_trends():
    at = RESULT["artist_trends"]
    assert "years" in at
    assert "artists" in at
    assert "series" in at
    assert len(at["years"]) > 0
    assert "Other" in at["series"]


def test_temporal():
    t = RESULT["temporal"]
    assert "songs_by_year" in t
    assert "songs_by_month" in t
    assert "album_year_counts" in t
    assert len(t["songs_by_year"]) > 0


def test_mood_key():
    mood = RESULT["mood_key"]
    assert "key_distribution" in mood
    assert "camelot_distribution" in mood
    assert "mood_quadrants" in mood
    assert "valence_energy_scatter" in mood


def test_albums():
    albums = RESULT["albums"]
    assert "top_albums" in albums
    assert albums["total_unique_albums"] > 0


def test_perfect_song():
    ps = RESULT["perfect_song"]
    assert "freq" in ps
    assert "composite" in ps
    assert "closest_match" in ps
    assert "furthest_match" in ps
    assert ps["total_scored"] > 0
    assert ps["closest_match"]["song"] != ps["furthest_match"]["song"]


def test_meta():
    meta = RESULT["_meta"]
    assert "source" in meta
    assert "songs_analyzed" in meta
    assert meta["songs_analyzed"] > 0


def test_output_json():
    """Verify analysis.json can be written and read back."""
    tmp = Path(__file__).resolve().parent / "_test_output.json"
    try:
        analyze.run(str(EXAMPLE_CSV), str(tmp), limit=100)
        assert tmp.exists()
        with open(tmp, encoding="utf-8") as f:
            data = json.load(f)
        assert "basic_stats" in data
    finally:
        if tmp.exists():
            tmp.unlink()


def test_split_values():
    assert analyze._split_values(None) == []
    assert analyze._split_values("") == []
    assert analyze._split_values("a,b,c") == ["a", "b", "c"]
    assert analyze._split_values(" A , B ") == ["a", "b"]
    assert analyze._split_values("A,B", lower=False) == ["A", "B"]
    assert analyze._split_values("a,,b") == ["a", "b"]


def test_value_counts_to_records():
    import pandas as pd
    s = pd.Series(["a", "b", "a", "c"])
    records = analyze._value_counts_to_records(s, "key")
    assert len(records) == 3
    names = {r["key"] for r in records}
    assert names == {"a", "b", "c"}


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
