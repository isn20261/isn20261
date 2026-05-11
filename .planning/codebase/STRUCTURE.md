# Codebase Structure

**Analysis Date:** 2026-05-04

## Directory Layout

```
isn20261/
├── __main__.py                # Pulumi program — single source of AWS infra
├── Pulumi.yaml                # Pulumi project metadata (Python runtime + uv toolchain)
├── Pulumi.dev.yaml            # Stack config: environment=dev, region=sa-east-1
├── Pulumi.prod.yaml           # Stack config: environment=prod, domainName=recommend.movies
├── pyproject.toml             # Python deps (pulumi, pulumi-aws, pulumi-aws-apigateway, pulumi-awsx)
├── uv.lock                    # uv lockfile
├── Makefile                   # Install + local SAM run targets
├── template.yaml              # SAM template for `sam local invoke` (uses functions/handler.py)
├── compose.yaml               # docker-compose for amazon/dynamodb-local on `sam-local` network
├── event.json                 # Sample event for SAM local invoke
├── README.md                  # AWS+Pulumi+Codespaces setup, requirements, Mermaid block diagrams
├── LICENSE
├── .gitignore                 # venv/, .venv/, *.pyc, __pycache__/, aws, sam_installation/
├── .vscode/                   # Editor config (not authoritative)
├── docs/
│   ├── openapi.yaml           # HTTP API contract (12 endpoints)
│   ├── inconsistencias.md     # Tracker of OpenAPI ↔ implementation deviations (12 items)
│   ├── Diagrama 02 abr 2026.jpeg  # Architecture sketch
│   ├── Diagrama 04 abr 2026.jpg   # Architecture sketch (revised)
│   └── Banco-de-Dados/
│       └── Modelagem.md       # JSON Schemas for the 5 DynamoDB tables
├── functions/                 # All Lambda source code
│   ├── requirements.txt       # Top-level (boto3) — used by SAM template
│   ├── handler.py             # Standalone demo handler for local SAM testing
│   ├── shared/                # ★ Source of truth for cross-Lambda helpers
│   │   ├── __init__.py        # Empty package marker
│   │   ├── auth.py            # Cognito JWT verification → returns `sub` or None
│   │   ├── db.py              # boto3 DynamoDB resource + table accessors + log writer
│   │   └── response.py        # API-Gateway-shaped response helpers (ok/created/bad_request/...)
│   ├── register/
│   │   ├── register.py        # POST /register handler
│   │   ├── requirements.txt   # boto3
│   │   └── shared -> ../shared  (symlink)
│   ├── login/
│   │   ├── login.py           # POST /login handler
│   │   ├── requirements.txt
│   │   └── shared -> ../shared  (symlink)
│   ├── recommend/
│   │   ├── recommend.py       # GET /recommend (auth optional) — mock catalogue
│   │   ├── requirements.txt
│   │   └── shared -> ../shared  (symlink)
│   ├── change_email/
│   │   ├── change_email.py    # POST /change-email
│   │   ├── requirements.txt
│   │   └── shared -> ../shared
│   ├── change_password/
│   │   ├── change_password.py # POST /change-password
│   │   ├── requirements.txt
│   │   └── shared -> ../shared
│   ├── lost_password/
│   │   ├── lost_password.py   # POST /lost-password
│   │   ├── requirements.txt
│   │   └── shared -> ../shared
│   ├── verify_email/
│   │   ├── verify_email.py    # GET /verify-email?token=...
│   │   ├── requirements.txt
│   │   └── shared -> ../shared
│   ├── preferences/
│   │   ├── preferences.py     # GET + POST /preferences
│   │   ├── requirements.txt
│   │   └── shared -> ../shared
│   ├── history/
│   │   ├── history.py         # GET /history
│   │   ├── requirements.txt
│   │   └── shared -> ../shared
│   └── watch_later/
│       ├── watch_later.py     # GET + POST /watch-later
│       ├── requirements.txt
│       └── shared -> ../shared
├── www/                       # Production static frontend uploaded to S3 by Pulumi
│   └── index.html             # Minimal placeholder page (~10 lines)
├── frontend/
│   └── _design-reference/     # ★ Design mockup ONLY — NOT built or deployed
│       ├── Recommend-a.html   # Entry HTML — loads React 18 + Babel from unpkg, mounts <Root/>
│       ├── styles.css         # CSS custom properties (colors, fonts), grain/animations
│       ├── design-canvas.jsx  # Multi-artboard canvas wrapper (frame chrome, zoom, navigation)
│       ├── tweaks-panel.jsx   # Floating panel: accent color/preset, background tone toggles
│       ├── app.jsx            # PrototypeApp — screen state machine + reveal animation
│       ├── data.jsx           # MOVIES mock catalogue (≈12 items, picsum poster seeds)
│       ├── icons.jsx          # Lucide-style stroke-icon set (Search, Home, Bookmark, …)
│       ├── shared.jsx         # Common UI atoms (BrandMark, Toast, etc.)
│       ├── home.jsx           # HomeDesktop, HomeMobile screens (3 hero variants)
│       ├── detail.jsx         # DetailScreen — cinematic recommendation reveal
│       ├── auth.jsx           # LoginScreen, RegisterScreen, ForgotScreen (3-state)
│       ├── preferences.jsx    # PreferencesScreen
│       ├── history-queue.jsx  # HistoryScreen + QueueScreen (drag-to-reorder watch-later)
│       ├── uploads/
│       │   └── pasted-1777594982617-1.png   # Reference image
│       └── scraps/
│           └── sketch-2026-05-01T00-23-11-dk40ao.napkin   # Design napkin export
└── .planning/
    └── codebase/              # GSD-managed codebase maps (this directory)
```

