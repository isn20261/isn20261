# Codebase Concerns

**Analysis Date:** 2026-05-04

> Brownfield Pulumi + Python AWS serverless project. Recent commits show
> heavy churn around Cognito decoupling (`#79`/`#86`) and an
> "Excluido lambdas… → Revert → Removido lambdas…" sequence
> (`0e39f93` → `443993d` → `bde8872`). Several inconsistencies and dead-code
> artifacts in this audit are direct consequences of that churn.

---

## Tech Debt

### Mock recommendation engine still in production code path

- Issue: `functions/recommend/recommend.py` (lines 28–89) hard-codes a
  six-movie `_MOCK_CATALOGUE` and `_MOCK_GENRE_INDEX`. The OMDB integration
  promised by the env var `OMDB_API_KEY` is read but never used.
- Files: `functions/recommend/recommend.py`,
  `docs/inconsistencias.md` (item 11)
- Impact: `/recommend` returns one of six movies regardless of any user
  preference outside `genres`. Subscriptions, age rating, and humor
  filters in `Users.preferences` are accepted by `POST /preferences`
  but ignored by `_pick_movie()`. Violates functional requirements 9–11
  in `README.md`.
- Fix approach: implement a real OMDB lookup (or any catalog data
  source) in `_resolve_movie()` and `_pick_movie()`, gated on
  `OMDB_API_KEY` presence; cache responses in DynamoDB to keep cost
  bounded. Remove `_MOCK_CATALOGUE` once parity is reached.

### Verification / reset URLs returned in HTTP body instead of being mailed

- Issue: `register.py` returns `{"verifyEmailUrl": …}`,
  `change_email.py` returns `{"url": …}`, and `lost_password.py` builds
  but discards a reset URL. None of them call SES.
- Files: `functions/register/register.py:104`,
  `functions/change_email/change_email.py:64-66`,
  `functions/lost_password/lost_password.py:54-56`
- Impact: in production this leaks single-use tokens to anyone who can
  read the response (e.g., via logs or the network), bypasses the
  "validate by email" requirement (functional requirement 4 in
  `README.md`), and is inconsistent with the OpenAPI contract
  (`docs/openapi.yaml` defines an empty 200 body for `/register` and
  `/lost-password`, see `docs/inconsistencias.md` items 9, 12).
- Fix approach: provision SES in `__main__.py`, add `ses:SendEmail` to
  the Lambda IAM policy, replace the `# TODO: send via SES` blocks with
  a real send, and drop the URL from the HTTP response.

### Token-based password reset flow is half-built

- Issue: `POST /lost-password` writes a `reset-password` token to the
  `Tokens` table but no `/reset-password` endpoint exists to consume it.
- Files: `functions/lost_password/lost_password.py:46-52`,
  `docs/inconsistencias.md` (item 10)
- Impact: a user who calls `/lost-password` cannot actually reset their
  password — functional requirement 4 (`README.md`) is unmet.
  Tokens accumulate in DynamoDB with no consumer.
- Fix approach: add a `POST /reset-password` Lambda that takes
  `{token, password}`, validates `type == "reset-password"` and
  `expiresAt`, calls `cognito-idp:AdminSetUserPassword`, and deletes the
  token. Wire it up in `__main__.py` like the other public routes.

### Documentation drifts from implementation

- Issue: `docs/openapi.yaml` and `docs/Banco-de-Dados/Modelagem.md`
  describe a contract that the Lambda code does not match:
  - `Users.preferences` schema lists `{language, theme, notifications}`
    but the code stores `{genres, subscriptions, ageRating, humor}`
    (`Modelagem.md:78-150`, `register.py:84-90`).
  - `Users.passwordHash` is marked `required` but Cognito owns the
    password — no Lambda ever writes it (`Modelagem.md:71`,
    `Modelagem.md:103-125`).
  - `Tokens` schema has `additionalProperties: false`, but
    `change_email.py:60` writes a `newEmail` attribute
    (`Modelagem.md:209-235`).
  - `Users.watchLater` items are documented as `{movieId, addedAt}`
    only, but `watch_later.py:64-67` also stores `title`.
  - `GET /history` advertises `genre` in the response but
    `Historico` has no such column; `history.py:25-30` omits it.
  - `POST /watch-later` requires `title` per OpenAPI but
    `watch_later.py:53` reads `movieId`.
  - `POST /lost-password` is marked `bearerAuth` in OpenAPI but the
    handler is, correctly, public.
