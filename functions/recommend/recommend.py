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


SIMILAR_LIMIT = 12


def _genre_set(movie_genre: str) -> set[str]:
    return {g.strip() for g in (movie_genre or "").lower().split(",") if g.strip()}


def _genre_matches(movie_genre: str, wanted: list[str]) -> bool:
    return bool(_genre_set(movie_genre) & set(wanted))


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


def _similar_card(movie: dict) -> dict:
    """Lightweight shape for the 'similar films' rail (no synopsis/cast)."""
    return {
        "movieId":    movie["movieId"],
        "title":      movie["title"],
        "year":       movie.get("year"),
        "genre":      movie["genre"],
        "poster":     movie.get("poster"),
        "imdbRating": movie.get("imdbRating"),
    }


def _pick_similar(target: dict) -> list[dict]:
    """Up to SIMILAR_LIMIT movies similar to `target`, as lightweight cards.

    Primary rule (strict): a similar movie's genre set must be a SUPERSET of the
    target's — it contains ALL of the target's genres, and may have more
    (e.g. target {crime, drama} -> only movies tagged with at least crime AND
    drama). Falls back to "shares at least one genre" only when the strict rule
    yields nothing (≈62/1000 movies have no strict superset peer). The target
    itself is always excluded. Result is a random sample (up to the limit).
    """
    target_genres = _genre_set(target.get("genre", ""))
    target_id = target.get("movieId")
    if not target_genres:
        return []

    pool = [
        m for m in get_all_movies()
        if m.get("movieId") != target_id
    ]

    strict = [m for m in pool if target_genres.issubset(_genre_set(m.get("genre", "")))]
    chosen = strict
    if not chosen:
        # Fallback: anything sharing at least one genre with the target.
        chosen = [m for m in pool if target_genres & _genre_set(m.get("genre", ""))]

    if len(chosen) > SIMILAR_LIMIT:
        chosen = random.sample(chosen, SIMILAR_LIMIT)
    else:
        # Shuffle so a short list isn't always in catalogue order.
        chosen = random.sample(chosen, len(chosen))

    return [_similar_card(m) for m in chosen]


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
        "synopsis":           movie.get("synopsis"),
        "cast":               movie.get("cast"),
        "similar":            _pick_similar(movie),
        "streaming-services": movie.get("streamingServices"),
    })
