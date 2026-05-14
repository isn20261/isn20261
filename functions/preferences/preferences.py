"""GET + POST /preferences — requires Bearer JWT auth.

DynamoDB stores preferences with camelCase keys; the API uses kebab-case
for `age-rating`. Mapping is applied on read and write.

Environment variables: shared db/auth vars
"""
import json
from botocore.exceptions import ClientError
from datetime import datetime, timezone

from shared.auth import get_sub, get_method
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
    values: dict = {":updatedAt": now_iso}

    update_parts = ["updatedAt = :updatedAt"]

    if genres is not None:
        if not isinstance(genres, list):
            return bad_request("genres must be an array")
        values[":genres"] = genres
        update_parts.append("preferences.genres = :genres")

    if subscriptions is not None:
        if not isinstance(subscriptions, list):
            return bad_request("subscriptions must be an array")
        values[":subscriptions"] = subscriptions
        update_parts.append("preferences.subscriptions = :subscriptions")

    if age_rating is not None:
        values[":ageRating"] = str(age_rating)
        update_parts.append("preferences.ageRating = :ageRating")

    if humor is not None:
        values[":humor"] = str(humor)
        update_parts.append("preferences.humor = :humor")

    update_expr = "SET " + ", ".join(update_parts)

    prefs_map = {}
    if genres is not None:
        prefs_map["genres"] = genres
    if subscriptions is not None:
        prefs_map["subscriptions"] = subscriptions
    if age_rating is not None:
        prefs_map["ageRating"] = str(age_rating)
    if humor is not None:
        prefs_map["humor"] = str(humor)

    # Try conditional update first (only if item exists). If it doesn't exist,
    # try conditional put to create it. If create races, retry the update.
    max_retries = 3
    success = False
    for attempt in range(max_retries):
        try:
            users().update_item(
                Key={"sub": sub},
                UpdateExpression=update_expr,
                ExpressionAttributeValues=values,
                ConditionExpression="attribute_exists(#sub)",
                ExpressionAttributeNames={"#sub": "sub"},
            )
            success = True
            break
        except ClientError as exc:
            err = exc.response.get("Error", {})
            code = err.get("Code")
            # If item does not exist, try to create it atomically
            if code == "ConditionalCheckFailedException":
                try:
                    users().put_item(
                        Item={"sub": sub, "preferences": prefs_map, "updatedAt": now_iso},
                        ConditionExpression="attribute_not_exists(#sub)",
                        ExpressionAttributeNames={"#sub": "sub"},
                    )
                    success = True
                    break
                except ClientError as exc2:
                    err2 = exc2.response.get("Error", {})
                    code2 = err2.get("Code")
                    # Another writer created the item; retry the update
                    if code2 == "ConditionalCheckFailedException":
                        continue
                    raise
            else:
                raise

    if not success:
        raise RuntimeError("Failed to write preferences after retries")

    write_log(sub, now_iso, "PREFERENCES_UPDATED", {
        k: v for k, v in body.items()
        if k in ("genres", "subscriptions", "age-rating", "humor") and v is not None
    })
    return ok()
