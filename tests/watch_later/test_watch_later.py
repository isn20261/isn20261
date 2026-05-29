import json

from boto3.dynamodb.conditions import Key
from shared.db import users, logs
from watch_later import handler


def test_get_no_auth(monkeypatch):
    monkeypatch.setattr("watch_later.watch_later.get_sub", lambda event: None)
    resp = handler({}, None)
    assert resp["statusCode"] == 401


def test_get_user_not_found(monkeypatch):
    monkeypatch.setattr("watch_later.watch_later.get_sub", lambda event: "nonexistent")
    resp = handler({}, None)
    assert resp["statusCode"] == 401


def test_get_returns_items(monkeypatch):
    monkeypatch.setattr("watch_later.watch_later.get_sub", lambda event: "user-1")
    users().put_item(
        Item={
            "sub": "user-1",
            "email": "a@b.com",
            "watchLater": [
                {"movieId": "tt0133093", "title": "The Matrix", "addedAt": "2025-01-01T00:00:00Z"},
                {"movieId": "tt0816692", "title": "Interstellar", "addedAt": "2025-02-01T00:00:00Z"},  # noqa: E501
            ],
        }
    )
    resp = handler({"httpMethod": "GET"}, None)
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert len(body) == 2
    assert body[0] == {"title": "The Matrix", "added-at": "2025-01-01T00:00:00Z"}
    assert body[1] == {"title": "Interstellar", "added-at": "2025-02-01T00:00:00Z"}


def test_get_returns_movieid_fallback(monkeypatch):
    monkeypatch.setattr("watch_later.watch_later.get_sub", lambda event: "user-1")
    users().put_item(
        Item={
            "sub": "user-1",
            "email": "a@b.com",
            "watchLater": [
                {"movieId": "tt1234567", "addedAt": "2025-01-01T00:00:00Z"},
            ],
        }
    )
    resp = handler({"httpMethod": "GET"}, None)
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert body[0]["title"] == "tt1234567"


def test_get_preserves_insertion_order(monkeypatch):
    monkeypatch.setattr("watch_later.watch_later.get_sub", lambda event: "user-1")
    users().put_item(
        Item={
            "sub": "user-1",
            "email": "a@b.com",
            "watchLater": [
                {"movieId": "tt0133093", "title": "The Matrix", "addedAt": "2025-01-01T00:00:00Z"},
                {"movieId": "tt0816692", "title": "Interstellar", "addedAt": "2025-02-01T00:00:00Z"},  # noqa: E501
                {"movieId": "tt1375666", "title": "Inception", "addedAt": "2025-03-01T00:00:00Z"},
            ],
        }
    )
    resp = handler({"httpMethod": "GET"}, None)
    body = json.loads(resp["body"])
    assert [item["title"] for item in body] == ["The Matrix", "Interstellar", "Inception"]


def test_post_valid_movieid_in_catalogue(monkeypatch):
    monkeypatch.setattr("watch_later.watch_later.get_sub", lambda event: "user-1")
    users().put_item(Item={"sub": "user-1", "email": "a@b.com"})

    event = {
        "httpMethod": "POST",
        "body": json.dumps({"movieId": "tt0133093"}),
    }
    resp = handler(event, None)
    assert resp["statusCode"] == 201

    user = users().get_item(Key={"sub": "user-1"})["Item"]
    assert len(user["watchLater"]) == 1
    assert user["watchLater"][0]["movieId"] == "tt0133093"
    assert user["watchLater"][0]["title"] == "The Matrix"


def test_post_valid_movieid_unknown(monkeypatch):
    monkeypatch.setattr("watch_later.watch_later.get_sub", lambda event: "user-1")
    users().put_item(Item={"sub": "user-1", "email": "a@b.com"})

    event = {
        "httpMethod": "POST",
        "body": json.dumps({"movieId": "tt9999999"}),
    }
    resp = handler(event, None)
    assert resp["statusCode"] == 201

    user = users().get_item(Key={"sub": "user-1"})["Item"]
    assert user["watchLater"][0]["title"] == "tt9999999"


def test_post_missing_movieid(monkeypatch):
    monkeypatch.setattr("watch_later.watch_later.get_sub", lambda event: "user-1")
    users().put_item(Item={"sub": "user-1", "email": "a@b.com"})

    event = {"httpMethod": "POST", "body": json.dumps({})}
    resp = handler(event, None)
    assert resp["statusCode"] == 400
    assert json.loads(resp["body"])["error"] == "movieId is required"


def test_post_invalid_json(monkeypatch):
    monkeypatch.setattr("watch_later.watch_later.get_sub", lambda event: "user-1")
    users().put_item(Item={"sub": "user-1", "email": "a@b.com"})

    event = {"httpMethod": "POST", "body": "not-json"}
    resp = handler(event, None)
    assert resp["statusCode"] == 400


def test_unsupported_method(monkeypatch):
    monkeypatch.setattr("watch_later.watch_later.get_sub", lambda event: "user-1")
    users().put_item(Item={"sub": "user-1", "email": "a@b.com"})

    resp = handler({"httpMethod": "DELETE"}, None)
    assert resp["statusCode"] == 400


