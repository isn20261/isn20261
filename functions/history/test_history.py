import json

from moto import mock_aws

from conftest import setup_dynamodb_tables
from shared.db import historico
from history import handler


@mock_aws
def test_history_no_auth(monkeypatch):
    setup_dynamodb_tables()
    monkeypatch.setattr("history.history.get_sub", lambda event: None)
    resp = handler({}, None)
    assert resp["statusCode"] == 401


@mock_aws
def test_history_empty(monkeypatch):
    setup_dynamodb_tables()
    monkeypatch.setattr("history.history.get_sub", lambda event: "user-1")
    resp = handler({}, None)
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert body == []


@mock_aws
def test_history_returns_newest_first(monkeypatch):
    setup_dynamodb_tables()
    monkeypatch.setattr("history.history.get_sub", lambda event: "user-1")
    historico().put_item(
        Item={
            "sub": "user-1",
            "timestamp": "2025-01-01T10:00:00Z",
            "movieTitle": "Old Movie",
        }
    )
    historico().put_item(
        Item={
            "sub": "user-1",
            "timestamp": "2025-02-01T10:00:00Z",
            "movieTitle": "New Movie",
        }
    )
    historico().put_item(
        Item={
            "sub": "user-1",
            "timestamp": "2025-01-15T10:00:00Z",
            "movieTitle": "Mid Movie",
        }
    )

    resp = handler({}, None)
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert len(body) == 3
    assert body[0]["title"] == "New Movie"
    assert body[1]["title"] == "Mid Movie"
    assert body[2]["title"] == "Old Movie"


@mock_aws
def test_history_response_shape(monkeypatch):
    setup_dynamodb_tables()
    monkeypatch.setattr("history.history.get_sub", lambda event: "user-1")
    historico().put_item(
        Item={
            "sub": "user-1",
            "timestamp": "2025-01-01T10:00:00Z",
            "movieTitle": "The Matrix",
        }
    )

    resp = handler({}, None)
    body = json.loads(resp["body"])
    item = body[0]
    assert set(item.keys()) == {"title", "recommended-at"}
    assert item["title"] == "The Matrix"
    assert item["recommended-at"] == "2025-01-01T10:00:00Z"
    assert "genre" not in item
