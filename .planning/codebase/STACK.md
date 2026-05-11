# Technology Stack

**Analysis Date:** 2026-05-04

## Languages

**Primary:**
- Python `>=3.13` — Pulumi infrastructure program (`__main__.py`) and AWS Lambda function handlers (`functions/`). Pinned in `pyproject.toml` and target runtime `python3.13` is set per Lambda in `__main__.py:151`.

**Secondary:**
- HTML / static assets — Single placeholder page in `www/index.html` (uploaded to S3 by `__main__.py:222-239`). Contains a small inline `<script>` polling `fetch('date')`.
- YAML — Pulumi stack/project configs (`Pulumi.yaml`, `Pulumi.dev.yaml`, `Pulumi.prod.yaml`), AWS SAM template (`template.yaml`), Docker Compose (`compose.yaml`), OpenAPI spec (`docs/openapi.yaml`).
- JSON — Sample SAM event (`event.json`), inline IAM policy documents (built via `json.dumps` in `__main__.py:77-89, 100-133`), DynamoDB schemas embedded in `docs/Banco-de-Dados/Modelagem.md`.
- JSX / CSS — Throwaway design mockups under `frontend/_design-reference/` (e.g. `app.jsx`, `styles.css`, `Recommend-a.html`). **Not production frontend code** — see "Frontend stack" below.
- Make — `Makefile` orchestrates tool installation and local SAM workflow.

## Runtime

**Environment:**
- AWS Lambda — `python3.13` runtime (`__main__.py:151`).
- Pulumi CLI — runs the Python infrastructure program locally / in CI to deploy the stack.
- Local Lambda emulation — AWS SAM CLI (`sam local invoke`) per `Makefile:44-45` and `template.yaml`.
- Local DynamoDB emulation — `amazon/dynamodb-local` Docker image on port `8000` (`compose.yaml`).

**Package Manager:**
- `uv` (Astral) — primary tool for the Pulumi project; `Pulumi.yaml:5-7` declares `runtime.options.toolchain = uv` with `virtualenv: venv`.
- Lockfile: `uv.lock` is present at the repo root and committed.
- `pip`-style `requirements.txt` files are also present **per Lambda function** (`functions/<name>/requirements.txt`), each currently containing only `boto3`. These are consumed by the Lambda packaging step (Pulumi `FileArchive(./functions/<name>)` in `__main__.py:154`).

## Frameworks

**Core:**
- Pulumi `>=3.0.0,<4.0.0` — Infrastructure-as-Code framework that provisions every AWS resource. Entry point: `__main__.py`.
- Pulumi AWS provider `>=7.0.0,<8.0.0` (`pulumi-aws`) — primary cloud provider plugin used throughout `__main__.py`.
- Pulumi AWS API Gateway component `>=3.0.0,<4.0.0` (`pulumi-aws-apigateway`) — declared in `pyproject.toml`; the actual API is built with the lower-level `aws.apigatewayv2` resources rather than this higher-level component.
- Pulumi AWSx `>=3.0.0,<4.0.0` (`pulumi-awsx`) — declared in `pyproject.toml`; not actively imported in `__main__.py`.
- AWS SDK for Python — `boto3` is imported in every Lambda (`functions/login/login.py:15`, `functions/register/register.py:15`, `functions/shared/db.py:2`, `functions/handler.py:3`, etc.) for DynamoDB and Cognito Identity Provider clients.
- AWS Serverless Application Model (SAM) — used only for local invoke; declared in `template.yaml` (`Transform: AWS::Serverless-2016-10-31`).

**Testing:**
- Not detected. There is no test directory, no `pytest`/`unittest` configuration, and no test files in the repo.

**Build/Dev:**
- `uv` — virtualenv + dependency resolution (`Pulumi.yaml:5-7`, `uv.lock`).
- AWS CLI — installed via `Makefile:5-13`; required for AWS auth and SAM.
- AWS SAM CLI — installed via `Makefile:15-23`; used by `make sam` to invoke Lambdas locally with the local DynamoDB container.
- Docker / Docker Compose — required for `compose.yaml` (DynamoDB Local) and SAM Lambda emulation; invoked from `Makefile:42`, `Makefile:48`.
- Pulumi CLI — installed via `Makefile:25-26`.
- VS Code recommended extensions (`/.vscode/extensions.json`): `ms-python.python`, `ms-python.black-formatter`, `amazonwebservices.aws-toolkit-vscode`, `pulumi.pulumi-vscode-tools`. Implies **Black** as the formatter convention, though no `pyproject.toml` `[tool.black]` section is configured.

## Key Dependencies

