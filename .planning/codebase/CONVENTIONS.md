# Coding Conventions

**Analysis Date:** 2026-05-04

This codebase is currently Python-only (Pulumi IaC + AWS Lambda handlers).
A frontend is planned (Next.js + shadcn/ui) but not yet implemented; the
JSX files under `frontend/_design-reference/` are throwaway visual mockups
and **MUST NOT** be treated as project conventions. See the "Frontend
Conventions (TBD)" section at the bottom.

## Naming Patterns

**Files:**
- Lambda module files use `snake_case` and match their parent directory
  name: `functions/change_password/change_password.py`,
  `functions/watch_later/watch_later.py`.
- Shared utilities live under `functions/shared/` with short, lowercase
  module names: `auth.py`, `db.py`, `response.py`.
- The Pulumi entry point is the standard `__main__.py` at the repo root.
- Per-Lambda dependency files are named `requirements.txt` and live next
  to the handler.

**Functions:**
- `snake_case` for all Python functions
  (`get_sub`, `get_sub_by_email`, `write_log`, `create_lambda`,
  `_pick_movie`).
- A leading underscore marks module-private helpers
  (`_serialize`, `_build`, `_db_to_api`, `_get`, `_post`, `_resolve_movie`,
  `_pick_movie`). See `functions/shared/response.py` and
  `functions/preferences/preferences.py`.
- Lambda entry points are uniformly named `handler(event, context)` —
  see every file under `functions/*/`.

**Variables:**
- Local variables: `snake_case`
  (`user_pool_id`, `now_iso`, `token_value`, `expires_at`).
- Module-level constants pulled from environment: `UPPER_SNAKE_CASE`
  (`USER_POOL_ID`, `CLIENT_ID`, `BASE_URL`, `OMDB_API_KEY`, `JWKS_URL`,
  `ISSUER`) — see `functions/shared/auth.py`,
  `functions/register/register.py`.
- Module-level "private" caches/singletons: leading underscore
  (`_jwks_client` in `functions/shared/auth.py`,
  `_resource` in `functions/shared/db.py`,
  `_MOCK_CATALOGUE` and `_GENRE_INDEX` in
  `functions/recommend/recommend.py`).

**API payload keys (HTTP I/O):**
- Mixed convention — be careful and follow what each handler already does:
  - `camelCase` for most JSON fields
    (`movieId`, `accessToken`, `refreshToken`, `verifyEmailUrl`,
    `emailVerified`, `watchLater`, `addedAt`, `expiresAt`).
  - `kebab-case` is used in a few API-facing fields explicitly:
    `age-rating`, `streaming-services`, `recommended-at`, `added-at`.
- DynamoDB attribute keys are `camelCase` (`ageRating`, `addedAt`,
  `movieTitle`, `emailVerified`, `updatedAt`, `createdAt`).
- Mapping between DB-side `camelCase` and API-side `kebab-case` is done
  explicitly in helpers like `_db_to_api()` in
  `functions/preferences/preferences.py`.

**Types/classes:**
- No project-defined classes yet. AWS SDK objects (e.g. `ClientError`,
  `PyJWKClient`) follow vendor naming (`PascalCase`).

## Code Style

**Formatting:**
- No formatter is configured at the repo level (no `pyproject.toml`
  `[tool.black]` / `[tool.ruff]` section, no `ruff.toml`, no `.pre-commit-config.yaml`).
- `.vscode/extensions.json` recommends `ms-python.black-formatter`, so
  Black is the de facto formatter for editor-level formatting, but it is
  **not enforced**.
- Existing code visibly uses **4-space indentation**, **double quotes**
  for strings, and **PEP 8 line lengths** with occasional column-aligned
  blocks (e.g. aligned `=` in env-var blocks at the top of
  `functions/shared/db.py`, response helpers in
  `functions/shared/response.py`). When editing those files, keep the
  alignment; otherwise stick to plain Black-style formatting.

**Linting:**
- No linter is configured (`ruff`, `flake8`, `pylint`, `mypy` are all
  absent from `pyproject.toml`, `Makefile`, and `.vscode/`).
