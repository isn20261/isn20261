"""History table: stores movie recommendation history per user."""

from datetime import datetime, timezone

from boto3.dynamodb.conditions import Key

from db.client import get_table

TABLE_ENV = "DB_TABLE_HISTORY"


def _table():
    return get_table(TABLE_ENV)


def _now():
    return datetime.now(timezone.utc).isoformat()


def add(sub: str, movie_title: str, timestamp: str | None = None):
    """Record a movie recommendation for a user."""
    _table().put_item(
        Item={
            "sub": sub,
            "timestamp": timestamp or _now(),
            "movieTitle": movie_title,
        }
    )


def get_all(sub: str, limit: int | None = None) -> list[dict]:
    """Get recommendation history for a user, newest first."""
    kwargs = {
        "KeyConditionExpression": Key("sub").eq(sub),
        "ScanIndexForward": False,
    }
    if limit:
        kwargs["Limit"] = limit
    resp = _table().query(**kwargs)
    return resp.get("Items", [])


def get_range(sub: str, start: str, end: str) -> list[dict]:
    """Get history between two ISO timestamps (inclusive)."""
    resp = _table().query(
        KeyConditionExpression=Key("sub").eq(sub) & Key("timestamp").between(start, end),
        ScanIndexForward=False,
    )
    return resp.get("Items", [])
