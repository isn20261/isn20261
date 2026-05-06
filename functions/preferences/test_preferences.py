import json

from boto3.dynamodb.conditions import Key
from moto import mock_aws

from conftest import setup_dynamodb_tables
from shared.db import users, logs
from preferences import handler


@mock_aws
def test_get_no_auth(monkeypatch):
    setup_dynamodb_tables()
    monkeypatch.setattr("preferences.preferences.get_sub", lambda event: None)
    resp = handler({}, None)
    assert resp["statusCode"] == 401


@mock_aws
def test_get_user_not_found(monkeypatch):
    setup_dynamodb_tables()
    monkeypatch.setattr("preferences.preferences.get_sub", lambda event: "nonexistent")
    resp = handler({}, None)
    assert resp["statusCode"] == 401


@mock_aws
def test_get_returns_prefs(monkeypatch):
    setup_dynamodb_tables()
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


@mock_aws
def test_get_returns_empty_prefs_for_new_user(monkeypatch):
    setup_dynamodb_tables()
    monkeypatch.setattr("preferences.preferences.get_sub", lambda event: "user-2")
    users().put_item(Item={"sub": "user-2", "email": "b@c.com"})
    resp = handler({}, None)
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert body["genres"] == []
    assert body["subscriptions"] == []
    assert body["age-rating"] is None
    assert body["humor"] is None


@mock_aws
def test_post_single_field(monkeypatch):
    setup_dynamodb_tables()
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


@mock_aws
def test_post_all_fields(monkeypatch):
    setup_dynamodb_tables()
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


@mock_aws
def test_post_no_fields(monkeypatch):
    setup_dynamodb_tables()
    monkeypatch.setattr("preferences.preferences.get_sub", lambda event: "user-1")
    users().put_item(Item={"sub": "user-1", "email": "a@b.com", "preferences": {}})

    event = {"httpMethod": "POST", "body": json.dumps({})}
    resp = handler(event, None)
    assert resp["statusCode"] == 400


@mock_aws
def test_post_genres_not_array(monkeypatch):
    setup_dynamodb_tables()
    monkeypatch.setattr("preferences.preferences.get_sub", lambda event: "user-1")
    users().put_item(Item={"sub": "user-1", "email": "a@b.com", "preferences": {}})

    event = {
        "httpMethod": "POST",
        "body": json.dumps({"genres": "not-a-list"}),
    }
    resp = handler(event, None)
    assert resp["statusCode"] == 400


@mock_aws
def test_post_invalid_json(monkeypatch):
    setup_dynamodb_tables()
    monkeypatch.setattr("preferences.preferences.get_sub", lambda event: "user-1")
    users().put_item(Item={"sub": "user-1", "email": "a@b.com", "preferences": {}})

    event = {"httpMethod": "POST", "body": "not-json"}
    resp = handler(event, None)
    assert resp["statusCode"] == 400
