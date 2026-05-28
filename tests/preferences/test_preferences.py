import json

from boto3.dynamodb.conditions import Key
from shared.db import users, logs
from preferences import handler


def test_get_no_auth(monkeypatch):
    monkeypatch.setattr("preferences.preferences.get_sub", lambda event: None)
    resp = handler({}, None)
    assert resp["statusCode"] == 401


def test_get_user_not_found(monkeypatch):
    monkeypatch.setattr("preferences.preferences.get_sub", lambda event: "nonexistent")
    resp = handler({}, None)
    assert resp["statusCode"] == 401


def test_get_returns_prefs(monkeypatch):
    monkeypatch.setattr("preferences.preferences.get_sub", lambda event: "user-1")
    users().put_item(
        Item={
            "sub": "user-1",
            "email": "a@b.com",
            "preferences": {
                "genres": ["action", "comedy"],
                "subscriptions": ["Netflix"],
                "ageRating": "PG-13",
                "humor": "dark",
            },
        }
    )
    resp = handler({}, None)
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert body["genres"] == ["action", "comedy"]
    assert body["subscriptions"] == ["Netflix"]
    assert body["age-rating"] == "PG-13"
    assert body["humor"] == "dark"


def test_get_returns_empty_prefs_for_new_user(monkeypatch):
    monkeypatch.setattr("preferences.preferences.get_sub", lambda event: "user-2")
    users().put_item(Item={"sub": "user-2", "email": "b@c.com"})
    resp = handler({}, None)
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert body["genres"] == []
    assert body["subscriptions"] == []
    assert body["age-rating"] is None
    assert body["humor"] is None


def test_post_single_field(monkeypatch):
    monkeypatch.setattr("preferences.preferences.get_sub", lambda event: "user-1")
    users().put_item(Item={"sub": "user-1", "email": "a@b.com", "preferences": {}})

    event = {
        "httpMethod": "POST",
        "body": json.dumps({"genres": ["sci-fi", "action"]}),
    }
    resp = handler(event, None)
    assert resp["statusCode"] == 200

    user = users().get_item(Key={"sub": "user-1"})["Item"]
    assert user["preferences"]["genres"] == ["sci-fi", "action"]


def test_post_all_fields(monkeypatch):
    monkeypatch.setattr("preferences.preferences.get_sub", lambda event: "user-2")
    users().put_item(Item={"sub": "user-2", "email": "c@d.com", "preferences": {}})

    event = {
        "httpMethod": "POST",
        "body": json.dumps(
            {
                "genres": ["comedy"],
                "subscriptions": ["Netflix"],
                "age-rating": "R",
                "humor": "light",
            }
        ),
    }
    resp = handler(event, None)
    assert resp["statusCode"] == 200

    user = users().get_item(Key={"sub": "user-2"})["Item"]
    assert user["preferences"]["genres"] == ["comedy"]
    assert user["preferences"]["subscriptions"] == ["Netflix"]
    assert user["preferences"]["ageRating"] == "R"
    assert user["preferences"]["humor"] == "light"

    log_items = logs().query(KeyConditionExpression=Key("sub").eq("user-2"))["Items"]
    assert any(item["action"] == "PREFERENCES_UPDATED" for item in log_items)


def test_post_no_fields(monkeypatch):
    monkeypatch.setattr("preferences.preferences.get_sub", lambda event: "user-1")
    users().put_item(Item={"sub": "user-1", "email": "a@b.com", "preferences": {}})

    event = {"httpMethod": "POST", "body": json.dumps({})}
    resp = handler(event, None)
    assert resp["statusCode"] == 400


def test_post_genres_not_array(monkeypatch):
    monkeypatch.setattr("preferences.preferences.get_sub", lambda event: "user-1")
    users().put_item(Item={"sub": "user-1", "email": "a@b.com", "preferences": {}})

    event = {
        "httpMethod": "POST",
        "body": json.dumps({"genres": "not-a-list"}),
    }
    resp = handler(event, None)
    assert resp["statusCode"] == 400


def test_post_invalid_json(monkeypatch):
    monkeypatch.setattr("preferences.preferences.get_sub", lambda event: "user-1")
    users().put_item(Item={"sub": "user-1", "email": "a@b.com", "preferences": {}})

    event = {"httpMethod": "POST", "body": "not-json"}
    resp = handler(event, None)
    assert resp["statusCode"] == 400


def test_post_creates_user_if_absent(monkeypatch):
    monkeypatch.setattr("preferences.preferences.get_sub", lambda event: "new-user")

    event = {
        "httpMethod": "POST",
        "body": json.dumps({"genres": ["sci-fi"], "age-rating": "16"}),
    }
    resp = handler(event, None)
    assert resp["statusCode"] == 200

    user = users().get_item(Key={"sub": "new-user"})["Item"]
    assert user["preferences"]["genres"] == ["sci-fi"]
    assert user["preferences"]["ageRating"] == "16"


def test_unsupported_method(monkeypatch):
    monkeypatch.setattr("preferences.preferences.get_sub", lambda event: "user-1")
    users().put_item(Item={"sub": "user-1", "email": "a@b.com", "preferences": {}})

    event = {"httpMethod": "DELETE", "body": None}
    resp = handler(event, None)
    assert resp["statusCode"] == 400
    assert json.loads(resp["body"])["error"] == "Method not allowed"


def test_post_subscriptions_not_array(monkeypatch):
    monkeypatch.setattr("preferences.preferences.get_sub", lambda event: "user-1")
    users().put_item(Item={"sub": "user-1", "email": "a@b.com", "preferences": {}})

    event = {
        "httpMethod": "POST",
        "body": json.dumps({"subscriptions": "Netflix"}),
    }
    resp = handler(event, None)
    assert resp["statusCode"] == 400


