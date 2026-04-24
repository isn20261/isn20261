"""GET /recommend — auth optional (works for anonymous and logged-in users).

Recommendation engine is MOCKED. Replace _omdb_lookup() with a real
OMDB API call when OMDB_API_KEY is set — see inconsistencias.md.

Authenticated users:
  - recommendations filtered by their stored preferences
  - result saved to Historico table
Anonymous users:
  - random recommendation from the full catalogue

Environment variables:
  OMDB_API_KEY (optional, for future OMDB integration), + shared db/auth vars
"""
import os
import random
from datetime import datetime, timezone

from shared.auth import get_sub
from shared.db import get_user, historico, write_log
from shared.response import ok, unauthorized

OMDB_API_KEY = os.environ.get("OMDB_API_KEY")

# ---------------------------------------------------------------------------
# Mock catalogue — replace with OMDB lookup in production
# ---------------------------------------------------------------------------
_MOCK_CATALOGUE = [
    {
        "movieId": "tt0133093",
        "title":   "The Matrix",
        "genre":   "action",
        "streaming-services": [
            {"name": "Netflix",
             "image": "https://assets.nflxext.com/us/ffe/siteui/common/icons/nficon2016.ico",
             "url":   "https://www.netflix.com/title/20557937"},
        ],
    },
    {
        "movieId": "tt0816692",
        "title":   "Interstellar",
        "genre":   "sci-fi",
        "streaming-services": [
            {"name": "Amazon Prime",
             "image": "https://www.amazon.com/favicon.ico",
             "url":   "https://www.amazon.com/dp/B00TU9UFTS"},
        ],
    },
    {
        "movieId": "tt1375666",
        "title":   "Inception",
        "genre":   "sci-fi",
        "streaming-services": [
            {"name": "Netflix",
             "image": "https://assets.nflxext.com/us/ffe/siteui/common/icons/nficon2016.ico",
             "url":   "https://www.netflix.com/title/70131314"},
        ],
    },
    {
        "movieId": "tt0468569",
        "title":   "The Dark Knight",
        "genre":   "action",
        "streaming-services": [
            {"name": "HBO Max",
             "image": "https://www.max.com/favicon.ico",
             "url":   "https://www.max.com/movies/dark-knight/07938dc1-3e25-4b2e-b01e-f23b7eed5977"},
        ],
    },
    {
        "movieId": "tt0110912",
        "title":   "Pulp Fiction",
        "genre":   "crime",
        "streaming-services": [
            {"name": "Amazon Prime",
             "image": "https://www.amazon.com/favicon.ico",
             "url":   "https://www.amazon.com/dp/B001CWSITY"},
        ],
    },
    {
        "movieId": "tt0245429",
        "title":   "Spirited Away",
        "genre":   "animation",
        "streaming-services": [
            {"name": "Netflix",
             "image": "https://assets.nflxext.com/us/ffe/siteui/common/icons/nficon2016.ico",
             "url":   "https://www.netflix.com/title/60023642"},
        ],
    },
]

_GENRE_INDEX: dict[str, list[dict]] = {}
for _m in _MOCK_CATALOGUE:
    _GENRE_INDEX.setdefault(_m["genre"], []).append(_m)


def _resolve_movie(movie_id: str) -> dict | None:
    """Return a catalogue entry by movieId, or None if not found."""
    return next((m for m in _MOCK_CATALOGUE if m["movieId"] == movie_id), None)


def _pick_movie(preferences: dict) -> dict:
    """Return one movie matching user preferences, or a random one."""
    genres = [g.lower() for g in (preferences.get("genres") or [])]
    candidates: list[dict] = []
    for g in genres:
        candidates.extend(_GENRE_INDEX.get(g, []))
    pool = candidates or _MOCK_CATALOGUE
    return random.choice(pool)


def handler(event, context):
    sub = get_sub(event)  # may be None for anonymous requests

    if sub:
        user = get_user(sub)
        if not user:
            return unauthorized()
        prefs = user.get("preferences") or {}
    else:
        prefs = {}

    movie   = _pick_movie(prefs)
    now_iso = datetime.now(timezone.utc).isoformat()

    if sub:
        historico().put_item(Item={
            "sub":        sub,
            "timestamp":  now_iso,
            "movieTitle": movie["title"],
        })
        write_log(sub, now_iso, "RECOMMEND", {"movieId": movie["movieId"]})

    return ok({
        "title":              movie["title"],
        "genre":              movie["genre"],
        "streaming-services": movie["streaming-services"],
    })
