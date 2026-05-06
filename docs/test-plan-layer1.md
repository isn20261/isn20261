# Layer 1 Test Plan — pytest + moto

Unit tests for Lambda handlers using `pytest` with `moto` for DynamoDB mocking.
No Docker, no AWS credentials, runs under 2 seconds.

## Dependencies

Add to `pyproject.toml`:

```toml
[dependency-groups]
dev = ["pytest>=8", "moto[cognitoidp,dynamodb]>=5"]
```

Run `uv sync`.

## File structure

```
functions/
├── conftest.py                    # shared fixtures + sys.path fix
├── shared/
│   ├── test_response.py           # 8 cases, pure Python
│   ├── test_db.py                 # 6 cases, moto dynamodb
│   └── test_auth.py               # 3 cases, self-signed JWT
├── recommend/
│   └── test_recommend.py          # 6 cases
├── history/
│   └── test_history.py            # 4 cases
├── preferences/
│   └── test_preferences.py        # 7 cases
└── watch_later/
    └── test_watch_later.py        # 6 cases
```

## conftest.py — shared concerns

### 1. `functions/` on `sys.path`

Required so `watch_later` can import `recommend._resolve_movie`, and so test files
in subdirectories resolve `from shared.db import ...` correctly.

```python
import sys, os
_functions_dir = os.path.dirname(os.path.abspath(__file__))
if _functions_dir not in sys.path:
    sys.path.insert(0, _functions_dir)
```

### 2. DynamoDB table setup (moto)

Fixture that creates all 5 tables (Users, EmailToSub, Tokens, Historico, Logs)
with matching schemas from Pulumi. Optional helper to seed a test user.

### 3. `get_sub` mock helper

Auth-dependent tests patch `shared.auth.get_sub` via `monkeypatch` to return a
known sub or `None`. This avoids the Cognito JWKS problem entirely.

---

## Test cases

### shared/test_response.py — 8 cases (no moto)

| # | Test | Expected |
|---|---|---|
| 1 | `ok({"key": "val"})` | 200, CORS header, valid JSON body |
| 2 | `created()` | 201 |
| 3 | `bad_request()` | 400, `{"error": "Bad Request"}` |
| 4 | `unauthorized()` | 401 |
| 5 | `forbidden()` | 403 |
| 6 | `not_found()` | 404 |
| 7 | `server_error()` | 500 |
| 8 | `Decimal` serialization | `Decimal("9.99")` → `9.99` in body |

### shared/test_db.py — 6 cases (moto)

| # | Test | Expected |
|---|---|---|
| 1 | `get_user(sub)` — found | returns item dict |
| 2 | `get_user(sub)` — missing | `None` |
| 3 | `get_sub_by_email(email)` — found | returns sub string |
| 4 | `get_sub_by_email(email)` — missing | `None` |
| 5 | `write_log(sub, ts, action, meta)` | item exists in Logs table |
| 6 | `get_token(token)` — found/missing | returns item or `None` |

### shared/test_auth.py — 3 cases (self-signed JWT)

| # | Test | Expected |
|---|---|---|
| 1 | Valid Bearer token (self-signed RS256) | returns `sub` claim |
| 2 | Missing Authorization header | `None` |
| 3 | Malformed token | `None` |

**Limitation**: moto does not expose Cognito's JWKS endpoint.
Workaround: generate RSA key pair in the test, sign a JWT manually,
monkeypatch `_jwks_client.get_signing_key_from_jwt` to return that key.

### recommend/test_recommend.py — 6 cases

| # | Scenario | Assertion |
|---|---|---|
| 1 | Anonymous (sub=None) | 200, movie from catalogue, no DB writes |
| 2 | Authenticated, genre prefs match | returned movie from preferred genre |
| 3 | Authenticated, user has no preferences | 200, random from full catalogue |
| 4 | Authenticated, user not in DB | 401 |
| 5 | Authenticated → historico saved | item in Historico table |
| 6 | Authenticated → audit log | item in Logs table |

### history/test_history.py — 4 cases

| # | Scenario | Assertion |
|---|---|---|
| 1 | No auth (sub=None) | 401 |
| 2 | Empty history | 200, `[]` |
| 3 | 3 items seeded | reverse-chronological order |
| 4 | Response shape | only `title` + `recommended-at` (no `genre`) |

### preferences/test_preferences.py — 7 cases

| # | Scenario | Assertion |
|---|---|---|
| 1 | GET — no auth | 401 |
| 2 | GET — user not in DB | 401 |
| 3 | GET — returns prefs | `ageRating` → `age-rating` mapping |
| 4 | POST — single field | 200, DB updated |
| 5 | POST — all fields | 200, all stored + audit log |
| 6 | POST — no fields provided | 400 |
| 7 | POST — `genres` not a list | 400 |

### watch_later/test_watch_later.py — 6 cases

| # | Scenario | Assertion |
|---|---|---|
| 1 | GET — no auth | 401 |
| 2 | GET — user not in DB | 401 |
| 3 | GET — returns items | `{title, added-at}` from watchLater list |
| 4 | POST — movieId in catalogue | 201, title resolved, stored in DB |
| 5 | POST — movieId unknown | 201, movieId used as fallback title |
| 6 | POST — missing/empty movieId | 400 |

---

## Design decisions

| Decision | Why |
|---|---|
| Patch `get_sub`, not Cognito | moto lacks JWKS endpoint; `test_auth.py` covers JWT decode separately |
| `functions/` on `sys.path` | Required for `watch_later`'s `from recommend import _resolve_movie` |
| One `@mock_aws` per test | Ensures table isolation; recreate tables fresh each test |
| `monkeypatch.setenv` before imports | `db.py` reads env vars at module level |

## CI command

```bash
uv run pytest functions/ -v
```

## Known limitations

| Issue | Impact | Mitigation |
|---|---|---|
| Cognito JWKS not mockable via moto | Can't do true E2E JWT validation in unit tests | `test_auth.py` uses self-signed JWT; handler tests patch `get_sub` |
| `watch_later` imports from `recommend` (cross-function) | Would fail at Lambda deploy time | `sys.path` fix in conftest; refactor `_resolve_movie` to `shared/` as follow-up |
| `__main__.py` references deleted `register`/`login` dirs | `pulumi up` will fail | Fix Pulumi IaC before testing deployment |