**Critical (root `pyproject.toml`):**
- `pulumi>=3.0.0,<4.0.0` — IaC engine. Resolved version: `3.229.0` (`uv.lock`).
- `pulumi-aws>=7.0.0,<8.0.0` — AWS provider. Resolved: `7.24.0` (`uv.lock`).
- `pulumi-aws-apigateway>=3.0.0,<4.0.0` — Resolved: `3.0.0` (`uv.lock`).
- `pulumi-awsx>=3.0.0,<4.0.0` — Resolved: `3.4.0` (`uv.lock`); pulls in `pulumi-docker` and `pulumi-docker-build` transitively.

**Lambda runtime (`functions/*/requirements.txt`):**
- `boto3` — declared (unpinned) in every Lambda's `requirements.txt`. Used directly in `functions/handler.py:3`, `functions/shared/db.py:2`, `functions/login/login.py:15`, `functions/register/register.py:15`, `functions/change_password/change_password.py:13`, `functions/change_email/change_email.py` (indirect via shared), `functions/verify_email/verify_email.py:16`.
- **Implicit / undeclared:** `PyJWT` (imported as `jwt` in `functions/shared/auth.py:2-3`, used for `PyJWKClient` and RS256 verification of Cognito ID tokens). This dependency is **not listed** in any `requirements.txt` — current packaging will fail at runtime unless `PyJWT[crypto]` is added. Surface this in CONCERNS.md.

**Infrastructure (transitive, from `uv.lock`):**
- `grpcio==1.80.0`, `protobuf==6.33.6` — Pulumi engine RPC.
- `opentelemetry-api`, `opentelemetry-sdk`, `opentelemetry-exporter-otlp-proto-grpc`, `opentelemetry-instrumentation-grpc` — Pulumi telemetry.
- `pyyaml==6.0.3`, `semver==3.0.4`, `parver==0.5`, `attrs==26.1.0`, `dill==0.4.1`, `wrapt==1.17.3`, `typing-extensions==4.15.0`, `packaging==26.0` — supporting libs.
- `pulumi-docker==4.11.2`, `pulumi-docker-build==0.0.15` — pulled in transitively by `pulumi-awsx`.

## Configuration

**Environment (Pulumi):**
- Stack-scoped Pulumi config consumed in `__main__.py:8-11` via `pulumi.Config()`:
  - `isn20261:environment` — required; values `dev` or `prod` (`Pulumi.dev.yaml`, `Pulumi.prod.yaml`).
  - `isn20261:domainName` — optional; only used when `environment == prod` (`Pulumi.prod.yaml:4` sets it to `recommend.movies`).
  - `aws:region` — set to `sa-east-1` in both `Pulumi.dev.yaml:2` and `Pulumi.prod.yaml:2`.

**Environment (Lambda runtime — set by Pulumi at deploy time):**
Defined in `__main__.py:137-145` and injected into every Lambda's `environment.variables`:
- `EMAIL_TO_SUB_TABLE`, `USERS_TABLE`, `TOKENS_TABLE`, `HISTORICO_TABLE`, `LOGS_TABLE` — DynamoDB table names.
- `USER_POOL_ID`, `CLIENT_ID` — Cognito identifiers.

**Environment (Lambda runtime — read but NOT set by Pulumi — schema mismatch):**
- `functions/shared/db.py:5-10` reads `USERS_TABLE`, `EMAIL_TO_SUB_TABLE`, `TOKENS_TABLE`, `HISTORICO_TABLE`, `LOGS_TABLE`, `AWS_REGION` — names match Pulumi output.
- `functions/shared/auth.py:5-7` reads `COGNITO_USER_POOL_ID` and `COGNITO_CLIENT_ID`, but Pulumi sets them as `USER_POOL_ID` / `CLIENT_ID`. **Mismatch — JWT verification will fail in deployed Lambdas.** Surface in CONCERNS.md.
- `functions/register/register.py:22`, `functions/change_password/change_password.py:21`, `functions/verify_email/verify_email.py:23` read `COGNITO_USER_POOL_ID` — same mismatch as above.
- `functions/login/login.py:22` reads `COGNITO_CLIENT_ID` — same mismatch.
- `BASE_URL` — read in `functions/register/register.py:23`, `functions/change_email/change_email.py:21`, `functions/lost_password/lost_password.py:20` with default `https://basic-movie-recommender.com/api/v1`. Not set by Pulumi.
- `OMDB_API_KEY` — read in `functions/recommend/recommend.py:23`. Not set by Pulumi (recommendation engine is currently mocked).

