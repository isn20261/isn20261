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
os.environ["MOVIES_TABLE"] = "Movies_test"
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
    resource.create_table(
        TableName="Movies_test",
        KeySchema=[{"AttributeName": "movieId", "KeyType": "HASH"}],
        AttributeDefinitions=[{"AttributeName": "movieId", "AttributeType": "S"}],
        BillingMode="PAY_PER_REQUEST",
    )


@pytest.fixture(autouse=True)
def _aws_db():
    with mock_aws():
        setup_dynamodb_tables()
        yield


def seed_user(sub, email="user@example.com", preferences=None):
    """Insert a user record. Call inside @mock_aws context."""
    from shared.db import users

    item = {"sub": sub, "email": email}
    if preferences:
        item["preferences"] = preferences
    users().put_item(Item=item)
    return item


def seed_movies():
    """Insert the 6-movie catalogue into Movies_test. Call inside @mock_aws context."""
    from decimal import Decimal
    from shared.db import movies

    catalogue = [
        {
            "movieId": "tt0133093",
            "title": "The Matrix",
            "year": 1999,
            "rated": "R",
            "genre": "action",
            "director": "The Wachowskis",
            "runtime": 136,
            "poster": "https://image.tmdb.org/t/p/w600_and_h900_face/lDqMDI3xpbB9UQRyeXfei0MXhqb.jpg",
            "imdbRating": Decimal("8.7"),
            "streamingServices": [
                {
                    "name": "Netflix",
                    "image": "https://assets.nflxext.com/us/ffe/siteui/common/icons/nficon2016.ico",
                    "url": "https://www.netflix.com/title/20557937",
                }
            ],
        },
        {
            "movieId": "tt0816692",
            "title": "Interstellar",
            "year": 2014,
            "rated": "PG-13",
            "genre": "sci-fi",
            "director": "Christopher Nolan",
            "runtime": 169,
            "poster": "https://image.tmdb.org/t/p/w600_and_h900_face/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
            "imdbRating": Decimal("8.7"),
            "streamingServices": [
                {
                    "name": "Amazon Prime",
                    "image": "https://www.amazon.com/favicon.ico",
                    "url": "https://www.amazon.com/dp/B00TU9UFTS",
                }
            ],
        },
        {
            "movieId": "tt1375666",
            "title": "Inception",
            "year": 2010,
            "rated": "PG-13",
            "genre": "sci-fi",
            "director": "Christopher Nolan",
            "runtime": 148,
            "poster": "https://image.tmdb.org/t/p/w600_and_h900_face/edv5CZvWj09upOsy2Y6IwDhK8bt.jpg",
            "imdbRating": Decimal("8.8"),
            "streamingServices": [
                {
                    "name": "Netflix",
                    "image": "https://assets.nflxext.com/us/ffe/siteui/common/icons/nficon2016.ico",
                    "url": "https://www.netflix.com/title/70131314",
                }
            ],
        },
        {
            "movieId": "tt0468569",
            "title": "The Dark Knight",
            "year": 2008,
            "rated": "PG-13",
            "genre": "action",
            "director": "Christopher Nolan",
            "runtime": 152,
            "poster": "https://image.tmdb.org/t/p/w600_and_h900_face/qJ2tW6WMUDux911B6EMy6Mcf35.jpg",
            "imdbRating": Decimal("9.0"),
            "streamingServices": [
                {
                    "name": "HBO Max",
                    "image": "https://www.max.com/favicon.ico",
                    "url": "https://www.max.com/movies/dark-knight/07938dc1-3e25-4b2e-b01e-f23b7eed5977",
                }
            ],
        },
        {
            "movieId": "tt0110912",
            "title": "Pulp Fiction",
            "year": 1994,
            "rated": "R",
            "genre": "crime",
            "director": "Quentin Tarantino",
            "runtime": 154,
            "poster": "https://image.tmdb.org/t/p/w600_and_h900_face/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
            "imdbRating": Decimal("8.9"),
            "streamingServices": [
                {
                    "name": "Amazon Prime",
                    "image": "https://www.amazon.com/favicon.ico",
                    "url": "https://www.amazon.com/dp/B001CWSITY",
                }
            ],
        },
        {
            "movieId": "tt0245429",
            "title": "Spirited Away",
            "year": 2001,
            "rated": "PG",
            "genre": "animation",
            "director": "Hayao Miyazaki",
            "runtime": 125,
            "poster": "https://image.tmdb.org/t/p/w600_and_h900_face/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg",
            "imdbRating": Decimal("8.6"),
            "streamingServices": [
                {
                    "name": "Netflix",
                    "image": "https://assets.nflxext.com/us/ffe/siteui/common/icons/nficon2016.ico",
                    "url": "https://www.netflix.com/title/60023642",
                }
            ],
        },
    ]
    for m in catalogue:
        movies().put_item(Item=m)
