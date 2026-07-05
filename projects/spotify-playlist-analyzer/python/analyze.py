"""
Spotify Playlist Analyzer — Python data analysis layer.

Reads a Spotify playlist CSV, computes all statistics,
and writes analysis.json consumed by the Ruby/Sinatra dashboard.

Usage:
    python analyze.py <csv_path> [-o output_path] [--limit N]
"""

import argparse
import json
import sys
from collections import Counter
from pathlib import Path

import numpy as np
import pandas as pd


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _bucket(values, n_buckets=10, fmt="{:.0f}-{:.0f}"):
    """Partition `values` into `n_buckets` quantile-based buckets.
    
    Uses qcut which creates buckets with roughly equal counts,
    avoiding edge cases with integer-heavy distributions.
    """
    vals = values.dropna()
    if len(vals) == 0:
        return {"buckets": [], "counts": []}
    if len(vals) < n_buckets:
        n_buckets = len(vals)
    if vals.nunique() < 2:
        return {"buckets": [fmt.format(vals.iloc[0], vals.iloc[0])], "counts": [len(vals)]}
    try:
        _, edges = pd.qcut(vals, q=n_buckets, retbins=True, duplicates="drop")
        n_actual = len(edges) - 1
        buckets = [fmt.format(edges[i], edges[i + 1]) for i in range(n_actual)]
        # Ensure unique labels
        seen = set()
        unique_buckets = []
        unique_edges = [edges[0]]
        for i in range(n_actual):
            label = buckets[i]
            if label not in seen:
                seen.add(label)
                unique_buckets.append(label)
                unique_edges.append(edges[i + 1])
        if len(unique_buckets) < 2:
            return {"buckets": [fmt.format(vals.min(), vals.max())], "counts": [len(vals)]}
        labels = pd.cut(vals, bins=unique_edges, labels=unique_buckets, include_lowest=True)
        counts = labels.value_counts(sort=False).tolist()
        return {"buckets": unique_buckets, "counts": counts}
    except ValueError:
        return {"buckets": [fmt.format(vals.min(), vals.max())], "counts": [len(vals)]}


def _split_col(df, column, sep=","):
    """Split a column by separator, returning all cleaned tokens."""
    parts = df[column].dropna().str.split(sep)
    return [p.strip().lower() for sublist in parts for p in sublist if p.strip()]


# ---------------------------------------------------------------------------
# Analysis modules
# ---------------------------------------------------------------------------

def basic_stats(df):
    """Compute aggregate overview stats."""
    explicit_count = (df["Explicit"].astype(str).str.lower() == "yes").sum()
    total_sec = int(df["Duration"].apply(_duration_to_sec).sum())
    return {
        "total_songs": int(len(df)),
        "unique_artists": int(df["Artist"].nunique()),
        "unique_genres": int(len(set(_split_col(df, "Genres")))),
        "unique_albums": int(df["Album"].nunique()),
        "avg_bpm": round(float(df["BPM"].median()), 1),
        "avg_energy": round(float(df["Energy"].median()), 1),
        "avg_dance": round(float(df["Dance"].median()), 1),
        "avg_valence": round(float(df["Valence"].median()), 1),
        "avg_duration_sec": round(float(df["Duration"].apply(_duration_to_sec).median()), 1),
        "total_duration_sec": total_sec,
        "total_duration_hrs": round(total_sec / 3600, 1),
        "avg_popularity": round(float(df["Popularity"].median()), 1),
        "explicit_count": int(explicit_count),
        "explicit_pct": round(float(explicit_count / len(df) * 100), 1),
    }


def _duration_to_sec(d):
    """Convert mm:ss or hh:mm:ss to seconds."""
    parts = str(d).split(":")
    if len(parts) == 3:
        return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
    if len(parts) == 2:
        return int(parts[0]) * 60 + int(parts[1])
    return 0


def audio_features(df):
    """Return histograms for numeric audio features."""
    features = {
        "bpm": ("BPM", "BPM"),
        "energy": ("Energy", "%"),
        "dance": ("Dance", "%"),
        "valence": ("Valence", "%"),
        "acousticness": ("Acoustic", "%"),
        "instrumentalness": ("Instrumental", "%"),
        "speechiness": ("Speech", "%"),
        "liveness": ("Live", "%"),
    }
    result = {}
    for key, (col, unit) in features.items():
        b = _bucket(df[col])
        b["unit"] = unit
        result[key] = b
    # Loudness uses db, different range
    loud = _bucket(df["Loud (db)"], fmt="{:.1f}-{:.1f}")
    loud["unit"] = "dB"
    result["loudness"] = loud
    return result