- Files: `docs/openapi.yaml`, `docs/Banco-de-Dados/Modelagem.md`,
  `docs/inconsistencias.md` (items 1–9)
- Impact: any client (including the upcoming Next.js frontend) that
  trusts the docs will fail to integrate. Schema validators that load
  `Modelagem.md`'s JSON Schema will reject every real `Users` item the
  system writes.
- Fix approach: treat `docs/inconsistencias.md` as a backlog and
  reconcile each item — preferably by updating the docs to match the
  implementation, which is the actual contract that has been merged.

### Duplicated `shared/` symlink fan-out per Lambda package

- Issue: every Lambda directory contains a `shared` symlink to
  `../shared`. Pulumi's `FileArchive` follows symlinks, so each ZIP
  artifact ships an identical copy of `auth.py`, `db.py`, `response.py`.
- Files: `functions/{login,register,recommend,…}/shared` (10 symlinks),
  `__main__.py:153-156`
- Impact: 10× duplication of shared code in deployment artifacts,
  larger cold starts, more places for divergence if anyone ever
  replaces the symlink with a real folder. Recent commit
  `bbbabcc "Seguir link simbólico para usar pasta shared"` shows the
  team is aware but the chosen workaround keeps the duplication.
- Fix approach: replace symlinks with a Lambda Layer built once from
  `functions/shared/`; attach the layer in `create_lambda()`.
  Alternatively switch to `pulumi-aws-apigateway` packaging or build
  ZIPs that include `functions/shared/` from the source tree directly.

### Stray leftover Lambda from earlier scaffold

- Issue: `functions/handler.py` is a 76-line standalone DynamoDB
  put/get Lambda that uses a different env-var schema
  (`DYNAMODB_TABLE`, `DYNAMODB_HOST`, `DYNAMODB_PORT`,
  `DYNAMODB_ENDPOINT_URL`), creates its own `isn20261` table on every
  invocation, and is referenced only by the (also-unused) `template.yaml`
  SAM scaffold.
- Files: `functions/handler.py`, `template.yaml`, `event.json`
- Impact: dead code that will mislead readers; the SAM template
  references `function/handler.handler` (with an `s`-less `function`
  directory that does not exist), so `sam local invoke` from the
  `Makefile` fails today.
- Fix approach: delete `functions/handler.py`; either delete
  `template.yaml`/`event.json`/the `sam-*` Make targets or update them
  to point at a real Lambda such as `functions/login/login.py`.

### Eight Lambda packages exist on disk but only three are deployed

- Issue: `__main__.py:159-215` only creates the `register`, `login`,
  and `recommend` Lambdas plus their routes. The packages
  `change_email`, `change_password`, `history`, `lost_password`,
  `preferences`, `verify_email`, and `watch_later` are committed (and
  individually tested in PRs `#54`, `#57`, `#61`, `#62`, `#66`) but
  never wired to API Gateway.
- Files: `__main__.py:159-215`, `functions/{change_email, change_password,
  history, lost_password, preferences, verify_email, watch_later}/`
- Impact: every endpoint other than `/register`, `/login`, `/recommend`
  is unreachable in dev and prod. The system today cannot satisfy
  functional requirements 4–6, 8, 10–13 from `README.md` even though
  the Lambda code exists.
- Fix approach: extend the routing block in `__main__.py` to include
  the missing Lambdas (each with the appropriate auth setting per the
  OpenAPI spec) and grant the IAM actions they need (see "IAM…" below).

### Unused `pulumi-awsx` and `pulumi-aws-apigateway` dependencies

- Issue: `pyproject.toml` declares `pulumi-awsx` and
  `pulumi-aws-apigateway`, but `__main__.py` builds API Gateway
  manually with `aws.apigatewayv2.*` and never imports either package.
