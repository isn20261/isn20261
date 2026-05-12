"""Read the validated `sub` claim from the API Gateway JWT authorizer.

The HTTP API Gateway is configured with a JWT authorizer (see __main__.py)
that validates signature, audience, issuer, and expiry **before** invoking
the Lambda. The validated claims are passed to the Lambda via
`event.requestContext.authorizer.jwt.claims`.

This module only extracts `sub` from that struct. No JWKS fetch, no
in-Lambda signature verification — those would be redundant work.
"""


def get_sub(event: dict) -> str | None:
    authorizer = (event.get("requestContext") or {}).get("authorizer") or {}
    # HTTP API v2 payload (`payload_format_version=2.0`): claims under "jwt"
    # HTTP API v1 / REST API payload: claims directly on the authorizer
    claims = authorizer.get("jwt", {}).get("claims") or authorizer.get("claims") or {}
    sub = claims.get("sub")
    return sub if sub else None