- Treat PEP 8 as the implicit standard.

**Type hints:**
- Type hints are used selectively, mostly on shared helpers and module
  boundaries (`functions/shared/auth.py`, `functions/shared/db.py`,
  `functions/shared/response.py`, `_resolve_movie`, `_pick_movie`).
- Style is **modern PEP 604 unions** (`str | None`, `dict | None`) and
  built-in generics (`list[dict]`, `dict[str, list[dict]]`), enabled by
  `requires-python = ">=3.13"` in `pyproject.toml`.
- `event` and `context` on Lambda handlers are intentionally untyped
  (`def handler(event, context):`) — match this when adding new handlers.

**Python version:**
- Target Python **3.13** (`pyproject.toml` and `runtime="python3.13"` in
  `__main__.py`'s `create_lambda` helper). Do not introduce
  `typing.Optional`/`typing.Union` syntax — prefer `X | None`.

## Import Organization

**Order (observed across all handlers):**
1. Standard-library imports (`json`, `os`, `secrets`, `random`, `datetime`).
2. Third-party imports (`boto3`, `botocore.exceptions.ClientError`,
   `jwt`, `pulumi`, `pulumi_aws`).
3. Local imports from the lambda's `shared/` package
   (`from shared.db import ...`, `from shared.auth import ...`,
   `from shared.response import ...`).

Each group is separated by a blank line.

Examples to follow: `functions/login/login.py`,
`functions/register/register.py`, `functions/change_password/change_password.py`.

**Path aliases:**
- None. Lambdas import the `shared` package directly because each Lambda
  zip is built with `code=pulumi.FileArchive("./functions/<name>")` and
  `shared/` is added to the package at build time. When adding new
  handlers, import as `from shared.<module> import <name>`.

**Cross-Lambda imports:**
- `functions/watch_later/watch_later.py` imports
  `from recommend import _resolve_movie`. This works only because the
  package layout colocates them inside the same archive when packaged.
  Avoid adding new cross-Lambda imports without first checking the
  packaging story in `__main__.py`.

## Error Handling

**Top-level pattern in every HTTP Lambda handler:**

```python
def handler(event, context):
    sub = get_sub(event)            # auth-gated handlers only
    if not sub:
        return unauthorized()

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return bad_request("Invalid JSON")

    # ... validation, returning bad_request(...) on each failed check ...

    try:
        resp = cognito.<some_call>(...)
    except ClientError as exc:
        code = exc.response["Error"]["Code"]
        if code == "InvalidPasswordException":
            return bad_request("Password does not meet requirements")
        if code in ("NotAuthorizedException", "UserNotFoundException"):
            return unauthorized("Invalid credentials")
        return server_error("Could not <do thing>")
    ...
```

**Conventions:**
- Always return through the helpers in `functions/shared/response.py`
  (`ok`, `created`, `bad_request`, `unauthorized`, `forbidden`,
  `not_found`, `server_error`). Never hand-craft a response dict in a
  handler.
- Validate inputs with explicit `if ...: return bad_request(...)` chains
  (see `functions/register/register.py` lines 36–41 for the canonical
  example: name length, email format, password length).
- Translate AWS `ClientError` codes into specific HTTP responses; fall
  back to `server_error(...)` with a human-readable message when no
  branch matches (see `functions/login/login.py`,
  `functions/change_password/change_password.py`,
  `functions/register/register.py`).
- Email enumeration is intentionally avoided in
  `functions/lost_password/lost_password.py` — always return `ok()` even
  on missing user. Match this behaviour for any future password-reset
  flow.
- `functions/shared/auth.py:36` swallows all exceptions
  (`except (InvalidTokenError, Exception):`). This is overly broad and
  is documented as a concern; do not copy it into new code.

**Anti-patterns to avoid (currently present):**
- `print(...)` for diagnostics: only `functions/handler.py:51` does this
  (a leftover dev script). Do not introduce `print` in production
  Lambdas — AWS provides `logging` natively.
- Bare `raise` to bubble up unrecognised errors is acceptable when you
  truly cannot handle the case (`functions/handler.py:53`), but always
  prefer mapping to `server_error(...)` in HTTP handlers so callers get
  a consistent JSON shape.

## Logging

**Framework:** None configured. The codebase has no use of the
`logging` module and no logger setup.

**Application audit log (DynamoDB):**
- Every state-changing handler calls
  `write_log(sub, timestamp, action, metadata)` from
  `functions/shared/db.py`. This persists to the `Logs` DynamoDB table.
- `action` is an `UPPER_SNAKE_CASE` verb describing the operation:
  `LOGIN`, `REGISTER`, `EMAIL_VERIFIED`, `EMAIL_CHANGED`,
  `CHANGE_EMAIL_REQUESTED`, `PASSWORD_CHANGED`,
  `PASSWORD_RESET_REQUESTED`, `PREFERENCES_UPDATED`,
  `WATCH_LATER_ADDED`, `RECOMMEND`. When adding new handlers, keep this
  pattern and reuse existing verbs where possible.
- `timestamp` is always
  `datetime.now(timezone.utc).isoformat()`. Compute it once into a
  `now_iso` (or `now`) local and reuse it for both `updatedAt` and the
  log row.
- `metadata` is a dict of relevant fields. Avoid logging secrets,
  passwords, or full tokens — current code logs only emails, movie IDs,
  and similar non-sensitive identifiers.

**stdout / CloudWatch:**
- There is currently no convention. `print` is used once
  (`functions/handler.py:51`) and should not be propagated. If you need
  CloudWatch diagnostics, introduce
  `logger = logging.getLogger(__name__)` at module scope and stick to
  `logger.info / logger.warning / logger.exception` — but coordinate
  this as a cross-cutting change rather than ad-hoc per file.

## Comments

**When to comment:**
- Module-level docstring on every Lambda handler module describing:
  HTTP method + path, auth requirement, required IAM permissions, and
  required environment variables. Examples to copy:
  `functions/register/register.py:1-9`,
  `functions/login/login.py:1-10`,
  `functions/change_email/change_email.py:1-10`,
  `functions/recommend/recommend.py:1-14`.
- Pulumi sections in `__main__.py` are separated by numbered banner
  comments: `# --- 1. ...`, `# --- 2. ...`, etc. Keep this style when
  extending the stack.

**JSDoc/TSDoc:**
- Not applicable.

**Docstrings:**
- One-line `"""..."""` docstrings on private helpers are common and
  appreciated (e.g. `_resolve_movie`, `_pick_movie`, `get_sub`). No
  formal style (Google/NumPy/reST) is enforced; current docstrings are
  free-form English prose.
- Inline comments are used sparingly to flag intent (e.g.
  `# may be None for anonymous requests` in
  `functions/recommend/recommend.py:112`,
  `# extends Token schema — see inconsistencias.md` in
  `functions/change_email/change_email.py:60`). Cross-reference
  `docs/inconsistencias.md` whenever you deliberately deviate from the
  documented schema.

## Function Design

**Size:**
- Handlers are typically 30–100 lines. The largest single handler is
  `functions/verify_email/verify_email.py` (~100 lines) because it
  multiplexes two flows; if a new handler exceeds ~100 lines, extract
  helpers (see how `preferences.py` and `watch_later.py` split into
  `_get(sub)` and `_post(event, sub)`).

**Parameters:**
- Lambda entry points always take exactly `(event, context)`.
- Helper functions take primitive Python types (`sub: str`,
  `prefs: dict`, `event: dict`). Keyword-only arguments are not
  currently used but are encouraged for boolean flags.

**Return values:**
- HTTP handlers always return the dict produced by a helper in
  `functions/shared/response.py`. Never `return None` from a handler.
- Internal helpers return either a domain dict or `None` for "not
  found" / "invalid token" cases (see
  `functions/shared/auth.py:get_sub`,
  `functions/shared/db.py:get_user`,
  `functions/shared/db.py:get_token`).