- Files: `pyproject.toml:5-10`, `__main__.py`
- Impact: extra resolution / install cost, confusion about which
  abstraction is "the right one".
- Fix approach: drop the unused deps from `pyproject.toml` (and
  `uv.lock`) or migrate the API Gateway code to `pulumi-aws-apigateway`
  for a smaller surface area.

### Static frontend is a placeholder

- Issue: `www/index.html` is a 10-line "Serverless with Pulumi"
  placeholder that fetches `/date` (an endpoint that does not exist).
  Pulumi still uploads it to the S3+CloudFront distribution.
- Files: `www/index.html`, `__main__.py:222-239`
- Impact: deploying produces a public site that is broken on first
  load. Will become irrelevant once the Next.js app replaces it.
- Fix approach: either ship a real `index.html`/SPA build artifact in
  `www/` or remove the public CloudFront path until the Next.js
  frontend is built.

---

## Known Bugs

### `__main__.py` injects env vars under names the Lambda code does not read

- Symptoms: every Lambda that touches Cognito raises
  `KeyError: 'COGNITO_USER_POOL_ID'` or `'COGNITO_CLIENT_ID'` at import
  time. `recommend.handler` does not crash at import, but every
  authenticated request returns `unauthorized()` because
  `shared/auth.py` builds JWKS_URL/ISSUER from the empty defaults.
- Files: `__main__.py:137-145` (sets `USER_POOL_ID`, `CLIENT_ID`),
  `functions/shared/auth.py:5-12` (reads `COGNITO_USER_POOL_ID`,
  `COGNITO_CLIENT_ID`),
  `functions/register/register.py:22`,
  `functions/login/login.py:22`,
  `functions/change_password/change_password.py:21`,
  `functions/verify_email/verify_email.py:23`
- Trigger: any HTTP call to a deployed endpoint, in any environment.
- Workaround: rename the keys in `__main__.py`'s `env_vars` dict to
  `COGNITO_USER_POOL_ID` / `COGNITO_CLIENT_ID` (or add aliases).

### Missing Python dependency: `PyJWT[crypto]`

- Symptoms: `shared/auth.py` does `import jwt` and
  `from jwt import PyJWKClient, InvalidTokenError`, but every
  Lambda's `requirements.txt` only lists `boto3`. Pulumi packages the
  function with `code=pulumi.FileArchive(f"./functions/{name}")` and
  does not vendor dependencies, so the runtime will hit
  `ModuleNotFoundError: No module named 'jwt'` for any Lambda that
  reads a Bearer token (`recommend`, `change_email`, `change_password`,
  `history`, `preferences`, `watch_later`, `verify_email`).
- Files: every `functions/*/requirements.txt`,
  `functions/shared/auth.py:2-3`, `__main__.py:148-156`
- Trigger: any authenticated request — first cold start of any
  authentication-dependent Lambda.
- Workaround: add `pyjwt[crypto]` to each Lambda's `requirements.txt`,
  add a build step that installs requirements into the package
  directory before `pulumi up` (currently nothing in the `Makefile`
  does this), or migrate to a Lambda Layer that bundles the deps.

### `watch_later` imports `recommend` cross-package

- Symptoms: `from recommend import _resolve_movie` succeeds locally
  but fails inside the deployed `watch_later` Lambda because the
  artifact only contains `functions/watch_later/`. Result:
  `ModuleNotFoundError: No module named 'recommend'`.
- Files: `functions/watch_later/watch_later.py:15`,
  `__main__.py:148-156`
- Trigger: first POST to `/watch-later` once the route is wired up.
- Workaround: move `_resolve_movie` and `_MOCK_CATALOGUE` into
  `functions/shared/` (the only directory that is symlinked into
  every package) or duplicate the lookup into `watch_later.py`.

### Cognito sign-up uses two flows interchangeably

- Symptoms: `register.py` calls `admin_create_user` +
  `admin_set_user_password`, but the IAM policy in `__main__.py`
  grants `cognito-idp:SignUp` and `cognito-idp:AdminConfirmSignUp`
  (which the code never uses) and does not grant
  `cognito-idp:AdminCreateUser` or
  `cognito-idp:AdminSetUserPassword`. `login.py` calls
  `initiate_auth` (`USER_PASSWORD_AUTH`) but the policy only allows
  `cognito-idp:AdminInitiateAuth`.
