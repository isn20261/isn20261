from moto import mock_aws

from conftest import setup_dynamodb_tables
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


@mock_aws
def test_get_user_found():
    setup_dynamodb_tables()
    users().put_item(Item={"sub": "user-1", "email": "a@b.com"})
    user = get_user("user-1")
    assert user is not None
    assert user["sub"] == "user-1"
    assert user["email"] == "a@b.com"


@mock_aws
def test_get_user_missing():
    setup_dynamodb_tables()
    assert get_user("nonexistent") is None


@mock_aws
def test_get_sub_by_email_found():
    setup_dynamodb_tables()
    email_to_sub().put_item(Item={"email": "a@b.com", "sub": "user-1"})
    sub = get_sub_by_email("a@b.com")
    assert sub == "user-1"


@mock_aws
def test_get_sub_by_email_missing():
    setup_dynamodb_tables()
    assert get_sub_by_email("unknown@b.com") is None


@mock_aws
def test_get_token_found():
    setup_dynamodb_tables()
    tokens().put_item(Item={"token": "abc123", "sub": "user-1", "type": "verify-email"})
    item = get_token("abc123")
    assert item is not None
    assert item["token"] == "abc123"
    assert item["sub"] == "user-1"


@mock_aws
def test_get_token_missing():
    setup_dynamodb_tables()
    assert get_token("no-such-token") is None


@mock_aws
def test_write_log():
    setup_dynamodb_tables()
    write_log("user-1", "2025-01-01T00:00:00Z", "RECOMMEND", {"movieId": "tt123"})
    result = logs().get_item(Key={"sub": "user-1", "timestamp": "2025-01-01T00:00:00Z"})
    item = result.get("Item")
    assert item is not None
    assert item["sub"] == "user-1"
    assert item["action"] == "RECOMMEND"
    assert item["metadata"] == {"movieId": "tt123"}
