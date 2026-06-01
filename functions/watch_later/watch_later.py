"""GET + POST /watch-later — requires Bearer JWT auth.

POST receives `movieId` (not `title` as in OpenAPI) — see inconsistencias.md.
watchLater items store {movieId, title, addedAt} so GET can return title
without an extra OMDB lookup — see inconsistencias.md for schema diff.

Environment variables: shared db/auth vars
"""
import json
from datetime import datetime, timezone

from shared.movies import resolve_movie
from shared.auth import get_sub, get_method
from shared.db import get_user, movies, users, write_log
from shared.response import ok, created, bad_request, unauthorized, server_error


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
    try:
        user = get_user(sub)
    except Exception:
        return server_error()
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
    user = get_user(sub)
    if not user:
        return unauthorized()

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return bad_request("Invalid JSON")

    movie_id = (body.get("movieId") or "").strip()
    if not movie_id or len(movie_id) > 255:
        return bad_request("movieId is required")

    movie = resolve_movie(movie_id)
    if movie is None:
        db_entry = movies().get_item(Key={"movieId": movie_id}).get("Item")
        movie = db_entry
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