def test_post_age_rating_integer_coerced_to_string(monkeypatch):
    monkeypatch.setattr("preferences.preferences.get_sub", lambda event: "user-1")
    users().put_item(Item={"sub": "user-1", "email": "a@b.com", "preferences": {}})

    event = {
        "httpMethod": "POST",
        "body": json.dumps({"age-rating": 18}),
    }
    resp = handler(event, None)
    assert resp["statusCode"] == 200

    user = users().get_item(Key={"sub": "user-1"})["Item"]
    assert user["preferences"]["ageRating"] == "18"
    assert isinstance(user["preferences"]["ageRating"], str)


def test_post_retry_race_put_conditional_then_update_succeeds(monkeypatch):
    """update_item: ConditionalCheckFailed → put_item: ConditionalCheckFailed (another writer
    created the row) → second update_item succeeds. Covers the `continue` branch."""
    from botocore.exceptions import ClientError

    class _Table:
        def __init__(self):
            self._update_calls = 0

        def update_item(self, *args, **kwargs):
            self._update_calls += 1
            if self._update_calls == 1:
                raise ClientError(
                    {"Error": {"Code": "ConditionalCheckFailedException", "Message": ""}},
                    "UpdateItem",
                )

        def put_item(self, *args, **kwargs):
            raise ClientError(
                {"Error": {"Code": "ConditionalCheckFailedException", "Message": ""}},
                "PutItem",
            )

    fake = _Table()
    monkeypatch.setattr("preferences.preferences.users", lambda: fake)
    monkeypatch.setattr("preferences.preferences.get_sub", lambda e: "user-1")

    resp = handler({"httpMethod": "POST", "body": json.dumps({"genres": ["action"]})}, None)
    assert resp["statusCode"] == 200
    assert fake._update_calls == 2


def test_post_put_item_unexpected_error_reraises(monkeypatch):
    """update_item: ConditionalCheckFailed → put_item raises a non-conditional error → re-raise."""
    import pytest
    from botocore.exceptions import ClientError

    class _Table:
        def update_item(self, *args, **kwargs):
            raise ClientError(
                {"Error": {"Code": "ConditionalCheckFailedException", "Message": ""}},
                "UpdateItem",
            )

        def put_item(self, *args, **kwargs):
            err = {"Error": {"Code": "ProvisionedThroughputExceededException", "Message": "throttled"}}  # noqa: E501
            raise ClientError(err, "PutItem")

    monkeypatch.setattr("preferences.preferences.users", lambda: _Table())
    monkeypatch.setattr("preferences.preferences.get_sub", lambda e: "user-1")

    with pytest.raises(ClientError) as exc_info:
        handler({"httpMethod": "POST", "body": json.dumps({"genres": ["action"]})}, None)
    assert exc_info.value.response["Error"]["Code"] == "ProvisionedThroughputExceededException"


def test_post_update_item_unexpected_error_reraises(monkeypatch):
    """update_item raises a non-conditional error → re-raise immediately (no put_item attempt)."""
    import pytest
    from botocore.exceptions import ClientError

    class _Table:
        def update_item(self, *args, **kwargs):
            err = {"Error": {"Code": "ProvisionedThroughputExceededException", "Message": "throttled"}}  # noqa: E501
            raise ClientError(err, "UpdateItem")

    monkeypatch.setattr("preferences.preferences.users", lambda: _Table())
    monkeypatch.setattr("preferences.preferences.get_sub", lambda e: "user-1")

    with pytest.raises(ClientError):
        handler({"httpMethod": "POST", "body": json.dumps({"genres": ["action"]})}, None)


def test_post_exhausts_retries_returns_500(monkeypatch):
    """Every attempt: update_item ConditionalCheckFailed + put_item ConditionalCheckFailed.
    After MAX_PREFERENCE_UPDATE_RETRIES loops, handler returns 500 — not a Lambda crash."""
    import json as _json
    from botocore.exceptions import ClientError

    class _Table:
        def update_item(self, *args, **kwargs):
            raise ClientError(
                {"Error": {"Code": "ConditionalCheckFailedException", "Message": ""}},
                "UpdateItem",
            )

        def put_item(self, *args, **kwargs):
            raise ClientError(
                {"Error": {"Code": "ConditionalCheckFailedException", "Message": ""}},
                "PutItem",
            )

    monkeypatch.setattr("preferences.preferences.users", lambda: _Table())
    monkeypatch.setattr("preferences.preferences.get_sub", lambda e: "user-1")

    resp = handler({"httpMethod": "POST", "body": _json.dumps({"genres": ["action"]})}, None)
    assert resp["statusCode"] == 500
    assert "error" in _json.loads(resp["body"])


def test_post_null_field_treated_as_absent(monkeypatch):
    """Explicit null is treated the same as omitting the field — existing value unchanged."""
    monkeypatch.setattr("preferences.preferences.get_sub", lambda event: "user-1")
    users().put_item(
        Item={
            "sub": "user-1",
            "email": "a@b.com",
            "preferences": {"ageRating": "PG-13"},
        }
    )

    event = {
        "httpMethod": "POST",
        "body": json.dumps({"genres": ["action"], "age-rating": None}),
    }
    resp = handler(event, None)
    assert resp["statusCode"] == 200

    user = users().get_item(Key={"sub": "user-1"})["Item"]
    assert user["preferences"]["ageRating"] == "PG-13"
    assert user["preferences"]["genres"] == ["action"]