- Files: `__main__.py:97-134` (IAM policy),
  `functions/register/register.py:47-67`,
  `functions/login/login.py:38-42`,
  `functions/change_password/change_password.py:46-51`,
  `functions/verify_email/verify_email.py:69-76`
- Trigger: every call to `/register`, `/login`, `/change-password`,
  `/verify-email` (when wired up).
- Workaround: rewrite the inline policy in `__main__.py` to match the
  actions the code actually performs (see "IAM permissions" below).

### `verify_email` deletes a token under failure paths inconsistently

- Symptoms: when the new email is already in use,
  `verify_email.py:65-67` deletes the token before returning
  `bad_request`, but when `admin_update_user_attributes` raises
  `ClientError` (`verify_email.py:69-76`) the token is not deleted —
  so a user can retry forever and burn through Cognito retries.
- Files: `functions/verify_email/verify_email.py:65-95`
- Trigger: transient Cognito failure during email change.
- Workaround: move the `tokens().delete_item` call into a `finally`
  branch that runs only on success, and explicitly handle the retry
  case.

### Frontend mockup never points at the real API

- Symptoms: `www/index.html` calls `fetch('date')` — there is no
  `/date` route. After deploy, the page renders forever with empty
  text.
- Files: `www/index.html`, `__main__.py:213-215` (no `/date` route)
- Trigger: any visit to the deployed CloudFront URL.
- Workaround: replace the placeholder with the production frontend or
  remove S3+CloudFront from the stack until the Next.js app is ready.

---

## Security Considerations

### IAM permissions far too broad in setup, far too narrow at runtime

- Risk:
  - The README-recommended group policy in `README.md:14-66`
    grants `iam:PassRole`, `dynamodb:*`, `cognito-idp:*`, `s3:*`,
    `cloudfront:*`, `apigateway:*`, `route53:*`, `lambda:*`, `acm:*`
    on `Resource: "*"`. This is the deployer's standing identity —
    a leaked access key (the README also tells contributors to put
    `AWS_SECRET_ACCESS_KEY` in Codespaces secrets) gives total
    control of the AWS account.
  - The runtime Lambda role policy at `__main__.py:97-134` allows
    `cognito-idp:*` actions (`AdminInitiateAuth`, `SignUp`,
    `AdminConfirmSignUp`) on `"Resource": "*"` — i.e., every Cognito
    user pool in the account, not just `user_pool`.
- Files: `README.md:14-66`, `__main__.py:97-134`
- Current mitigation: none.
- Recommendations:
  - Scope the Cognito statement's `Resource` to `user_pool.arn`.
  - Replace the unused `SignUp`/`AdminConfirmSignUp` actions with the
    actions the Lambdas actually call:
    `AdminCreateUser`, `AdminSetUserPassword`,
    `AdminUpdateUserAttributes`, `InitiateAuth` (note: `InitiateAuth`
    is required for the public `USER_PASSWORD_AUTH` flow used by
    `login.py`, separate from `AdminInitiateAuth`).
  - In the README, replace `dynamodb:*`/`cognito-idp:*`/`lambda:*`/
    `s3:*` wildcards with the smaller set Pulumi actually needs to
    create+update the stack.
  - Document a separate read-only deployer role for CI (push
    pipeline) versus a developer role.

### CORS wide open on every Lambda response

- Risk: `functions/shared/response.py:14-17` sets
  `Access-Control-Allow-Origin: *` on every response (200/400/401/403
  /500). With Bearer tokens issued to the browser, any third-party
  site can call the API on behalf of a logged-in user as soon as the
  user-supplied script possesses the token. (Not directly exploitable
  via cookies because Cognito tokens are not auto-attached, but it
  removes a defense-in-depth layer.)
- Files: `functions/shared/response.py:14-17`,
  `__main__.py` (no `cors_configuration` set on
  `aws.apigatewayv2.Api`)
- Current mitigation: none — the API Gateway HTTP API also has no
  `cors_configuration`, so the wildcard header from the integration is
  the only one the browser sees.
