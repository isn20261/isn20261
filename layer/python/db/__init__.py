"""
Database abstraction module for the movie recommendation platform.

Usage in Lambda functions:
    from db import users, history, logs, tokens, email_sub, auth

Environment variables (set via Lambda config):
    DB_TABLE_EMAIL_SUB  - EmailToSub table name
    DB_TABLE_USERS      - Users table name
    DB_TABLE_TOKENS     - Tokens table name
    DB_TABLE_HISTORY    - History table name
    DB_TABLE_LOGS       - Logs table name
    DYNAMODB_ENDPOINT   - (optional) Local DynamoDB endpoint, e.g. http://localhost:8000
"""

from db import auth, email_sub, history, logs, tokens, users

__all__ = ["users", "email_sub", "tokens", "history", "logs", "auth"]
