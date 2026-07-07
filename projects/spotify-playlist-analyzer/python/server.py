"""
Spotify Playlist Analyzer — Flask dashboard server.

Auto-runs analysis on startup if CSV is newer than analysis.json.
Reads analysis.json at request time with mtime-based caching.
"""

import json
import os
import subprocess
import sys
from pathlib import Path

from flask import Flask, render_template, request

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

ROOT_DIR = Path(__file__).resolve().parent.parent
CSV_PRIMARY = ROOT_DIR / "data" / "spotify-playlist.csv"
CSV_FALLBACK = ROOT_DIR / "data" / "spotify-playlist-example.csv"
CSV_PATH = CSV_PRIMARY if CSV_PRIMARY.exists() else CSV_FALLBACK
ANALYSIS_PATH = ROOT_DIR / "data" / "analysis.json"
ANALYZE_PY_PATH = Path(__file__).resolve().parent / "analyze.py"
PYTHON_DIR = Path(__file__).resolve().parent

if CSV_PATH == CSV_FALLBACK:
    print(f"[server] Using example CSV ({CSV_FALLBACK.name}) — place your own at {CSV_PRIMARY.name} for analysis", file=sys.stderr)

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = Flask(__name__)

# Cache
cached_mtime = None
cached_data = {}


def load_analysis():
    """Read analysis.json with mtime-based caching."""
    global cached_mtime, cached_data
    if not ANALYSIS_PATH.exists():
        return {}
    mtime = ANALYSIS_PATH.stat().st_mtime
    if cached_mtime != mtime:
        try:
            raw = ANALYSIS_PATH.read_text(encoding="utf-8")
            cached_data = json.loads(raw)
            cached_mtime = mtime
            print(f"[server] Reloaded analysis data (mtime: {mtime})", file=sys.stderr)
        except (json.JSONDecodeError, OSError) as e:
            print(f"[server] Error reading analysis: {e}", file=sys.stderr)
            cached_data = {}
    return cached_data


# ---------------------------------------------------------------------------
# Auto-run Python analysis on boot if needed
# ---------------------------------------------------------------------------

def needs_rebuild():
    if not ANALYSIS_PATH.exists():
        return True
    if not CSV_PATH.exists():
        return False
    analysis_mtime = ANALYSIS_PATH.stat().st_mtime
    if CSV_PATH.stat().st_mtime > analysis_mtime:
        return True
    if ANALYZE_PY_PATH.stat().st_mtime > analysis_mtime:
        return True
    return False


if needs_rebuild():
    if CSV_PATH.exists():
        print("[server] Source files changed — running analysis...", file=sys.stderr)
        result = subprocess.run(
            [sys.executable, "analyze.py", str(CSV_PATH), "-o", str(ANALYSIS_PATH)],
            cwd=PYTHON_DIR,
            capture_output=True,
            text=True,
        )
        if result.returncode == 0:
            print("[server] Analysis complete", file=sys.stderr)
        else:
            print(f"[server] Analysis failed:\n{result.stderr}", file=sys.stderr)
    else:
        print(f"[server] No CSV found — expected {CSV_PRIMARY.name} or {CSV_FALLBACK.name}", file=sys.stderr)


# ---------------------------------------------------------------------------
# Context
# ---------------------------------------------------------------------------

NAV_LINKS = [
    {"path": "/", "label": "Overview"},
    {"path": "/audio", "label": "Audio Features"},
    {"path": "/genres", "label": "Genres"},
    {"path": "/artists", "label": "Artists"},
    {"path": "/mood", "label": "Mood & Key"},
    {"path": "/timeline", "label": "Timeline"},
]


@app.context_processor
def inject_globals():
    data = load_analysis()
    return {
        "data": data,
        "nav_links": NAV_LINKS,
        "current_path": request.path,
    }


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/audio")
def audio():
    return render_template("audio.html")


@app.route("/genres")
def genres():
    return render_template("genres.html")


@app.route("/artists")
def artists():
    return render_template("artists.html")


@app.route("/mood")
def mood():
    return render_template("mood.html")


@app.route("/timeline")
def timeline():
    return render_template("timeline.html")


# ---------------------------------------------------------------------------
# Error pages
# ---------------------------------------------------------------------------


@app.errorhandler(404)
def not_found(e):
    return render_template("404.html"), 404


@app.errorhandler(500)
def server_error(e):
    return render_template("error.html", error_message=str(e)), 500


# ---------------------------------------------------------------------------
# Routes — workshop integration
# ---------------------------------------------------------------------------


@app.route("/api/health")
def health():
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"Starting dashboard at http://localhost:{port}", file=sys.stderr)
    app.run(host="0.0.0.0", port=port, debug=True)
