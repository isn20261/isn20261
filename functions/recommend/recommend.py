"""GET /recommend — auth optional (works for anonymous and logged-in users).

Authenticated users:
  - recommendations filtered by their stored preferences (fallback only)
  - result saved to Historico table
Anonymous users:
  - random recommendation

Environment variables:
  OMDB_API_KEY — when set, queries OMDB API instead of fallback catalogue
  DISABLE_AUTH — skips auth checks in dev
"""
import os
import random
from datetime import datetime, timezone

import requests

from shared.auth import get_sub
from shared.db import get_user, historico, write_log
from shared.response import ok, unauthorized

OMDB_API_KEY = os.environ.get("OMDB_API_KEY")

_OMDB_MAX_IMDB_ID = 37_287_335

# ---------------------------------------------------------------------------
# Fallback catalogue — used when OMDB_API_KEY is absent or all retries fail
# ---------------------------------------------------------------------------
_FALLBACK_CATALOGUE = [
    {
        "movieId": "tt0133093",
        "title": "The Matrix",
        "year": 1999,
        "rated": "R",
        "genre": "action",
        "director": "The Wachowskis",
        "runtime": 136,
        "poster": "",
        "imdbRating": 8.7,
        "streaming-services": [],
    },
    {
        "movieId": "tt0816692",
        "title": "Interstellar",
        "year": 2014,
        "rated": "PG-13",
        "genre": "sci-fi",
        "director": "Christopher Nolan",
        "runtime": 169,
        "poster": "",
        "imdbRating": 8.7,
        "streaming-services": [],
    },
    {
        "movieId": "tt1375666",
        "title": "Inception",
        "year": 2010,
        "rated": "PG-13",
        "genre": "sci-fi",
        "director": "Christopher Nolan",
        "runtime": 148,
        "poster": "",
        "imdbRating": 8.8,
        "streaming-services": [],
    },
    {
        "movieId": "tt0468569",
        "title": "The Dark Knight",
        "year": 2008,
        "rated": "PG-13",
        "genre": "action",
        "director": "Christopher Nolan",
        "runtime": 152,
        "poster": "",
        "imdbRating": 9.0,
        "streaming-services": [],
    },
    {
        "movieId": "tt0110912",
        "title": "Pulp Fiction",
        "year": 1994,
        "rated": "R",
        "genre": "crime",
        "director": "Quentin Tarantino",
        "runtime": 154,
        "poster": "",
        "imdbRating": 8.9,
        "streaming-services": [],
    },
    {
        "movieId": "tt0245429",
        "title": "Spirited Away",
        "year": 2001,
        "rated": "PG",
        "genre": "animation",
        "director": "Hayao Miyazaki",
        "runtime": 125,
        "poster": "",
        "imdbRating": 8.6,
        "streaming-services": [],
    },
]

_GENRE_INDEX: dict[str, list[dict]] = {}
for _m in _FALLBACK_CATALOGUE:
    _GENRE_INDEX.setdefault(_m["genre"], []).append(_m)


def _resolve_movie(movie_id: str) -> dict | None:
    return next((m for m in _FALLBACK_CATALOGUE if m["movieId"] == movie_id), None)


# ---------------------------------------------------------------------------
# OMDB API integration
# ---------------------------------------------------------------------------

def _safe_int(value, default=0):
    try:
        return int(str(value).split()[0])
    except (ValueError, AttributeError):
        return default


def _safe_float(value, default=0.0):
    try:
        return float(value)
    except (ValueError, TypeError):
        return default


def _omdb_to_movie(data: dict) -> dict:
    return {
        "movieId": data.get("imdbID", ""),
        "title": data.get("Title", ""),
        "year": _safe_int(data.get("Year")),
        "rated": data.get("Rated", ""),
        "genre": data.get("Genre", ""),
        "director": data.get("Director", ""),
        "runtime": _safe_int(data.get("Runtime")),
        "poster": data.get("Poster", ""),
        "imdbRating": _safe_float(data.get("imdbRating")),
        "streaming-services": [],
    }


def _omdb_random_movie() -> dict | None:
    for _ in range(5):
        imdb_id = f"tt{random.randint(1, _OMDB_MAX_IMDB_ID):07d}"
        try:
            resp = requests.get(
                "https://www.omdbapi.com/",
                params={"apikey": OMDB_API_KEY, "i": imdb_id},
                timeout=5,
            )
            data = resp.json()
            if data.get("Response") == "True":
                return _omdb_to_movie(data)
        except Exception:
            continue
    return None


# ---------------------------------------------------------------------------
# Recommendation engine
# ---------------------------------------------------------------------------

def _pick_movie(preferences: dict) -> dict:
    if OMDB_API_KEY:
        movie = _omdb_random_movie()
        if movie:
            return movie

    genres = [g.lower() for g in (preferences.get("genres") or [])]
    candidates: list[dict] = []
    for g in genres:
        candidates.extend(_GENRE_INDEX.get(g, []))
    pool = candidates or _FALLBACK_CATALOGUE
    return random.choice(pool)


def _public_movie(movie: dict) -> dict:
    return {
        "title": movie["title"],
        "year": movie["year"],
        "rated": movie["rated"],
        "genre": movie["genre"],
        "director": movie["director"],
        "runtime": movie["runtime"],
        "poster": movie["poster"],
        "imdbRating": movie["imdbRating"],
        "streaming-services": movie["streaming-services"],
    }


# ---------------------------------------------------------------------------
# Lambda handler
# ---------------------------------------------------------------------------

def handler(event, context):
    sub = get_sub(event)

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

    movie = _pick_movie(prefs)
    now_iso = datetime.now(timezone.utc).isoformat()

    if sub:
        historico().put_item(Item={
            "sub": sub,
            "timestamp": now_iso,
            "movieTitle": movie["title"],
        })
        write_log(sub, now_iso, "RECOMMEND", {"movieId": movie["movieId"]})

    return ok(_public_movie(movie))