def test_post_empty_movieid(monkeypatch):
    monkeypatch.setattr("watch_later.watch_later.get_sub", lambda event: "user-1")
    users().put_item(Item={"sub": "user-1", "email": "a@b.com"})

    resp = handler({"httpMethod": "POST", "body": json.dumps({"movieId": ""})}, None)
    assert resp["statusCode"] == 400
    assert json.loads(resp["body"])["error"] == "movieId is required"


def test_post_whitespace_movieid(monkeypatch):
    monkeypatch.setattr("watch_later.watch_later.get_sub", lambda event: "user-1")
    users().put_item(Item={"sub": "user-1", "email": "a@b.com"})

    resp = handler({"httpMethod": "POST", "body": json.dumps({"movieId": "   "})}, None)
    assert resp["statusCode"] == 400
    assert json.loads(resp["body"])["error"] == "movieId is required"


def test_post_movieid_too_long(monkeypatch):
    monkeypatch.setattr("watch_later.watch_later.get_sub", lambda event: "user-1")
    users().put_item(Item={"sub": "user-1", "email": "a@b.com"})

    long_id = "x" * 256
    resp = handler({"httpMethod": "POST", "body": json.dumps({"movieId": long_id})}, None)
    assert resp["statusCode"] == 400
    assert json.loads(resp["body"])["error"] == "movieId is required"


def test_post_writes_audit_log(monkeypatch):
    monkeypatch.setattr("watch_later.watch_later.get_sub", lambda event: "user-1")
    users().put_item(Item={"sub": "user-1", "email": "a@b.com"})

    handler({"httpMethod": "POST", "body": json.dumps({"movieId": "tt0133093"})}, None)

    log_items = logs().query(KeyConditionExpression=Key("sub").eq("user-1"))["Items"]
    log = next(item for item in log_items if item["action"] == "WATCH_LATER_ADDED")
    assert log["metadata"]["movieId"] == "tt0133093"
    assert log["metadata"]["title"] == "The Matrix"


def test_post_duplicate_movieid_appends_duplicate(monkeypatch):
    """list_append has no dedup — two POSTs with the same movieId create two entries."""
    monkeypatch.setattr("watch_later.watch_later.get_sub", lambda event: "user-1")
    users().put_item(Item={"sub": "user-1", "email": "a@b.com"})

    event = {"httpMethod": "POST", "body": json.dumps({"movieId": "tt9999999"})}
    handler(event, None)
    handler(event, None)

    user = users().get_item(Key={"sub": "user-1"})["Item"]
    assert len(user["watchLater"]) == 2
    assert all(e["movieId"] == "tt9999999" for e in user["watchLater"])


def test_get_response_shape(monkeypatch):
    monkeypatch.setattr("watch_later.watch_later.get_sub", lambda event: "user-1")
    users().put_item(
        Item={
            "sub": "user-1",
            "email": "a@b.com",
            "watchLater": [
                {"movieId": "tt0133093", "title": "The Matrix", "addedAt": "2025-01-01T00:00:00Z"},
            ],
        }
    )
    resp = handler({"httpMethod": "GET"}, None)
    body = json.loads(resp["body"])
    assert set(body[0].keys()) == {"title", "added-at"}


def test_post_movie_not_in_mock_catalogue_resolves_title_from_db(monkeypatch):
    """movieId absent from MOCK_CATALOGUE but present in Movies table stores the real title."""
    from shared.db import movies
    movies().put_item(
        Item={"movieId": "tt0111161", "title": "The Shawshank Redemption", "genre": "drama"}
    )
    monkeypatch.setattr("watch_later.watch_later.get_sub", lambda event: "user-1")
    users().put_item(Item={"sub": "user-1", "email": "a@b.com"})

    resp = handler({"httpMethod": "POST", "body": json.dumps({"movieId": "tt0111161"})}, None)
    assert resp["statusCode"] == 201
    user = users().get_item(Key={"sub": "user-1"})["Item"]
    assert user["watchLater"][0]["title"] == "The Shawshank Redemption"


def test_post_user_not_found_returns_401(monkeypatch):
    """POST with a valid JWT for an unregistered sub must return 401, not create a ghost record."""
    monkeypatch.setattr("watch_later.watch_later.get_sub", lambda event: "ghost-sub")
    event = {"httpMethod": "POST", "body": json.dumps({"movieId": "tt0133093"})}
    resp = handler(event, None)
    assert resp["statusCode"] == 401
    assert "Item" not in users().get_item(Key={"sub": "ghost-sub"})


def test_get_returns_500_on_dynamodb_error(monkeypatch):
    from unittest.mock import MagicMock
    from botocore.exceptions import ClientError
    fake_table = MagicMock()
    fake_table.get_item.side_effect = ClientError(
        {"Error": {"Code": "InternalServerError", "Message": "DynamoDB failure"}},
        "GetItem",
    )
    import shared.db as db_module
    monkeypatch.setattr(db_module, "users", lambda: fake_table)
    monkeypatch.setattr("watch_later.watch_later.get_sub", lambda event: "user-1")
    resp = handler({"httpMethod": "GET"}, None)
    assert resp["statusCode"] == 500
