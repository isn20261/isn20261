"""Lambda handler for the /api route, backed by DynamoDB."""

import json
import os
import time
import uuid

import boto3

TABLE_NAME = os.environ["TABLE_NAME"]
dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(TABLE_NAME)


def handler(event, context):
    """Handle API Gateway proxy requests for /api items."""
    http_method = event.get("httpMethod", "GET")

    headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }

    try:
        if http_method == "OPTIONS":
            return {"statusCode": 200, "headers": headers, "body": ""}

        if http_method == "GET":
            result = table.scan()
            items = result.get("Items", [])
            return {
                "statusCode": 200,
                "headers": headers,
                "body": json.dumps({"items": items}),
            }

        if http_method == "POST":
            body = json.loads(event.get("body", "{}"))
            item = {
                "id": str(uuid.uuid4()),
                "content": body.get("content", ""),
                "created_at": str(int(time.time())),
            }
            table.put_item(Item=item)
            return {
                "statusCode": 201,
                "headers": headers,
                "body": json.dumps(item),
            }

        return {
            "statusCode": 405,
            "headers": headers,
            "body": json.dumps({"error": "Method not allowed"}),
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "headers": headers,
            "body": json.dumps({"error": str(e)}),
        }