def genres(df):
    """Count and rank genres."""
    genre_list = _split_col(df, "Genres")
    if not genre_list:
        return {"top_genres": [], "total_unique": 0}
    counter = Counter(genre_list)
    total = len(genre_list)
    top = [
        {"name": name.title(), "count": count, "pct": round(count / total * 100, 1)}
        for name, count in counter.most_common(20)
    ]
    return {
        "top_genres": top,
        "total_unique": len(counter),
        "total_occurrences": total,
    }


def temporal(df):
    """Analyze songs added over time and album release dates."""
    # Parse Added at
    df["_added"] = pd.to_datetime(df["Added at"], errors="coerce")
    df["_added_year"] = df["_added"].dt.year
    df["_added_month"] = df["_added"].dt.to_period("M").astype(str)

    songs_by_year = (
        df["_added_year"].value_counts().sort_index()
        .rename_axis("year").reset_index(name="count")
        .to_dict(orient="records")
    )
    songs_by_month = (
        df["_added_month"].value_counts().sort_index()
        .rename_axis("month").reset_index(name="count")
        .to_dict(orient="records")
    )

    # Album dates
    df["_album_year"] = (
        pd.to_datetime(df["Album Date"], errors="coerce").dt.year
    )
    album_year_counts = (
        df["_album_year"].value_counts().sort_index()
        .rename_axis("year").reset_index(name="count")
        .to_dict(orient="records")
    )

    # Earliest / latest addition
    added_min = df["_added"].min()
    added_max = df["_added"].max()

    return {
        "songs_by_year": songs_by_year,
        "songs_by_month": songs_by_month,
        "album_year_counts": album_year_counts,
        "earliest_added": str(added_min.date()) if pd.notna(added_min) else None,
        "latest_added": str(added_max.date()) if pd.notna(added_max) else None,
    }


def _value_counts_to_records(series, key_name):
    """Convert a value_counts() series to a list of {key_name, count} dicts."""
    counts = series.value_counts().reset_index()
    counts.columns = [key_name, "count"]
    return counts.to_dict(orient="records")


def mood_key(df):
    """Analyze key distribution and valence-energy mood quadrants."""
    key_distribution = _value_counts_to_records(
        df["Key"].dropna().str.strip(), "key"
    )
    camelot_distribution = _value_counts_to_records(
        df["Camelot"].dropna().str.strip(), "camelot"
    )

    # Mood quadrants: split on median valence/energy
    # Use a single dropna on the subset to keep valence-energy pairs aligned
    mood_subset = df[["Valence", "Energy"]].dropna()
    if len(mood_subset) > 0:
        v_vals = mood_subset["Valence"]
        e_vals = mood_subset["Energy"]
        v_med = v_vals.median()
        e_med = e_vals.median()
        quad = {"high_valence_high_energy": 0, "high_valence_low_energy": 0,
                "low_valence_high_energy": 0, "low_valence_low_energy": 0}
        for v, e in zip(v_vals, e_vals):
            if v >= v_med and e >= e_med:
                quad["high_valence_high_energy"] += 1
            elif v >= v_med and e < e_med:
                quad["high_valence_low_energy"] += 1
            elif v < v_med and e >= e_med:
                quad["low_valence_high_energy"] += 1
            else:
                quad["low_valence_low_energy"] += 1
    else:
        quad = {}

    # Scatter data for Chart.js: individual song valence/energy
    scatter = df.dropna(subset=["Valence", "Energy"])
    valence_energy_scatter = [
        {
            "valence": float(row["Valence"]),
            "energy": float(row["Energy"]),
            "song": str(row["Song"]),
            "artist": str(row["Artist"]),
            "genre": str(row["Genres"]),
        }
        for _, row in scatter.iterrows()
    ]

    return {
        "key_distribution": key_distribution,
        "camelot_distribution": camelot_distribution,
        "mood_quadrants": quad,
        "valence_energy_scatter": valence_energy_scatter,
    }


