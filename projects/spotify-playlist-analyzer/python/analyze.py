"""
Spotify Playlist Analyzer — Python data analysis layer.

Reads a Spotify playlist CSV, computes all statistics,
and writes analysis.json consumed by the Flask dashboard.

Usage:
    python analyze.py <csv_path> [-o output_path] [--limit N]
"""

import argparse
import json
import sys
from collections import Counter, defaultdict
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


def _split_values(value, lower=True):
    """Split a comma-separated string into cleaned tokens. Handles NaN."""
    if pd.isna(value):
        return []
    parts = str(value).split(",")
    if lower:
        return [p.strip().lower() for p in parts if p.strip()]
    return [p.strip() for p in parts if p.strip()]


def _split_col(df, column, sep=","):
    """Split a DataFrame column by separator, returning all cleaned tokens."""
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


def _parse_genres(x):
    return _split_values(x)


def genres(df):
    """Count and rank genres."""

    df = df.copy()
    df["Genres"] = df["Genres"].fillna("")

    genre_list = [
        g
        for x in df["Genres"]
        for g in _parse_genres(x)
    ]

    if not genre_list:
        return {"top_genres": [], "total_unique": 0}

    counter = Counter(genre_list)
    total = len(genre_list)

    genre_artists = {}
    genre_years = {}

    for _, row in df.iterrows():
        artists = _split_values(row.get("Artist", ""), lower=False)
        genres_in_row = _parse_genres(row.get("Genres", ""))

        if not genres_in_row:
            continue

        added_dt = pd.to_datetime(row.get("Added at"), errors="coerce")
        year = int(added_dt.year) if pd.notna(added_dt) else None

        for g in genres_in_row:
            if artists:
                genre_artists.setdefault(g, set()).add(artists[0])
            if year:
                genre_years.setdefault(g, set()).add(year)

    top = [
        {
            "name": name,
            "count": count,
            "pct": round(count / total * 100, 1),
            "artist_count": len(genre_artists.get(name, set())),
            "year_min": min(genre_years[name]) if name in genre_years else None,
            "year_max": max(genre_years[name]) if name in genre_years else None,
        }
        for name, count in counter.most_common(20)
    ]

    genre_combo_counter = {}

    for _, row in df.iterrows():
        genres_in_row = _parse_genres(row.get("Genres", ""))
        if not genres_in_row:
            continue

        genres_in_row = sorted(genres_in_row)
        n = min(len(genres_in_row), 6)

        genre_combo_counter.setdefault(n, Counter())

        if n == 1:
            genre_combo_counter[n][genres_in_row[0].title()] += 1
        else:
            combo = " + ".join(g.title() for g in genres_in_row)
            genre_combo_counter[n][combo] += 1

    genre_counts = pd.Series([
        len(_parse_genres(x)) for x in df["Genres"].fillna("")
    ])

    max_bin = int(genre_counts.max()) if not genre_counts.empty else 5

    bins = list(range(1, min(max_bin + 1, 6))) + (["6+"] if max_bin >= 6 else [])

    genres_per_song = []
    genre_combo_info = {}

    for b in bins:
        if isinstance(b, int):
            cnt = int((genre_counts == b).sum())
            genres_per_song.append({"label": str(b), "count": cnt})

            top_entry = genre_combo_counter.get(b, Counter()).most_common(1)
            if top_entry:
                genre_combo_info[str(b)] = {
                    "name": top_entry[0][0],
                    "count": top_entry[0][1],
                }
        else:
            cnt = int((genre_counts >= 6).sum())
            genres_per_song.append({"label": "6+", "count": cnt})

            top_entry = genre_combo_counter.get(6, Counter()).most_common(1)
            if top_entry:
                genre_combo_info["6+"] = {
                    "name": top_entry[0][0],
                    "count": top_entry[0][1],
                }

    return {
        "top_genres": top,
        "total_unique": len(counter),
        "total_occurrences": total,
        "genres_per_song": genres_per_song,
        "genre_combo_info": genre_combo_info,
    }


