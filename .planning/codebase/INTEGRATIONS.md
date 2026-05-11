# External Integrations

**Analysis Date:** 2026-05-04

## APIs & External Services

**AWS-managed services (provisioned in `__main__.py` and consumed by Lambda code):**

- **Amazon Cognito (User Pool + App Client)** — primary identity provider.
  - Pool: `app-users-{env}` with `auto_verified_attributes=["email"]` (`__main__.py:63-65`).
  - App client: `explicit_auth_flows=["ALLOW_USER_PASSWORD_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"]`, `generate_secret=False` (`__main__.py:67-72`).
  - SDK/Client: `boto3.client("cognito-idp")` instantiated at module load in `functions/login/login.py:21`, `functions/register/register.py:21`, `functions/change_password/change_password.py:20`, `functions/verify_email/verify_email.py:22`.
  - Operations called: `initiate_auth` (`functions/login/login.py:38-42`), `admin_create_user` + `admin_set_user_password` (`functions/register/register.py:47-67`), `admin_set_user_password` (`functions/change_password/change_password.py:46-51`), `admin_update_user_attributes` (`functions/verify_email/verify_email.py:70-74`).
  - Auth env vars (read by Lambdas): `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID` (`functions/shared/auth.py:6-7`). **Mismatch:** Pulumi sets `USER_POOL_ID` / `CLIENT_ID` instead (`__main__.py:143-144`) — see CONCERNS.md.
  - JWT verification endpoint (HTTPS, called from Lambda cold start): `https://cognito-idp.{region}.amazonaws.com/{user_pool_id}/.well-known/jwks.json` (`functions/shared/auth.py:9-10`).

- **Amazon API Gateway v2 (HTTP API)** — public REST/HTTP entry point for all backend traffic.
  - API: `aws.apigatewayv2.Api(..., protocol_type="HTTP")` (`__main__.py:164`).
  - JWT authorizer using the Cognito user pool as JWKS issuer (`__main__.py:171-180`); issuer URL built from `https://cognito-idp.{region}.amazonaws.com/{user_pool_id}` (`__main__.py:167-169`).
  - Routes currently wired (`__main__.py:213-215`):
    - `POST /api/v1/register` → `register.handler` (public).
    - `POST /api/v1/login` → `login.handler` (public).
    - `GET /api/v1/recommend` → `recommend.handler` (JWT-authorised).
  - Stage: `$default`, `auto_deploy=True` (`__main__.py:217-219`).
  - **Gap:** the Lambda functions for `change_email`, `change_password`, `lost_password`, `verify_email`, `preferences`, `watch_later`, `history` exist under `functions/` but are **not** wired into API Gateway in `__main__.py`. The OpenAPI spec (`docs/openapi.yaml`) still documents them.

- **Amazon CloudFront** — global CDN that fronts both the S3 bucket (frontend) and the API Gateway (backend).
  - Distribution `cdn-{env}` with `http_version="http3"`, IPv6 enabled, default root `index.html` (`__main__.py:357-415`).
  - Two origins:
    - `S3-frontend` — served via Origin Access Control (`__main__.py:241-247`).
    - `APIGateway-backend` — origin host derived from `api.api_endpoint` (`__main__.py:287-289`); `origin_protocol_policy="https-only"`.
  - Custom cache policies: `S3-Cache-Policy-{env}` (long TTL, `__main__.py:293-310`) and `API-Cache-Policy-{env}` (zero TTL for POST/login safety, `__main__.py:313-330`).
  - Origin request policy `API-Origin-Request-Policy-{env}` whitelists `Authorization`, `Origin`, `Referer`, `Accept` and intentionally omits `Host` (`__main__.py:333-353`).
  - API path pattern routed to backend: `/api/v1/*` (`__main__.py:392`).

