# Testing Patterns

**Analysis Date:** 2026-05-04

## Status: No Tests Exist

**The repository currently has no automated tests.** A full filesystem
sweep on 2026-05-04 confirms:

- No `tests/` directory anywhere in the repo (root, `functions/`,
  `frontend/`, or otherwise).
- No `test_*.py` or `*_test.py` files anywhere in the repo.
- No `pytest.ini`, `tox.ini`, `setup.cfg`, `noxfile.py`, or
  `[tool.pytest.*]`/`[tool.coverage.*]` sections in `pyproject.toml`.
- No `Makefile` target invokes a test runner — `make` only handles
  `install`, `sam`, `sam-start`, `sam-stop`, `sam-dynamodb`, and
  `sam-lambda` (see `Makefile`).
- No GitHub Actions workflows or other CI configuration
  (`.github/workflows/` does not exist).
- `.vscode/extensions.json` recommends Python and Black, but no test
  extension.
- No frontend tests (no `package.json`, no Jest/Vitest config) — the
  frontend itself does not exist yet (see `CONVENTIONS.md`'s "Frontend
  Conventions (TBD)" section).

The "Executar rotinas de qualidade antes de publicar a solução"
requirement listed in `README.md` is **not yet satisfied**.

## What Currently Stands In For Tests

The closest things to a test in the codebase today are:

- `event.json` — a sample API Gateway event used to invoke the local
  Lambda via `make sam-lambda`
  (`sam local invoke -t template.yaml -e event.json --docker-network sam-local`).
  This is a **manual smoke harness**, not an automated test.
- `template.yaml` — minimal SAM template that wires `event.json` into a
  single `HandlerFunction` (handler `handler.handler`) for local
  invocation.
- `compose.yaml` — runs DynamoDB Local for manual integration testing
  via `make sam-dynamodb`.
- `functions/handler.py` — a one-off Lambda that creates a DynamoDB
  table and writes an item. It mixes setup and runtime logic and was
  used as a manual probe; treat it as legacy scaffolding rather than a
  template for new code.

## Recommended Test Locations (when adding tests)

Given the existing layout, the conventional Python locations are:

- **Repo-root test tree (recommended for cross-Lambda tests):**
  `tests/` at the repo root, mirroring `functions/`:
  - `tests/conftest.py` — shared fixtures (mocked Cognito, DynamoDB,
    JWT signer).
  - `tests/shared/test_auth.py` — covers
    `functions/shared/auth.py:get_sub`.
  - `tests/shared/test_db.py` — covers
    `functions/shared/db.py` table accessors and `write_log`.
  - `tests/shared/test_response.py` — covers
    `functions/shared/response.py` helpers and
    `Decimal` serialization.
  - `tests/login/test_login.py`,
    `tests/register/test_register.py`,
    `tests/recommend/test_recommend.py`,
    `tests/preferences/test_preferences.py`,
    `tests/watch_later/test_watch_later.py`,
    `tests/history/test_history.py`,
    `tests/change_password/test_change_password.py`,
    `tests/change_email/test_change_email.py`,
    `tests/verify_email/test_verify_email.py`,
    `tests/lost_password/test_lost_password.py`.
- **Pulumi tests:** `tests/infra/test_main.py` for
  `__main__.py` (use `pulumi.runtime.set_mocks` /
  `pulumi.runtime.test`).
- **Per-Lambda colocation (alternative):** a `tests/` folder inside
  each `functions/<name>/` directory. Avoid this approach — it
  conflicts with how Pulumi packages each Lambda directory verbatim
  (`code=pulumi.FileArchive(f"./functions/{name}")` in `__main__.py`),
  which would ship test code into the deployed zip.

## Test Framework

**Runner:**
- None installed. Recommended: **pytest** (idiomatic for Python 3.13,
  works with the existing `uv` dependency manager).
- Add to `pyproject.toml` under a `[dependency-groups]` `test` group
  and run via `uv run pytest`.

**Assertion Library:**
- None installed. pytest's built-in `assert` rewriting is sufficient;
  no need for `unittest.TestCase` or `nose`.

**Run Commands (proposed, none currently work):**
```bash
uv run pytest                     # run all tests
uv run pytest -k <pattern>        # filter by name
uv run pytest --cov=functions     # coverage
```

## Test File Organization (proposed)

**Location:**
- Centralised in `tests/` at the repo root, mirroring the `functions/`
  tree (see "Recommended Test Locations" above). This avoids polluting
  Lambda zips.

**Naming:**
- Files: `test_<module>.py` to align with pytest's default
  `test_*.py` discovery pattern.
- Functions: `test_<scenario>_<expected>` — e.g.
  `test_login_returns_401_for_unknown_user`.

**Structure:**
```
tests/
├── conftest.py
├── shared/
│   ├── test_auth.py
│   ├── test_db.py
│   └── test_response.py
├── login/
│   └── test_login.py
├── register/
│   └── test_register.py
└── ...
```

## Test Structure (proposed pattern, to be adopted)

```python
# tests/login/test_login.py
import json
from unittest.mock import patch

import pytest

from functions.login import login as login_module


@pytest.fixture
def event_factory():
    def _make(body=None, headers=None):
        return {
            "httpMethod": "POST",
            "headers": headers or {},
            "body": json.dumps(body) if body is not None else None,
        }
    return _make


def test_returns_400_when_body_is_invalid_json(event_factory):
    event = {"body": "{not json"}
    resp = login_module.handler(event, None)
    assert resp["statusCode"] == 400
    assert json.loads(resp["body"])["error"] == "Invalid JSON"
```

Patterns to standardise once tests exist:
- Arrange/Act/Assert blocks separated by blank lines.
- One behaviour per test; expressive `test_*` names.
- Reuse an `event_factory` fixture rather than constructing API Gateway
  events inline.

## Mocking

**No mocking framework is currently in use.** When tests are added, the
recommended toolchain is:

- **`moto`** for `boto3` mocks (DynamoDB and Cognito-IDP), since every
  Lambda touches one or both:
  - `@moto.mock_aws` decorator or `with moto.mock_aws():` context
    manager.
  - Pre-create tables with the same hash/range keys as
    `__main__.py`'s `aws.dynamodb.Table` definitions (`Users` ←
    `sub`, `EmailToSub` ← `email`, `Tokens` ← `token`,
    `Historico` ← `(sub, timestamp)`, `Logs` ← `(sub, timestamp)`).