- Recommendations: define an allowlist of origins (the eventual
  Next.js URL plus localhost for development). Drive it from
  `pulumi.Config().require("allowedOrigin")` so dev/prod can diverge.
  Set CORS on the API Gateway (`cors_configuration`) and remove the
  manual header from `response.py`, or keep the manual header but
  make it environment-aware.

### Bearer token validation silently swallows every error

- Risk: `functions/shared/auth.py:36` catches
  `(InvalidTokenError, Exception)` and returns `None`, meaning
  legitimate operational issues (network failure to JWKS, key id
  mismatch after Cognito rotation, malformed token) are
  indistinguishable from "no token" in the handlers — every endpoint
  responds `401 Unauthorized` with no log line. There is no logging
  hook in `auth.py`.
- Files: `functions/shared/auth.py:26-37`
- Current mitigation: none.
- Recommendations: catch `InvalidTokenError` and `PyJWKClientError`
  separately, log them with `print(...)`/`logging` so they show up in
  CloudWatch, and let unexpected exceptions propagate so API Gateway
  returns 500 instead of masking them as 401.

### No JWT type / token-use enforcement

- Risk: `shared/auth.py` validates `audience=CLIENT_ID` and
  `issuer=ISSUER` but does not enforce `token_use == "access"` (or
  `"id"`). Cognito issues both `access` and `id` tokens with the same
  audience semantics; without checking `token_use`, a leaked id token
  can be used as a bearer.
- Files: `functions/shared/auth.py:26-37`
- Current mitigation: none.
- Recommendations: after `jwt.decode`, assert
  `claims.get("token_use") == "access"` (or whichever the Lambdas
  expect) and reject otherwise. Likewise verify `client_id` for
  access tokens.

### Password policy effectively disabled

- Risk: the Cognito `UserPool` is created with all defaults; no
  explicit `password_policy` block in `__main__.py:62-72`. The
  Lambdas accept passwords from 6 to 100 characters (`register.py:40`,
  `change_password.py:34-36`). The README example also uses
  `"123456"` as the example password.
- Files: `__main__.py:62-65`, `functions/register/register.py:40`,
  `functions/change_password/change_password.py:35-36`,
  `README.md` (none — example value is in `docs/openapi.yaml:46-47`)
- Current mitigation: Cognito defaults (8 chars, 1 number, 1 upper,
  1 lower, 1 symbol). However the validation in `register.py` accepts
  6 characters and only fails downstream when Cognito rejects with
  `InvalidPasswordException` — bad UX, and the OpenAPI spec exposes a
  `minLength: 6`.
- Recommendations: set `password_policy` explicitly on
  `aws.cognito.UserPool` (e.g., 12 chars, mixed case, digits,
  symbols, temporary password 1 day). Update the Lambda validation
  and `docs/openapi.yaml` to match.

### Single-use tokens are 64-char hex (256-bit) — fine, but stored unhashed

- Risk: `Tokens` table stores the raw token under the partition key.
  Anyone with `dynamodb:Scan` on `Tokens` (the runtime role has it,
  see `__main__.py:113-119`) can read every active reset/verification
  token. Combined with the "verify URL returned in response body"
  bug above, the blast radius is wider than necessary.
- Files: `functions/lost_password/lost_password.py:46-52`,
  `functions/register/register.py:95-100`,
  `functions/change_email/change_email.py:55-61`,
  `functions/shared/db.py:31-33`, `__main__.py:113-119`
- Current mitigation: 24-hour TTL via `expiresAt` ISO string —
  enforced in code only, not as a DynamoDB TTL attribute, so expired
  tokens accumulate forever in the table.
- Recommendations: hash tokens (SHA-256) before storing; the
  client-presented value is hashed and looked up. Drop
  `dynamodb:Scan` from the IAM policy (no Lambda needs it). Configure
  the DynamoDB TTL feature on `Tokens.expiresAt` (epoch seconds — so
  also change the column type) so AWS auto-expires entries.

### `email_to_sub` lookup leaks user enumeration on `change-email`