- **AWS Certificate Manager (ACM)** — TLS certificate for the production domain.
  - Conditional: only when `environment == prod` AND `domainName` is set (`__main__.py:255-285`).
  - Certificate is provisioned in `us-east-1` via a dedicated `aws.Provider("us-east-1")` (CloudFront requires certs in `us-east-1`).
  - DNS validation via Route 53 (`__main__.py:265-279`).

- **Amazon Route 53** — public DNS for the production custom domain.
  - Zone lookup: `aws.route53.get_zone(name=domain_name)` (`__main__.py:263`).
  - Records: ACM DNS validation (`__main__.py:265-272`) and an `A`-alias record pointing the apex domain to the CloudFront distribution (`__main__.py:438-451`).
  - Default production domain: `recommend.movies` (`Pulumi.prod.yaml:4`).

- **Amazon S3** — static asset hosting for the frontend bucket.
  - Bucket: `frontend-bucket-{env}` (`__main__.py:222`).
  - Upload loop walks `www/` and uploads each file as a `BucketObject` with auto-detected `Content-Type` (`__main__.py:224-239`).
  - Read access locked to CloudFront via a bucket policy that allows `s3:GetObject` only when `AWS:SourceArn` matches the distribution ARN (`__main__.py:417-436`).

- **AWS Lambda** — backend compute.
  - Runtime: `python3.13`, code packaged from `./functions/<name>` directories (`__main__.py:148-156`).
  - IAM role `lambda-role-{env}` granted `AWSLambdaBasicExecutionRole` plus an inline policy with DynamoDB CRUD on the five tables and `cognito-idp:AdminInitiateAuth`, `cognito-idp:SignUp`, `cognito-idp:AdminConfirmSignUp` on `*` (`__main__.py:75-134`).
  - **Gap:** the inline policy does not cover several Cognito actions actually invoked by the code: `admin_create_user`, `admin_set_user_password`, `admin_update_user_attributes`, `initiate_auth` (the public flow). Live calls will fail with AccessDenied — see CONCERNS.md.

**External (third-party) APIs:**

- **OMDB API** — planned movie metadata source.
  - Status: **not yet integrated**. `functions/recommend/recommend.py:23` reads `OMDB_API_KEY` but only as a placeholder; the catalogue is hard-coded in `_MOCK_CATALOGUE` (`functions/recommend/recommend.py:28-89`).
  - Documented in `docs/inconsistencias.md:131-138` and the architecture diagram in `README.md:209-247`. Target endpoint base: `https://www.omdbapi.com/`.

- **Letterboxd, Claude, ChatGPT** — referenced in the README architecture diagram (`README.md:209-247`) as future processor integrations. **No code present.**

- **Streaming-service "deep links"** — `functions/recommend/recommend.py:33-89` returns hard-coded URLs and favicon image URLs for Netflix (`netflix.com`), Amazon Prime (`amazon.com`), and HBO Max (`max.com`). These are static strings, not live integrations.

- **Google Fonts** — referenced only by the design-mockup HTML (`frontend/_design-reference/Recommend-a.html`) via `https://fonts.googleapis.com` / `https://fonts.gstatic.com`. Not used by deployed assets.

## Data Storage

**Databases:**

