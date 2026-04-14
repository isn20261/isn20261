"""
DynamoDB client configuration.

Set DYNAMODB_ENDPOINT to use DynamoDB Local (e.g. http://localhost:8000).
When unset, uses the real AWS DynamoDB service.
"""

import os

import boto3

_ENDPOINT = os.environ.get("DYNAMODB_ENDPOINT")


def _get_resource():
    kwargs = {}
    if _ENDPOINT:
        kwargs["endpoint_url"] = _ENDPOINT
        kwargs["region_name"] = os.environ.get("AWS_DEFAULT_REGION", "sa-east-1")
    return boto3.resource("dynamodb", **kwargs)


resource = _get_resource()


def get_table(env_var: str):
    """Get a DynamoDB Table object by its environment variable name."""
    table_name = os.environ.get(env_var)
    if not table_name:
        raise RuntimeError(f"Environment variable {env_var} is not set")
    return resource.Table(table_name)
