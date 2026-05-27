import json

from boto3.dynamodb.conditions import Key
from conftest import seed_movies
from shared.db import users, historico, logs
from recommend import handler


def test_recommend_anonymous(monkeypatch):
    seed_movies()
    monkeypatch.setattr("recommend.recommend.get_sub", lambda event: None)
    resp = handler({}, None)
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert "title" in body
    assert "genre" in body
    assert "streaming-services" in body


def test_recommend_authenticated_with_genre_prefs(monkeypatch):
    seed_movies()
    monkeypatch.setattr("recommend.recommend.get_sub", lambda event: "user-1")
    users().put_item(
        Item={
            "sub": "user-1",
            "email": "a@b.com",
            "preferences": {"genres": ["sci-fi"]},
        }
    )
    resp = handler({}, None)
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert body["genre"] == "sci-fi"


def test_recommend_authenticated_no_prefs(monkeypatch):
    seed_movies()
    monkeypatch.setattr("recommend.recommend.get_sub", lambda event: "user-2")
    users().put_item(Item={"sub": "user-2", "email": "c@d.com"})
    resp = handler({}, None)
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert "title" in body


def test_recommend_authenticated_user_not_found(monkeypatch):
    seed_movies()
    monkeypatch.setattr("recommend.recommend.get_sub", lambda event: "nonexistent")
    resp = handler({}, None)
    assert resp["statusCode"] == 401


def test_recommend_disable_auth_allows_user_not_found_and_saves_history(monkeypatch):
    seed_movies()
    monkeypatch.setenv("DISABLE_AUTH", "1")
    monkeypatch.setattr("recommend.recommend.get_sub", lambda event: "nonexistent")
    resp = handler({}, None)
    assert resp["statusCode"] == 200

    items = historico().query(KeyConditionExpression=Key("sub").eq("nonexistent"))["Items"]
    assert len(items) == 1


def test_recommend_saves_to_historico(monkeypatch):
    seed_movies()
    monkeypatch.setattr("recommend.recommend.get_sub", lambda event: "user-3")
    users().put_item(
        Item={
            "sub": "user-3",
            "email": "e@f.com",
            "preferences": {"genres": ["action"]},
        }
    )
    resp = handler({}, None)
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])

    items = historico().query(KeyConditionExpression=Key("sub").eq("user-3"))["Items"]
    assert len(items) == 1
    assert items[0]["movieTitle"] == body["title"]
    assert items[0]["movieId"] == "tt0133093" or items[0]["movieId"] == "tt0468569"
    assert items[0]["genre"] == body["genre"]
    assert "timestamp" in items[0]


def test_recommend_writes_audit_log(monkeypatch):
    seed_movies()
    monkeypatch.setattr("recommend.recommend.get_sub", lambda event: "user-4")
    users().put_item(
        Item={
            "sub": "user-4",
            "email": "g@h.com",
            "preferences": {"genres": ["crime"]},
        }
    )
    handler({}, None)

    log_items = logs().query(KeyConditionExpression=Key("sub").eq("user-4"))["Items"]
    log = next(item for item in log_items if item["action"] == "RECOMMEND")
    assert log["metadata"]["movieId"].startswith("tt")


def test_recommend_response_includes_all_fields(monkeypatch):
    seed_movies()
    monkeypatch.setattr("recommend.recommend.get_sub", lambda event: "user-5")
    users().put_item(
        Item={
            "sub": "user-5",
            "email": "i@j.com",
            "preferences": {"genres": ["action"]},
        }
    )
    resp = handler({}, None)
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert "title" in body
    assert "year" in body
    assert "rated" in body
    assert "genre" in body
    assert "director" in body
    assert "runtime" in body
    assert "poster" in body
    assert isinstance(body["imdbRating"], (int, float))
    assert "streaming-services" in body


def test_recommend_raises_when_movies_table_empty(monkeypatch):
    import pytest
    monkeypatch.setattr("recommend.recommend.get_sub", lambda event: None)
    with pytest.raises(RuntimeError, match="Movies table is empty"):
        handler({}, None)


def test_recommend_genre_with_no_match_falls_back_to_all(monkeypatch):
    """When user genres don't match any movie, falls back to the full catalogue."""
    seed_movies()
    monkeypatch.setattr("recommend.recommend.get_sub", lambda event: "user-1")
    users().put_item(
        Item={
            "sub": "user-1",
            "email": "a@b.com",
            "preferences": {"genres": ["western"]},
        }
    )
    resp = handler({}, None)
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert "title" in body
    assert "genre" in body


def test_recommend_reads_all_scan_pages(monkeypatch):
    """When DynamoDB scan returns a paginated result, all pages are consumed."""
    from unittest.mock import MagicMock
    import recommend.recommend as rec_module

    page1 = {
        "Items": [{"movieId": "tt0000001", "title": "Page One", "genre": "drama"}],
        "LastEvaluatedKey": {"movieId": "tt0000001"},
    }
    page2 = {"Items": [{"movieId": "tt0000002", "title": "Page Two", "genre": "drama"}]}

    fake_table = MagicMock()
    fake_table.scan.side_effect = [page1, page2]

    monkeypatch.setattr(rec_module, "movies", lambda: fake_table)
    monkeypatch.setattr("recommend.recommend.get_sub", lambda event: None)

    resp = handler({}, None)
    assert resp["statusCode"] == 200
    assert fake_table.scan.call_count == 2
    body = json.loads(resp["body"])
    assert body["title"] in {"Page One", "Page Two"}
