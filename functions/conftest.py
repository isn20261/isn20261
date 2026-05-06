import os
import sys

import boto3

# --- Ensure functions/ is importable ---
_functions_dir = os.path.dirname(os.path.abspath(__file__))
if _functions_dir not in sys.path:
    sys.path.insert(0, _functions_dir)

# --- Skip symlinked shared/ copies under handler directories ---
# Each handler dir has `shared -> ../shared`. This avoids running the
# same shared tests 5 times (once per symlink + once for the real dir).
_real_shared_dir = os.path.realpath(os.path.join(_functions_dir, "shared"))


def pytest_ignore_collect(collection_path, config):
    path_str = str(collection_path)
    # Only intercept dirs that look like functions/*/shared (one level deep)
    if path_str.endswith("/shared") and path_str.count(os.sep) == _functions_dir.count(os.sep) + 2:
        if os.path.realpath(path_str) == _real_shared_dir:
            return True
    return None


# --- Env vars set before any shared module import ---
os.environ["COGNITO_USER_POOL_ID"] = "test-pool-id"
os.environ["COGNITO_CLIENT_ID"] = "test-client-id"
os.environ["USERS_TABLE"] = "Users_test"
os.environ["EMAIL_TO_SUB_TABLE"] = "EmailToSub_test"
os.environ["TOKENS_TABLE"] = "Tokens_test"
os.environ["HISTORICO_TABLE"] = "Historico_test"
os.environ["LOGS_TABLE"] = "Logs_test"
os.environ["AWS_REGION"] = "sa-east-1"


def setup_dynamodb_tables():
    """Create all 5 DynamoDB tables and patch shared.db._resource.

    Must be called inside a @mock_aws context.  Replaces the module-level
    boto3 resource in shared.db so that the accessor functions (users(),
    historico(), etc.) use the mock backend.
    """
    import shared.db as db_module

    resource = boto3.resource("dynamodb", region_name="sa-east-1")
    db_module._resource = resource

    resource.create_table(
        TableName="Users_test",
        KeySchema=[{"AttributeName": "sub", "KeyType": "HASH"}],
        AttributeDefinitions=[{"AttributeName": "sub", "AttributeType": "S"}],
        BillingMode="PAY_PER_REQUEST",
    )
    resource.create_table(
        TableName="EmailToSub_test",
        KeySchema=[{"AttributeName": "email", "KeyType": "HASH"}],
        AttributeDefinitions=[{"AttributeName": "email", "AttributeType": "S"}],
        BillingMode="PAY_PER_REQUEST",
    )
    resource.create_table(
        TableName="Tokens_test",
        KeySchema=[{"AttributeName": "token", "KeyType": "HASH"}],
        AttributeDefinitions=[{"AttributeName": "token", "AttributeType": "S"}],
        BillingMode="PAY_PER_REQUEST",
    )
    resource.create_table(
        TableName="Historico_test",
        KeySchema=[
            {"AttributeName": "sub", "KeyType": "HASH"},
            {"AttributeName": "timestamp", "KeyType": "RANGE"},
        ],
        AttributeDefinitions=[
            {"AttributeName": "sub", "AttributeType": "S"},
            {"AttributeName": "timestamp", "AttributeType": "S"},
        ],
        BillingMode="PAY_PER_REQUEST",
    )
    resource.create_table(
        TableName="Logs_test",
        KeySchema=[
            {"AttributeName": "sub", "KeyType": "HASH"},
            {"AttributeName": "timestamp", "KeyType": "RANGE"},
        ],
        AttributeDefinitions=[
            {"AttributeName": "sub", "AttributeType": "S"},
            {"AttributeName": "timestamp", "AttributeType": "S"},
        ],
        BillingMode="PAY_PER_REQUEST",
    )


def seed_user(sub, email="user@example.com", preferences=None):
    """Insert a user record. Call inside @mock_aws context."""
    from shared.db import users

    item = {"sub": sub, "email": email}
    if preferences:
        item["preferences"] = preferences
    users().put_item(Item=item)
    return item