- Risk: `change_email.py:48-49` returns 403 "Email already in use" if
  the new email already maps to a different user, distinguishing
  registered from unregistered emails to any authenticated attacker.
  (`/lost-password` correctly avoids this; `/register` is by design
  public-but-allowed-to-leak; `/change-email` should not leak.)
- Files: `functions/change_email/change_email.py:48-49`
- Current mitigation: requires a valid Bearer token, so the attacker
  must have a logged-in account.
- Recommendations: return a generic 400 ("Invalid email") whether the
  address is in use or malformed, mirroring `/lost-password`'s
  user-enumeration defence.

### `*-credentials*`, `.env*`, `.pem` not in `.gitignore`

- Risk: `.gitignore` (5 lines) only ignores `venv/`, `.venv/`,
  `*.pyc`, `__pycache__/`, `aws`, `sam_installation/`. Nothing
  prevents a contributor from accidentally committing `.env`,
  `aws-credentials.json`, `*.pem`, etc.
- Files: `.gitignore`
- Current mitigation: no such files exist in the repo today
  (verified via `ls`).
- Recommendations: extend `.gitignore` to include `.env*`,
  `*.pem`, `*.key`, `secrets/`, `*credentials*.json`, and add a
  pre-commit hook (e.g., `gitleaks`) to the project.

---

## Performance Bottlenecks

### Pulumi uploads `www/` file-by-file at every deploy

- Problem: `__main__.py:225-239` walks `www/` and creates one
  `aws.s3.BucketObject` resource per file inside the Pulumi program.
  Pulumi will re-evaluate every file on each `pulumi up`, even when
  nothing changed; resource churn in the state grows linearly with
  the asset count.
- Files: `__main__.py:225-239`
- Cause: imperative `for` loop over `os.walk` instead of
  `pulumi.synced_folder` or a one-shot `aws s3 sync` step.
- Improvement path: use `pulumi-synced-folder` or build the SPA into
  a single tarball and deploy via a build step. This is mostly latent
  today because `www/` has one file, but will bite once the Next.js
  frontend ships hundreds of files.

### Cold-start dependencies pulled per-Lambda

- Problem: every Lambda zip includes its own `boto3` (and once
  `PyJWT` is added, that too) because there is no shared Lambda
  Layer. Cold start scales with package size.
- Files: every `functions/*/requirements.txt`,
  `__main__.py:148-156` (no `layers=` argument)
- Cause: deployment model packages each function independently.
- Improvement path: build a single Layer for `boto3` + `PyJWT` +
  `shared/`, attach it via `aws.lambda_.LayerVersion` referenced from
  `create_lambda()`. Removes duplication and shrinks deploy size.

### `historico().query()` returns all entries with no pagination

- Problem: `history.py:20-30` returns every recommendation ever made
  for the user with `ScanIndexForward=False` and no `Limit` /
  `ExclusiveStartKey`. For a heavy user the response can blow past
  the 6 MB Lambda payload cap.
- Files: `functions/history/history.py:20-30`
- Cause: missing pagination contract.
- Improvement path: add `?limit=` and `?cursor=` query parameters,
  cap to 50 by default, return a `nextCursor` in the response.
  Update `docs/openapi.yaml` accordingly.

### `watchLater` stored as a list inside the user item

- Problem: `users().update_item(... list_append ...)` appends to a
  list inside the `Users` row. DynamoDB items are capped at 400 KB —
  with `{movieId, title, addedAt}` per entry (~150 bytes), the list
  starts to fail writes around 2,500 entries. Also, every add
  rewrites the whole user item.
- Files: `functions/watch_later/watch_later.py:60-68`,
  `docs/Banco-de-Dados/Modelagem.md:152-170`
- Cause: schema choice ("watchLater is a list inside Users").
- Improvement path: introduce a separate `WatchLater` table with
  `(sub, movieId)` as the composite key, mirroring `Historico`.
  Update `Modelagem.md`.

---

## Fragile Areas

### `__main__.py` — single-file, 470 lines, no abstractions

- Files: `__main__.py`
- Why fragile: the Pulumi program mixes DynamoDB, Cognito, IAM,
  Lambda, API Gateway, S3, CloudFront, and Route53 in one module.
  Any new endpoint requires changes in three places (resource,
  route, IAM) and there is no test coverage. The recent IAM-policy
  churn (`f545256 "Atualizar política do IAM"`) shows this is a
  recurring touch point.