def artists(df):
    """Analyze artist frequency and collaborations."""
    # Parse Artist (may contain multiple separated by comma)
    df["_artists"] = df["Artist"].str.split(",")
    all_artists = [a.strip() for sublist in df["_artists"].dropna() for a in sublist]
    if not all_artists:
        return {"top_artists": [], "collaboration_count": 0}
    counter = Counter(all_artists)
    top = [
        {"name": name, "count": count, "pct": round(count / len(all_artists) * 100, 1)}
        for name, count in counter.most_common(20)
    ]

    # Collaboration count: rows where Artist has multiple names
    collab_count = int(df["_artists"].dropna().apply(lambda x: len(x) > 1).sum())

    # Artist-genre mapping: aggregate genres per artist
    artist_genres = {}
    for _, row in df.iterrows():
        artists_list = [a.strip() for a in str(row.get("Artist", "")).split(",")]
        genres_list = [g.strip().lower() for g in str(row.get("Genres", "")).split(",")]
        for a in artists_list:
            if a not in artist_genres:
                artist_genres[a] = set()
            artist_genres[a].update(genres_list)

    # Enrich top artists with their genres
    for t in top:
        name = t["name"]
        t["genres"] = sorted(artist_genres.get(name, set()))

    return {
        "top_artists": top,
        "collaboration_count": collab_count,
        "total_unique_artists": len(counter),
    }


