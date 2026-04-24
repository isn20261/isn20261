"""GET + POST /watch-later — requires Bearer JWT auth.

POST receives `movieId` (not `title` as in OpenAPI) — see inconsistencias.md.
watchLater items store {movieId, title, addedAt} so GET can return title
without an extra OMDB lookup — see inconsistencias.md for schema diff.

Environment variables: shared db/auth vars
"""
import json
from datetime import datetime, timezone

from shared.auth import get_sub
from shared.db import get_user, users, write_log
from shared.response import ok, created, bad_request, unauthorized
from recommend import _resolve_movie   # reuse mock/OMDB lookup


def handler(event, context):
    sub = get_sub(event)
    if not sub:
        return unauthorized()

    method = (event.get("httpMethod") or "GET").upper()

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