- Safe modification: add new Lambdas only via `create_lambda()` and
  new routes only via `create_route()`, but extend the inline IAM
  policy when actions change.
- Test coverage: zero. There are no Pulumi unit tests
  (`pulumi.runtime.test`) anywhere in the repo.

### `functions/shared/auth.py` — silent failure mode

- Files: `functions/shared/auth.py`
- Why fragile: `except (InvalidTokenError, Exception)` makes
  every auth failure look identical to "no token". Combined with
  the env-var-name bug above, all authenticated endpoints return
  401 today; no obvious operator signal to distinguish a config bug
  from a malicious caller.
- Safe modification: any change must add structured logging before
  it can be reasoned about.
- Test coverage: zero.

### Cognito decoupling refactor leftovers

- Files: every `functions/*/shared` symlink, `functions/handler.py`,
  `template.yaml`, `event.json`,
  unmerged inconsistencies in `docs/inconsistencias.md`
- Why fragile: the merge sequence
  `0e39f93 → 443993d (revert) → bde8872 → 8136ab8` shows the team
  removed and re-added user-management lambdas within the same week.
  Today's tree is "everything came back" but several artifacts that
  predated the churn (`functions/handler.py`, the SAM scaffold) were
  not cleaned, and AGENTS.md added in `a58288b` does not appear in
  the working tree (it lives only in git history).
- Safe modification: before adding new lambdas, run a sweep:
  delete `functions/handler.py`, decide whether SAM local invoke is
  still in scope, and reinstate `AGENTS.md` if it is meant to be
  developer-facing documentation.

### No CI/CD pipeline

- Files: no `.github/workflows`, `.gitlab-ci.yml`, or buildspec.
- Why fragile: requirement 15 in `README.md` says "Automatizar
  integração e implantação de código (CI/CD)" but the repo has no
  pipeline. Every deploy is a `pulumi up` from a developer machine
  using a high-privilege key (see "IAM permissions" above).
- Safe modification: the lack of CI also means there are no
  pre-merge linters/tests; relies entirely on human review.
- Test coverage: zero — there is no `tests/` directory and no
  testing framework installed.

---

## Scaling Limits

### `_MOCK_CATALOGUE` is a Python global

- Current capacity: 6 movies.
- Limit: hard ceiling — adding a movie requires a code change and a
  redeploy.
- Scaling path: integrate OMDB (`OMDB_API_KEY` is already wired up
  to be read in `recommend.py:23`) with a DynamoDB cache.

### `Users.watchLater` list inside row

- Current capacity: ~2,500 entries before the 400 KB DynamoDB item
  cap (assuming ~150 B/item).
- Limit: hard write failure once the list crosses ~400 KB.
- Scaling path: split into a `WatchLater` table.

### `Tokens` table grows unbounded

- Current capacity: indefinite.
- Limit: code-only TTL means expired tokens accumulate forever.
  DynamoDB on-demand pricing absorbs cost but operationally noisy.
- Scaling path: enable DynamoDB TTL on the `expiresAt` attribute
  (and switch to epoch seconds rather than ISO 8601).

### Single-region deployment with no failover

- Current capacity: `sa-east-1` only (`Pulumi.dev.yaml`,
  `Pulumi.prod.yaml`).
- Limit: outage in São Paulo region takes the whole product down.
  CloudFront fronts S3+API but origins are not multi-region.
- Scaling path: replicate DynamoDB tables (Global Tables), deploy
  Lambdas in a second region, use Route 53 latency or failover
  routing. Aligned with non-functional requirement 3 in `README.md`
  ("multinuvem com service mesh") if/when the project pursues it.

---

## Dependencies at Risk

### `boto3` is the *only* declared runtime dep, yet `PyJWT` is imported

- Risk: see "Missing Python dependency" under Known Bugs.
- Impact: complete outage of every authenticated endpoint at first
  cold start.
- Migration plan: add `pyjwt[crypto]` to all `functions/*/requirements.txt`
  (or move to a Layer) and add a build step before `pulumi up`.

