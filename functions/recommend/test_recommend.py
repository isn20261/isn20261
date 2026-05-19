import json

from boto3.dynamodb.conditions import Key
from moto import mock_aws

from conftest import setup_dynamodb_tables
from shared.db import users, historico, logs
from recommend import handler

_OMDB_MOCK_MOVIE = {
    "movieId": "tt9999999",
    "title": "Test Movie",
    "year": 2020,
    "rated": "PG",
    "genre": "comedy",
    "director": "Test Director",
    "runtime": 120,
    "poster": "https://example.com/poster.jpg",
    "imdbRating": 7.5,
    "streaming-services": [],
}


@mock_aws
def test_recommend_anonymous(monkeypatch):
    setup_dynamodb_tables()
    monkeypatch.setattr("recommend.recommend.get_sub", lambda event: None)
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
    assert "imdbRating" in body
    assert body["streaming-services"] == []
    assert "movieId" not in body


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
    assert "year" in body


@mock_aws
def test_recommend_authenticated_user_not_found(monkeypatch):
    setup_dynamodb_tables()
    monkeypatch.setattr("recommend.recommend.get_sub", lambda event: "nonexistent")
    resp = handler({}, None)
    assert resp["statusCode"] == 401


@mock_aws
def test_recommend_disable_auth_allows_user_not_found_and_saves_history(monkeypatch):
    setup_dynamodb_tables()
    monkeypatch.setenv("DISABLE_AUTH", "1")
    monkeypatch.setattr("recommend.recommend.get_sub", lambda event: "nonexistent")
    resp = handler({}, None)
    assert resp["statusCode"] == 200

    items = historico().query(KeyConditionExpression=Key("sub").eq("nonexistent"))["Items"]
    assert len(items) == 1


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


# --- OMDB integration tests ---


@mock_aws
def test_recommend_omdb_fetch_success(monkeypatch):
    setup_dynamodb_tables()
    monkeypatch.setattr("recommend.recommend.OMDB_API_KEY", "test-key")
    monkeypatch.setattr("recommend.recommend.get_sub", lambda event: "user-omdb")
    monkeypatch.setattr(
        "recommend.recommend._omdb_random_movie",
        lambda preferences=None: _OMDB_MOCK_MOVIE,
    )
    users().put_item(Item={"sub": "user-omdb", "email": "omdb@test.com"})

    resp = handler({}, None)
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert body["title"] == "Test Movie"
    assert body["year"] == 2020
    assert body["rated"] == "PG"
    assert body["genre"] == "comedy"
    assert body["director"] == "Test Director"
    assert body["runtime"] == 120
    assert body["poster"] == "https://example.com/poster.jpg"
    assert body["imdbRating"] == 7.5
    assert body["streaming-services"] == []
    assert "movieId" not in body


@mock_aws
def test_recommend_omdb_exhausted_retries_falls_back(monkeypatch):
    setup_dynamodb_tables()
    monkeypatch.setattr("recommend.recommend.OMDB_API_KEY", "test-key")
    monkeypatch.setattr("recommend.recommend.get_sub", lambda event: "user-fallback")
    monkeypatch.setattr(
        "recommend.recommend._omdb_random_movie",
        lambda preferences=None: None,
    )
    users().put_item(Item={"sub": "user-fallback", "email": "fallback@test.com"})

    resp = handler({}, None)
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert "title" in body
    assert "year" in body
    assert "rated" in body
    assert "genre" in body
    assert "director" in body
    assert "runtime" in body
    assert body["streaming-services"] == []


@mock_aws
def test_recommend_omdb_anonymous(monkeypatch):
    setup_dynamodb_tables()
    monkeypatch.setattr("recommend.recommend.OMDB_API_KEY", "test-key")
    monkeypatch.setattr("recommend.recommend.get_sub", lambda event: None)
    monkeypatch.setattr(
        "recommend.recommend._omdb_random_movie",
        lambda preferences=None: _OMDB_MOCK_MOVIE,
    )

    resp = handler({}, None)
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert body["title"] == "Test Movie"
    assert body["genre"] == "comedy"


# --- OMDB genre-preference filtering ---


def _make_omdb_response(response_value: str, **fields):
    """Build a stub requests.Response with .json() returning OMDB-shaped data."""
    payload = {"Response": response_value, **fields}

    class _Resp:
        def json(self):
            return payload

    return _Resp()


@mock_aws
def test_recommend_omdb_honors_genre_preferences(monkeypatch):
    """OMDB result is accepted only when its Genre overlaps preferences.genres."""
    import recommend.recommend as r

    setup_dynamodb_tables()
    monkeypatch.setattr(r, "OMDB_API_KEY", "test-key")
    monkeypatch.setattr(r, "get_sub", lambda event: "user-genre-ok")
    users().put_item(
        Item={
            "sub": "user-genre-ok",
            "email": "g@h.com",
            "preferences": {"genres": ["action"]},
        }
    )

    # First OMDB call returns a comedy (rejected — no overlap with "action"),
    # second returns an action movie (accepted).
    responses = iter(
        [
            _make_omdb_response("True", imdbID="tt0000001", Title="Some Comedy",
                                Genre="Comedy, Romance"),
            _make_omdb_response("True", imdbID="tt0000002", Title="Some Action",
                                Genre="Action, Thriller"),
        ]
    )
    monkeypatch.setattr(r.requests, "get", lambda *a, **kw: next(responses))

    resp = handler({}, None)
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert body["title"] == "Some Action"
    assert "Action" in body["genre"]


@mock_aws
def test_recommend_omdb_genre_mismatch_falls_back(monkeypatch):
    """If 5 OMDB retries all return non-matching genres, fall back to catalogue."""
    import recommend.recommend as r

    setup_dynamodb_tables()
    monkeypatch.setattr(r, "OMDB_API_KEY", "test-key")
    monkeypatch.setattr(r, "get_sub", lambda event: "user-genre-strict")
    users().put_item(
        Item={
            "sub": "user-genre-strict",
            "email": "g@h.com",
            "preferences": {"genres": ["animation"]},
        }
    )

    # Every OMDB roll returns "Horror" — never overlaps with "animation".
    monkeypatch.setattr(
        r.requests,
        "get",
        lambda *a, **kw: _make_omdb_response(
            "True", imdbID="tt0000001", Title="Horror Film", Genre="Horror"
        ),
    )

    resp = handler({}, None)
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    # Fallback catalogue has "Spirited Away" tagged "animation".
    assert body["title"] == "Spirited Away"


@mock_aws
def test_recommend_omdb_filters_non_movies(monkeypatch):
    """type=movie query parameter is sent on every OMDB call."""
    import recommend.recommend as r

    setup_dynamodb_tables()
    monkeypatch.setattr(r, "OMDB_API_KEY", "test-key")
    monkeypatch.setattr(r, "get_sub", lambda event: None)

    captured_params: list[dict] = []

    def _fake_get(*args, **kwargs):
        captured_params.append(kwargs.get("params", {}))
        return _make_omdb_response(
            "True", imdbID="tt0000001", Title="A Movie", Genre="Drama"
        )

    monkeypatch.setattr(r.requests, "get", _fake_get)

    handler({}, None)
    assert captured_params, "expected at least one OMDB call"
    assert captured_params[0].get("type") == "movie"
