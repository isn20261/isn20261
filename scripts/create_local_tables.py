#!/usr/bin/env python3
"""
Create DynamoDB tables on DynamoDB Local for development.

Usage:
    1. Start DynamoDB Local:  docker compose up -d
    2. Run this script:       python scripts/create_local_tables.py
    3. Set env vars and test your Lambda handlers locally.

Environment variables used by the db module (set these for local dev):
    export DYNAMODB_ENDPOINT=http://localhost:8000
    export DB_TABLE_EMAIL_SUB=email-to-sub
    export DB_TABLE_USERS=users
    export DB_TABLE_TOKENS=tokens
    export DB_TABLE_HISTORY=history
    export DB_TABLE_LOGS=logs
"""

import boto3

ENDPOINT = "http://localhost:8000"

client = boto3.client("dynamodb", endpoint_url=ENDPOINT, region_name="sa-east-1")

TABLES = [
    {
        "TableName": "email-to-sub",
        "KeySchema": [{"AttributeName": "email", "KeyType": "HASH"}],
        "AttributeDefinitions": [{"AttributeName": "email", "AttributeType": "S"}],
        "BillingMode": "PAY_PER_REQUEST",
    },
    {
        "TableName": "users",
        "KeySchema": [{"AttributeName": "sub", "KeyType": "HASH"}],
        "AttributeDefinitions": [{"AttributeName": "sub", "AttributeType": "S"}],
        "BillingMode": "PAY_PER_REQUEST",
    },
    {
        "TableName": "tokens",
        "KeySchema": [{"AttributeName": "token", "KeyType": "HASH"}],
        "AttributeDefinitions": [{"AttributeName": "token", "AttributeType": "S"}],
        "BillingMode": "PAY_PER_REQUEST",
    },
    {
        "TableName": "history",
        "KeySchema": [
            {"AttributeName": "sub", "KeyType": "HASH"},
            {"AttributeName": "timestamp", "KeyType": "RANGE"},
        ],
        "AttributeDefinitions": [
            {"AttributeName": "sub", "AttributeType": "S"},
            {"AttributeName": "timestamp", "AttributeType": "S"},
        ],
        "BillingMode": "PAY_PER_REQUEST",
    },
    {
        "TableName": "logs",
        "KeySchema": [
            {"AttributeName": "sub", "KeyType": "HASH"},
            {"AttributeName": "timestamp", "KeyType": "RANGE"},
        ],
        "AttributeDefinitions": [
            {"AttributeName": "sub", "AttributeType": "S"},
            {"AttributeName": "timestamp", "AttributeType": "S"},
        ],
        "BillingMode": "PAY_PER_REQUEST",
    },
]


def main():
    existing = client.list_tables()["TableNames"]
    for table_def in TABLES:
        name = table_def["TableName"]
        if name in existing:
            print(f"  Table '{name}' already exists, skipping.")
        else:
            client.create_table(**table_def)
            print(f"  Created table '{name}'.")
    print("\nAll tables ready. Set these env vars for local development:\n")
    print("export DYNAMODB_ENDPOINT=http://localhost:8000")
    print("export DB_TABLE_EMAIL_SUB=email-to-sub")
    print("export DB_TABLE_USERS=users")
    print("export DB_TABLE_TOKENS=tokens")
    print("export DB_TABLE_HISTORY=history")
    print("export DB_TABLE_LOGS=logs")


if __name__ == "__main__":
    main()
