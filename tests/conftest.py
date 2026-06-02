import os
import sys

import boto3
import pytest
from moto import mock_aws

# Locate functions/ relative to this conftest (tests/../functions)
_tests_dir = os.path.dirname(os.path.abspath(__file__))
_functions_dir = os.path.normpath(os.path.join(_tests_dir, "..", "functions"))

if _functions_dir not in sys.path:
    sys.path.insert(0, _functions_dir)

# --- Env vars set before any shared module import ---
os.environ["USERS_TABLE"] = "Users_test"
os.environ["EMAIL_TO_SUB_TABLE"] = "EmailToSub_test"
os.environ["TOKENS_TABLE"] = "Tokens_test"
os.environ["HISTORICO_TABLE"] = "Historico_test"
os.environ["LOGS_TABLE"] = "Logs_test"
os.environ["AWS_REGION"] = "sa-east-1"


def setup_dynamodb_tables():
    """Create all 6 DynamoDB tables and patch shared.db._resource.

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


@pytest.fixture(autouse=True)
def _aws_db():
    import shared.movies as movies_module
    movies_module._catalogue = None  # reset cache between tests
    with mock_aws():
        setup_dynamodb_tables()
        yield
    movies_module._catalogue = None


def seed_user(sub, email="user@example.com", preferences=None):
    """Insert a user record. Call inside @mock_aws context."""
    from shared.db import users

    item = {"sub": sub, "email": email}
    if preferences:
        item["preferences"] = preferences
    users().put_item(Item=item)
    return item


def seed_movies():
    """Populate the in-process movie catalogue cache with a small fixture set."""
    import shared.movies as movies_module

    movies_module._catalogue = [
        {
            "movieId": "the-matrix-1999",
            "title": "The Matrix",
            "year": 1999,
            "rated": "R",
            "genre": "action",
            "director": "The Wachowskis",
            "runtime": 136,
            "poster": "https://example.com/matrix.jpg",
            "imdbRating": 8.7,
        },
        {
            "movieId": "interstellar-2014",
            "title": "Interstellar",
            "year": 2014,
            "rated": "PG-13",
            "genre": "sci-fi",
            "director": "Christopher Nolan",
            "runtime": 169,
            "poster": "https://example.com/interstellar.jpg",
            "imdbRating": 8.7,
        },
        {
            "movieId": "inception-2010",
            "title": "Inception",
            "year": 2010,
            "rated": "PG-13",
            "genre": "sci-fi",
            "director": "Christopher Nolan",
            "runtime": 148,
            "poster": "https://example.com/inception.jpg",
            "imdbRating": 8.8,
        },
        {
            "movieId": "the-dark-knight-2008",
            "title": "The Dark Knight",
            "year": 2008,
            "rated": "PG-13",
            "genre": "action",
            "director": "Christopher Nolan",
            "runtime": 152,
            "poster": "https://example.com/darkknight.jpg",
            "imdbRating": 9.0,
        },
        {
            "movieId": "pulp-fiction-1994",
            "title": "Pulp Fiction",
            "year": 1994,
            "rated": "R",
            "genre": "crime",
            "director": "Quentin Tarantino",
            "runtime": 154,
            "poster": "https://example.com/pulpfiction.jpg",
            "imdbRating": 8.9,
        },
        {
            "movieId": "spirited-away-2001",
            "title": "Spirited Away",
            "year": 2001,
            "rated": "PG",
            "genre": "animation",
            "director": "Hayao Miyazaki",
            "runtime": 125,
            "poster": "https://example.com/spiritedaway.jpg",
            "imdbRating": 8.6,
        },
    ]
