from shared.db import (
    get_user,
    get_sub_by_email,
    get_token,
    write_log,
    users,
    email_to_sub,
    tokens,
    logs,
)


def test_get_user_found():
    users().put_item(Item={"sub": "user-1", "email": "a@b.com"})
    user = get_user("user-1")
    assert user is not None
    assert user["sub"] == "user-1"
    assert user["email"] == "a@b.com"


def test_get_user_missing():
    assert get_user("nonexistent") is None


def test_get_sub_by_email_found():
    email_to_sub().put_item(Item={"email": "a@b.com", "sub": "user-1"})
    sub = get_sub_by_email("a@b.com")
    assert sub == "user-1"


def test_get_sub_by_email_missing():
    assert get_sub_by_email("unknown@b.com") is None


def test_get_token_found():
    tokens().put_item(Item={"token": "abc123", "sub": "user-1", "type": "verify-email"})
    item = get_token("abc123")
    assert item is not None
    assert item["token"] == "abc123"
    assert item["sub"] == "user-1"


def test_get_token_missing():
    assert get_token("no-such-token") is None


def test_write_log():
    write_log("user-1", "2025-01-01T00:00:00Z", "RECOMMEND", {"movieId": "tt123"})
    result = logs().get_item(Key={"sub": "user-1", "timestamp": "2025-01-01T00:00:00Z"})
    item = result.get("Item")
    assert item is not None
    assert item["sub"] == "user-1"
    assert item["action"] == "RECOMMEND"
    assert item["metadata"] == {"movieId": "tt123"}


def test_users_create_if_absent_returns_false_on_duplicate():
    from shared.db import users_create_if_absent
    users_create_if_absent("user-1", "a@b.com")
    result = users_create_if_absent("user-1", "a@b.com")
    assert result is False


def test_users_create_if_absent_reraises_unexpected_error(monkeypatch):
    import pytest
    from botocore.exceptions import ClientError
    from shared.db import users_create_if_absent
    import shared.db as db_module

    class _FakeTable:
        def put_item(self, *args, **kwargs):
            err = {"Error": {"Code": "ProvisionedThroughputExceededException", "Message": "throttled"}}  # noqa: E501
            raise ClientError(err, "PutItem")

    monkeypatch.setattr(db_module, "users", lambda: _FakeTable())
    with pytest.raises(ClientError):
        users_create_if_absent("user-99", "x@y.com")