def artists(df):
    """Analyze artist frequency and collaborations."""

    df = df.copy()

    df["_artists"] = (
        df["Artist"]
        .fillna("")
        .apply(lambda x: _split_values(x, lower=False))
    )

    all_artists = [a for group in df["_artists"] for a in group]

    if not all_artists:
        return {
            "top_artists": [],
            "collaboration_count": 0,
            "total_unique_artists": 0,
            "song_count_distribution": [],
        }

    counter = Counter(all_artists)

    top = [
        {
            "name": name,
            "count": count,
            "pct": round(count / len(all_artists) * 100, 1),
        }
        for name, count in counter.most_common(20)
    ]

    collab_count = int(df["_artists"].apply(lambda x: len(x) > 1).sum())

    artist_genres = {}
    artist_years = {}
    artist_year_counts = {}
    artist_collab_genres = defaultdict(list)

    for _, row in df.iterrows():
        artists_list = row["_artists"]
        genres = _parse_genres(row.get("Genres", ""))

        added = pd.to_datetime(row.get("Added at"), errors="coerce")
        year = int(added.year) if pd.notna(added) else None

        for artist in artists_list:
            if year is not None:
                artist_years.setdefault(artist, set()).add(year)
                artist_year_counts.setdefault(artist, Counter())[year] += 1

            artist_collab_genres[artist].append(genres)

        if len(artists_list) == 1 and genres:
            artist_genres.setdefault(artists_list[0], set()).update(genres)

    for artist, genre_lists in artist_collab_genres.items():
        if artist in artist_genres:
            continue

        flat = [g for gl in genre_lists for g in gl if g]

        if flat:
            artist_genres[artist] = {Counter(flat).most_common(1)[0][0]}
        else:
            artist_genres[artist] = {"uncategorized"}

    for t in top:
        name = t["name"]

        t["genres"] = sorted(artist_genres.get(name, []))

        years = artist_years.get(name, set())
        t["year_min"] = min(years) if years else None
        t["year_max"] = max(years) if years else None
        t["year_count"] = len(years)

        counts = artist_year_counts.get(name)
        if counts:
            peak_year, peak_count = counts.most_common(1)[0]
            t["peak_year"] = peak_year
            t["peak_count"] = peak_count
        else:
            t["peak_year"] = None
            t["peak_count"] = 0

    top.sort(
        key=lambda x: (
            x["peak_year"] is None,
            x["peak_year"] or 0,
            -x["count"],
        )
    )

    freq_dist = Counter(counter.values())
    max_freq = max(freq_dist.keys(), default=0)

    song_count_distribution = [
        {"label": "1", "count": freq_dist.get(1, 0)},
        {"label": "2", "count": freq_dist.get(2, 0)},
        {"label": "3", "count": freq_dist.get(3, 0)},
        {"label": "4", "count": freq_dist.get(4, 0)},
        {"label": "5", "count": freq_dist.get(5, 0)},
        {"label": "6–10", "count": sum(freq_dist.get(i, 0) for i in range(6, 11))},
        {"label": "11+", "count": sum(freq_dist.get(i, 0) for i in range(11, max_freq + 1))},
    ]

    return {
        "top_artists": top,
        "collaboration_count": collab_count,
        "total_unique_artists": len(counter),
        "song_count_distribution": song_count_distribution,
    }

def temporal(df):
    """Analyze songs added over time and album release dates."""
    added = pd.to_datetime(df["Added at"], errors="coerce")

    songs_by_year = _value_counts_to_records(added.dt.year.dropna(), "year", sort_by_index=True)
    songs_by_month = _value_counts_to_records(added.dt.to_period("M").astype(str).dropna(), "month", sort_by_index=True)
    album_year = pd.to_datetime(df["Album Date"], errors="coerce").dt.year
    album_year_counts = _value_counts_to_records(album_year.dropna(), "year", sort_by_index=True)

    added_min = added.min()
    added_max = added.max()

    return {
        "songs_by_year": songs_by_year,
        "songs_by_month": songs_by_month,
        "album_year_counts": album_year_counts,
        "earliest_added": str(added_min.date()) if pd.notna(added_min) else None,
        "latest_added": str(added_max.date()) if pd.notna(added_max) else None,
    }


def _value_counts_to_records(series, key_name, sort_by_index=False):
    """Convert a value_counts() series to a list of {key_name, count} dicts.
    
    If sort_by_index is True, sort by index (e.g. chronological) instead of count.
    """
    counts = series.value_counts()
    if sort_by_index:
        counts = counts.sort_index()
    counts = counts.reset_index()
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

    # Mood quadrants
    mood_subset = df[["Valence", "Energy"]].dropna()
    if len(mood_subset):
        v_med = mood_subset["Valence"].median()
        e_med = mood_subset["Energy"].median()

        quad = {
            "high_valence_high_energy": 0,
            "high_valence_low_energy": 0,
            "low_valence_high_energy": 0,
            "low_valence_low_energy": 0,
        }

        for v, e in zip(mood_subset["Valence"], mood_subset["Energy"]):
            if v >= v_med and e >= e_med:
                quad["high_valence_high_energy"] += 1
            elif v >= v_med:
                quad["high_valence_low_energy"] += 1
            elif e >= e_med:
                quad["low_valence_high_energy"] += 1
            else:
                quad["low_valence_low_energy"] += 1
    else:
        quad = {}

    # ------------------------------------------------------------------
    # Build artist -> genres lookup (includes featured artists)
    # ------------------------------------------------------------------
    artist_genres = {}

    for _, row in df.iterrows():
        artists = _split_values(row["Artist"], lower=False)
        genres = _split_values(row["Genres"])

        for artist in artists:
            artist_genres.setdefault(artist, set()).update(genres)

    # ------------------------------------------------------------------
    # Scatter data
    # ------------------------------------------------------------------
    scatter = df.dropna(subset=["Valence", "Energy"])

    valence_energy_scatter = []

    for _, row in scatter.iterrows():
        artists = _split_values(row["Artist"], lower=False)

        merged_genres = sorted({
            genre
            for artist in artists
            for genre in artist_genres.get(artist, set())
        })

        valence_energy_scatter.append({
            "valence": float(row["Valence"]),
            "energy": float(row["Energy"]),
            "song": str(row["Song"]),
            "artist": ",".join(artists),
            "genre": ", ".join(merged_genres),
        })

    return {
        "key_distribution": key_distribution,
        "camelot_distribution": camelot_distribution,
        "mood_quadrants": quad,
        "valence_energy_scatter": valence_energy_scatter,
    }


