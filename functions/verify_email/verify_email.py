"""GET /verify-email?token=<64hex> — public endpoint, no auth required.

Handles two scenarios via the same token type ("verify-email"):
  1. Initial registration verification  — token has no `newEmail` field
  2. Email-change verification          — token has `newEmail` field

Required IAM permissions on Lambda role:
  cognito-idp:AdminUpdateUserAttributes  (for email-change flow)

Environment variables:
  COGNITO_USER_POOL_ID (for email-change flow), + shared db vars
"""
import os
from datetime import datetime, timezone

import boto3
from botocore.exceptions import ClientError

from shared.db import get_token, tokens, users, email_to_sub, get_user, write_log
from shared.response import ok, bad_request, unauthorized, server_error

cognito      = boto3.client("cognito-idp")
USER_POOL_ID = os.environ.get("COGNITO_USER_POOL_ID", "")


def handler(event, context):
    params     = event.get("queryStringParameters") or {}
    token_value = params.get("token", "")

    if not token_value or len(token_value) != 64:
        return bad_request("Invalid token")

    record = get_token(token_value)
    if not record:
        return unauthorized("Token not found or already used")

    if record.get("type") != "verify-email":
        return unauthorized("Invalid token type")

    expires_at = record.get("expiresAt", "")
    now        = datetime.now(timezone.utc)
    try:
        from datetime import datetime as dt
        exp = dt.fromisoformat(expires_at)
        if exp.tzinfo is None:
            from datetime import timezone as tz
            exp = exp.replace(tzinfo=tz.utc)
        if now > exp:
            tokens().delete_item(Key={"token": token_value})
            return unauthorized("Token expired")
    except ValueError:
        return unauthorized("Invalid token expiry")

    sub       = record["sub"]
    new_email = record.get("newEmail")
    now_iso   = now.isoformat()

    if new_email:
        # Email-change verification flow
        user = get_user(sub)
        if not user:
            return unauthorized("User not found")
        old_email = user["email"]

        if email_to_sub().get_item(Key={"email": new_email}).get("Item"):
            tokens().delete_item(Key={"token": token_value})
            return bad_request("Email already in use")

        try:
            cognito.admin_update_user_attributes(
                UserPoolId=USER_POOL_ID,
                Username=old_email,
                UserAttributes=[{"Name": "email", "Value": new_email}],
            )
        except ClientError:
            return server_error("Could not update email in Cognito")

        users().update_item(
            Key={"sub": sub},
            UpdateExpression="SET email = :e, emailVerified = :v, updatedAt = :u",
            ExpressionAttributeValues={":e": new_email, ":v": True, ":u": now_iso},
        )
        email_to_sub().delete_item(Key={"email": old_email})
        email_to_sub().put_item(Item={"email": new_email, "sub": sub})
        write_log(sub, now_iso, "EMAIL_CHANGED", {"oldEmail": old_email, "newEmail": new_email})
    else:
        # Initial registration verification flow
        users().update_item(
            Key={"sub": sub},
            UpdateExpression="SET emailVerified = :v, updatedAt = :u",
            ExpressionAttributeValues={":v": True, ":u": now_iso},
        )
        write_log(sub, now_iso, "EMAIL_VERIFIED", {})

    tokens().delete_item(Key={"token": token_value})
    return ok()