## Directory Purposes

**`functions/`:**
- Purpose: Per-Lambda source trees, each one packaged independently as a deployment ZIP.
- Contains: One subdirectory per HTTP endpoint plus `shared/` (source of truth for helpers) plus `handler.py` (SAM demo only).
- Key files: `functions/<name>/<name>.py` is always the handler entry; `functions/shared/{auth,db,response}.py` are imported by every Lambda via the `shared -> ../shared` symlink.

**`functions/shared/`:**
- Purpose: Single source of truth for JWT verification (`auth.py`), DynamoDB clients/accessors (`db.py`), and HTTP response helpers (`response.py`).
- Contains: `__init__.py`, `auth.py` (PyJWKClient cached per-warm), `db.py` (table-name env-var resolution + helpers like `get_user`, `write_log`), `response.py` (`ok`/`bad_request`/etc.).
- Special: Each sibling Lambda directory contains a relative symlink `shared -> ../shared` so `pulumi.FileArchive` packages a copy of these files into every ZIP. Touching any file here changes every Lambda's behavior.

**`functions/<endpoint>/`:**
- Purpose: One Lambda per endpoint. The Pulumi function name is the directory name; the handler is `<dirname>.handler` (declared in `__main__.py:148-156`).
- Contains: `<name>.py` (handler), `requirements.txt` (per-Lambda deps — currently just `boto3`; some need `pyjwt` at deploy time but it is provided via `functions/requirements.txt`/Lambda layer in practice), `shared` symlink.

**`docs/`:**
- Purpose: Reference docs.
- Contains:
  - `openapi.yaml` — authoritative HTTP contract (deviations tracked in `inconsistencias.md`).
  - `Banco-de-Dados/Modelagem.md` — JSON Schema for each DynamoDB table.
  - `inconsistencias.md` — backlog of OpenAPI vs. implementation gaps (read this before changing schemas).
  - `Diagrama *.jpeg/.jpg` — system diagrams (image only; the canonical Mermaid version is in `README.md`).

**`www/`:**
- Purpose: Static frontend uploaded to the S3 bucket by Pulumi (`__main__.py:222-239` walks the directory and creates a `BucketObject` per file).
- Contains: `index.html` placeholder.
- Currently shipped: yes — every file under `www/` becomes an S3 object served via CloudFront.

**`frontend/_design-reference/`:**
- Purpose: High-fidelity React+Babel-in-the-browser design prototype for the "Recommend·a" UI.
- Contains: One HTML entry (`Recommend-a.html`) plus 12 `.jsx` files compiled in-browser via `@babel/standalone` and a single `styles.css`.
- Generated: No.
- Committed: Yes.
- Currently shipped: **No** — `__main__.py` only uploads `www/`. To deploy this prototype as the live frontend would require either (a) building it into static assets and dumping them in `www/`, or (b) creating a real Next.js/Vite app under `frontend/` and pointing the Pulumi upload at the build output.

