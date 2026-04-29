"""POST /register — public endpoint, no auth required.

Required IAM permissions on Lambda role:
  cognito-idp:AdminCreateUser
  cognito-idp:AdminSetUserPassword

Environment variables:
  COGNITO_USER_POOL_ID, BASE_URL (optional), + shared db vars
"""
import json
import os
import secrets
from datetime import datetime, timezone, timedelta

import boto3
from botocore.exceptions import ClientError

from shared.db import email_to_sub, users, tokens, write_log
from shared.response import ok, bad_request, forbidden, server_error

cognito = boto3.client("cognito-idp")
USER_POOL_ID = os.environ["COGNITO_USER_POOL_ID"]
BASE_URL = os.environ.get("BASE_URL", "https://basic-movie-recommender.com/api/v1")


def handler(event, context):
    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return bad_request("Invalid JSON")

    name     = (body.get("name") or "").strip()
    email    = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""

    if not name or len(name) < 3 or len(name) > 50:
        return bad_request("name must be between 3 and 50 characters")
    if not email or len(email) < 5 or len(email) > 255 or "@" not in email:
        return bad_request("Invalid email")
    if not password or len(password) < 6 or len(password) > 100:
        return bad_request("password must be between 6 and 100 characters")

    if email_to_sub().get_item(Key={"email": email}).get("Item"):
        return forbidden("Email already registered")

    try:
        resp = cognito.admin_create_user(
            UserPoolId=USER_POOL_ID,
            Username=email,
            UserAttributes=[
                {"Name": "email",          "Value": email},
                {"Name": "name",           "Value": name},
                {"Name": "email_verified", "Value": "false"},
            ],
            MessageAction="SUPPRESS",
        )
        sub = next(
            a["Value"]
            for a in resp["User"]["Attributes"]
            if a["Name"] == "sub"
        )
        cognito.admin_set_user_password(
            UserPoolId=USER_POOL_ID,
            Username=email,
            Password=password,
            Permanent=True,
        )
    except ClientError as exc:
        code = exc.response["Error"]["Code"]
        if code == "UsernameExistsException":
            return forbidden("Email already registered")
        if code == "InvalidPasswordException":
            return bad_request("Password does not meet requirements")
        return server_error("Could not create user")

    now_dt = datetime.now(timezone.utc)
    now = now_dt.isoformat()
    expires_dt = now_dt + timedelta(hours=24)
    expires_at = expires_dt.isoformat()
    ttl = int(expires_dt.timestamp())
    token_value = secrets.token_hex(32)  # 64 hex chars

    users().put_item(Item={
        "sub":           sub,
        "email":         email,
        "emailVerified": False,
        "preferences": {
            "genres":        [],
            "subscriptions": [],
            "ageRating":     None,
            "humor":         None,
        },
        "watchLater": [],
        "createdAt":  now,
        "updatedAt":  now,
    })
    email_to_sub().put_item(Item={"email": email, "sub": sub})
    tokens().put_item(Item={
        "token":     token_value,
        "sub":       sub,
        "type":      "verify-email",
        "expiresAt": expires_at,
        "ttl":       ttl,
    })
    write_log(sub, now, "REGISTER", {"email": email})

    # TODO: send verification e-mail via SES instead of returning URL
    verify_url = f"{BASE_URL}/verify-email?token={token_value}"
    return ok({"verifyEmailUrl": verify_url})
