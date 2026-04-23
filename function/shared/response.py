import json
from decimal import Decimal


def _serialize(obj):
    if isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    raise TypeError(f"Not serializable: {type(obj)}")


def _build(status: int, body=None) -> dict:
    result = {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
    }
    if body is not None:
        result["body"] = json.dumps(body, default=_serialize)
    return result


def ok(body=None):        return _build(200, body)
def created(body=None):   return _build(201, body)
def bad_request(msg="Bad Request"):           return _build(400, {"error": msg})
def unauthorized(msg="Unauthorized"):         return _build(401, {"error": msg})
def forbidden(msg="Forbidden"):               return _build(403, {"error": msg})
def not_found(msg="Not Found"):               return _build(404, {"error": msg})
def server_error(msg="Internal Server Error"): return _build(500, {"error": msg})
