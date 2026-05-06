import json
from decimal import Decimal

from shared.response import (
    ok,
    created,
    bad_request,
    unauthorized,
    forbidden,
    not_found,
    server_error,
)


def test_ok_with_body():
    resp = ok({"key": "val"})
    assert resp["statusCode"] == 200
    assert resp["headers"]["Content-Type"] == "application/json"
    assert resp["headers"]["Access-Control-Allow-Origin"] == "*"
    assert json.loads(resp["body"]) == {"key": "val"}


def test_ok_empty_body():
    resp = ok()
    assert resp["statusCode"] == 200
    assert "body" not in resp


def test_created_empty():
    resp = created()
    assert resp["statusCode"] == 201
    assert "body" not in resp


def test_created_with_body():
    resp = created({"id": 1})
    assert resp["statusCode"] == 201
    assert json.loads(resp["body"]) == {"id": 1}


def test_bad_request_default():
    resp = bad_request()
    assert resp["statusCode"] == 400
    assert json.loads(resp["body"]) == {"error": "Bad Request"}


def test_bad_request_custom():
    resp = bad_request("Name is required")
    assert resp["statusCode"] == 400
    assert json.loads(resp["body"]) == {"error": "Name is required"}


def test_unauthorized():
    resp = unauthorized()
    assert resp["statusCode"] == 401
    assert json.loads(resp["body"]) == {"error": "Unauthorized"}


def test_forbidden():
    resp = forbidden()
    assert resp["statusCode"] == 403
    assert json.loads(resp["body"]) == {"error": "Forbidden"}


def test_not_found():
    resp = not_found()
    assert resp["statusCode"] == 404
    assert json.loads(resp["body"]) == {"error": "Not Found"}


def test_server_error():
    resp = server_error()
    assert resp["statusCode"] == 500
    assert json.loads(resp["body"]) == {"error": "Internal Server Error"}


def test_decimal_serialization_float():
    resp = ok({"price": Decimal("9.99")})
    data = json.loads(resp["body"])
    assert data["price"] == 9.99
    assert isinstance(data["price"], float)


def test_decimal_serialization_int():
    resp = ok({"count": Decimal("10")})
    data = json.loads(resp["body"])
    assert data["count"] == 10
    assert isinstance(data["count"], int)