### `pulumi-aws` pinned to `>=7.0.0,<8.0.0`

- Risk: aws provider 7.x is a recent major; bumping the upper bound
  needs a deprecation review (`apigatewayv2`, `acm`, `cloudfront`
  resource shapes have churned across major versions).
- Impact: dependency upgrades require a Pulumi-aware tester.
- Migration plan: when bumping, run `pulumi preview` in `dev` first
  and review every diff in API Gateway / IAM resources.

### `pulumi-awsx`, `pulumi-aws-apigateway` declared but unused

- Risk: dead deps. Either drop them or migrate `__main__.py` to use
  them. Right now they only inflate the `uv.lock` and slow installs.
- Impact: minor, but they represent abandoned design choices.
- Migration plan: pick one — remove from `pyproject.toml` or refactor
  `__main__.py` to use `pulumi_aws_apigateway`'s higher-level API.

---

## Missing Critical Features

### No frontend yet

- Problem: per the task brief, the production frontend is a Next.js
  app that has not been built. The current `www/index.html` is a
  10-line placeholder, and `frontend/_design-reference/` is a
  React-Babel mockup explicitly marked as not for production
  (uses `unpkg.com` CDN scripts, in-browser Babel, no build step,
  many `*.jsx` files loaded as `<script type="text/babel">`).
- Blocks: every functional requirement in `README.md:92-117` that is
  user-facing.
- Note: the *absence of frontend security/perf concerns* in this
  document is by design — there is no production frontend code yet
  to audit. This is a planning concern (deliver Next.js scaffolding
  + auth flow + API client), not a code concern. `frontend/_design-reference/`
  was intentionally not scanned as production code.

### No `/reset-password` endpoint

- Problem: see "Token-based password reset flow" above.
- Blocks: requirement 4 (recover password by email).

### No SES integration

- Problem: see "Verification / reset URLs returned in HTTP body"
  above.
- Blocks: requirements 4 and 6 (validate via email).

### No CI/CD

- Problem: see "No CI/CD pipeline" under Fragile Areas.
- Blocks: requirement 15.

### No streaming-services / LLM integration

- Problem: the architectural diagram in `README.md:181-247` shows
  Lambda_Proc → OMDB / Letterboxd / Claude / ChatGPT, plus an SQS
  broker. None of those exist in `__main__.py` (no SQS, no
  SecretsManager, no CloudWatch beyond Lambda defaults, no second
  Lambda for processing, no integrations with OMDB/Letterboxd/LLM
  APIs).
- Blocks: requirements 8–11 in any non-mock form.

---

## Test Coverage Gaps

### Zero automated tests

- What's not tested: everything.
- Files: no `tests/`, no `pytest.ini`, no `tox.ini`, no
  `pyproject.toml [tool.pytest]` block, no Pulumi mocks.
- Risk: every refactor (especially the in-flight Cognito decoupling)
  ships untested. The `bde8872 → 443993d` revert ping-pong shows
  the cost.
- Priority: High.

### Pulumi program never previewed in CI

- What's not tested: IAM-policy regressions, env-var-name drift,
  resource diff size before merge.
- Files: `__main__.py`, `Pulumi.{dev,prod}.yaml`.
- Risk: the env-var mismatch documented under "Known Bugs" would
  have been caught by a single `pulumi preview` + integration test
  that read the resulting Lambda config back.
- Priority: High.

### No contract test between OpenAPI and Lambda handlers

- What's not tested: every divergence enumerated in
  `docs/inconsistencias.md`.
- Files: `docs/openapi.yaml`, every `functions/*/[a-z]*.py`.
- Risk: clients (frontend, mobile) will be written against the
  OpenAPI doc and break on integration.
- Priority: Medium — fix the docs first, then add a generator.

### No security tests for IAM scope

- What's not tested: that the runtime role can call exactly the
  Cognito/DynamoDB actions the code uses, and no more.
- Files: `__main__.py:97-134`.
- Risk: privilege creep; broken endpoints when actions are renamed.
- Priority: Medium.

---

*Concerns audit: 2026-05-04*
