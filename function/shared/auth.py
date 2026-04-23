import os
import jwt
from jwt import PyJWKClient, InvalidTokenError

REGION        = os.environ.get("AWS_REGION", "sa-east-1")
USER_POOL_ID  = os.environ.get("COGNITO_USER_POOL_ID", "")
CLIENT_ID     = os.environ.get("COGNITO_CLIENT_ID", "")

JWKS_URL = (
    f"https://cognito-idp.{REGION}.amazonaws.com/{USER_POOL_ID}/.well-known/jwks.json"
)
ISSUER = f"https://cognito-idp.{REGION}.amazonaws.com/{USER_POOL_ID}"

# Client is instantiated once per Lambda container; cache_jwk_set avoids
# an HTTP round-trip on every warm invocation.
_jwks_client = PyJWKClient(JWKS_URL, cache_jwk_set=True, lifespan=3600)


def get_sub(event: dict) -> str | None:
    """Return the Cognito sub from a valid Bearer JWT, or None."""
    headers = event.get("headers") or {}
    auth = headers.get("Authorization") or headers.get("authorization", "")
    if not auth.startswith("Bearer "):
        return None
    token = auth[7:]
    try:
        signing_key = _jwks_client.get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=CLIENT_ID,
            issuer=ISSUER,
        )
        return claims.get("sub")
    except (InvalidTokenError, Exception):
        return None
