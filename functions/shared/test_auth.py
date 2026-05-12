from shared.auth import get_sub, get_method


def _event_with_sub(sub):
    return {
        "requestContext": {
            "authorizer": {
                "jwt": {
                    "claims": {"sub": sub, "email": "u@example.com"}
                }
            }
        }
    }


def test_returns_sub_from_claims():
    assert get_sub(_event_with_sub("abc-123")) == "abc-123"


def test_missing_request_context():
    assert get_sub({}) is None


def test_missing_authorizer():
    assert get_sub({"requestContext": {}}) is None


def test_missing_jwt():
    assert get_sub({"requestContext": {"authorizer": {}}}) is None


def test_missing_claims():
    assert get_sub({"requestContext": {"authorizer": {"jwt": {}}}}) is None


def test_missing_sub_claim():
    event = {"requestContext": {"authorizer": {"jwt": {"claims": {"email": "u@e.com"}}}}}
    assert get_sub(event) is None


def test_empty_sub_returns_none():
    assert get_sub(_event_with_sub("")) is None


def test_null_request_context():
    assert get_sub({"requestContext": None}) is None


def test_payload_format_v1_claims():
    # HTTP API v1 / REST API payload: claims directly on authorizer (no jwt nesting)
    event = {
        "requestContext": {
            "authorizer": {"claims": {"sub": "v1-style-sub"}}
        }
    }
    assert get_sub(event) == "v1-style-sub"


def test_disable_auth_allows_root_sub(monkeypatch):
    monkeypatch.setenv("DISABLE_AUTH", "1")
    assert get_sub({"sub": "dev-sub"}) == "dev-sub"


def test_disable_auth_allows_header_sub(monkeypatch):
    monkeypatch.setenv("DISABLE_AUTH", "true")
    assert get_sub({"headers": {"x-dev-sub": "dev-sub"}}) == "dev-sub"


def test_disable_auth_allows_querystring_sub(monkeypatch):
    monkeypatch.setenv("DISABLE_AUTH", "yes")
    assert (
        get_sub({"queryStringParameters": {"sub": "dev-sub"}}) == "dev-sub"
    )


def test_disable_auth_without_sub_returns_none(monkeypatch):
    monkeypatch.setenv("DISABLE_AUTH", "1")
    assert get_sub({"headers": {}, "queryStringParameters": {}}) is None


def test_get_method_v2_payload():
    event = {"requestContext": {"http": {"method": "post"}}}
    assert get_method(event) == "POST"


def test_get_method_v1_payload():
    event = {"httpMethod": "delete"}
    assert get_method(event) == "DELETE"


def test_get_method_v2_takes_priority():
    event = {
        "httpMethod": "GET",
        "requestContext": {"http": {"method": "POST"}},
    }
    assert get_method(event) == "POST"


def test_get_method_defaults_to_get():
    assert get_method({}) == "GET"
    assert get_method({"requestContext": {}}) == "GET"
    assert get_method({"requestContext": {"http": {}}}) == "GET"
