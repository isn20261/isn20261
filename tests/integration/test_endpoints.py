"""
Testes de integração — rodam contra a infra real após `pulumi up`.

Variáveis de ambiente necessárias:
    INTEGRATION_BASE_URL        ex.: https://xxxx.cloudfront.net  ou  https://cinedica.video
    INTEGRATION_USER_POOL_ID    ex.: sa-east-1_xxxxxxxx
    INTEGRATION_CLIENT_ID       ex.: xxxxxxxxxxxxxxxxxxxxxxxxxx
    INTEGRATION_TEST_EMAIL      ex.: ci-test@example.com
    INTEGRATION_TEST_PASSWORD   ex.: Test@123456
"""

import os
import boto3
import pytest
import requests


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def base_url():
    url = os.environ["INTEGRATION_BASE_URL"].rstrip("/")
    return url


@pytest.fixture(scope="session")
def access_token():
    """Autentica o usuário de teste e devolve o JWT Access Token."""
    idp = boto3.client("cognito-idp", region_name=os.environ.get("AWS_DEFAULT_REGION", "sa-east-1"))
    resp = idp.initiate_auth(
        AuthFlow="USER_PASSWORD_AUTH",
        AuthParameters={
            "USERNAME": os.environ["INTEGRATION_TEST_EMAIL"],
            "PASSWORD": os.environ["INTEGRATION_TEST_PASSWORD"],
        },
        ClientId=os.environ["INTEGRATION_CLIENT_ID"],
    )
    return resp["AuthenticationResult"]["AccessToken"]


@pytest.fixture(scope="session")
def auth_headers(access_token):
    return {"Authorization": f"Bearer {access_token}"}


# ---------------------------------------------------------------------------
# GET /api/v1/recommend
# ---------------------------------------------------------------------------

class TestRecommend:
    def test_returns_200(self, base_url, auth_headers):
        resp = requests.get(f"{base_url}/api/v1/recommend", headers=auth_headers)
        assert resp.status_code == 200

    def test_response_has_required_fields(self, base_url, auth_headers):
        resp = requests.get(f"{base_url}/api/v1/recommend", headers=auth_headers)
        body = resp.json()
        assert "title" in body
        assert "genre" in body
        assert "streaming-services" in body

    @pytest.mark.skipif(
        os.getenv("INTEGRATION_STACK") == "dev",
        reason="A stack de dev tem disableAuth=true, então não retorna 401"
    )
    def test_unauthorized_without_token(self, base_url):
        resp = requests.get(f"{base_url}/api/v1/recommend")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# GET /api/v1/preferences
# POST /api/v1/preferences
# ---------------------------------------------------------------------------

class TestPreferences:
    def test_get_returns_200(self, base_url, auth_headers):
        resp = requests.get(f"{base_url}/api/v1/preferences", headers=auth_headers)
        assert resp.status_code == 200

    def test_post_returns_200(self, base_url, auth_headers):
        resp = requests.post(
            f"{base_url}/api/v1/preferences",
            headers=auth_headers,
            json={"genres": ["sci-fi"]},
        )
        assert resp.status_code == 200

    def test_post_persists_preferences(self, base_url, auth_headers):
        requests.post(
            f"{base_url}/api/v1/preferences",
            headers=auth_headers,
            json={"genres": ["action"]},
        )
        resp = requests.get(f"{base_url}/api/v1/preferences", headers=auth_headers)
        body = resp.json()
        assert "action" in body.get("genres", [])

    @pytest.mark.skipif(
        os.getenv("INTEGRATION_STACK") == "dev",
        reason="A stack de dev tem disableAuth=true, então não retorna 401"
    )
    def test_unauthorized_without_token(self, base_url):
        resp = requests.get(f"{base_url}/api/v1/preferences")
        assert resp.status_code == 401