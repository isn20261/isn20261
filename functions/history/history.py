"""GET /history — requires Bearer JWT auth.

Returns movie recommendation history sorted newest-first.
`genre` is intentionally absent from the response — see inconsistencias.md.

Environment variables: shared db/auth vars
"""
from boto3.dynamodb.conditions import Key

from shared.auth import get_sub
from shared.db import historico
from shared.response import ok, unauthorized


def handler(event, context):
    sub = get_sub(event)
    if not sub:
        return unauthorized()

    resp = historico().query(
        KeyConditionExpression=Key("sub").eq(sub),
        ScanIndexForward=False,  # newest first
    )

    items = [
        {
            "title":          item["movieTitle"],
            "recommended-at": item["timestamp"],
        }
        for item in resp.get("Items", [])
    ]
    return ok(items)