## Module Design

**Exports:**
- Modules expose plain top-level functions; no `__all__` lists are
  used.
- `functions/shared/__init__.py` is **empty** (verified) — `shared` is a
  package marker only. Do not add re-exports here without discussion;
  keep imports explicit (`from shared.db import users, write_log`).

**Barrel files:**
- Not used. Each consumer imports the specific module it needs.

**Module-level state:**
- AWS SDK clients/resources are constructed once at module import to
  benefit from Lambda warm-container reuse:
  - `cognito = boto3.client("cognito-idp")` in `register.py`,
    `login.py`, `change_password.py`, `verify_email.py`.
  - `_resource = boto3.resource("dynamodb", ...)` in
    `functions/shared/db.py`.
  - `_jwks_client = PyJWKClient(..., cache_jwk_set=True, lifespan=3600)`
    in `functions/shared/auth.py`.
  Always follow this pattern in new handlers — never construct AWS
  clients inside `handler()`.

## Date / Time

- All timestamps are timezone-aware UTC ISO 8601 strings produced by
  `datetime.now(timezone.utc).isoformat()`.
- For TTL/expiry, use `(datetime.now(timezone.utc) + timedelta(...))
  .isoformat()` — see
  `functions/register/register.py:77`,
  `functions/change_email/change_email.py:52`,
  `functions/lost_password/lost_password.py:43`.
