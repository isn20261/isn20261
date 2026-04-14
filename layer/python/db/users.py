"""Users table: stores user profiles and preferences."""

from datetime import datetime, timezone

from db.client import get_table

TABLE_ENV = "DB_TABLE_USERS"


def _table():
    return get_table(TABLE_ENV)


def _now():
    return datetime.now(timezone.utc).isoformat()


def create(sub: str, email: str, password_hash: str):
    """Create a new user."""
    now = _now()
    _table().put_item(
        Item={
            "sub": sub,
            "email": email,
            "passwordHash": password_hash,
            "emailVerified": False,
            "preferences": {},
            "watchLater": [],
            "createdAt": now,
            "updatedAt": now,
        },
        ConditionExpression="attribute_not_exists(#s)",
        ExpressionAttributeNames={"#s": "sub"},
    )


def get(sub: str) -> dict | None:
    """Get a user by sub. Returns None if not found."""
    resp = _table().get_item(Key={"sub": sub})
    return resp.get("Item")


def update(sub: str, **fields):
    """Update arbitrary fields on a user. Pass field=value pairs."""
    if not fields:
        return
    fields["updatedAt"] = _now()

    expr_parts = []
    names = {}
    values = {}
    for i, (key, val) in enumerate(fields.items()):
        alias = f"#k{i}"
        placeholder = f":v{i}"
        expr_parts.append(f"{alias} = {placeholder}")
        names[alias] = key
        values[placeholder] = val

    _table().update_item(
        Key={"sub": sub},
        UpdateExpression="SET " + ", ".join(expr_parts),
        ExpressionAttributeNames=names,
        ExpressionAttributeValues=values,
    )


def delete(sub: str):
    """Delete a user."""
    _table().delete_item(Key={"sub": sub})


def update_preferences(sub: str, preferences: dict):
    """Replace the user's preferences map."""
    update(sub, preferences=preferences)


def add_to_watch_later(sub: str, movie: str):
    """Append a movie to the user's watch-later list."""
    _table().update_item(
        Key={"sub": sub},
        UpdateExpression="SET #wl = list_append(if_not_exists(#wl, :empty), :movie), #u = :now",
        ExpressionAttributeNames={"#wl": "watchLater", "#u": "updatedAt"},
        ExpressionAttributeValues={
            ":movie": [movie],
            ":empty": [],
            ":now": _now(),
        },
    )


def remove_from_watch_later(sub: str, movie: str):
    """Remove a movie from the watch-later list (by value)."""
    user = get(sub)
    if not user:
        return
    watch_later = user.get("watchLater", [])
    if movie in watch_later:
        watch_later.remove(movie)
        update(sub, watchLater=watch_later)