**Environment (local SAM):**
- `functions/handler.py:8-12` reads `DYNAMODB_ENDPOINT_URL`, `DYNAMODB_HOST`, `DYNAMODB_PORT` (default `8000`), `DYNAMODB_TABLE` (default `isn20261`) for the `dynamodb-local` container. Used only by the standalone SAM-local handler, not by the deployed function set.

**Environment (developer host):**
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION` — required for AWS CLI / boto3 / Pulumi (see `README.md:75-82`).
- `PULUMI_ACCESS_TOKEN` — required to log in to Pulumi Cloud (see `README.md:84-88`).
- A `.env` file is **not** committed and is **not** referenced anywhere in the repo. `.gitignore` (`venv/`, `.venv/`, `*.pyc`, `__pycache__/`, `aws`, `sam_installation/`) does not even mention `.env`.

**Build:**
- `pyproject.toml` — Pulumi project Python dependencies and Python version requirement.
- `uv.lock` — full transitive dependency lock for the Pulumi program.
- `Pulumi.yaml` — Pulumi project (`runtime: python`, `toolchain: uv`).
- `Pulumi.dev.yaml`, `Pulumi.prod.yaml` — per-stack config (region, environment, optional domain).
- `template.yaml` — SAM template targeting a single placeholder `HandlerFunction` (`function/handler.handler`, runtime `python3.13`, 30s timeout, 128 MB memory). The `CodeUri: function` does not match the deployed `functions/` layout — used only for local invoke smoke-test of `functions/handler.py` against `event.json`.
- `compose.yaml` — Docker Compose service `dynamodb-local` exposed on `8000` and joined to the `sam-local` network (consumed by `make sam-lambda` via `--docker-network sam-local`).
- `Makefile` — installs `aws_cli`, `aws_sam_cli`, `pulumi`, `uv`; orchestrates `sam-start` / `sam-stop` for local DynamoDB + Lambda invocation.

## Platform Requirements

**Development:**
- Python `>=3.13` (`pyproject.toml`).
- `uv` (Astral) for the Pulumi virtualenv.
- AWS CLI v2 with valid IAM credentials (`README.md:75-82`).
- AWS SAM CLI for local Lambda invocation (`Makefile:15-23`).
- Pulumi CLI with `PULUMI_ACCESS_TOKEN` (`README.md:84-88`).
- Docker + Docker Compose for `dynamodb-local` and SAM Lambda containers.
- Linux x86_64 — install scripts in `Makefile` use `awscli-exe-linux-x86_64.zip` and `aws-sam-cli-linux-x86_64.zip`.
- The required IAM permissions for the Pulumi-deploying user are documented in `README.md:14-67` (full access on `cloudfront:*`, `apigateway:*`, `s3:*`, `route53:*`, `lambda:*`, `dynamodb:*`, `cognito-idp:*`, `acm:*`, plus targeted `iam:*` actions).

**Production:**
- Deployment target: AWS, region `sa-east-1` (São Paulo) — set in both `Pulumi.dev.yaml:2` and `Pulumi.prod.yaml:2`.
- Two Pulumi stacks: `dev` and `prod` (`isn20261:environment`).
- Stack-driven feature flags: when `environment == prod` AND `domainName` is set, the program provisions ACM (in `us-east-1` via a secondary `aws.Provider`), Route 53 records, and CloudFront aliases (`__main__.py:255-285`, `__main__.py:438-451`).

## Frontend Stack

**Status: Not yet established.**

- The `frontend/_design-reference/` directory contains throwaway design mockups (`app.jsx`, `auth.jsx`, `data.jsx`, `home.jsx`, `detail.jsx`, `history-queue.jsx`, `preferences.jsx`, `tweaks-panel.jsx`, `design-canvas.jsx`, `Recommend-a.html`, `styles.css`). These are intentionally a **design reference / spec**, not a production frontend project. There is no `package.json`, no Next.js install, no build pipeline, no router, no `node_modules`, and no real React project scaffolding under `frontend/`.
- The `Recommend-a.html` file pulls fonts directly from `fonts.googleapis.com` and reads CSS variables from `styles.css`; the JSX files reference an in-memory `MOVIES` constant rather than a real API.
- The currently-deployed "frontend" is the single static page `www/index.html`, uploaded to S3 by `__main__.py:222-239` and served by CloudFront (`__main__.py:357-415`).
- **Planned (per project context, not yet present in the repo):** Next.js + shadcn/ui. Treat any future planning that loads this document accordingly: when adding the real frontend, do **not** assume the libraries used inside `frontend/_design-reference/` (raw React via JSX `<script>` tags) are the production stack.

---

*Stack analysis: 2026-05-04*
