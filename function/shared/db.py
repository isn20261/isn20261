import os
import boto3

_resource = boto3.resource("dynamodb")

USERS_TABLE     = os.environ.get("USERS_TABLE",       "Users")
EMAIL_TO_SUB    = os.environ.get("EMAIL_TO_SUB_TABLE", "EmailToSub")
TOKENS_TABLE    = os.environ.get("TOKENS_TABLE",       "Tokens")
HISTORICO_TABLE = os.environ.get("HISTORICO_TABLE",    "Historico")
LOGS_TABLE      = os.environ.get("LOGS_TABLE",         "Logs")


def users():        return _resource.Table(USERS_TABLE)
def email_to_sub(): return _resource.Table(EMAIL_TO_SUB)
def tokens():       return _resource.Table(TOKENS_TABLE)
def historico():    return _resource.Table(HISTORICO_TABLE)
def logs():         return _resource.Table(LOGS_TABLE)


def get_user(sub: str) -> dict | None:
    resp = users().get_item(Key={"sub": sub})
    return resp.get("Item")


def get_sub_by_email(email: str) -> str | None:
    resp = email_to_sub().get_item(Key={"email": email})
    item = resp.get("Item")
    return item["sub"] if item else None


def get_token(token: str) -> dict | None:
    resp = tokens().get_item(Key={"token": token})
    return resp.get("Item")


def write_log(sub: str, timestamp: str, action: str, metadata: dict) -> None:
    logs().put_item(Item={
        "sub": sub,
        "timestamp": timestamp,
        "action": action,
        "metadata": metadata,
    })
