# AGENTS.md

## Quick-start commands

```
make install       # install AWS CLI, SAM CLI, Pulumi, uv
uv sync            # install Python deps from lockfile
uv run pulumi preview --stack dev    # dry-run infra diff
uv run pulumi up --stack dev         # deploy infra to AWS
uv run pytest functions/ -v          # run unit tests (Layer 1 — no Docker/AWS needed)
```

* `make sam` is **broken** — `compose.yaml` was deleted and has not been restored. The SAM/Docker local dev path needs to be rebuilt before `make sam` works again. See Known Issues #1.

## Architecture

- **Monorepo** — Pulumi IaC at `__main__.py` provisions **everything**: DynamoDB tables, Cognito, IAM roles, Lambda functions, API Gateway v2, S3, CloudFront, Route53+certs (prod only).
- **`functions/`** — Lambda source directories, one per endpoint. Each directory contains a handler `.py`, its own `requirements.txt`. Pulumi deploys with `pulumi.FileArchive(f"./functions/{name}")`.
- **Lambda Layer** (`__main__.py:158-175`) — `shared/` modules (`auth.py`, `db.py`, `response.py`) are packaged as a Lambda Layer at `/opt/python/shared/`, not via symlinks. Pulumi creates the layer with `pulumi.AssetArchive`.
- **5 Lambda dirs**, all 5 wired in Pulumi:
  - `recommend` — `recommend.handler` (`__main__.py:275`), GET `/api/v1/recommend`
  - `history` — `history.handler` (`__main__.py:273`), GET `/api/v1/history`
  - `preferences` — `preferences.handler` (`__main__.py:274`), GET+POST `/api/v1/preferences`
  - `watch_later` — `watch_later.handler` (`__main__.py:276`), GET+POST `/api/v1/watch-later`
  - `post_confirm` — `post_confirm.handler` (`__main__.py:186`), Cognito PostConfirmation trigger (no API route, invoked by Cognito on sign-up)
