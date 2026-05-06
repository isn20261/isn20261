# AGENTS.md

## Quick-start commands

```
make install       # install AWS CLI, SAM CLI, Pulumi, uv
make sam           # local Lambda invocation with DynamoDB Local (docker compose + SAM)
uv sync            # install Python deps from lockfile
uv run pulumi preview --stack dev    # dry-run infra diff
uv run pulumi up --stack dev         # deploy infra to AWS
uv run pytest functions/ -v          # run unit tests (Layer 1 — no Docker/AWS needed)
```

* `make sam` starts `dynamodb-local` (Docker, port 8000, network `sam-local`), invokes the function via SAM with `event.json`, then tears down.
* `make sam-start` / `make sam-stop` let you run the Docker/SAM steps separately.

## Architecture

- **Monorepo** — Pulumi IaC at `__main__.py` provisions **everything**: DynamoDB tables, Cognito, IAM roles, Lambda functions, API Gateway v2, S3, CloudFront, Route53+certs (prod only).
- **`functions/`** — Lambda source directories, one per endpoint. Each directory contains a handler `.py`, its own `requirements.txt`, and a **`shared/` symlink** vendoring `functions/shared/`. Pulumi deploys with `pulumi.FileArchive(f"./functions/{name}")`.
- **4 Lambda dirs**, only 1 wired in Pulumi:
  - `recommend` — wired in `__main__.py:161` (GET `/api/v1/recommend`, JWT auth optional)
  - `history`, `preferences`, `watch_later` — code exists but **no route/integration** in Pulumi yet
- **`functions/shared/`** — shared library used by all Lambda handlers:
  - `db.py` — DynamoDB table accessors (`users()`, `tokens()`, `logs()`, etc.) and `write_log()`
  - `auth.py` — Cognito JWT decode via `get_sub(event)`, returns `sub` or `None`
  - `response.py` — HTTP helpers: `ok()`, `bad_request()`, `unauthorized()`, etc. (handles `Decimal` serialization)
- **Frontend** (`www/`) is a placeholder `index.html`, served via S3 + CloudFront.
- **Dev stack** (`Pulumi.dev.yaml`): no domain, CloudFront uses default cert.
- **Prod stack** (`Pulumi.prod.yaml`): domain `recommend.movies`, Route53 + ACM (us-east-1) for HTTPS.

## Known issues — fix before deploying

1. **`__main__.py` references deleted dirs** — lines 159-160 try to deploy `register`/`login` Lambdas whose source directories (`functions/register/`, `functions/login/`) were removed in PR #86. `pulumi up` will fail until those lines and routes (lines 213-214) are removed or the directories are re-created.

2. **Env var naming mismatch** — `__main__.py:143-144` sets `USER_POOL_ID` and `CLIENT_ID`, but `shared/auth.py:6-7` reads `COGNITO_USER_POOL_ID` and `COGNITO_CLIENT_ID`. Auth will fail in deployed Lambdas until names are aligned.

3. **Cross-function import** — `watch_later.py:15` does `from recommend import _resolve_movie`. This works locally but will fail at Lambda deploy time because Pulumi packages each function directory independently. Move `_resolve_movie` to `shared/` or duplicate it.

Full list of known issues at `docs/inconsistencias.md` (12 items, some may be stale after PR #86 removed several endpoints).

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

## Testing

- **Layer 1 (unit)** — `uv run pytest functions/ -v`. Uses `pytest` + `moto` for DynamoDB. No Docker, no AWS. Test plan at `docs/test-plan-layer1.md`.
- Auth-dependent handlers patch `shared.auth.get_sub` via `monkeypatch` (moto doesn't expose Cognito JWKS).
- `conftest.py` adds `functions/` to `sys.path` so cross-function imports resolve in tests.

## Pending / mocked integrations

- **`recommend.py`** — uses hardcoded `_MOCK_CATALOGUE`. Real OMDB API integration pending (`OMDB_API_KEY` env var).

## Environment setup

Required env vars (set in Codespace or CI):

```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_DEFAULT_REGION=sa-east-1
PULUMI_ACCESS_TOKEN
```

Use `uv` (not pip/poetry) for package management. The lockfile `uv.lock` is committed.
