import argparse
import json


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--path", required=True)
    p.add_argument("--method", default="GET")
    p.add_argument("--token", default="")
    p.add_argument("--body", default="")
    args = p.parse_args()

    headers = {}
    if args.token:
        headers["Authorization"] = f"Bearer {args.token}"

    event = {
        "resource": args.path,
        "path": args.path,
        "httpMethod": args.method.upper(),
        "headers": headers,
        "multiValueHeaders": {},
        "queryStringParameters": None,
        "multiValueQueryStringParameters": None,
        "pathParameters": None,
        "stageVariables": None,
        "requestContext": {},
        "body": args.body or None,
        "isBase64Encoded": False,
    }
    print(json.dumps(event))


if __name__ == "__main__":
    main()
