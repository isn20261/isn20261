import json

from shared.db import historico
from history import handler


def test_history_no_auth(monkeypatch):
    monkeypatch.setattr("history.history.get_sub", lambda event: None)
    resp = handler({}, None)
    assert resp["statusCode"] == 401


def test_history_empty(monkeypatch):
    monkeypatch.setattr("history.history.get_sub", lambda event: "user-1")
    resp = handler({}, None)
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert body == []


def test_history_returns_newest_first(monkeypatch):
    monkeypatch.setattr("history.history.get_sub", lambda event: "user-1")
    historico().put_item(
        Item={
            "sub": "user-1",
            "timestamp": "2025-01-01T10:00:00Z",
            "movieTitle": "Old Movie",
            "genre": "action",
        }
    )
    historico().put_item(
        Item={
            "sub": "user-1",
            "timestamp": "2025-02-01T10:00:00Z",
            "movieTitle": "New Movie",
            "genre": "sci-fi",
        }
    )
    historico().put_item(
        Item={
            "sub": "user-1",
            "timestamp": "2025-01-15T10:00:00Z",
            "movieTitle": "Mid Movie",
            "genre": "crime",
        }
    )

    resp = handler({}, None)
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert len(body) == 3
    assert body[0]["title"] == "New Movie"
    assert body[1]["title"] == "Mid Movie"
    assert body[2]["title"] == "Old Movie"


def test_history_response_shape(monkeypatch):
    monkeypatch.setattr("history.history.get_sub", lambda event: "user-1")
    historico().put_item(
        Item={
            "sub": "user-1",
            "timestamp": "2025-01-01T10:00:00Z",
            "movieTitle": "The Matrix",
            "movieId": "tt0133093",
            "genre": "action",
        }
    )

    resp = handler({}, None)
    body = json.loads(resp["body"])
    item = body[0]
    assert set(item.keys()) == {"title", "genre", "recommended-at"}
    assert item["title"] == "The Matrix"
    assert item["genre"] == "action"
    assert item["recommended-at"] == "2025-01-01T10:00:00Z"


def test_history_backward_compat_no_genre(monkeypatch):
    monkeypatch.setattr("history.history.get_sub", lambda event: "user-1")
    historico().put_item(
        Item={
            "sub": "user-1",
            "timestamp": "2025-01-01T10:00:00Z",
            "movieTitle": "Old Entry",
        }
    )

    resp = handler({}, None)
    body = json.loads(resp["body"])
    item = body[0]
    assert item["title"] == "Old Entry"
    assert item["genre"] is None
    assert item["recommended-at"] == "2025-01-01T10:00:00Z"


def test_history_sub_without_user_record_returns_empty(monkeypatch):
    """History only checks JWT sub, not Users table — valid sub with no User row returns 200 []."""
    monkeypatch.setattr("history.history.get_sub", lambda event: "ghost-sub")
    resp = handler({}, None)
    assert resp["statusCode"] == 200
    assert json.loads(resp["body"]) == []
