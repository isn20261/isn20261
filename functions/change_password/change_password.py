"""POST /change-password — requires Bearer JWT auth.

Required IAM permissions on Lambda role:
  cognito-idp:AdminSetUserPassword

Environment variables:
  COGNITO_USER_POOL_ID, + shared db/auth vars
"""
import json
import os
from datetime import datetime, timezone

import boto3
from botocore.exceptions import ClientError

from shared.auth import get_sub
from shared.db import get_user, users, write_log
from shared.response import ok, bad_request, unauthorized, forbidden, server_error

cognito      = boto3.client("cognito-idp")
USER_POOL_ID = os.environ["COGNITO_USER_POOL_ID"]


def handler(event, context):
    sub = get_sub(event)
    if not sub:
        return unauthorized()

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return bad_request("Invalid JSON")

    password = body.get("password") or ""
    if not password or len(password) < 6 or len(password) > 100:
        return bad_request("password must be between 6 and 100 characters")

    user = get_user(sub)
    if not user:
        return unauthorized()

    if not user.get("emailVerified"):
        return forbidden("Email must be verified before changing password")

    try:
        cognito.admin_set_user_password(
            UserPoolId=USER_POOL_ID,
            Username=user["email"],
            Password=password,
            Permanent=True,
        )
    except ClientError as exc:
        code = exc.response["Error"]["Code"]
        if code == "InvalidPasswordException":
            return bad_request("Password does not meet requirements")
        return server_error("Could not update password")

    now_iso = datetime.now(timezone.utc).isoformat()
    users().update_item(
        Key={"sub": sub},
        UpdateExpression="SET updatedAt = :u",
        ExpressionAttributeValues={":u": now_iso},
    )
    write_log(sub, now_iso, "PASSWORD_CHANGED", {})
    return ok()