**`.planning/codebase/`:**
- Purpose: Output directory for GSD codebase-mapper agents (this file lives here).
- Generated: Yes (but committed as documentation).
- Committed: Yes.

**`.vscode/`:**
- Purpose: Editor settings — not authoritative for tooling.
- Generated: No.
- Committed: Yes.

## Key File Locations

**Entry Points:**
- `__main__.py`: Pulumi program — provisions the entire AWS stack.
- `functions/<name>/<name>.py:handler`: Lambda invocation entry for HTTP endpoint `<name>`.
- `functions/handler.py:handler`: Local-only SAM demo handler (referenced by `template.yaml`).
- `frontend/_design-reference/Recommend-a.html`: Browser entry for the design prototype (open via `file://` or any static server).

**Configuration:**
- `Pulumi.yaml`: Project name + Python runtime (uv toolchain).
- `Pulumi.dev.yaml` / `Pulumi.prod.yaml`: Per-stack config (`environment`, `aws:region`, optional `domainName`).
- `pyproject.toml`: Pulumi-side Python dependencies.
- `functions/<name>/requirements.txt`: Per-Lambda deps (currently all just `boto3`; `pyjwt` is required by `shared/auth.py` and must be present in the Lambda's site-packages — verify when adding new functions).
- `template.yaml`: SAM Serverless Function (`HandlerFunction` → `function/handler.handler`, runtime python3.13).
- `compose.yaml`: `dynamodb-local` service on the `sam-local` Docker network.
- `Makefile`: `install` (downloads aws-cli/sam-cli/pulumi/uv), `sam` / `sam-start` / `sam-stop` (local Lambda + DynamoDB-Local).
- `event.json`: Default test event for `sam local invoke` — `{"sub": "123456", "email": "user@example.com"}`.

**Core Logic:**
- `__main__.py`: Infrastructure (lines 13–60 DynamoDB, 62–72 Cognito, 74–134 IAM, 136–161 Lambdas, 164–219 API Gateway, 221–415 S3+CloudFront).
- `functions/shared/auth.py`: JWT validation (`get_sub(event) -> str | None`).
- `functions/shared/db.py`: DynamoDB resource + table accessors (`users()`, `email_to_sub()`, `tokens()`, `historico()`, `logs()`) and high-level helpers (`get_user`, `get_sub_by_email`, `get_token`, `write_log`).
- `functions/shared/response.py`: HTTP response builders (`ok`, `created`, `bad_request`, `unauthorized`, `forbidden`, `not_found`, `server_error`).

**Testing:**
- No automated test suite is present. `event.json` + `make sam` provides a smoke-test path for `functions/handler.py`. There are no `pytest`, `unittest`, or `conftest.py` files anywhere in the repo as of this map.

## Naming Conventions

**Files:**
- Python Lambdas: `snake_case.py` matching the directory name (`change_email/change_email.py`).
- Pulumi resource logical names: `kebab-case-{env}` (e.g., `users-table-dev`, `cdn-prod`, `lambda-role-dev`).
- DynamoDB physical table names: `PascalCase_{env}` (e.g., `Users_dev`, `EmailToSub_prod`).
- Design prototype files: `kebab-case.jsx` (e.g., `history-queue.jsx`, `tweaks-panel.jsx`); HTML entry uses the brand name `Recommend-a.html`.
- Docs in Portuguese: filename in PT (`Modelagem.md`, `inconsistencias.md`); diagrams use the date as the filename (`Diagrama 04 abr 2026.jpg`).

**Directories:**
- Lambda function dirs: `snake_case` matching the route slug with hyphens replaced by underscores (`watch_later/` for `/watch-later`, `change_email/` for `/change-email`).
- Hidden meta-dirs: `.planning/`, `.vscode/`, `.git/`, `.claude/`.

**Symbols (Python):**
- Module-level constants: `UPPER_SNAKE_CASE` (`USER_POOL_ID`, `BASE_URL`, `_MOCK_CATALOGUE`).
- Functions: `snake_case` (`get_sub`, `write_log`, `_pick_movie` — leading underscore = module-private).
- Lambda entry function: always `handler(event, context)` (matches `functions.<name>.handler` declared in `__main__.py:159-161`).

## Where to Add New Code

**A new HTTP endpoint:**
1. Pick a slug, e.g. `/api/v1/reset-password` (the missing companion to `/lost-password` — see `docs/inconsistencias.md` item 10).
2. Create `functions/reset_password/reset_password.py` with a top-level `handler(event, context)`.
3. Create `functions/reset_password/requirements.txt` mirroring an existing one.
4. Create the symlink: from inside `functions/reset_password/`, run `ln -s ../shared shared`.
5. In `__main__.py`:
   - Add `reset_password_lambda = create_lambda("reset_password", "reset_password.handler")` after the existing Lambdas (`__main__.py:159-161`).
   - Add `create_route("/api/v1/reset-password", "POST", reset_password_lambda)` (or pass `auth_id=authorizer.id` if it requires JWT).
   - Add any new IAM action to the inline policy at `__main__.py:97-134`.
6. Update `docs/openapi.yaml` and tick off the relevant item in `docs/inconsistencias.md`.

**A new shared helper:**
- Add to `functions/shared/<module>.py`. Because of the symlink layout, every Lambda gets it for free — no per-function plumbing.
- If the helper imports a new third-party package, add it to every per-Lambda `requirements.txt` that uses it (or, preferably, factor in a Lambda Layer — not yet present in this repo).

**A new DynamoDB table:**
- Add an `aws.dynamodb.Table(...)` block in `__main__.py` near the existing tables (lines 13–60), using the same `f"{name}-table-{env}"` and `f"{Name}_{env}"` pattern.
- Add the table ARN to the IAM policy at `__main__.py:97-134`.
- Plumb the env var into `env_vars` (`__main__.py:137-145`) and add a corresponding accessor in `functions/shared/db.py`.
- Document the schema in `docs/Banco-de-Dados/Modelagem.md`.

**A new field on an existing table:**
- DynamoDB is schemaless at write time, so a Lambda can start writing the field immediately. **However:** update `docs/Banco-de-Dados/Modelagem.md` (it has `additionalProperties: false`) and remove the corresponding row from `docs/inconsistencias.md` if it is one of the tracked items (4, 5, 7).

**A new Cognito-touching capability:**
- Extend the Cognito statement of the inline policy at `__main__.py:121-128` (currently allows `AdminInitiateAuth`, `SignUp`, `AdminConfirmSignUp` — note that `AdminCreateUser`, `AdminSetUserPassword`, `AdminUpdateUserAttributes`, `InitiateAuth` are also called by the Lambdas and may rely on the wildcard `Resource: "*"` plus the broader user-group policy in `README.md`).

**Frontend work:**
- For now, edit `frontend/_design-reference/*.jsx` for design iteration. The prototype is self-contained and runs by opening `Recommend-a.html` in a browser.
- For real-app work, either (a) replace `www/index.html` with the SPA build output, or (b) introduce a build step (Vite/Next.js) under `frontend/` and point `frontend_dir = "www"` in `__main__.py:224` at the new output directory after building.

**Local development:**
- Use `make sam` to spin up DynamoDB-Local + invoke the demo handler (`functions/handler.py`) once. There is currently no full local stack for the production Lambdas — they call Cognito directly, which has no local emulator.

## Special Directories

**`frontend/_design-reference/`:**
- Purpose: Design prototype (React via CDN + Babel-in-browser). Reference only.
- Generated: No.
- Committed: Yes.
- Currently deployed: **No.**

**`www/`:**
- Purpose: Static frontend served at the apex of CloudFront. Every file here is uploaded to S3 by Pulumi.
- Generated: No (currently a single hand-written `index.html`).
- Committed: Yes.

**`functions/<name>/shared/` (symlinks):**
- Purpose: Allow `pulumi.FileArchive(./functions/<name>)` to bundle a copy of `functions/shared/` into each Lambda ZIP without source duplication.
- Generated: No (created manually with `ln -s ../shared shared`; tracked by git as a symlink — confirmed via `ls -la`).
- Committed: Yes.

**`.planning/`:**
- Purpose: GSD workflow output (codebase maps, plans).
- Generated: Yes (by `/gsd-map-codebase` and friends).
- Committed: Yes.

**`.claude/`:**
- Purpose: Local Claude Code agent definitions/hooks/commands.
- Generated: Yes (managed by Claude Code).
- Committed: Yes (note: `recent commits` show this directory is currently `??` untracked at the working-tree level, but the `.planning/` and `.claude/` trees are project tooling, not application code).

---

*Structure analysis: 2026-05-04*
