"""GET /recommend — auth optional (works for anonymous and logged-in users).

Authenticated users:
  - recommendations filtered by their stored preferences
  - result saved to Historico table
Anonymous users:
  - random recommendation from the full catalogue

Environment variables: shared db/auth vars
"""
import os
import random
from datetime import datetime, timezone

from shared.auth import get_sub
from shared.db import get_user, historico, write_log
from shared.movies import get_all_movies
from shared.response import ok, unauthorized, server_error


def _genre_matches(movie_genre: str, wanted: list[str]) -> bool:
    movie_genres = {g.strip() for g in movie_genre.lower().split(",")}
    return bool(movie_genres & set(wanted))


def _pick_movie(preferences: dict) -> dict | None:
    genres = [g.lower() for g in (preferences.get("genres") or [])]
    all_movies = get_all_movies()
    if not all_movies:
        return None

    if genres:
        candidates = [m for m in all_movies if _genre_matches(m.get("genre", ""), genres)]
        pool = candidates or all_movies
    else:
        pool = all_movies
    return random.choice(pool)


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

    try:
        movie = _pick_movie(prefs)
    except Exception:
        return server_error()

    if movie is None:
        return server_error()

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
