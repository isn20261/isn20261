"""Cognito PostConfirmation trigger — seeds DynamoDB on user signup.

Fires once per user, immediately after email confirmation. Creates the
initial `Users` row plus the `EmailToSub` mapping so the first call to a
protected API endpoint has a base item to update.

Idempotent: a re-trigger with the same `sub` is a no-op (no duplicate
row, no duplicate REGISTER log).

The handler MUST return the `event` unchanged — that is the Cognito
trigger contract. Returning a 4xx-equivalent or raising would block
the user's signup.

Environment variables: shared db vars (USERS_TABLE, EMAIL_TO_SUB_TABLE,
LOGS_TABLE, AWS_REGION).
"""
from datetime import datetime, timezone

from shared.db import users_create_if_absent, email_to_sub_put, write_log


def handler(event, context):
    if event.get("triggerSource") != "PostConfirmation_ConfirmSignUp":
        return event

    attrs = (event.get("request") or {}).get("userAttributes") or {}
    sub = attrs.get("sub")
    email = attrs.get("email")
    if not sub or not email:
        return event

    name = attrs.get("name") or None
    now_iso = datetime.now(timezone.utc).isoformat()

    created = users_create_if_absent(sub, email, name=name, created_at=now_iso)
    if created:
        email_to_sub_put(email, sub)
        write_log(sub, now_iso, "REGISTER", {"email": email})

    return event