- **Amazon DynamoDB** — only persistent store. Five tables, all `PAY_PER_REQUEST`, all provisioned in `__main__.py:14-60` and documented in `docs/Banco-de-Dados/Modelagem.md`:
  - `EmailToSub_{env}` — partition key `email` (string). Lookup table mapping email → Cognito `sub`. Read/written via `functions/shared/db.py:14`, used by `functions/register/register.py:43,94`, `functions/lost_password/lost_password.py:34`, `functions/change_email/change_email.py:48`, `functions/verify_email/verify_email.py:65,83-84`.
  - `Users_{env}` — partition key `sub` (string). Stores per-user profile, preferences map, and `watchLater` list. Used heavily by `functions/preferences/preferences.py`, `functions/watch_later/watch_later.py`, `functions/change_password/change_password.py`, `functions/change_email/change_email.py`, `functions/verify_email/verify_email.py`.
  - `Tokens_{env}` — partition key `token` (string). Stores `verify-email` and `reset-password` tokens with `expiresAt`; verify-email tokens may carry `newEmail` (`functions/change_email/change_email.py:55-61`, `functions/verify_email/verify_email.py:33-55`).
  - `Historico_{env}` — partition key `sub`, sort key `timestamp`. Stores recommendation history (`functions/recommend/recommend.py:126-130`, `functions/history/history.py:20-23`).
  - `Logs_{env}` — partition key `sub`, sort key `timestamp`. Audit trail of user actions; written via `functions/shared/db.py:36-42` from every Lambda.
  - Connection: AWS-managed, accessed via `boto3.resource("dynamodb", region_name=…)` (`functions/shared/db.py:4`).
  - **Local development:** `compose.yaml` runs `amazon/dynamodb-local` on port `8000`; `functions/handler.py` (a separate SAM-local entry point, not deployed) connects via `DYNAMODB_ENDPOINT_URL` / `DYNAMODB_HOST`.

**File Storage:**
- Amazon S3 — `frontend-bucket-{env}` for static frontend assets only (`__main__.py:222`). No Lambda code currently writes to S3.

**Caching:**
- CloudFront edge cache — `S3-Cache-Policy-{env}` (`__main__.py:293-310`) caches static assets with default TTL `86400s` and max `31536000s`. API path pattern uses `API-Cache-Policy-{env}` with TTL `0` (effectively no cache).
- In-process JWKS cache — `PyJWKClient(..., cache_jwk_set=True, lifespan=3600)` in `functions/shared/auth.py:16` caches Cognito public keys per Lambda container.
- No Redis / ElastiCache / Memcached.

## Authentication & Identity

**Auth Provider:**
- Amazon Cognito — sole identity provider.
  - User registration: `functions/register/register.py` calls `admin_create_user` (with `email_verified=false`, `MessageAction=SUPPRESS`) followed by `admin_set_user_password(..., Permanent=True)`.
  - Login: `functions/login/login.py` uses `USER_PASSWORD_AUTH` flow via `initiate_auth` and returns `accessToken`, `idToken`, `refreshToken`.
  - JWT verification: `functions/shared/auth.py` uses `PyJWT`'s `PyJWKClient` to fetch JWKS, validates RS256, audience = client ID, issuer = Cognito issuer URL, and returns the `sub` claim.
  - Password reset: token-based via DynamoDB `Tokens` table (`functions/lost_password/lost_password.py`); the matching `/reset-password` endpoint is not yet implemented (`docs/inconsistencias.md:120-129`).
  - Email verification & email-change: token-based via DynamoDB `Tokens` table (`functions/verify_email/verify_email.py`, `functions/change_email/change_email.py`).
- Token format: JWT (Bearer). Documented in `docs/openapi.yaml:14-21`.
- Header convention: `Authorization: Bearer <token>` (`functions/shared/auth.py:21-25`).

## Monitoring & Observability

**Error Tracking:**
- None. No Sentry / Bugsnag / Rollbar integration. Lambdas swallow exceptions in places (e.g. `functions/shared/auth.py:36` catches `Exception` broadly and returns `None`).

**Logs:**
- Application audit logs: written to the DynamoDB `Logs_{env}` table by `functions/shared/db.py:36-42`. Every authenticated Lambda calls `write_log(sub, timestamp, action, metadata)` for actions like `LOGIN`, `REGISTER`, `RECOMMEND`, `PASSWORD_CHANGED`, `EMAIL_CHANGED`, `EMAIL_VERIFIED`, `WATCH_LATER_ADDED`, `PREFERENCES_UPDATED`, `CHANGE_EMAIL_REQUESTED`, `PASSWORD_RESET_REQUESTED`.
- Lambda runtime logs: written to Amazon CloudWatch Logs implicitly through the `AWSLambdaBasicExecutionRole` (`__main__.py:91-95`). The README architecture diagram lists `CloudWatch` as the cross-cutting observability service (`README.md:201-247`).
- No structured logger configured — code uses `print(...)` (`functions/handler.py:51`).