def perfect_song(df):
    """Build a 'perfect song' profile and find the real track closest to it."""
    def most_common(series):
        return series.mode().iloc[0] if not series.mode().empty else None

    features = {
        "bpm": ("BPM", "BPM"),
        "energy": ("Energy", "%"),
        "dance": ("Dance", "%"),
        "valence": ("Valence", "%"),
        "acousticness": ("Acoustic", "%"),
        "popularity": ("Popularity", ""),
    }

    freq = {}
    perf_target = {}
    for key, (col, unit) in features.items():
        vals = df[col].dropna()
        # Popularity=0 is treated as missing (many tracks default to 0 without data)
        if key == "popularity":
            vals = vals[vals > 0]
        val = most_common(vals)
        if val is not None:
            v = float(val)
            freq[key] = {"value": round(v, 0), "unit": unit}
            perf_target[key] = v

    # --- Find closest real song ---
    numeric_cols = [col for key, (col, _) in features.items()]

    def _song_score(row):
        """Lower = closer to the perfect profile (normalized euclidean)."""
        score = 0.0
        count = 0
        for key, (col, _) in features.items():
            target = perf_target.get(key)
            if target is None:
                continue
            v = row.get(col)
            if pd.isna(v):
                continue
            v = float(v)
            # Popularity=0 treated as missing
            if key == "popularity" and v == 0:
                continue
            # Normalize to 0-1 range based on data bounds for equal weighting
            col_min, col_max = float(df[col].min()), float(df[col].max())
            if col_max > col_min:
                v_norm = (v - col_min) / (col_max - col_min)
                t_norm = (target - col_min) / (col_max - col_min)
                score += (v_norm - t_norm) ** 2
                count += 1
        return score / max(count, 1)

    scored = df.copy()
    scored["_score"] = scored.apply(_song_score, axis=1)
    best_idx = scored["_score"].idxmin()
    worst_idx = scored["_score"].idxmax()
    best = scored.loc[best_idx]
    worst = scored.loc[worst_idx]

    def _song_info(row):
        return {
            "song": str(row.get("Song", "")),
            "artist": str(row.get("Artist", "")),
            "album": str(row.get("Album", "")),
            "bpm": int(row.get("BPM", 0)) if pd.notna(row.get("BPM")) else None,
            "energy": int(row.get("Energy", 0)) if pd.notna(row.get("Energy")) else None,
            "dance": int(row.get("Dance", 0)) if pd.notna(row.get("Dance")) else None,
            "valence": int(row.get("Valence", 0)) if pd.notna(row.get("Valence")) else None,
            "genres": str(row.get("Genres", "")),
            "popularity": int(row.get("Popularity", 0)) if pd.notna(row.get("Popularity")) else None,
            "key": str(row.get("Key", "")),
            "camelot": str(row.get("Camelot", "")),
            "explicit": str(row.get("Explicit", "")),
        }

    composite = {
        "key": str(most_common(df["Key"].dropna().str.strip()) or "—"),
        "camelot": str(most_common(df["Camelot"].dropna().str.strip()) or "—"),
        "time_signature": int(most_common(df["Time Signature"].dropna().astype(int)) or 4),
        "explicit": str(most_common(df["Explicit"].dropna().str.strip().str.lower()) or "no"),
        "genre": str(most_common(
            pd.Series(_split_col(df, "Genres"))
        ).title() if most_common(pd.Series(_split_col(df, "Genres"))) else "—"),
    }

    return {
        "freq": freq,
        "composite": composite,
        "closest_match": _song_info(best),
        "furthest_match": _song_info(worst),
        "total_scored": int(len(scored)),
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def parse_args():
    parser = argparse.ArgumentParser(description="Analyze a Spotify playlist CSV")
    parser.add_argument("csv", type=str, help="Path to spotify-playlist.csv")
    parser.add_argument("-o", "--output", type=str, default="analysis.json",
                        help="Output JSON path (default: analysis.json)")
    parser.add_argument("--limit", type=int, default=None,
                        help="Process only first N rows (for development)")
    return parser.parse_args()


def _detect_sep(path):
    """Auto-detect CSV delimiter by sampling the first line."""
    try:
        with open(path, encoding="utf-8") as f:
            first = f.readline()
        tab_count = first.count("\t")
        comma_count = first.count(",")
        return "\t" if tab_count > comma_count else ","
    except Exception:
        return "\t"  # fallback


# Canonical column name mapping (lowercased, stripped → expected name)
_COLUMN_ALIASES = {
    "song": "Song",
    "artist": "Artist",
    "bpm": "BPM",
    "camelot": "Camelot",
    "energy": "Energy",
    "added at": "Added at",
    "added_at": "Added at",
    "duration": "Duration",
    "popularity": "Popularity",
    "genres": "Genres",
    "album": "Album",
    "album date": "Album Date",
    "album_date": "Album Date",
    "dance": "Dance",
    "acoustic": "Acoustic",
    "instrumental": "Instrumental",
    "valence": "Valence",
    "speech": "Speech",
    "live": "Live",
    "loud (db)": "Loud (db)",
    "key": "Key",
    "time signature": "Time Signature",
    "time_signature": "Time Signature",
    "spotify track id": "Spotify Track Id",
    "spotify_track_id": "Spotify Track Id",
    "isrc": "ISRC",
    "explicit": "Explicit",
}


def _normalize_columns(df):
    """Rename columns to canonical names (case-insensitive match)."""
    rename_map = {}
    for col in df.columns:
        key = col.strip().lower()
        if key in _COLUMN_ALIASES:
            rename_map[col] = _COLUMN_ALIASES[key]
        elif key.lstrip("#") in _COLUMN_ALIASES:
            rename_map[col] = _COLUMN_ALIASES[key.lstrip("#")]
    if rename_map:
        df = df.rename(columns=rename_map)
    return df


def run(csv_path, output_path, limit=None):
    sep = _detect_sep(csv_path)
    # First column is named "#" (the row number) in some exports. Read with
    # header=0 and don't use comment='#' since it's part of the column name.
    raw = pd.read_csv(csv_path, sep=sep, encoding="utf-8", header=0)
    raw = _normalize_columns(raw)
    # Drop the "#" index column — it's just the row number
    if "#" in raw.columns:
        raw = raw.drop(columns=["#"])
    df = raw.head(limit) if limit else raw
    df = df.copy()  # Avoid SettingWithCopyWarning

    print(f"Loaded {len(df)} songs from {csv_path}")

    result = {
        "basic_stats": basic_stats(df),
        "audio_features": audio_features(df),
        "genres": genres(df),
        "temporal": temporal(df),
        "mood_key": mood_key(df),
        "artists": artists(df),
        "perfect_song": perfect_song(df),
        "_meta": {
            "source": str(csv_path),
            "songs_analyzed": len(df),
            "limit_applied": limit,
        },
    }

    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    with open(output, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    print(f"Wrote analysis to {output.resolve()}")
    return result


if __name__ == "__main__":
    args = parse_args()
    run(args.csv, args.output, args.limit)
