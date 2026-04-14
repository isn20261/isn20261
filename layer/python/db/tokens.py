"""Tokens table: stores verification and password-reset tokens with TTL."""

import time

from db.client import get_table

TABLE_ENV = "DB_TABLE_TOKENS"


def _table():
    return get_table(TABLE_ENV)


def create(token: str, sub: str, token_type: str, expires_at: int):
    """
    Create a token.

    Args:
        token: The token string (partition key).
        sub: The user's sub.
        token_type: 'verify-email' or 'reset-password'.
        expires_at: Unix timestamp (epoch seconds) for TTL expiration.
    """
    _table().put_item(
        Item={
            "token": token,
            "sub": sub,
            "type": token_type,
            "expiresAt": expires_at,
        }
    )


def get(token: str) -> dict | None:
    """Get a token. Returns None if not found or expired."""
    resp = _table().get_item(Key={"token": token})
    item = resp.get("Item")
    if not item:
        return None
    # DynamoDB TTL deletion is eventual; check manually too
    if item.get("expiresAt", 0) < int(time.time()):
        return None
    return item


def delete(token: str):
    """Delete a token (e.g. after use)."""
    _table().delete_item(Key={"token": token})
