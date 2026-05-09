#!/usr/bin/env bash
set -euo pipefail

REGION="${AWS_DEFAULT_REGION:-${AWS_REGION:-sa-east-1}}"
ENV_NAME="${ISN_ENV:-dev}"

users_table="Users_${ENV_NAME}"
email_to_sub_table="EmailToSub_${ENV_NAME}"
tokens_table="Tokens_${ENV_NAME}"
historico_table="Historico_${ENV_NAME}"
logs_table="Logs_${ENV_NAME}"

# Wait for DynamoDB to be responsive (LocalStack health may go green slightly
# before every service is ready).
for i in $(seq 1 30); do
  if awslocal dynamodb list-tables --region "$REGION" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

create_table_if_missing() {
  local table_name="$1"
  shift
  if awslocal dynamodb describe-table --region "$REGION" --table-name "$table_name" >/dev/null 2>&1; then
    echo "[localstack-init] DynamoDB table exists: $table_name"
    return 0
  fi

  echo "[localstack-init] Creating DynamoDB table: $table_name"
  # Table might already exist (e.g., volume persisted) or be in CREATING state.
  # Treat ResourceInUseException as success.
  set +e
  create_out=$(awslocal dynamodb create-table --region "$REGION" --table-name "$table_name" "$@" --billing-mode PAY_PER_REQUEST 2>&1)
  rc=$?
  set -e
  if [ $rc -ne 0 ]; then
    if echo "$create_out" | grep -q "ResourceInUseException"; then
      echo "[localstack-init] DynamoDB table already exists: $table_name"
      return 0
    fi
    echo "$create_out" >&2
    return $rc
  fi
}

create_table_if_missing "$users_table" \
  --attribute-definitions AttributeName=sub,AttributeType=S \
  --key-schema AttributeName=sub,KeyType=HASH

create_table_if_missing "$email_to_sub_table" \
  --attribute-definitions AttributeName=email,AttributeType=S \
  --key-schema AttributeName=email,KeyType=HASH

create_table_if_missing "$tokens_table" \
  --attribute-definitions AttributeName=token,AttributeType=S \
  --key-schema AttributeName=token,KeyType=HASH

create_table_if_missing "$historico_table" \
  --attribute-definitions AttributeName=sub,AttributeType=S AttributeName=timestamp,AttributeType=S \
  --key-schema AttributeName=sub,KeyType=HASH AttributeName=timestamp,KeyType=RANGE

create_table_if_missing "$logs_table" \
  --attribute-definitions AttributeName=sub,AttributeType=S AttributeName=timestamp,AttributeType=S \
  --key-schema AttributeName=sub,KeyType=HASH AttributeName=timestamp,KeyType=RANGE