def albums(df):
    """Analyze album frequency."""
    required = {"Album", "Artist", "Album Date", "Genres"}
    missing = required - set(df.columns)
    if missing:
        return {"top_albums": [], "total_unique_albums": 0}

    album_groups = df.groupby("Album", sort=False)
    top = []
    for name, group in album_groups:
        first = group.iloc[0]
        artists = str(first.get("Artist", ""))
        years = pd.to_datetime(group["Album Date"], errors="coerce").dt.year.dropna()
        year_min = int(years.min()) if not years.empty else None
        year_max = int(years.max()) if not years.empty else None
        solo_tracks = group[~group["Artist"].str.contains(",", na=False)]
        genre_list = _split_col(solo_tracks, "Genres") if len(solo_tracks) > 0 else _split_col(group, "Genres")
        top_genres = [g.title() for g, _ in Counter(genre_list).most_common(3)]

        top.append({
            "name": str(name),
            "artist": artists,
            "count": len(group),
            "year_min": year_min,
            "year_max": year_max,
            "genres": top_genres,
        })
    top.sort(key=lambda x: x["count"], reverse=True)
    return {"top_albums": top[:20], "total_unique_albums": len(top)}


def _trends(df, value_col, output_key, top_n=15, title_names=False):
    """Build year-over-year trends for a multi-value column (Genres or Artist)."""
    required = {value_col, "Added at"}
    missing = required - set(df.columns)
    if missing:
        return {"years": [], output_key: [], "series": {}}

    df = df.copy()
    df["_year"] = pd.to_datetime(df["Added at"], errors="coerce").dt.year
    df = df.dropna(subset=["_year", value_col])
    df["_year"] = df["_year"].astype(int)

    if df.empty:
        return {"years": [], output_key: [], "series": {}}

    # Build year → counter
    year_counter = {}
    for _, row in df.iterrows():
        year = int(row["_year"])
        values = _split_values(row[value_col])
        for v in values:
            year_counter.setdefault(year, Counter())[v] += 1

    years = sorted(year_counter.keys())

    # Collect per-year top N items (union → series keys)
    top_set = set()
    for year in years:
        top_items = [v for v, _ in year_counter[year].most_common(top_n)]
        top_set.update(top_items)

    all_years_items = sorted(top_set)

    # Build series: per-year, top N go in their slot, rest into Other
    series = {}
    for year in years:
        counts = year_counter[year]
        top_for_year = {v for v, _ in counts.most_common(top_n)}
        for item in all_years_items:
            val = counts.get(item, 0)
            if item in top_for_year and val > 0:
                series.setdefault(item, [0] * len(years))[years.index(year)] = val
            else:
                series.setdefault("Other", [0] * len(years))[years.index(year)] += val

    # Order by total count descending, Other always last
    item_order = sorted(
        [v for v in series if v != "Other"],
        key=lambda v: sum(series[v]), reverse=True
    )
    ordered = {v: series[v] for v in item_order}
    if "Other" in series:
        ordered["Other"] = series["Other"]

    top_per_year = [
        {"year": y, "name": year_counter[y].most_common(1)[0][0].title() if title_names else year_counter[y].most_common(1)[0][0],
         "count": year_counter[y].most_common(1)[0][1]}
        for y in years
    ]

    return {
        "years": years,
        output_key: list(ordered.keys()),
        "series": ordered,
        "top_per_year": top_per_year,
    }


def genre_trends(df, top_n=15):
    """Genre distribution by year added — delegated to _trends()."""
    return _trends(df, "Genres", "genres", top_n, title_names=True)


def artist_trends(df, top_n=15):
    """Top artists by year added — delegated to _trends()."""
    return _trends(df, "Artist", "artists", top_n)


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

    # Precompute bounds once (avoids O(n²) inside _song_score apply)
    _bounds = {}
    for col in numeric_cols:
        vals = df[col].dropna()
        _bounds[col] = (float(vals.min()), float(vals.max())) if len(vals) > 0 else (0.0, 1.0)

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
            col_min, col_max = _bounds[col]
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
        "albums": albums(df),
        "genre_trends": genre_trends(df),
        "artist_trends": artist_trends(df),
        "perfect_song": perfect_song(df),
        "_meta": {
            "source": Path(csv_path).name,
            "songs_analyzed": len(df),
            "limit_applied": limit,
        },
    }

    output = Path(output_path) if output_path else None
    if output:
        output.parent.mkdir(parents=True, exist_ok=True)
        with open(output, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        print(f"Wrote analysis to {output.resolve()}")
    return result


if __name__ == "__main__":
    args = parse_args()
    run(args.csv, args.output, args.limit)
