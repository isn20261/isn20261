"""GET + POST /preferences — requires Bearer JWT auth.

DynamoDB stores preferences with camelCase keys; the API uses kebab-case
for `age-rating`. Mapping is applied on read and write.

Environment variables: shared db/auth vars
"""
import json
from datetime import datetime, timezone

from shared.auth import get_sub
from shared.db import get_user, users, write_log
from shared.response import ok, bad_request, unauthorized


def _db_to_api(prefs: dict) -> dict:
    return {
        "genres":        prefs.get("genres") or [],
        "subscriptions": prefs.get("subscriptions") or [],
        "age-rating":    prefs.get("ageRating"),
        "humor":         prefs.get("humor"),
    }


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
    return ok(_db_to_api(user.get("preferences") or {}))


def _post(event: dict, sub: str):
    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return bad_request("Invalid JSON")

    genres        = body.get("genres")
    subscriptions = body.get("subscriptions")
    age_rating    = body.get("age-rating")
    humor         = body.get("humor")

    if all(v is None for v in [genres, subscriptions, age_rating, humor]):
        return bad_request("At least one preference field is required")

    now_iso = datetime.now(timezone.utc).isoformat()
    updates: list[str] = ["updatedAt = :updatedAt"]
    values: dict       = {":updatedAt": now_iso}

    if genres is not None:
        if not isinstance(genres, list):
            return bad_request("genres must be an array")
        updates.append("preferences.genres = :genres")
        values[":genres"] = genres

    if subscriptions is not None:
        if not isinstance(subscriptions, list):
            return bad_request("subscriptions must be an array")
        updates.append("preferences.subscriptions = :subs")
        values[":subs"] = subscriptions

    if age_rating is not None:
        updates.append("preferences.ageRating = :ar")
        values[":ar"] = str(age_rating)

    if humor is not None:
        updates.append("preferences.humor = :humor")
        values[":humor"] = str(humor)

    users().update_item(
        Key={"sub": sub},
        UpdateExpression="SET " + ", ".join(updates),
        ExpressionAttributeValues=values,
    )
    write_log(sub, now_iso, "PREFERENCES_UPDATED", {
        k: v for k, v in body.items()
        if k in ("genres", "subscriptions", "age-rating", "humor") and v is not None
    })
    return ok()