- **Routes** — 7 routes at `__main__.py:341-346`: GET history, GET+POST preferences, GET recommend, GET+POST watch-later. All use JWT authorizer in prod (dev skips auth via `DISABLE_AUTH=1`).
- **`functions/shared/`** — shared library used by all Lambda handlers:
  - `db.py` — DynamoDB table accessors: `users()`, `email_to_sub()`, `tokens()`, `historico()`, `logs()`, `write_log()`, `get_user()`, etc.
  - `auth.py` — extracts Cognito `sub` from `event.requestContext.authorizer.jwt.claims` (validated by API Gateway's JWT authorizer; no in-Lambda JWKS fetch). Also provides `get_method()`. Reads `DISABLE_AUTH` env var for dev mode.
  - `response.py` — HTTP helpers: `ok()`, `created()`, `bad_request()`, `unauthorized()`, `forbidden()`, `not_found()`, `server_error()`. Handles `Decimal` serialization, sets CORS headers.
- **Frontend** — real Next.js 16 + TypeScript + Tailwind v4 app at `frontend/web/` (20+ components, all 10 phases complete). **NOT DEPLOYED** — Pulumi still uploads the stale `www/index.html` placeholder to S3 + CloudFront. See Known Issues #4.
- **Dev stack** (`Pulumi.dev.yaml`): no domain, CloudFront uses default cert.
- **Prod stack** (`Pulumi.prod.yaml`): domain `cinedica.video`, Route53 + ACM (us-east-1) for HTTPS.

## Known issues

1. **Broken `make sam` / SAM local dev** — `compose.yaml` was deleted. `template.yaml` has `CodeUri: function` (should be `functions/`) and references dead `functions/handler.py`. `event.json` payload doesn't match any active Lambda contract. The entire Docker/SAM path is non-functional until a compose file is created and the template is fixed.

2. **Duplicated `_MOCK_CATALOGUE`** — `recommend/recommend.py:28-89` and `watch_later/watch_later.py:17-78` each maintain an independent copy of the 6-movie mock catalogue. Any catalogue update must be edited in both places. Consider moving to `shared/`.

3. **Unused `pyjwt[crypto]` in Lambda requirements** — `functions/recommend/requirements.txt`, `history/requirements.txt`, `preferences/requirements.txt`, and `watch_later/requirements.txt` all declare `pyjwt[crypto]>=2.8,<3` but no handler actually imports JWT. `shared/auth.py` relies on API Gateway's JWT authorizer, not in-Lambda verification.

4. **Frontend deployment gap** — the real frontend at `frontend/web/` (Next.js 16, 20+ components, all phases complete) is not wired to Pulumi. Pulumi uploads `www/index.html` (a dead placeholder that fetches a nonexistent `/date` endpoint). The Next.js app needs a build step and the S3 upload target updated.

5. **Dead code files** — `functions/handler.py` (legacy standalone DynamoDB handler), `template.yaml`, and `event.json` serve no active purpose. They are only referenced by each other in the broken SAM path.

6. **`recommend/__init__.py` exports unused `_resolve_movie`** — line 1 exports `_resolve_movie` but no other module imports it (both `recommend` and `watch_later` have their own copies). Creates misleading coupling.

Full list of known issues at `docs/inconsistencias.md` (several items are stale — many referenced `register`/`login`/`lost_password` Lambdas were deleted in PR #86).

## API conventions

- All routes use prefix `/api/v1/`.
- Responses must use helpers from `shared/response.py` (not raw dicts).
- Auth for protected endpoints: extract Cognito `sub` via `shared/auth.py:get_sub(event)` from `event.requestContext.authorizer.jwt.claims` (injected by API Gateway's JWT authorizer, not decoded in-Lambda).
- Every user-triggered action should call `write_log(sub, timestamp, action, metadata)` from `shared/db.py`.
- DynamoDB table names are suffixed with `_{env}` (e.g. `Users_dev`, `Users_prod`).

## Local dev with SAM + Docker (BROKEN)

- **`compose.yaml`** — does not exist. The file that previously ran `amazon/dynamodb-local` on port 8000 / network `sam-local` was deleted. `Makefile:42` calls `docker compose up -d` which will fail.
- **`template.yaml`** — references `CodeUri: function` (wrong directory) and `Handler: handler.handler` (the legacy `functions/handler.py`). Does not match any active Lambda structure.
- **`event.json`** — test payload `{"sub": "123456", "email": "user@example.com"}` matches the old `handler.py` contract, not any active Lambda's API Gateway v2 event format.
- To restore: create a new `compose.yaml` with `amazon/dynamodb-local`, fix `template.yaml` to point to the desired Lambda, and update `event.json` to match the API Gateway v2 event format (`requestContext.http.method`, `requestContext.authorizer.jwt.claims`, etc.).

## Testing

- **Layer 1 (unit)** — `uv run pytest functions/ -v`. Uses `pytest` + `moto` for DynamoDB. No Docker, no AWS. 63 test cases across 8 files:
  - `shared/`: `test_auth.py` (14), `test_db.py` (7), `test_response.py` (10)
  - `recommend/test_recommend.py` (6), `history/test_history.py` (4)
  - `preferences/test_preferences.py` (8), `watch_later/test_watch_later.py` (7)
  - `post_confirm/test_post_confirm.py` (7)
- Auth-dependent handlers patch `shared.auth.get_sub` via `monkeypatch` (moto doesn't expose Cognito JWKS).
- `conftest.py` adds `functions/` to `sys.path`, sets test DynamoDB table names, provides `setup_dynamodb_tables()` and `seed_user()` helpers.

## Pending / mocked integrations

- **OMDB API** — both `recommend/recommend.py` and `watch_later/watch_later.py` use hardcoded `_MOCK_CATALOGUE` (6 movies). Real OMDB API integration pending (`OMDB_API_KEY` env var, currently read but unused).
- **Frontend deployment** — `frontend/web/` Next.js app needs a build step integrated into the Pulumi pipeline (replace `www/` upload).
- **No CI/CD pipeline** — no `.github/workflows/`, build scripts, or automated deploy flows exist.

## Environment setup

Required env vars (set in Codespace or CI):

```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_DEFAULT_REGION=sa-east-1
PULUMI_ACCESS_TOKEN
```

Use `uv` (not pip/poetry) for package management. The lockfile `uv.lock` is committed.
