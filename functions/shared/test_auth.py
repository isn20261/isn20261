from unittest.mock import MagicMock

import jwt
from cryptography.hazmat.primitives.asymmetric import rsa

from shared.auth import get_sub


def _make_rs256_token(
    sub="test-sub",
    issuer="https://cognito-idp.sa-east-1.amazonaws.com/test-pool-id",
    audience="test-client-id",
):
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    token = jwt.encode(
        {"sub": sub, "iss": issuer, "aud": audience},
        private_key,
        algorithm="RS256",
    )
    return token, private_key


def test_valid_bearer_token(monkeypatch):
    token, private_key = _make_rs256_token()
    mock_key = MagicMock()
    mock_key.key = private_key.public_key()
    mock_client = MagicMock()
    mock_client.get_signing_key_from_jwt.return_value = mock_key
    monkeypatch.setattr("shared.auth._jwks_client", mock_client)

    event = {"headers": {"Authorization": f"Bearer {token}"}}
    assert get_sub(event) == "test-sub"


def test_missing_authorization_header():
    assert get_sub({"headers": {}}) is None
    assert get_sub({}) is None


def test_non_bearer_authorization():
    event = {"headers": {"Authorization": "Basic xyz"}}
    assert get_sub(event) is None


def test_malformed_token(monkeypatch):
    mock_client = MagicMock()
    mock_client.get_signing_key_from_jwt.side_effect = Exception("JWKS fetch failed")
    monkeypatch.setattr("shared.auth._jwks_client", mock_client)

    event = {"headers": {"Authorization": "Bearer garbage-token"}}
    assert get_sub(event) is None
