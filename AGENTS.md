# AGENTS.md

## Quick-start commands

```
make install       # install AWS CLI, SAM CLI, Pulumi, uv
make sam           # local Lambda invocation with DynamoDB Local (docker compose + SAM)
uv sync            # install Python deps from lockfile
uv run pulumi preview --stack dev    # dry-run infra diff
uv run pulumi up --stack dev         # deploy infra to AWS
```

* `make sam` starts `dynamodb-local` (Docker, port 8000, network `sam-local`), invokes the function via SAM with `event.json`, then tears down.
* `make sam-start` / `make sam-stop` let you run the Docker/SAM steps separately.

## Architecture

- **Monorepo** — Pulumi IaC at `__main__.py` provisions **everything**: DynamoDB tables, Cognito, IAM roles, Lambda functions, API Gateway v2, S3, CloudFront, Route53+certs (prod only).
- **`functions/`** — Lambda source directories, one per endpoint. Each directory contains a handler `.py`, its own `requirements.txt`, and a **`shared/` symlink** vendoring `functions/shared/`. Pulumi deploys with `pulumi.FileArchive(f"./functions/{name}")`.
- **Only 3 of 10 Lambdas are wired** into `__main__.py` (lines 159-161): `register`, `login`, `recommend`. The other 7 (`change_password`, `change_email`, `history`, `lost_password`, `preferences`, `watch_later`, `verify_email`) have code but no route/integration in the Pulumi program.
- **`function/`** (singular) is a legacy copy — ignore it.
- **`functions/shared/`** — shared library used by all Lambda handlers:
  - `db.py` — DynamoDB table accessors (`users()`, `tokens()`, `logs()`, etc.) and `write_log()`
  - `auth.py` — Cognito JWT decode via `get_sub(event)`, returns `sub` or `None`
  - `response.py` — HTTP helpers: `ok()`, `bad_request()`, `unauthorized()`, etc. (handles `Decimal` serialization)
- **Frontend** (`www/`) is a placeholder `index.html`, served via S3 + CloudFront.
- **Dev stack** (`Pulumi.dev.yaml`): no domain, CloudFront uses default cert.
- **Prod stack** (`Pulumi.prod.yaml`): domain `recommend.movies`, Route53 + ACM (us-east-1) for HTTPS.

## Critical gotcha — env var naming mismatch

Pulumi IaC (`__main__.py:143-144`) sets env vars on the Lambda as **`USER_POOL_ID`** and **`CLIENT_ID`**, but the Python code reads:

| File | Env var it reads |
|---|---|
| `shared/auth.py` | `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID` |
| `register/register.py` | `COGNITO_USER_POOL_ID` |
| `login/login.py` | `COGNITO_CLIENT_ID` |

**These don't match.** Auth and Cognito calls in the deployed Lambdas will fail until the names are aligned in one direction or the other.

## Local dev with SAM + Docker

- `compose.yaml` runs `amazon/dynamodb-local` on port 8000, network `sam-local`.
- `template.yaml` references `functions/handler.py` (the old handler, not the per-endpoint ones). It passes `dummy` credentials and `http://dynamodb-local:8000` as the endpoint.
- `event.json` is the test payload: `{"sub": "123456", "email": "user@example.com"}`.
- The DynamoDB table is created on-the-fly inside `handler.py` if it doesn't exist.

## API conventions

- All routes use prefix `/api/v1/`.
- Responses must use helpers from `shared/response.py` (not raw dicts).
- Auth for protected endpoints: extract Cognito `sub` via `shared/auth.py:get_sub(event)` from the `Authorization: Bearer <token>` header.
- Every user-triggered action should call `write_log(sub, timestamp, action, metadata)` from `shared/db.py`.
- DynamoDB table names are suffixed with `_{env}` (e.g. `Users_dev`, `Users_prod`).

## Pending / mocked integrations

- **`recommend.py`** — uses hardcoded `_MOCK_CATALOGUE`. Real OMDB API integration pending (`OMDB_API_KEY` env var).
- **SES email sending** — `register.py` and `lost_password.py` return verification/reset URLs in the response body (with `# TODO` comments). Real SES not yet wired in Pulumi.
- **`/lost-password` flow** — generates a reset token but no `/reset-password` endpoint exists to consume it.
- Full list of known issues at `docs/inconsistencias.md` (12 items).

## Environment setup

Required env vars (set in Codespace or CI):

```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_DEFAULT_REGION=sa-east-1
PULUMI_ACCESS_TOKEN
```

Use `uv` (not pip/poetry) for package management. The lockfile `uv.lock` is committed.