- **`pytest-mock`** (or stdlib `unittest.mock.patch`) for in-process
  patching of `cognito.initiate_auth`, `cognito.admin_create_user`, etc.
- **`PyJWT`** with a locally generated RSA keypair to forge valid JWTs
  for `functions/shared/auth.py:get_sub` tests, or monkey-patch
  `_jwks_client.get_signing_key_from_jwt` directly.

**What to mock:**
- All AWS SDK calls (`boto3.client("cognito-idp")`,
  `boto3.resource("dynamodb")`).
- The Cognito JWKS HTTP fetch in `functions/shared/auth.py`.
- `datetime.now(...)` when assertions depend on timestamps — use
  `freezegun` or inject a clock parameter.

**What NOT to mock:**
- The `shared.response` helpers — they are pure and should be exercised
  directly.
- `json.loads` / `json.dumps` — let them run.
- Validation logic inside handlers — feed real inputs.

## Fixtures and Factories (proposed)

```python
# tests/conftest.py
import os
import boto3
import pytest
from moto import mock_aws


@pytest.fixture(autouse=True)
def aws_env(monkeypatch):
    monkeypatch.setenv("AWS_REGION", "sa-east-1")
    monkeypatch.setenv("USERS_TABLE", "Users")
    monkeypatch.setenv("EMAIL_TO_SUB_TABLE", "EmailToSub")
    monkeypatch.setenv("TOKENS_TABLE", "Tokens")
    monkeypatch.setenv("HISTORICO_TABLE", "Historico")
    monkeypatch.setenv("LOGS_TABLE", "Logs")
    monkeypatch.setenv("COGNITO_USER_POOL_ID", "us-east-1_TEST")
    monkeypatch.setenv("COGNITO_CLIENT_ID", "test-client")


@pytest.fixture
def dynamodb(aws_env):
    with mock_aws():
        ddb = boto3.resource("dynamodb", region_name="sa-east-1")
        ddb.create_table(
            TableName="Users",
            KeySchema=[{"AttributeName": "sub", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "sub", "AttributeType": "S"}],
            BillingMode="PAY_PER_REQUEST",
        )
        # ... other tables
        yield ddb
```

