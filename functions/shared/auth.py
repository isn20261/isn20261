import os
import jwt
from jwt import PyJWKClient, InvalidTokenError

REGION = os.environ.get("AWS_REGION", "sa-east-1")

# Prefer the names used by the Python code, but accept the IaC-provided
# names too (Pulumi currently uses USER_POOL_ID / CLIENT_ID).
USER_POOL_ID = os.environ.get("COGNITO_USER_POOL_ID") or os.environ.get("USER_POOL_ID", "")
CLIENT_ID = os.environ.get("COGNITO_CLIENT_ID") or os.environ.get("CLIENT_ID", "")

_default_jwks_url = (
    f"https://cognito-idp.{REGION}.amazonaws.com/{USER_POOL_ID}/.well-known/jwks.json"
)
_default_issuer = f"https://cognito-idp.{REGION}.amazonaws.com/{USER_POOL_ID}"

# Local testing (LocalStack) can override where JWKS is fetched from and what
# issuer string is expected in the token.
JWKS_URL = os.environ.get("COGNITO_JWKS_URL") or _default_jwks_url
ISSUER = os.environ.get("COGNITO_ISSUER") or _default_issuer


def _get_jwks_client() -> PyJWKClient:
    # Client is instantiated once per Lambda container; cache_jwk_set avoids
    # an HTTP round-trip on every warm invocation.
    return PyJWKClient(JWKS_URL, cache_jwk_set=True, lifespan=3600)

def get_sub(event: dict) -> str | None:
    print(f"[auth] LOCAL_DEV_SUB={os.environ.get('LOCAL_DEV_SUB', 'NOT_SET')}")
    local_sub = os.environ.get("LOCAL_DEV_SUB")
    if local_sub:
        return local_sub
    headers = event.get("headers") or {}
    auth = headers.get("Authorization") or headers.get("authorization", "")
    if not auth.startswith("Bearer "):
        return None
    token = auth[7:]
    try:
        signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=CLIENT_ID,
            issuer=ISSUER,
        )
        return claims.get("sub")
    except (InvalidTokenError, Exception) as e:
        print(f"[auth] get_sub failed: {type(e).__name__}: {e}")
        return None