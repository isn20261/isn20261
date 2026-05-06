import json

from moto import mock_aws

from conftest import setup_dynamodb_tables
from shared.db import users
from watch_later import handler


@mock_aws
def test_get_no_auth(monkeypatch):
    setup_dynamodb_tables()
    monkeypatch.setattr("watch_later.watch_later.get_sub", lambda event: None)
    resp = handler({}, None)
    assert resp["statusCode"] == 401


@mock_aws
def test_get_user_not_found(monkeypatch):
    setup_dynamodb_tables()
    monkeypatch.setattr("watch_later.watch_later.get_sub", lambda event: "nonexistent")
    resp = handler({}, None)
    assert resp["statusCode"] == 401


@mock_aws
def test_get_returns_items(monkeypatch):
    setup_dynamodb_tables()
    monkeypatch.setattr("watch_later.watch_later.get_sub", lambda event: "user-1")
    users().put_item(
        Item={
            "sub": "user-1",
            "email": "a@b.com",
            "watchLater": [
                {"movieId": "tt0133093", "title": "The Matrix", "addedAt": "2025-01-01T00:00:00Z"},
                {"movieId": "tt0816692", "title": "Interstellar", "addedAt": "2025-02-01T00:00:00Z"},
            ],
        }
    )
    resp = handler({"httpMethod": "GET"}, None)
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert len(body) == 2
    assert body[0] == {"title": "The Matrix", "added-at": "2025-01-01T00:00:00Z"}
    assert body[1] == {"title": "Interstellar", "added-at": "2025-02-01T00:00:00Z"}


@mock_aws
def test_get_returns_movieid_fallback(monkeypatch):
    setup_dynamodb_tables()
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


@mock_aws
def test_post_valid_movieid_in_catalogue(monkeypatch):
    setup_dynamodb_tables()
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


@mock_aws
def test_post_valid_movieid_unknown(monkeypatch):
    setup_dynamodb_tables()
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


@mock_aws
def test_post_missing_movieid(monkeypatch):
    setup_dynamodb_tables()
    monkeypatch.setattr("watch_later.watch_later.get_sub", lambda event: "user-1")
    users().put_item(Item={"sub": "user-1", "email": "a@b.com"})

    event = {"httpMethod": "POST", "body": json.dumps({})}
    resp = handler(event, None)
    assert resp["statusCode"] == 400


@mock_aws
def test_post_invalid_json(monkeypatch):
    setup_dynamodb_tables()
    monkeypatch.setattr("watch_later.watch_later.get_sub", lambda event: "user-1")
    users().put_item(Item={"sub": "user-1", "email": "a@b.com"})

    event = {"httpMethod": "POST", "body": "not-json"}
    resp = handler(event, None)
    assert resp["statusCode"] == 400