**Metrics / Tracing:**
- Not detected. AWS X-Ray is not enabled on Lambdas; no OpenTelemetry instrumentation in function code (the `opentelemetry-*` packages in `uv.lock` come transitively from Pulumi itself, not from the Lambda runtime).

## CI/CD & Deployment

**Hosting:**
- AWS only — region `sa-east-1` (`Pulumi.dev.yaml:2`, `Pulumi.prod.yaml:2`).
- Frontend served from S3 via CloudFront, optionally with Route 53 alias and ACM cert in production.
- Backend served from API Gateway v2 → Lambda.

**CI Pipeline:**
- Not detected. There is no `.github/workflows/`, no `.gitlab-ci.yml`, no `buildspec.yml`, no `Jenkinsfile`. Deployment is currently manual via `pulumi up` (with developer-supplied AWS / Pulumi credentials per `README.md:71-88`).

**Deployment exports (`__main__.py:468-470`):**
- `api_internal_url` — raw API Gateway endpoint.
- `public_url` — CloudFront URL or custom domain in prod.
- `cloudfront_id` — for cache-invalidation tooling.

## Environment Configuration

**Required env vars (developer host):**
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION` (`README.md:75-82`).
- `PULUMI_ACCESS_TOKEN` (`README.md:84-88`).

**Required Pulumi config (per stack):**
- `aws:region` (set to `sa-east-1`).
- `isn20261:environment` (`dev` or `prod`).
- `isn20261:domainName` (prod only, optional).

**Lambda runtime env vars (set automatically by Pulumi at deploy, `__main__.py:137-145`):**
- `EMAIL_TO_SUB_TABLE`, `USERS_TABLE`, `TOKENS_TABLE`, `HISTORICO_TABLE`, `LOGS_TABLE`.
- `USER_POOL_ID`, `CLIENT_ID`. **Mismatch:** code reads `COGNITO_USER_POOL_ID` / `COGNITO_CLIENT_ID` — surface in CONCERNS.md.
- `AWS_REGION` is auto-injected by the Lambda runtime.

**Lambda runtime env vars expected by code but NOT yet set by Pulumi:**
- `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID` (see mismatch above).
- `BASE_URL` — used to build verification / reset URLs.
- `OMDB_API_KEY` — for the planned OMDB integration.

**Local SAM env vars (for `functions/handler.py` only):**
- `DYNAMODB_ENDPOINT_URL`, `DYNAMODB_HOST`, `DYNAMODB_PORT` (default `8000`), `DYNAMODB_TABLE` (default `isn20261`).

**Secrets location:**
- AWS credentials — developer environment / GitHub Codespaces secrets. Not committed.
- Pulumi state and stack secrets — Pulumi Cloud (auth via `PULUMI_ACCESS_TOKEN`).
- No `.env` files exist in the repo. `.gitignore` does not yet list `.env*`; if a developer adds one locally, it will not be ignored — surface in CONCERNS.md.
- Future: `OMDB_API_KEY` and SES credentials will likely belong in AWS Secrets Manager (referenced as `SecretManager` in the architecture diagram, `README.md:201`).

## Webhooks & Callbacks

**Incoming:**
- None currently wired. The only external traffic into Lambdas is API Gateway HTTP requests on the `/api/v1/*` paths.

**Outgoing:**
- None implemented. Outbound integrations exist only as TODOs:
  - Email delivery via Amazon SES — pending in `functions/register/register.py:103`, `functions/change_email/change_email.py:64`, `functions/lost_password/lost_password.py:7,54`. Currently the verification / reset URL is returned in the HTTP response body (dev-only convenience).
  - OMDB API calls — pending in `functions/recommend/recommend.py` (see `docs/inconsistencias.md:131-138`).

---

*Integration audit: 2026-05-04*
