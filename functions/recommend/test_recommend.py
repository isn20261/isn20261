import json

from boto3.dynamodb.conditions import Key
from moto import mock_aws

from conftest import setup_dynamodb_tables
from shared.db import users, historico, logs
from recommend import handler


@mock_aws
def test_recommend_anonymous(monkeypatch):
    setup_dynamodb_tables()
    monkeypatch.setattr("recommend.recommend.get_sub", lambda event: None)
    resp = handler({}, None)
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert "title" in body
    assert "genre" in body
    assert "streaming-services" in body


@mock_aws
def test_recommend_authenticated_with_genre_prefs(monkeypatch):
    setup_dynamodb_tables()
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


@mock_aws
def test_recommend_authenticated_no_prefs(monkeypatch):
    setup_dynamodb_tables()
    monkeypatch.setattr("recommend.recommend.get_sub", lambda event: "user-2")
    users().put_item(Item={"sub": "user-2", "email": "c@d.com"})
    resp = handler({}, None)
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert "title" in body


@mock_aws
def test_recommend_authenticated_user_not_found(monkeypatch):
    setup_dynamodb_tables()
    monkeypatch.setattr("recommend.recommend.get_sub", lambda event: "nonexistent")
    resp = handler({}, None)
    assert resp["statusCode"] == 401


@mock_aws
def test_recommend_saves_to_historico(monkeypatch):
    setup_dynamodb_tables()
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
    assert "timestamp" in items[0]


@mock_aws
def test_recommend_writes_audit_log(monkeypatch):
    setup_dynamodb_tables()
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
    assert any(item["action"] == "RECOMMEND" for item in log_items)
