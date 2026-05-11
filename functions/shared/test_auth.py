from shared.auth import get_sub


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
