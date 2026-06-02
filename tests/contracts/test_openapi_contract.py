"""
Contract tests asserting handler responses conform to docs/openapi.yaml.

Each class names the spec path+operation so regressions are easy to trace back
to a specific section of the spec. Tests here focus on things the unit tests
don't cover: field names, field types, boundary values, and auth rules.
"""
import json
import re

from conftest import seed_movies
from shared.db import users, historico
from recommend import handler as recommend_handler
from history import handler as history_handler
from preferences import handler as preferences_handler
from watch_later import handler as watch_later_handler

# Minimal ISO 8601 / RFC 3339 datetime prefix check
_DATETIME_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}")


class TestRecommendContract:
    """GET /recommend — security: [{bearerAuth: []}, {}] (anonymous allowed)"""

    def test_200_has_all_spec_fields(self, monkeypatch):
        seed_movies()
        monkeypatch.setattr("recommend.recommend.get_sub", lambda e: None)
        body = json.loads(recommend_handler({}, None)["body"])
        for field in ("title", "year", "rated", "genre", "director", "runtime",
                      "poster", "imdbRating", "streaming-services"):
            assert field in body, f"spec field missing from response: {field}"

    def test_imdbRating_is_numeric(self, monkeypatch):
        """spec: imdbRating type: number, format: double"""
        seed_movies()
        monkeypatch.setattr("recommend.recommend.get_sub", lambda e: None)
        body = json.loads(recommend_handler({}, None)["body"])
        assert isinstance(body["imdbRating"], (int, float))

    def test_streaming_services_items_have_spec_keys(self, monkeypatch):
        """spec: when streaming-services is present, items must have name, image, url"""
        seed_movies()
        monkeypatch.setattr("recommend.recommend.get_sub", lambda e: None)
        body = json.loads(recommend_handler({}, None)["body"])
        services = body.get("streaming-services") or []
        for svc in services:
            assert "name" in svc, "streaming-service item missing 'name'"
            assert "image" in svc, "streaming-service item missing 'image'"
            assert "url" in svc, "streaming-service item missing 'url'"

    def test_anonymous_request_returns_200(self, monkeypatch):
        """spec allows {} (no auth) in the security array — anonymous must succeed."""
        seed_movies()
        monkeypatch.setattr("recommend.recommend.get_sub", lambda e: None)
        assert recommend_handler({}, None)["statusCode"] == 200


class TestHistoryContract:
    """GET /history — security: bearerAuth required"""

    def test_200_returns_array(self, monkeypatch):
        """spec: response schema is type: array"""
        monkeypatch.setattr("history.history.get_sub", lambda e: "user-1")
        body = json.loads(history_handler({}, None)["body"])
        assert isinstance(body, list)

    def test_item_has_exactly_spec_fields(self, monkeypatch):
        """spec: items have title, genre, recommended-at — no more, no less"""
        monkeypatch.setattr("history.history.get_sub", lambda e: "user-1")
        historico().put_item(Item={
            "sub": "user-1",
            "timestamp": "2025-01-01T10:00:00Z",
            "movieTitle": "The Matrix",
            "genre": "action",
        })
        item = json.loads(history_handler({}, None)["body"])[0]
        assert set(item.keys()) == {"title", "genre", "recommended-at"}

    def test_recommended_at_is_datetime_string(self, monkeypatch):
        """spec: recommended-at format: date-time"""
        monkeypatch.setattr("history.history.get_sub", lambda e: "user-1")
        historico().put_item(Item={
            "sub": "user-1",
            "timestamp": "2025-06-01T12:00:00Z",
            "movieTitle": "Inception",
            "genre": "sci-fi",
        })
        item = json.loads(history_handler({}, None)["body"])[0]
        assert _DATETIME_RE.match(item["recommended-at"]), (
            f"recommended-at is not a datetime string: {item['recommended-at']!r}"
        )

    def test_401_when_unauthenticated(self, monkeypatch):
        """spec: 401 Unauthorized"""
        monkeypatch.setattr("history.history.get_sub", lambda e: None)
        assert history_handler({}, None)["statusCode"] == 401


class TestPreferencesGetContract:
    """GET /preferences — security: bearerAuth required"""

    def test_200_has_all_spec_fields(self, monkeypatch):
        """spec: response has genres, subscriptions, age-rating, humor"""
        monkeypatch.setattr("preferences.preferences.get_sub", lambda e: "user-1")
        users().put_item(Item={"sub": "user-1", "email": "a@b.com"})
        body = json.loads(preferences_handler({}, None)["body"])
        for field in ("genres", "subscriptions", "age-rating", "humor"):
            assert field in body, f"spec field missing from response: {field}"

    def test_genres_and_subscriptions_are_arrays(self, monkeypatch):
        """spec: genres and subscriptions are type: array"""
        monkeypatch.setattr("preferences.preferences.get_sub", lambda e: "user-1")
        users().put_item(Item={"sub": "user-1", "email": "a@b.com"})
        body = json.loads(preferences_handler({}, None)["body"])
        assert isinstance(body["genres"], list)
        assert isinstance(body["subscriptions"], list)

    def test_401_when_unauthenticated(self, monkeypatch):
        """spec: 401 Unauthorized"""
        monkeypatch.setattr("preferences.preferences.get_sub", lambda e: None)
        assert preferences_handler({}, None)["statusCode"] == 401