- Do not use `datetime.utcnow()` (deprecated naive datetime).

## Token / Secret Generation

- Use `secrets.token_hex(32)` for one-time tokens (64-char hex). This
  produces a uniform 64-character token validated server-side as
  `len(token) == 64` in `functions/verify_email/verify_email.py:30`. Do
  not change the length without updating that validator.

## Configuration

- Read configuration via `os.environ` with sane defaults at module
  scope. Two patterns coexist; both are acceptable:
  - **Required**, fail-fast: `os.environ["COGNITO_CLIENT_ID"]`
    (`functions/login/login.py`,
    `functions/register/register.py`).
  - **Optional with default**:
    `os.environ.get("BASE_URL", "https://...")`,
    `os.environ.get("AWS_REGION", "sa-east-1")`. Use this whenever a
    handler must still function with the default.

## Repo / Tooling Notes

- Dependency manager: `uv` (lockfile is `uv.lock`); install instructions
  in `Makefile`.
- Local stack: `make sam` brings up `compose.yaml` (DynamoDB Local) and
  `sam local invoke -t template.yaml -e event.json`.
- Per-Lambda dependencies are duplicated as `boto3` in each
  `functions/*/requirements.txt`. When adding a Lambda that needs an
  extra package (e.g. `pyjwt` for `shared/auth.py` consumers), add it to
  that Lambda's `requirements.txt`.

---

## Frontend Conventions (TBD)

The frontend has not yet been built. Key facts:

- `frontend/_design-reference/*.jsx` is **throwaway mockup code** used
  to prototype the visual design. Files include `app.jsx`, `auth.jsx`,
  `data.jsx`, `home.jsx`, `detail.jsx`, `history-queue.jsx`,
  `preferences.jsx`, `shared.jsx`, `tweaks-panel.jsx`,
  `design-canvas.jsx`, `icons.jsx`, plus `styles.css` and
  `Recommend-a.html`. **Do not** mine these for conventions, and do not
  copy their inline styles, ad-hoc state shapes, or `React.useState`
  patterns into the real app.
- The **planned** stack is **Next.js + shadcn/ui** (see the
  parent project plan / orchestrator notes). Conventions for
  components, hooks, file layout, styling (Tailwind), and forms will be
  established when that work starts and recorded here.
- `www/` currently holds a single `index.html` placeholder served via
  S3 + CloudFront from `__main__.py`. It is not the eventual frontend.

When the Next.js scaffold lands, this section should be replaced with
real conventions covering: file/component naming, server vs. client
components, form-state management, fetch/SWR patterns, error
boundaries, Tailwind class ordering, and shadcn import paths.

---

*Convention analysis: 2026-05-04*
