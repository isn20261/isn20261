#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUTPUTS_FILE="$REPO_ROOT/volume/isn20261-localstack-outputs.json"

if [ ! -f "$OUTPUTS_FILE" ]; then
  echo "Outputs file not found: $OUTPUTS_FILE" >&2
  echo "Start LocalStack first: docker compose up -d" >&2
  exit 1
fi

token_vars="$(python3 -c 'import json,sys; out=json.load(open(sys.argv[1], "r", encoding="utf-8")); region=out.get("region") or "sa-east-1"; print(region, out["client_id"], out.get("client_secret", "") or "", out["test_email"], out["test_password"], sep="\t")' "$OUTPUTS_FILE")"
IFS=$'\t' read -r REGION CLIENT_ID CLIENT_SECRET EMAIL PASSWORD <<<"$token_vars"

export AWS_ACCESS_KEY_ID="test"
export AWS_SECRET_ACCESS_KEY="test"
export AWS_DEFAULT_REGION="$REGION"

AUTH_PARAMS="USERNAME=$EMAIL,PASSWORD=$PASSWORD"

if [ -n "${CLIENT_SECRET:-}" ]; then
  secret_hash="$(python3 -c 'import base64,hmac,hashlib,sys; username,client_id,client_secret=sys.argv[1:4]; digest=hmac.new(client_secret.encode(), (username+client_id).encode(), hashlib.sha256).digest(); print(base64.b64encode(digest).decode())' "$EMAIL" "$CLIENT_ID" "$CLIENT_SECRET")"
  AUTH_PARAMS="$AUTH_PARAMS,SECRET_HASH=$secret_hash"
fi

token="$(aws cognito-idp initiate-auth \
  --endpoint-url "http://localhost:4566" \
  --region "$REGION" \
  --client-id "$CLIENT_ID" \
  --auth-flow USER_PASSWORD_AUTH \
  --auth-parameters "$AUTH_PARAMS" \
  --query 'AuthenticationResult.IdToken' \
  --output text)"

if [ -z "$token" ] || [ "$token" = "None" ]; then
  echo "Failed to obtain IdToken from Cognito" >&2
  exit 1
fi

# Basic sanity check: JWT should have 3 dot-separated parts
if [[ "$token" != *.*.* ]]; then
  echo "IdToken does not look like a JWT" >&2
  exit 1
fi

echo "$token"
