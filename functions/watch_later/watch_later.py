"""GET + POST /watch-later — requires Bearer JWT auth.

POST receives `movieId` (not `title` as in OpenAPI) — see inconsistencias.md.
watchLater items store {movieId, title, addedAt} so GET can return title
without an extra OMDB lookup — see inconsistencias.md for schema diff.

Environment variables: shared db/auth vars
"""
import json
from datetime import datetime, timezone

from shared.auth import get_sub, get_method
from shared.db import get_user, users, write_log
from shared.response import ok, created, bad_request, unauthorized


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

def _resolve_movie(movie_id: str) -> dict | None:
    """Return a catalogue entry by movieId, or None if not found."""
    return next((m for m in _MOCK_CATALOGUE if m["movieId"] == movie_id), None)

def handler(event, context):
    sub = get_sub(event)
    if not sub:
        return unauthorized()

    method = get_method(event)

    if method == "GET":
        return _get(sub)
    if method == "POST":
        return _post(event, sub)
    return bad_request("Method not allowed")


def _get(sub: str):
    user = get_user(sub)
    if not user:
        return unauthorized()

    items = [
        {
            "title":    entry.get("title", entry.get("movieId")),
            "added-at": entry["addedAt"],
        }
        for entry in (user.get("watchLater") or [])
    ]
    return ok(items)


def _post(event: dict, sub: str):
    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return bad_request("Invalid JSON")

    movie_id = (body.get("movieId") or "").strip()
    if not movie_id or len(movie_id) > 255:
        return bad_request("movieId is required")

    movie = _resolve_movie(movie_id)
    title = movie["title"] if movie else movie_id

    now_iso = datetime.now(timezone.utc).isoformat()
    users().update_item(
        Key={"sub": sub},
        UpdateExpression="SET watchLater = list_append(if_not_exists(watchLater, :empty), :item)",
        ExpressionAttributeValues={
            ":empty": [],
            ":item":  [{"movieId": movie_id, "title": title, "addedAt": now_iso}],
        },
    )
    write_log(sub, now_iso, "WATCH_LATER_ADDED", {"movieId": movie_id, "title": title})
    return created()
