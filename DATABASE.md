# Database Module (`db`)

Shared DynamoDB abstraction layer packaged as a Lambda Layer. Any Lambda function in this project can import it.

## Architecture

```
layer/python/db/        ← Lambda Layer source (auto-deployed by Pulumi)
├── __init__.py         ← Re-exports all modules
├── client.py           ← DynamoDB connection (local or AWS)
├── auth.py             ← Password hashing (PBKDF2, no external deps)
├── email_sub.py        ← Email ↔ Sub mapping
├── users.py            ← User profiles & preferences
├── tokens.py           ← Email verification & password reset tokens (TTL)
├── history.py          ← Movie recommendation history
└── logs.py             ← User action audit log
```

## Tables

| Table      | Partition Key | Sort Key    | TTL         | Purpose                        |
|------------|---------------|-------------|-------------|--------------------------------|
| email-to-sub | `email` (S) | —           | —           | Lookup sub by email            |
| users      | `sub` (S)     | —           | —           | User profile, preferences      |
| tokens     | `token` (S)   | —           | `expiresAt` | Verify-email, reset-password   |
| history    | `sub` (S)     | `timestamp` (S) | —       | Movie recommendation log       |
| logs       | `sub` (S)     | `timestamp` (S) | —       | All user actions               |

## Using in Your Lambda Function

### 1. Add the layer and env vars in `__main__.py`

The existing `fn` Lambda already has the layer attached. For **new** Lambda functions:

```python
my_fn = aws.lambda_.Function("my-fn",
    runtime="python3.9",
    handler="my_handler.handler",
    role=role.arn,
    code=pulumi.FileArchive("./my_function"),
    layers=[db_layer.arn],                              # ← attach the layer
    environment=aws.lambda_.FunctionEnvironmentArgs(
        variables=db_table_names,                       # ← pass all table names
    ),
)
```

### 2. Import and use in your handler

```python
from db import users, email_sub, history, logs, tokens, auth

def handler(event, context):
    # Create a user
    password_hash = auth.hash_password("s3cret")
    users.create(sub="abc-123", email="user@example.com", password_hash=password_hash)

    # Look up sub by email
    sub = email_sub.get_sub("user@example.com")

    # Record a recommendation
    history.add(sub="abc-123", movie_title="Inception")

    # Get watch history
    items = history.get_all(sub="abc-123", limit=10)

    # Log an action
    logs.add(sub="abc-123", action="recommend", metadata={"movie": "Inception"})

    # Update preferences
    users.update_preferences(sub="abc-123", preferences={
        "streamingServices": ["Netflix", "Prime"],
        "mood": "happy",
        "ageRating": "PG-13",
    })

    # Add to watch later
    users.add_to_watch_later(sub="abc-123", movie="The Matrix")

    # Verify a password
    user = users.get(sub="abc-123")
    if auth.verify_password("s3cret", user["passwordHash"]):
        print("Authenticated!")

    return {"statusCode": 200, "body": "ok"}
```

## Local Development

### 1. Start DynamoDB Local

```bash
docker compose up -d
```

### 2. Create tables

```bash
pip install boto3
python scripts/create_local_tables.py
```

### 3. Set environment variables

```bash
export DYNAMODB_ENDPOINT=http://localhost:8000
export DB_TABLE_EMAIL_SUB=email-to-sub
export DB_TABLE_USERS=users
export DB_TABLE_TOKENS=tokens
export DB_TABLE_HISTORY=history
export DB_TABLE_LOGS=logs
```

### 4. Test your handler locally

```python
# test_local.py
import os
os.environ["DYNAMODB_ENDPOINT"] = "http://localhost:8000"
os.environ["DB_TABLE_USERS"] = "users"
# ... set all table env vars ...

import sys
sys.path.insert(0, "layer/python")  # so 'from db import ...' works locally

from db import users, auth
users.create("test-sub", "test@test.com", auth.hash_password("123"))
print(users.get("test-sub"))
```

## API Reference

### `db.auth`
- `hash_password(password: str) -> str` — Returns `"salt:hash"` hex string
- `verify_password(password: str, stored_hash: str) -> bool`

### `db.email_sub`
- `put(email, sub)` — Link email to sub
- `get_sub(email) -> str | None` — Lookup sub by email
- `delete(email)` — Remove mapping

### `db.users`
- `create(sub, email, password_hash)` — New user (fails if exists)
- `get(sub) -> dict | None` — Get user profile
- `update(sub, **fields)` — Update any fields
- `delete(sub)` — Delete user
- `update_preferences(sub, preferences: dict)` — Replace preferences
- `add_to_watch_later(sub, movie: str)` — Append to watch list
- `remove_from_watch_later(sub, movie: str)` — Remove from watch list

### `db.tokens`
- `create(token, sub, token_type, expires_at)` — Create with TTL (epoch seconds)
- `get(token) -> dict | None` — Get if not expired
- `delete(token)` — Delete after use

### `db.history`
- `add(sub, movie_title, timestamp=None)` — Record recommendation
- `get_all(sub, limit=None) -> list[dict]` — Newest first
- `get_range(sub, start, end) -> list[dict]` — Between two ISO timestamps

### `db.logs`
- `add(sub, action, metadata=None, timestamp=None)` — Log an action
- `get_all(sub, limit=None) -> list[dict]` — Newest first
- `get_by_action(sub, action) -> list[dict]` — Filter by action type

## Switching Local ↔ Production

The **only** difference is the `DYNAMODB_ENDPOINT` environment variable:

| Environment | `DYNAMODB_ENDPOINT`         | Table names                       |
|-------------|----------------------------|-----------------------------------|
| Local dev   | `http://localhost:8000`     | Fixed: `users`, `logs`, etc.      |
| AWS (Pulumi)| *not set*                  | Pulumi-generated (auto via env vars) |

When deployed via Pulumi, the table names are set automatically. Locally, you set them yourself to the plain names used in `create_local_tables.py`.
