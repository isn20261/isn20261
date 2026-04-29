"""POST /lost-password — public endpoint, no auth required.

Generates a password-reset token. Does not reveal whether the e-mail
exists to prevent user enumeration.

NOTE: there is no /reset-password endpoint yet — see inconsistencias.md.
TODO: send reset e-mail via SES.

Environment variables:
  BASE_URL (optional), + shared db vars
"""
import json
import os
import secrets
from datetime import datetime, timezone, timedelta

from shared.db import get_sub_by_email, get_user, tokens, write_log
from shared.response import ok, bad_request

BASE_URL = os.environ.get("BASE_URL", "https://basic-movie-recommender.com/api/v1")


def handler(event, context):
    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return bad_request("Invalid JSON")

    email = (body.get("email") or "").strip().lower()
    if not email or len(email) < 5 or len(email) > 255 or "@" not in email:
        return bad_request("Invalid email")

    # Always return 200 to avoid user enumeration
    sub = get_sub_by_email(email)
    if not sub:
        return ok()

    user = get_user(sub)
    if not user:
        return ok()

    now        = datetime.now(timezone.utc)
    expires_dt = now + timedelta(hours=1)
    expires_at = expires_dt.isoformat()
    ttl = int(expires_dt.timestamp())
    token_value = secrets.token_hex(32)

    tokens().put_item(Item={
        "token":     token_value,
        "sub":       sub,
        "type":      "reset-password",
        "expiresAt": expires_at,
        "ttl":       ttl,
    })
    write_log(sub, now.isoformat(), "PASSWORD_RESET_REQUESTED", {"email": email})

    # TODO: send reset e-mail via SES
    # reset_url = f"{BASE_URL}/reset-password?token={token_value}"
    return ok()
