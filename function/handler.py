import json
import os
import boto3
from botocore.exceptions import ClientError


def handler(event, context):
    endpoint_url = os.environ.get("DYNAMODB_ENDPOINT_URL")
    host = os.environ.get("DYNAMODB_HOST")
    port = os.environ.get("DYNAMODB_PORT", "8000")
    region = os.environ.get("AWS_REGION") or os.environ.get("AWS_DEFAULT_REGION")
    table_name = os.environ.get("DYNAMODB_TABLE", "isn20261")

    resource_kwargs = {"service_name": "dynamodb"}

    if endpoint_url:
        resource_kwargs["endpoint_url"] = endpoint_url
    elif host:
        resource_kwargs["endpoint_url"] = f"http://{host}:{port}"

    if "endpoint_url" in resource_kwargs:
        key_id = os.environ.get("AWS_ACCESS_KEY_ID")
        secret_key = os.environ.get("AWS_SECRET_ACCESS_KEY")
        if key_id:
            resource_kwargs["aws_access_key_id"] = key_id
        if secret_key:
            resource_kwargs["aws_secret_access_key"] = secret_key
        if region:
            resource_kwargs["region_name"] = region
    elif region:
        resource_kwargs["region_name"] = region

    dynamodb = boto3.resource(**resource_kwargs)
    table = dynamodb.Table(table_name)

    tables = [
        {
            "TableName": table_name,
            "AttributeDefinitions": [{"AttributeName": "sub", "AttributeType": "S"}],
            "KeySchema": [{"AttributeName": "sub", "KeyType": "HASH"}],
            "BillingMode": "PAY_PER_REQUEST",
        }
    ]

    for definition in tables:
        try:
            created_table = dynamodb.create_table(**definition)
            created_table.wait_until_exists()
        except ClientError as e:
            if e.response["Error"]["Code"] == "ResourceInUseException":
                print(f"⚠️  Tabela '{definition['TableName']}' já existe")
            else:
                raise

    sub = event.get("sub")
    if not isinstance(sub, str) or not sub.strip():
        return {
            "statusCode": 400,
            "body": json.dumps({"error": "Missing or invalid required field: sub"}),
            "headers": {"Content-Type": "application/json"},
        }

    item = {
        "sub": sub,
        "email": event.get("email", "")
    }

    table.put_item(Item=item)
    result = table.get_item(Key={"sub": sub})
    saved_item = result.get("Item", {})

    return {
        "statusCode": 200,
        "body": json.dumps(saved_item),
        "headers": {"Content-Type": "application/json"},
    }