class TestPreferencesPostContract:
    """POST /preferences — anyOf: at least one field required"""

    def test_200_on_valid_body(self, monkeypatch):
        monkeypatch.setattr("preferences.preferences.get_sub", lambda e: "user-1")
        users().put_item(Item={"sub": "user-1", "email": "a@b.com", "preferences": {}})
        event = {"httpMethod": "POST", "body": json.dumps({"genres": ["action"]})}
        assert preferences_handler(event, None)["statusCode"] == 200

    def test_400_when_no_recognized_field(self, monkeypatch):
        """spec anyOf: at least one of genres/subscriptions/age-rating/humor is required."""
        monkeypatch.setattr("preferences.preferences.get_sub", lambda e: "user-1")
        users().put_item(Item={"sub": "user-1", "email": "a@b.com", "preferences": {}})
        event = {"httpMethod": "POST", "body": json.dumps({})}
        assert preferences_handler(event, None)["statusCode"] == 400

    def test_401_when_unauthenticated(self, monkeypatch):
        """spec: 401 Unauthorized"""
        monkeypatch.setattr("preferences.preferences.get_sub", lambda e: None)
        event = {"httpMethod": "POST", "body": json.dumps({"genres": ["action"]})}
        assert preferences_handler(event, None)["statusCode"] == 401


class TestWatchLaterGetContract:
    """GET /watch-later — security: bearerAuth required"""

    def test_200_returns_array(self, monkeypatch):
        """spec: response schema is type: array"""
        monkeypatch.setattr("watch_later.watch_later.get_sub", lambda e: "user-1")
        users().put_item(Item={"sub": "user-1", "email": "a@b.com"})
        body = json.loads(watch_later_handler({"httpMethod": "GET"}, None)["body"])
        assert isinstance(body, list)

    def test_item_has_exactly_spec_fields(self, monkeypatch):
        """spec: items have title, added-at — no more, no less"""
        monkeypatch.setattr("watch_later.watch_later.get_sub", lambda e: "user-1")
        users().put_item(Item={
            "sub": "user-1", "email": "a@b.com",
            "watchLater": [
                {"movieId": "tt0133093", "title": "The Matrix", "addedAt": "2025-01-01T00:00:00Z"},
            ],
        })
        item = json.loads(watch_later_handler({"httpMethod": "GET"}, None)["body"])[0]
        assert set(item.keys()) == {"title", "added-at"}

    def test_added_at_is_datetime_string(self, monkeypatch):
        """spec: added-at format: date-time"""
        monkeypatch.setattr("watch_later.watch_later.get_sub", lambda e: "user-1")
        users().put_item(Item={
            "sub": "user-1", "email": "a@b.com",
            "watchLater": [
                {"movieId": "tt123", "title": "M", "addedAt": "2025-06-01T12:00:00Z"},
            ],
        })
        item = json.loads(watch_later_handler({"httpMethod": "GET"}, None)["body"])[0]
        assert _DATETIME_RE.match(item["added-at"]), (
            f"added-at is not a datetime string: {item['added-at']!r}"
        )

    def test_401_when_unauthenticated(self, monkeypatch):
        """spec: 401 Unauthorized"""
        monkeypatch.setattr("watch_later.watch_later.get_sub", lambda e: None)
        assert watch_later_handler({}, None)["statusCode"] == 401


class TestWatchLaterPostContract:
    """POST /watch-later — movieId: required, minLength: 1, maxLength: 255"""

    def test_201_on_valid_movieid(self, monkeypatch):
        """spec: 201 Created"""
        monkeypatch.setattr("watch_later.watch_later.get_sub", lambda e: "user-1")
        users().put_item(Item={"sub": "user-1", "email": "a@b.com"})
        event = {"httpMethod": "POST", "body": json.dumps({"movieId": "tt0133093"})}
        assert watch_later_handler(event, None)["statusCode"] == 201

    def test_201_movieid_at_maxlength(self, monkeypatch):
        """spec: maxLength: 255 — exactly 255 chars must be accepted."""
        monkeypatch.setattr("watch_later.watch_later.get_sub", lambda e: "user-1")
        users().put_item(Item={"sub": "user-1", "email": "a@b.com"})
        event = {"httpMethod": "POST", "body": json.dumps({"movieId": "x" * 255})}
        assert watch_later_handler(event, None)["statusCode"] == 201

    def test_400_movieid_over_maxlength(self, monkeypatch):
        """spec: maxLength: 255 — 256 chars must be rejected."""
        monkeypatch.setattr("watch_later.watch_later.get_sub", lambda e: "user-1")
        users().put_item(Item={"sub": "user-1", "email": "a@b.com"})
        event = {"httpMethod": "POST", "body": json.dumps({"movieId": "x" * 256})}
        assert watch_later_handler(event, None)["statusCode"] == 400

    def test_400_missing_movieid(self, monkeypatch):
        """spec: movieId is required"""
        monkeypatch.setattr("watch_later.watch_later.get_sub", lambda e: "user-1")
        users().put_item(Item={"sub": "user-1", "email": "a@b.com"})
        event = {"httpMethod": "POST", "body": json.dumps({})}
        assert watch_later_handler(event, None)["statusCode"] == 400

    def test_401_when_unauthenticated(self, monkeypatch):
        """spec: 401 Unauthorized"""
        monkeypatch.setattr("watch_later.watch_later.get_sub", lambda e: None)
        event = {"httpMethod": "POST", "body": json.dumps({"movieId": "tt123"})}
        assert watch_later_handler(event, None)["statusCode"] == 401
