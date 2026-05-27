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
from shared.db import get_user, historico, movies, write_log
from shared.response import ok, unauthorized

OMDB_API_KEY = os.environ.get("OMDB_API_KEY")


def _scan_all_movies() -> list:
    table = movies()
    resp = table.scan()
    items = list(resp.get("Items", []))
    while "LastEvaluatedKey" in resp:
        resp = table.scan(ExclusiveStartKey=resp["LastEvaluatedKey"])
        items.extend(resp.get("Items", []))
    return items


def _pick_movie(preferences: dict) -> dict:
    """Return one movie matching user preferences, or a random one."""
    genres = [g.lower() for g in (preferences.get("genres") or [])]
    all_movies = _scan_all_movies()
    if not all_movies:
        raise RuntimeError("Movies table is empty")

    if genres:
        candidates = [m for m in all_movies if m.get("genre", "").lower() in genres]
        pool = candidates or all_movies
    else:
        pool = all_movies
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
            "movieId":    movie["movieId"],
            "genre":      movie["genre"],
        })
        write_log(sub, now_iso, "RECOMMEND", {"movieId": movie["movieId"]})

    return ok({
        "title":              movie["title"],
        "year":               movie.get("year"),
        "rated":              movie.get("rated"),
        "genre":              movie["genre"],
        "director":           movie.get("director"),
        "runtime":            movie.get("runtime"),
        "poster":             movie.get("poster"),
        "imdbRating":         movie.get("imdbRating"),
        "streaming-services": movie.get("streamingServices"),
    })
