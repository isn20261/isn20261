"""POST /change-email — requires Bearer JWT auth.

Generates a verification token for the new e-mail address.
The actual e-mail update only happens after /verify-email is called.

Required IAM permissions on Lambda role: none beyond DynamoDB

Environment variables:
  BASE_URL (optional), + shared db/auth vars
"""
import json
import os
import secrets
from datetime import datetime, timezone, timedelta

from shared.auth import get_sub
from shared.db import get_user, email_to_sub, tokens, write_log
from shared.response import ok, bad_request, unauthorized, forbidden, server_error


BASE_URL = os.environ.get("BASE_URL", "https://basic-movie-recommender.com/api/v1")


def handler(event, context):
    sub = get_sub(event)
    if not sub:
        return unauthorized()

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return bad_request("Invalid JSON")

    new_email = (body.get("email") or "").strip().lower()
    if not new_email or len(new_email) < 5 or len(new_email) > 255 or "@" not in new_email:
        return bad_request("Invalid email")

    user = get_user(sub)
    if not user:
        return unauthorized()

    if not user.get("emailVerified"):
        return forbidden("Current email must be verified before changing it")

    if user["email"] == new_email:
        return bad_request("New email must be different from current email")

    if email_to_sub().get_item(Key={"email": new_email}).get("Item"):
        return forbidden("Email already in use")

    now        = datetime.now(timezone.utc)
    expires_dt = now + timedelta(hours=24)
    expires_at = expires_dt.isoformat()
    ttl = int(expires_dt.timestamp())
    token_value = secrets.token_hex(32)

    tokens().put_item(Item={
        "token":     token_value,
        "sub":       sub,
        "type":      "verify-email",
        "expiresAt": expires_at,
        "ttl":  ttl,
        "newEmail":  new_email,   # extends Token schema — see inconsistencias.md
    })
    write_log(sub, now.isoformat(), "CHANGE_EMAIL_REQUESTED", {"newEmail": new_email})

    # TODO: send via SES instead of returning URL
    verify_url = f"{BASE_URL}/verify-email?token={token_value}"
    return ok({"url": verify_url})
