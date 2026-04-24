"""POST /login — public endpoint, no auth required.

Required IAM permissions on Lambda role:
  cognito-idp:InitiateAuth  (must be allowed on the app client)

Environment variables:
  COGNITO_CLIENT_ID, + shared db vars

Note: USER_PASSWORD_AUTH must be enabled on the Cognito app client.
"""
import json
import os
from datetime import datetime, timezone

import boto3
from botocore.exceptions import ClientError

from shared.db import get_sub_by_email, write_log
from shared.response import ok, bad_request, unauthorized, server_error

cognito   = boto3.client("cognito-idp")
CLIENT_ID = os.environ["COGNITO_CLIENT_ID"]


def handler(event, context):
    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return bad_request("Invalid JSON")

    email    = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""

    if not email or not password:
        return bad_request("email and password are required")

    try:
        resp = cognito.initiate_auth(
            AuthFlow="USER_PASSWORD_AUTH",
            AuthParameters={"USERNAME": email, "PASSWORD": password},
            ClientId=CLIENT_ID,
        )
    except ClientError as exc:
        code = exc.response["Error"]["Code"]
        if code in ("NotAuthorizedException", "UserNotFoundException"):
            return unauthorized("Invalid credentials")
        if code == "UserNotConfirmedException":
            return unauthorized("Email not confirmed")
        return server_error("Authentication failed")

    auth = resp.get("AuthenticationResult", {})

    sub = get_sub_by_email(email)
    if sub:
        write_log(sub, datetime.now(timezone.utc).isoformat(), "LOGIN", {"email": email})

    return ok({
        "accessToken":  auth.get("AccessToken"),
        "idToken":      auth.get("IdToken"),
        "refreshToken": auth.get("RefreshToken"),
    })
