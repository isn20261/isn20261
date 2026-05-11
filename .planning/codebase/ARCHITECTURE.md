<!-- refreshed: 2026-05-04 -->
# Architecture

**Analysis Date:** 2026-05-04

## System Overview

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                              End User                                   │
│              (browser / mobile — see frontend/_design-reference)        │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │ HTTPS
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    CloudFront Distribution (cdn-{env})                  │
│  - Default behavior  → S3 (frontend assets, long cache)                 │
│  - /api/v1/*         → API Gateway (no cache, forward Authorization)    │
│  Configured in `__main__.py` (sections "Frontend: S3" and "Distribuição")│
└─────────┬─────────────────────────────────┬─────────────────────────────┘
          │                                 │
          ▼                                 ▼
┌──────────────────────────┐     ┌────────────────────────────────────────┐
│   S3 frontend bucket     │     │   API Gateway v2 (HTTP API)            │
│   `frontend-bucket-{env}`│     │   `http-api-{env}`                     │
│   Source: `www/`         │     │   Routes prefixed `/api/v1/`           │
│   (uploaded recursively  │     │   JWT Authorizer = Cognito User Pool   │
│    by `__main__.py`)     │     │   `__main__.py` lines 164–219          │
└──────────────────────────┘     └─────────────────┬──────────────────────┘
                                                   │ AWS_PROXY integration
                                                   ▼
                                 ┌────────────────────────────────────────┐
                                 │           AWS Lambda functions         │
                                 │  python3.13 — one per endpoint         │
                                 │  Code: `functions/<name>/<name>.py`    │
                                 │  Common code: `functions/shared/`      │
                                 │  (per-lambda symlink `shared -> ../shared`) │
                                 └─────────────────┬──────────────────────┘
                                                   │
                       ┌───────────────────────────┼───────────────────────────┐
                       ▼                           ▼                           ▼
            ┌────────────────────┐    ┌────────────────────────┐    ┌─────────────────────┐
            │ Amazon Cognito     │    │ DynamoDB (5 tables)    │    │ External APIs       │
            │ User Pool          │    │ EmailToSub, Users,     │    │ OMDB (planned)      │
            │ `app-user-pool-{e}`│    │ Tokens, Historico, Logs│    │ SES email (planned) │
            │ Defined in         │    │ Defined in             │    │ See                 │
            │ `__main__.py`      │    │ `__main__.py` lines    │    │ `docs/inconsistencias.md`│
            │ lines 62–72        │    │ 13–60                  │    │ items 11–12         │
            └────────────────────┘    └────────────────────────┘    └─────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Pulumi program | Provisions every AWS resource (DynamoDB, Cognito, IAM, Lambda, API Gateway, S3, CloudFront, Route53, ACM) | `__main__.py` |
| Lambda handlers | Implement one HTTP endpoint each as `handler(event, context)` | `functions/<name>/<name>.py` |
| Shared library | Cross-cutting helpers reused by every Lambda — JWT verification, DynamoDB table accessors, JSON response builders | `functions/shared/auth.py`, `functions/shared/db.py`, `functions/shared/response.py` |
| Cognito User Pool | Identity provider — owns user records, password storage, JWT issuance | `__main__.py` lines 62–72 |
| API Gateway v2 | HTTP routing, JWT authorization, AWS_PROXY integration with Lambdas | `__main__.py` lines 164–219 |
| DynamoDB tables | Application state — email→sub index, user profile, tokens, history, audit log | `__main__.py` lines 13–60, schemas in `docs/Banco-de-Dados/Modelagem.md` |
| S3 + CloudFront | Static frontend hosting + CDN/edge entry point that also fronts the API | `__main__.py` lines 221–451 |
| OpenAPI contract | Reference for HTTP surface; deviations tracked in `docs/inconsistencias.md` | `docs/openapi.yaml` |
| Standalone SAM stub | `template.yaml` + `event.json` + `compose.yaml` enable `sam local invoke` against the demo handler in `functions/handler.py`, backed by Dynamodb-Local | `template.yaml`, `compose.yaml`, `Makefile`, `functions/handler.py` |

## Pattern Overview

**Overall:** Serverless event-driven API with infrastructure-as-code (Pulumi), thin Lambdas over a shared utility module, and a CDN-fronted static SPA.

**Key Characteristics:**
- One Lambda per HTTP endpoint — no monolithic router. Each lives in its own `functions/<name>/` directory and is uploaded as an independent ZIP via `pulumi.FileArchive` in `__main__.py:148-156`.
- Shared code is a single source-of-truth module (`functions/shared/`) referenced from each Lambda directory through a `shared -> ../shared` symbolic link, so packaging follows the symlink and produces self-contained ZIPs.
- Cognito is the only identity store. Application Lambdas never touch passwords; they call `cognito-idp:AdminInitiateAuth`, `AdminCreateUser`, `AdminSetUserPassword`, and verify JWTs through `shared/auth.py`. This decoupling is recent — see "Recent architectural movement" below.
- DynamoDB is used as a key-value/document store with PAY_PER_REQUEST billing — no provisioned capacity. `Users` is a single-table document (preferences and watch-later are nested maps/lists).
- HTTP boundary is consistent: `event["body"]` is a JSON string; responses are built by `shared/response.py` helpers and serialized with a `Decimal`-aware encoder.
- 12-factor configuration: a Pulumi `environment` config (`dev` | `prod`) drives every resource name and toggles production-only Route53/ACM/CloudFront alias wiring (`__main__.py:8-11, 250-285, 438-451`).

## Layers

**Infrastructure (Pulumi):**
- Purpose: Declares and reconciles all AWS resources across `dev` and `prod` stacks.
- Location: `__main__.py`, `Pulumi.yaml`, `Pulumi.dev.yaml`, `Pulumi.prod.yaml`
- Contains: DynamoDB tables, Cognito user pool, IAM role/policy, Lambda functions, API Gateway HTTP API + JWT authorizer + routes, S3 bucket + objects, CloudFront distribution + cache/origin policies, optional Route53/ACM for prod.
- Depends on: `pulumi`, `pulumi-aws`, AWS credentials in env.
- Used by: nothing — top of the stack.

**Edge / Delivery:**
- Purpose: Single public entry point (CloudFront) that serves the SPA from S3 and reverse-proxies `/api/v1/*` to API Gateway with custom cache and origin-request policies.
- Location: `__main__.py:221-415`, plus the static asset tree in `www/`.
- Depends on: S3 bucket, API Gateway endpoint.
- Used by: end users.

**API (API Gateway v2):**
- Purpose: HTTP routing, request/response normalization, JWT authorization for protected routes.
- Location: `__main__.py:164-219`
- Contains: `http-api-{env}`, `cognito-authorizer-{env}` (JWT, audiences = app-client id), one `Integration` + `Route` + `Permission` per endpoint via `create_route()`.
- Depends on: Cognito user pool client (audience), Lambda invoke ARNs.
- Used by: CloudFront `/api/v1/*` ordered cache behavior.

**Functions (Lambda):**
- Purpose: One HTTP endpoint per Lambda; pure Python 3.13 handlers.
- Location: `functions/<name>/<name>.py` — currently `register`, `login`, `recommend`, `change_email`, `change_password`, `lost_password`, `verify_email`, `preferences`, `history`, `watch_later`.
- Depends on: `shared/` (auth, db, response), `boto3`, `pyjwt`, Cognito, DynamoDB.
- Used by: API Gateway integrations.

**Shared library:**
- Purpose: Eliminate duplication between Lambdas without introducing a Lambda Layer.
- Location: `functions/shared/auth.py`, `functions/shared/db.py`, `functions/shared/response.py`, `functions/shared/__init__.py` (empty marker).
- Depends on: `boto3`, `pyjwt`, env vars.
- Used by: every Lambda via the per-function `shared` symlink.

**Identity (Cognito):**
- Purpose: User registration, password storage, password-policy enforcement, JWT issuance + JWKS endpoint.
- Location: `__main__.py:62-72` (resource definition); consumed in `functions/register/register.py`, `functions/login/login.py`, `functions/change_password/change_password.py`, `functions/verify_email/verify_email.py`.
- Used by: every authentication-touching Lambda + the API Gateway JWT authorizer.

**Persistence (DynamoDB):**
- Purpose: Application state — email lookup, user document, transient tokens, history, audit log.
- Location: `__main__.py:13-60`; schemas in `docs/Banco-de-Dados/Modelagem.md`.
- Used by: every Lambda through `functions/shared/db.py` accessor functions.

**Frontend assets:**
- Purpose: Static site served via S3 + CloudFront.
- Location: `www/index.html` (current production source uploaded by `__main__.py:222-239`).
- Note: A high-fidelity, non-shipped design prototype lives at `frontend/_design-reference/` — no Next.js/React app is wired into the deployment pipeline yet (see STRUCTURE.md).

## Data Flow

### Primary Request Path — `POST /api/v1/login`

1. Browser issues `POST` to CloudFront. (`__main__.py:357-407` — distribution config)
2. CloudFront's `/api/v1/*` ordered cache behavior forwards to the API Gateway origin with `Authorization` header allowed and cache disabled. (`__main__.py:312-353`)
3. API Gateway HTTP API matches route `POST /api/v1/login` → AWS_PROXY integration. (`__main__.py:213`)
4. Lambda `login-{env}` is invoked with the standard API Gateway v2 event shape. (`__main__.py:160`)
5. Handler parses JSON body, calls `cognito.initiate_auth(AuthFlow="USER_PASSWORD_AUTH", ...)`, looks up the `sub` by email via `shared.db.get_sub_by_email`, writes a `LOGIN` log row, and returns `{accessToken, idToken, refreshToken}`. (`functions/login/login.py:25-61`)
6. Response is built by `shared.response.ok` → `{ "statusCode": 200, "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"}, "body": "{...}" }`. (`functions/shared/response.py:11-24`)

### Authenticated Request Path — `GET /api/v1/recommend`

1. Browser sends request with `Authorization: Bearer <id-or-access-token>`.
2. CloudFront `/api/v1/*` forwards Authorization through `api_origin_request_policy`. (`__main__.py:333-353`)
3. API Gateway evaluates the JWT authorizer (audience = Cognito app client, issuer = Cognito User Pool URL). (`__main__.py:171-180`)
4. On success, Lambda `recommend-{env}` is invoked.
5. `shared.auth.get_sub(event)` re-validates the bearer JWT against the JWKS endpoint, with the JWKS client cached for 1 hour. (`functions/shared/auth.py:9-37`)
6. If `sub` is present, the handler reads `Users[sub].preferences` to pick a movie, writes a row to `Historico`, and writes a `RECOMMEND` log entry. (`functions/recommend/recommend.py:111-137`)
7. Anonymous fallback: if the JWT is missing/invalid (`get_sub` returns `None`), `recommend.py` still returns a random movie — no Historico/Logs writes.

### Email-Verification / Email-Change Flow — `POST /change-email` → `GET /verify-email`

1. `POST /change-email` (auth required) validates that the current email is verified, ensures the new address is unused, generates a 64-hex token, and writes it to `Tokens` with `type="verify-email"` and a `newEmail` field. (`functions/change_email/change_email.py:24-66`)
2. The endpoint currently returns the verify URL in the response body (TODO: SES — see `docs/inconsistencias.md` item 12).
3. `GET /verify-email?token=...` (public) loads the token, checks expiry, and either flips `emailVerified=true` (registration flow) or rotates the email in Cognito and `EmailToSub` (email-change flow). (`functions/verify_email/verify_email.py:26-96`)
4. Token is deleted after successful use.

### State Management

- All state is in DynamoDB or Cognito — Lambdas are stateless.
- Module-level globals are limited to AWS clients (`boto3.client(...)`, `boto3.resource(...)`, `PyJWKClient`) cached per-warm-container for performance — see `functions/shared/auth.py:16` and `functions/shared/db.py:4`.

## Key Abstractions

**HTTP Response Builder:**
- Purpose: Uniform response envelope, CORS headers, Decimal-aware JSON serialization.
- Examples: `functions/shared/response.py` — `ok`, `created`, `bad_request`, `unauthorized`, `forbidden`, `not_found`, `server_error`.
- Pattern: Plain functions returning the Lambda Proxy response dict.

**Table Accessors:**
- Purpose: Centralize table-name resolution from env vars and provide thin domain helpers.
- Examples: `functions/shared/db.py` — `users()`, `email_to_sub()`, `tokens()`, `historico()`, `logs()`, plus `get_user`, `get_sub_by_email`, `get_token`, `write_log`.
- Pattern: Module-level resource singleton + factory functions returning `boto3` `Table` objects.

**Bearer-JWT Subject Resolver:**
- Purpose: Decode and verify the Cognito JWT from the `Authorization` header in API Gateway events.
- Examples: `functions/shared/auth.py:get_sub(event)`.
- Pattern: Returns `sub` string on success, `None` on any failure (caller decides 401). JWKS client is constructed once per container.

**Per-Lambda Symlinked Shared Module:**
- Purpose: Allow `pulumi.FileArchive(./functions/<name>)` to package a self-contained ZIP that includes `shared/` for `import shared.xxx`.
- Examples: `functions/recommend/shared` → `../shared`, same for every other Lambda directory.
- Pattern: Source of truth is `functions/shared/`. The repo's `bbbabcc` commit ("Seguir link simbólico para usar pasta shared nos lambdas") established this convention.

## Entry Points

**Pulumi program:**
- Location: `__main__.py`
- Triggers: `pulumi up` / `pulumi preview` against stack `dev` or `prod`.
- Responsibilities: Provisions every AWS resource and wires permissions, routes, integrations, and outputs (`api_internal_url`, `public_url`, `cloudfront_id`).

**HTTP API (Lambda handlers):**
- Locations and routes (`__main__.py:159-215` and OpenAPI spec `docs/openapi.yaml`):
  - `POST /api/v1/register` → `functions/register/register.py:handler` (currently wired into Pulumi via `register_lambda`)
  - `POST /api/v1/login` → `functions/login/login.py:handler` (wired)
  - `GET /api/v1/recommend` → `functions/recommend/recommend.py:handler` (wired, with JWT authorizer)
  - The other Lambda functions (`change_email`, `change_password`, `lost_password`, `verify_email`, `preferences`, `history`, `watch_later`) exist as code under `functions/` and are documented in `docs/openapi.yaml`, but are **not yet attached** to API Gateway in `__main__.py`. Adding them requires creating an additional `create_lambda(...)` + `create_route(...)` pair per endpoint.
- Triggers: API Gateway HTTP requests proxied from CloudFront.

**Local SAM harness:**
- Location: `template.yaml` + `functions/handler.py` + `compose.yaml` + `Makefile` (`sam`, `sam-start`, `sam-stop` targets).
- Triggers: `make sam` — boots `amazon/dynamodb-local` and runs `sam local invoke -t template.yaml -e event.json --docker-network sam-local`.
- Note: `functions/handler.py` is a standalone demo handler (creates a single `isn20261` table and upserts a `{sub, email}` item). It is **not** any of the production Lambdas — it exists purely as a local-dev sanity check.

## Architectural Constraints

- **Threading:** Each Lambda invocation runs single-threaded inside its own container. Module-level state (e.g., the JWKS cache in `shared/auth.py:16`, the DynamoDB resource in `shared/db.py:4`, the Cognito client in `register.py:21`) survives across warm invocations of the same container only.
- **Global state:** AWS SDK clients and the `PyJWKClient` are constructed at module import. Lambda env vars (`USERS_TABLE`, `COGNITO_USER_POOL_ID`, etc.) are read once at import time — changing them requires a redeploy.
- **Packaging assumes symlinks resolve:** Each `functions/<name>/shared` is a relative symlink. Pulumi's `FileArchive` follows symlinks; CI/CD runners must preserve them. Removing the symlink will break `from shared.xxx import ...` at runtime.
- **No shared OpenAPI ↔ implementation enforcement:** `docs/openapi.yaml` and the Lambdas drift independently. Known divergences are tracked in `docs/inconsistencias.md` (12 open items as of this map).
- **DynamoDB schema drift:** Implementations write fields not present in `docs/Banco-de-Dados/Modelagem.md` (`watchLater[].title`, `Tokens.newEmail`, `preferences.{genres,subscriptions,ageRating,humor}` instead of the documented `{language,theme,notifications}`). The implementation is the authoritative source — see `docs/inconsistencias.md` items 4, 5, 7.
- **Single AWS region by convention:** `sa-east-1` (`Pulumi.dev.yaml`, `Pulumi.prod.yaml`). The ACM cert in prod is created in `us-east-1` because CloudFront viewer certs must live there (`__main__.py:256-279`).
- **CORS is wide open:** `Access-Control-Allow-Origin: *` from `shared/response.py:14`. No preflight handling — relies on CloudFront's allowed methods including `OPTIONS` (`__main__.py:395-403`) but no Lambda answers `OPTIONS`.

## Anti-Patterns

### Cross-Lambda Imports of Sibling Code

**What happens:** `functions/watch_later/watch_later.py:15` does `from recommend import _resolve_movie` to reuse the mock catalogue lookup.
**Why it's wrong:** Each Lambda is a separate ZIP — `recommend.py` is **not** packaged inside `watch_later`'s deployment artifact. This import only works locally (where every file lives under `functions/`); in production it raises `ModuleNotFoundError`.
**Do this instead:** Move shared movie-lookup helpers into `functions/shared/movies.py` (or similar) and import via `from shared.movies import resolve`. Same lesson as the `shared/` symlink pattern.

### Mutating `email_to_sub` Without Transaction

**What happens:** `functions/verify_email/verify_email.py:78-84` updates `Users.email`, deletes the old `EmailToSub` row, and inserts the new one as three separate non-transactional writes. A failure between the delete and the put leaves the email index inconsistent (no row maps to the user).
**Why it's wrong:** DynamoDB does not roll back partial multi-table sequences. The user's email index can diverge from the canonical `Users.email` field.
**Do this instead:** Wrap the three updates in `dynamodb.transact_write_items` so all-or-nothing semantics apply.

### Returning Verification URL in Response Body

**What happens:** `functions/register/register.py:104-105` and `functions/change_email/change_email.py:65-66` return `{verifyEmailUrl}` directly in the HTTP response.
**Why it's wrong:** Defeats out-of-band verification — anyone who can submit a registration can read the activation token. Also exposed in API Gateway logs.
**Do this instead:** Send via SES from the Lambda (see `docs/inconsistencias.md` item 12) and return an empty 200.

### Implicit Schema Divergence Instead of Migration

**What happens:** Implementations silently extend DynamoDB items with undocumented fields (`Tokens.newEmail`, `watchLater[].title`) and reshape `preferences` away from the documented schema.
**Why it's wrong:** `docs/Banco-de-Dados/Modelagem.md` has `additionalProperties: false`. Anyone validating items against the JSON schema will reject what production writes.
**Do this instead:** Treat `Modelagem.md` as a contract and update it (and any validators) when fields change. The list of pending updates is in `docs/inconsistencias.md`.

## Error Handling

**Strategy:** Each Lambda catches `botocore.exceptions.ClientError` for AWS calls (Cognito, DynamoDB) and translates well-known error codes (`UsernameExistsException`, `NotAuthorizedException`, `InvalidPasswordException`, `UserNotConfirmedException`) into appropriate HTTP responses via `shared/response.py`. Anything unexpected falls through to `server_error("...")` returning HTTP 500 with a generic message — the original exception is logged by Lambda's default print/log behavior but not enriched.

**Patterns:**
- Validate input first (length, presence, JSON parseability) → `bad_request(...)`.
- Wrap each AWS SDK call in a try/except over `ClientError`.
- Use `unauthorized()` for missing/invalid JWT (returned by `shared/auth.get_sub` as `None`).
- For privacy-sensitive flows (`/lost-password`), always return `200 OK` regardless of whether the email exists, to avoid user enumeration (`functions/lost_password/lost_password.py:34-40`).

## Cross-Cutting Concerns

**Logging:**
- Application audit log: every state-changing handler writes a row to the `Logs` DynamoDB table via `shared.db.write_log(sub, timestamp, action, metadata)` — actions include `REGISTER`, `LOGIN`, `RECOMMEND`, `PREFERENCES_UPDATED`, `WATCH_LATER_ADDED`, `CHANGE_EMAIL_REQUESTED`, `EMAIL_CHANGED`, `EMAIL_VERIFIED`, `PASSWORD_CHANGED`, `PASSWORD_RESET_REQUESTED`.
- Operational logs: `print(...)` only (e.g., `functions/handler.py:51`); rely on CloudWatch Logs (Lambda default, granted via `AWSLambdaBasicExecutionRole` — `__main__.py:91-95`).

**Validation:**
- Inline manual validation in each handler. No shared validator layer; no JSON Schema validation against `docs/Banco-de-Dados/Modelagem.md` at runtime.

**Authentication:**
- Two-tier: API Gateway JWT authorizer (configured for the `recommend` route in `__main__.py:215`; the OpenAPI marks others with `bearerAuth` but they are not yet wired) **and** in-Lambda re-verification via `shared.auth.get_sub` for handlers that need the `sub` claim.
- Public endpoints (`register`, `login`, `lost_password`, `verify_email`) skip auth entirely.

## Recent Architectural Movement

Captured from `git log` and the current main branch:

- **Decouple Cognito from Lambdas (#79, merged in `8136ab8`):** The previous design used custom user-management Lambdas (`Add user authentication and email management functions`, commit `55ddbcf`). The recent refactor delegates user creation, password storage, and authentication to Cognito directly — Lambdas now only call `cognito-idp:Admin*` and `InitiateAuth` and verify JWTs. As a side effect, `passwordHash` was removed from the runtime `Users` document (still present in `Modelagem.md` — see `docs/inconsistencias.md` item 6). Recent commits explicitly remove user-management Lambdas (`Removido lambdas referencias a gerenciamento de usuário`, `bde8872`).
- **Symlinked shared module (commit `bbbabcc`):** Replaced earlier per-Lambda copies of `auth.py`/`db.py`/`response.py` with a single source plus relative symlinks, eliminating drift across functions.
- **DynamoDB tables provisioned via Pulumi (PR #80):** `EmailToSub`, `Users`, `Tokens`, `Historico`, `Logs` are now created declaratively per `Modelagem.md`. Previously some tables were ad-hoc (see `functions/handler.py`, which still creates its own `isn20261` table for local SAM testing).
- **Frontend prototype landing (commits `55c9ac2`, `ec0f197`):** A design-only React/Babel prototype was added under `frontend/_design-reference/`. It is **not** built or deployed; the production frontend uploaded to S3 is still the placeholder `www/index.html`.

---

*Architecture analysis: 2026-05-04*
