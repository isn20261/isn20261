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
from shared.movies import GENRE_INDEX, MOCK_CATALOGUE
from shared.response import ok, unauthorized

OMDB_API_KEY = os.environ.get("OMDB_API_KEY")


def _pick_movie(preferences: dict) -> dict:
    """Return one movie matching user preferences, or a random one."""
    genres = [g.lower() for g in (preferences.get("genres") or [])]
    candidates: list[dict] = []
    for g in genres:
        candidates.extend(GENRE_INDEX.get(g, []))
    pool = candidates or MOCK_CATALOGUE
    return random.choice(pool)


def handler(event, context):
    sub = get_sub(event)  # may be None for anonymous requests

    if sub:
        user = get_user(sub)
        if not user:
            if os.environ.get("DISABLE_AUTH", "").lower() in {"1", "true", "yes"}:
                prefs = {}
            else:
                return unauthorized()
        else:
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