**Location:**
- `tests/conftest.py` for repo-wide fixtures; per-package
  `tests/<area>/conftest.py` for area-specific helpers.

## Coverage

**Requirements:** None enforced. There is no `coverage` config and no
CI gate.

**Suggested target once tests exist:** 80% line coverage on
`functions/shared/` and on each Lambda handler's happy path + primary
failure branches (invalid JSON, missing auth, AWS `ClientError`).

**View coverage (after adopting pytest-cov):**
```bash
uv run pytest --cov=functions --cov-report=term-missing
```

## Test Types

**Unit Tests:**
- Scope: pure helpers and individual handler decision points. Examples
  to write first:
  - `functions/shared/response.py` — every status helper, plus the
    `Decimal` serializer in `_serialize`.
  - `functions/shared/auth.py:get_sub` — missing header, malformed
    Bearer token, expired token, wrong audience, valid token.
  - `functions/recommend/recommend.py:_pick_movie` and
    `_resolve_movie` — empty preferences, unknown genre, valid match.
  - `functions/preferences/preferences.py:_db_to_api` mapping.
- Approach: in-process function calls with mocked AWS SDK.

**Integration Tests:**
- Scope: full handler execution against `moto`-mocked DynamoDB +
  Cognito.
- Approach: use the `dynamodb` fixture above and call
  `module.handler(event, None)`.
- Priority handlers (because they mutate multiple tables and are easy
  to break): `register`, `verify_email`, `change_email`, `watch_later`,
  `recommend`.

**E2E Tests:**
- Not yet applicable. Once a frontend exists, candidates are Playwright
  or Cypress against a Pulumi `dev` stack. Currently the closest E2E
  equivalent is `make sam` + manual `curl` against
  `sam local invoke`.

## Common Patterns (proposed)

**Async Testing:**
- Not applicable today — all handlers are synchronous Python.

**Error Testing:**
```python
def test_change_password_returns_400_for_short_password(
    event_factory, valid_jwt
):
    event = event_factory(body={"password": "abc"}, headers={
        "Authorization": f"Bearer {valid_jwt}",
    })
    resp = change_password.handler(event, None)
    assert resp["statusCode"] == 400
    assert "between 6 and 100" in json.loads(resp["body"])["error"]
```

**AWS `ClientError` simulation:**
```python
from botocore.exceptions import ClientError

def _client_error(code):
    return ClientError(
        {"Error": {"Code": code, "Message": code}},
        "OperationName",
    )

def test_login_maps_NotAuthorizedException_to_401(mocker, event_factory):
    mocker.patch.object(
        login_module.cognito, "initiate_auth",
        side_effect=_client_error("NotAuthorizedException"),
    )
    resp = login_module.handler(
        event_factory(body={"email": "x@x.com", "password": "wrong"}),
        None,
    )
    assert resp["statusCode"] == 401
```

This mirrors the real branching in `functions/login/login.py:43-49`,
`functions/register/register.py:68-74`, and
`functions/change_password/change_password.py:52-56`.

---

*Testing analysis: 2026-05-04*
