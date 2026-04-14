"""Logs table: records all user actions on the platform."""

import json
from datetime import datetime, timezone

from boto3.dynamodb.conditions import Key

from db.client import get_table

TABLE_ENV = "DB_TABLE_LOGS"


def _table():
    return get_table(TABLE_ENV)


def _now():
    return datetime.now(timezone.utc).isoformat()


def add(sub: str, action: str, metadata: dict | None = None, timestamp: str | None = None):
    """
    Log a user action.

    Args:
        sub: The user identifier.
        action: Action name (e.g. 'login', 'recommend', 'update-preferences').
        metadata: Optional dict of extra data about the action.
        timestamp: Optional ISO timestamp; defaults to now.
    """
    item = {
        "sub": sub,
        "timestamp": timestamp or _now(),
        "action": action,
    }
    if metadata:
        item["metadata"] = json.loads(json.dumps(metadata, default=str))
    _table().put_item(Item=item)


def get_all(sub: str, limit: int | None = None) -> list[dict]:
    """Get logs for a user, newest first."""
    kwargs = {
        "KeyConditionExpression": Key("sub").eq(sub),
        "ScanIndexForward": False,
    }
    if limit:
        kwargs["Limit"] = limit
    resp = _table().query(**kwargs)
    return resp.get("Items", [])


def get_by_action(sub: str, action: str) -> list[dict]:
    """Get logs for a user filtered by action type."""
    resp = _table().query(
        KeyConditionExpression=Key("sub").eq(sub),
        FilterExpression="action = :a",
        ExpressionAttributeValues={":a": action},
        ScanIndexForward=False,
    )
    return resp.get("Items", [])
