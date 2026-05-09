#!/usr/bin/env bash
set -euo pipefail

REGION="${AWS_DEFAULT_REGION:-${AWS_REGION:-sa-east-1}}"
ENV_NAME="${ISN_ENV:-dev}"
OUTPUT_FILE="/var/lib/localstack/isn20261-localstack-outputs.json"

POOL_NAME="isn20261-${ENV_NAME}"
CLIENT_NAME="isn20261-client-${ENV_NAME}"
TEST_EMAIL="test@example.com"
TEST_PASSWORD="Passw0rd!"

# Reuse existing pool if already created.
existing_pool_id="$({ awslocal cognito-idp list-user-pools --region "$REGION" --max-results 60 2>/dev/null || true; } | python - "$POOL_NAME" <<'PY'
import json,sys
raw=sys.stdin.read().strip() or '{}'
try:
  data=json.loads(raw)
except Exception:
  data={}
for p in data.get('UserPools', []) or []:
  if p.get('Name') == sys.argv[1]:
    print(p.get('Id') or '')
    break
PY
)"

if [ -n "$existing_pool_id" ]; then
  USER_POOL_ID="$existing_pool_id"
  echo "[localstack-init] Cognito user pool exists: $USER_POOL_ID"
else
  echo "[localstack-init] Creating Cognito user pool: $POOL_NAME"
  USER_POOL_ID="$(awslocal cognito-idp create-user-pool --region "$REGION" --pool-name "$POOL_NAME" --query 'UserPool.Id' --output text)"
fi

# Create (or reuse) client
existing_client_id="$({ awslocal cognito-idp list-user-pool-clients --region "$REGION" --user-pool-id "$USER_POOL_ID" --max-results 60 2>/dev/null || true; } | python - "$CLIENT_NAME" <<'PY'
import json,sys
raw=sys.stdin.read().strip() or '{}'
try:
  data=json.loads(raw)
except Exception:
  data={}
for c in data.get('UserPoolClients', []) or []:
  if c.get('ClientName') == sys.argv[1]:
    print(c.get('ClientId') or '')
    break
PY
)"

if [ -n "$existing_client_id" ]; then
  CLIENT_ID="$existing_client_id"
  echo "[localstack-init] Cognito client exists: $CLIENT_ID"
else
  echo "[localstack-init] Creating Cognito user pool client: $CLIENT_NAME"
  CLIENT_ID="$(awslocal cognito-idp create-user-pool-client \
    --region "$REGION" \
    --user-pool-id "$USER_POOL_ID" \
    --client-name "$CLIENT_NAME" \
    --generate-secret \
    --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_ADMIN_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH \
    --query 'UserPoolClient.ClientId' --output text)"
fi

# Fetch client secret (if any). If the client was created with --generate-secret,
# USER_PASSWORD_AUTH requires SECRET_HASH.
CLIENT_SECRET="$(awslocal cognito-idp describe-user-pool-client \
  --region "$REGION" \
  --user-pool-id "$USER_POOL_ID" \
  --client-id "$CLIENT_ID" \
  --query 'UserPoolClient.ClientSecret' \
  --output text 2>/dev/null || true)"
if [ "$CLIENT_SECRET" = "None" ]; then
  CLIENT_SECRET=""
fi

# Ensure test user exists
if awslocal cognito-idp admin-get-user --region "$REGION" --user-pool-id "$USER_POOL_ID" --username "$TEST_EMAIL" >/dev/null 2>&1; then
  echo "[localstack-init] Cognito user exists: $TEST_EMAIL"
else
  echo "[localstack-init] Creating Cognito user: $TEST_EMAIL"
  awslocal cognito-idp admin-create-user \
    --region "$REGION" \
    --user-pool-id "$USER_POOL_ID" \
    --username "$TEST_EMAIL" \
    --user-attributes Name=email,Value="$TEST_EMAIL" Name=email_verified,Value=true \
    --message-action SUPPRESS >/dev/null
fi

# Always set password to known value
awslocal cognito-idp admin-set-user-password \
  --region "$REGION" \
  --user-pool-id "$USER_POOL_ID" \
  --username "$TEST_EMAIL" \
  --password "$TEST_PASSWORD" \
  --permanent >/dev/null

# Read the Cognito user's sub (used as DynamoDB PK)
USER_SUB="$(awslocal cognito-idp admin-get-user \
  --region "$REGION" \
  --user-pool-id "$USER_POOL_ID" \
  --username "$TEST_EMAIL" \
  --query 'UserAttributes[?Name==`sub`].Value | [0]' \
  --output text 2>/dev/null || true)"
if [ "$USER_SUB" = "None" ]; then
  USER_SUB=""
fi

# Defaults that work well for local SAM containers (same docker network)
# LocalStack issues tokens with an issuer like: http://localhost.localstack.cloud:4566/<user_pool_id>
COGNITO_ISSUER="http://localhost.localstack.cloud:4566/${USER_POOL_ID}"
LOCALSTACK_HOSTNAME="${LOCALSTACK_HOSTNAME:-localstack-main}"
COGNITO_JWKS_URL_DOCKER="http://${LOCALSTACK_HOSTNAME}:4566/${USER_POOL_ID}/.well-known/jwks.json"
COGNITO_JWKS_URL_HOST="http://localhost:4566/${USER_POOL_ID}/.well-known/jwks.json"

# Seed user records in DynamoDB so authenticated endpoints work.
ENV_NAME="${ENV_NAME:-dev}"
USERS_TABLE="Users_${ENV_NAME}"
EMAIL_TO_SUB_TABLE="EmailToSub_${ENV_NAME}"

if [ -n "$USER_SUB" ]; then
  # Users
  awslocal dynamodb put-item \
    --region "$REGION" \
    --table-name "$USERS_TABLE" \
    --item "{\"sub\":{\"S\":\"$USER_SUB\"},\"email\":{\"S\":\"$TEST_EMAIL\"},\"preferences\":{\"M\":{}},\"watchLater\":{\"L\":[]}}" >/dev/null || true

  # EmailToSub
  awslocal dynamodb put-item \
    --region "$REGION" \
    --table-name "$EMAIL_TO_SUB_TABLE" \
    --item "{\"email\":{\"S\":\"$TEST_EMAIL\"},\"sub\":{\"S\":\"$USER_SUB\"}}" >/dev/null || true
fi

python - <<PY
import json
out={
  "region": "${REGION}",
  "env": "${ENV_NAME}",
  "localstack_hostname": "${LOCALSTACK_HOSTNAME}",
  "user_pool_id": "${USER_POOL_ID}",
  "client_id": "${CLIENT_ID}",
  "client_secret": "${CLIENT_SECRET}",
  "user_sub": "${USER_SUB}",
  "test_email": "${TEST_EMAIL}",
  "test_password": "${TEST_PASSWORD}",
  "issuer": "${COGNITO_ISSUER}",
  "jwks_url_docker": "${COGNITO_JWKS_URL_DOCKER}",
  "jwks_url_host": "${COGNITO_JWKS_URL_HOST}",
}
with open("${OUTPUT_FILE}","w",encoding="utf-8") as f:
  json.dump(out,f,indent=2)
print(f"[localstack-init] Wrote outputs: ${OUTPUT_FILE}")
PY
