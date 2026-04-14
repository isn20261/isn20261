"""EmailToSub table: maps email addresses to JWT sub identifiers."""

from db.client import get_table

TABLE_ENV = "DB_TABLE_EMAIL_SUB"


def _table():
    return get_table(TABLE_ENV)


def put(email: str, sub: str):
    """Link an email to a sub."""
    _table().put_item(Item={"email": email, "sub": sub})


def get_sub(email: str) -> str | None:
    """Get the sub for an email. Returns None if not found."""
    resp = _table().get_item(Key={"email": email})
    item = resp.get("Item")
    return item["sub"] if item else None


def delete(email: str):
    """Remove an email-to-sub mapping."""
    _table().delete_item(Key={"email": email})
