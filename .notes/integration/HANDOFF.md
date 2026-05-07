# Integration exploration — handoff note

> **Purpose:** restoration point for picking up the backend-integration conversation between Arthur and Claude. This file is the single source of truth when resuming. Local-only — do not push.
>
> **Last updated:** 2026-05-06 (after first scoping conversation; right before tooling install on Linux)

---

## Status snapshot

- **Frontend milestone v1.0:** functionally complete. All 10 phases merged into `frontend`. PR `frontend → main` opened manually but won't merge until ~next week (waiting for class reviewers).
- **Mocked frontend ships:** auth (mock seam + protected routes), home/hero, recommendation result, preferences, history, watch later (localStorage-backed). All under `frontend/web/`.
- **`_design-reference/` deleted** at Phase 10 handoff. **`.claude/` untracked** so GSD config stays local.
- **Branch we are on now:** `integration-explore` (local-only, NEVER push). Branched off `frontend`.
- **Arthur is moving the repo from Windows → Linux** before starting integration work. Re-clone there; this file travels with the repo (it's at `.notes/integration/HANDOFF.md`).

## What this exploration is

Arthur owns the frontend. The whole class shares the backend (Pulumi + AWS Lambda + DynamoDB + Cognito). The class hasn't wired most of the Lambdas, the env-var names are mismatched, and ~8/11 Lambdas crash on import.

Goal of THIS work:
1. Understand the current backend state hands-on (run it, observe what breaks)
2. Get the frontend talking to a real (or LocalStack-mocked) backend, replacing the `lib/api/*` mock seams
3. Produce **context files for teammates' AIs** — so when other students bring their AI to work on the backend, the AI starts with a real picture of the system

This is **not** a milestone yet. It's exploratory. When we have a coherent direction we'll open a proper GSD milestone (probably `v2-backend-integration`). Until then everything goes in `.notes/integration/`.

## Privacy constraints (hard)

- **Don't push the `integration-explore` branch.** It stays local on Arthur's machine.
- **Don't push `.notes/`** — currently NOT in `.gitignore`. We could add it once it has content worth protecting.
- The eventual deliverables that DO go public:
  - **Polished context docs** for teammates (e.g., `BACKEND.md`, `CONTRIBUTING-BACKEND.md` at the repo root)
  - **A future GSD milestone** (`.planning/phases/v2-...`) with proper plans / PRs

## Strategic context (decisions already made)

1. **Mocked frontend → real backend is a domain-by-domain swap, not a big-bang rewrite.** Each `lib/api/{auth, recommend, history, watch-later}` module is shaped like a future Lambda response — replace function bodies, not the call sites.
2. **The seam swap pattern:** add a `lib/api/_config.ts` with `USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false"` and dispatch per-function. Trivial to wire; the real cost is implementing the `real*` side per domain.
3. **Local-first dev environment via LocalStack** (confirmed 2026-05-06 — there is an open class issue titled "criar ambiente local com localstack for aws"). NOT SAM. The SAM scaffold in the repo is dead code (see "Existing scaffolding" below).
4. **Cognito-direct first:** for auth, the cleanest first integration is the frontend talking directly to Cognito via `amazon-cognito-identity-js`, bypassing the class's broken Lambda layer. Pulumi already has the right setup (USER_PASSWORD_AUTH, generate_secret=False) — see `__main__.py:67-72`.
5. **Don't fix the entire backend before integrating.** Pick the most isolated domain (auth) first. The non-Cognito Lambdas can stay broken while the auth path goes real.

## Arthur's environment (confirmed 2026-05-06)

| Question | Answer |
|---|---|
| AWS CLI installed? | **No** (was on Windows; moving to Linux now) |
| AWS credentials configured? | No |
| Pulumi CLI installed? | No |
| Pulumi stacks deployed? | None (pure code on disk; nobody is running `pulumi up` yet) |
| Has personal AWS account? | **Yes**, no IAM users / access keys created yet |
| Docker installed? | Yes (was on Windows; will be on Linux too) |
| Operating system | **Linux** (just moved from Windows specifically because Python/Docker behave better there) |

Arthur misconception cleared: **Pulumi does NOT configure AWS — it READS already-configured credentials.** You set up AWS first (`aws configure` or env vars), then Pulumi uses those.

## Existing scaffolding in the repo

What's there:
- `compose.yaml` — single service: `amazon/dynamodb-local` on port 8000 + `sam-local` Docker network
- `template.yaml` + `event.json` — AWS SAM template (NOT LocalStack)
- `Makefile` targets: `install`, `aws_cli`, `aws_sam_cli`, `pulumi`, `uv`, `sam`, `sam-start`, `sam-stop`, `sam-dynamodb`, `sam-lambda`
- `functions/handler.py` — standalone demo Lambda (creates a single `isn20261` table, hard-codes `{sub, email}` upsert)

**It's broken today.** `template.yaml` has `CodeUri: function` (singular) but the directory is `functions/`. `make sam` fails. The whole SAM scaffold + `functions/handler.py` predates the Cognito decoupling refactor — none of it talks to the real Lambdas (`login`, `register`, `recommend`, etc.).

**Decision:** ignore the SAM scaffold. We're using LocalStack instead (per class issue). Either delete it in a cleanup PR later, or leave it untouched if classmates want to keep it.

What we'll add:
- A `localstack` service in `compose.yaml` (alongside or replacing `dynamodb-local` — LocalStack already includes DynamoDB)
- A `Pulumi.localstack.yaml` stack with `aws:endpoints` pointing at LocalStack
- A `pulumilocal` wrapper command (or env-var-based endpoint config) so `__main__.py` deploys to LocalStack instead of real AWS

## Cognito on LocalStack — the one gotcha

LocalStack tiers:
- **Community (free, FOSS):** DynamoDB, Lambda, API Gateway, IAM, S3, CloudFront, SES, SQS — covers ~90% of this stack.
- **Pro (paid):** adds Cognito, plus advanced features.

Three options for Cognito specifically:
- **A. LocalStack academic license (free).** LocalStack has a student/educator program — apply with `@aluno.ifsc.edu.br` (or whatever IFSC uses). Takes a few days. Covers Pro features for free if approved.
- **B. Real Cognito on Arthur's personal AWS account.** Free tier covers it easily. Hybrid setup: DynamoDB/Lambda/API Gateway on LocalStack, Cognito on real AWS. Cleanest if academic license falls through.
- **C. `cognito-local`** — third-party FOSS Docker container that mimics Cognito's API. Works for basic flows; some edge cases differ from real Cognito.

Recommendation: **start with option B** (use real Cognito on personal AWS) while applying for option A in parallel. Option B unblocks immediately; option A is the "right" long-term answer if it works.

## Known backend issues (from `.planning/codebase/CONCERNS.md`)

Verified in the codebase already (see `__main__.py` and `functions/`):

- **Env-var name mismatch** — Pulumi sets `USER_POOL_ID` and `CLIENT_ID` on the Lambda env (`__main__.py:143-144`); the Lambda code reads `COGNITO_USER_POOL_ID` and `COGNITO_CLIENT_ID`. Every Lambda crashes on import. Single one-line fix per Lambda OR rename in Pulumi.
- **IAM policy mismatch** — IAM grants `cognito-idp:SignUp` + `AdminConfirmSignUp` (`__main__.py:124-126`); the actual code calls `admin_create_user` + `admin_set_user_password` + `initiate_auth USER_PASSWORD_AUTH`. None of those are in the policy. Lambda call → AccessDeniedException.
- **Missing PyJWT dep** — every `functions/*/requirements.txt` only lists `boto3`, but `shared/auth.py` imports `jwt`. Every authenticated Lambda will `ModuleNotFoundError` on first cold start.
- **~8 of 11 Lambdas not wired to API Gateway routes** — they exist as functions but no route hits them.
- **No backend tests** — refactors ship blind.
- **JWT verification doesn't check `token_use`** — accepts both id and access tokens for the same audience.
- **Password policy not set** — Cognito uses defaults. Frontend validates ≥8 chars but no symbol/case rules. Mismatch causes `InvalidPasswordException` on sign-up.

These are real issues but **none of them block a frontend → Cognito direct integration**. They block the Lambda-mediated path. That's why Cognito-direct is the recommended first integration.

## Concrete next step (do this on resume — Linux machine)

### Step 1: Install tooling (~15 min)

The repo's `Makefile` already automates this **for Linux** — Arthur is now on Linux, so it just works:

```bash
cd ~/path/to/isn20261     # wherever the repo lives on the Linux box
make install              # installs aws-cli, sam-cli, pulumi, uv
```

If `make install` fails on something, the individual targets (`make aws_cli`, `make pulumi`, `make uv`) can be run one at a time. Skip `make aws_sam_cli` — we're not using SAM.

Plus Docker (probably already installed; if not: `sudo apt install docker.io docker-compose-plugin && sudo usermod -aG docker $USER` then log out/in).

### Step 2: Configure AWS for LocalStack (5 min)

```bash
aws configure
# AWS Access Key ID: test
# AWS Secret Access Key: test
# Default region: sa-east-1
# Default output format: json
```

These dummy creds work for LocalStack. Real Cognito (option B) needs separate real creds — we'll set those up as a named profile (`aws configure --profile personal`) when we get to Cognito.

### Step 3: Boot LocalStack (5 min)

Edit `compose.yaml` to add a `localstack` service alongside `dynamodb-local` (or replace it — LocalStack ships its own DynamoDB). Use the official `localstack/localstack` image, expose port 4566, mount `/var/run/docker.sock`. Standard setup; Claude can write the YAML when we get here.

```bash
docker compose up -d
curl http://localhost:4566/_localstack/health    # should list services as "available"
```

### Step 4: Pulumi against LocalStack (this is where we'll discover real bugs)

Two ways to point Pulumi at LocalStack:
- **`pulumilocal`** — wrapper that auto-injects endpoint overrides. Install: `pip install pulumi-local`. Then use `pulumilocal up` instead of `pulumi up`.
- **Manual endpoints config** — add `aws:endpoints` to `Pulumi.localstack.yaml` listing each service's localhost URL.

Easier first pass: `pulumilocal`. We'll create `Pulumi.localstack.yaml` and run:

```bash
pulumilocal stack init localstack
pulumilocal up
```

**Expect this to fail.** The known bugs from CONCERNS.md will surface — env-var mismatch, missing PyJWT, IAM action drift. Each failure is a thing to fix or document. Don't try to fix everything; aim for **one working endpoint** (`/login` or `/register`) end-to-end.

### Step 5: Wire the frontend at the local API

In `frontend/web/lib/api/`, add `_config.ts`:

```ts
export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4566";
```

In `lib/api/auth.ts`, branch on `USE_MOCK`. The mock implementation stays as the default; a new `realSignIn` / `realSignUp` calls fetch against `${API_BASE}/api/v1/...` (or directly against Cognito if we go option B).

Run `cd frontend/web && NEXT_PUBLIC_USE_MOCK=false pnpm dev`, manually try logging in, watch the network tab.

### Step 6: Document everything as we go

Two parallel outputs:
1. Update **this file** as facts change (decisions, what worked, what didn't)
2. Build up `.notes/integration/SETUP.md` (commands that actually worked) and `.notes/integration/BUGS-FOUND.md` (one entry per backend issue we hit, with fix or workaround). These become the seeds of the polished `BACKEND.md` for teammates later.

## Files relevant to this work

- `__main__.py` — Pulumi program (User Pool, IAM, Lambda definitions, API Gateway)
- `functions/*/` — individual Lambda handlers (Python)
- `compose.yaml` — Docker services (currently dynamodb-local; we'll add localstack)
- `Makefile` — install targets for AWS CLI, Pulumi, uv (Linux-targeted)
- `Pulumi.dev.yaml`, `Pulumi.prod.yaml` — existing stacks (NOT deployed); we'll add `Pulumi.localstack.yaml`
- `.planning/codebase/CONCERNS.md` — the most authoritative writeup of what's broken
- `.planning/codebase/STACK.md` — tech stack inventory
- `.planning/codebase/ARCHITECTURE.md` — system architecture (read this if you've forgotten the request flow)
- `.planning/codebase/INTEGRATIONS.md` — external service integrations
- `frontend/web/lib/api/auth.ts` — the mock seam that v2 swaps to real Cognito
- `frontend/web/lib/api/recommend.ts` — same, for recommendation
- `frontend/web/lib/api/history.ts` — same, for history
- `frontend/web/lib/api/watch-later.ts` — same, for watch-later

## Conversation history (where this picks up from)

Two scoping conversations have happened:

**Conversation 1** (frontend milestone, ended 2026-05-06):
1. Built and shipped Phases 4–10 (auth UI, auth context, home, recommendation, preferences, history, watch-later)
2. Discussed: real Cognito in Phase 5? → no, stay mocked
3. Decided: integration is its own thing, not Phase 11
4. Lean-mode adjustment: turned off `plan_check` and `verifier` in `.planning/config.json`

**Conversation 2** (this one, 2026-05-06 evening):
1. Read this HANDOFF
2. Discovered the SAM scaffold in repo (compose.yaml, template.yaml, Makefile sam targets, functions/handler.py) — broken, dead code
3. Confirmed class issue mandates **LocalStack**, not SAM
4. Confirmed Arthur has zero AWS/Pulumi tooling installed, has personal AWS account, is moving Windows → Linux
5. Cleared the "Pulumi configures AWS" misconception
6. Mapped out the 6-step plan above (install → configure AWS for localstack → boot localstack → pulumi up → wire frontend → document)

Arthur is the only GSD/Claude user on this project. Teammates work without AI tooling. So everything in `.planning/` and `.notes/` is for Arthur + Claude — not for the team. The deliverable for the team is polished docs at the end.

## Reset trigger

If a resumed conversation seems to have lost context: read this file end-to-end, then check `git log --oneline -10` to see what's happened since this was written. If `last_updated` above is more than 7 days old, ask Arthur for a status update before assuming anything.

If the resumed conversation is on a fresh Linux machine: the "Concrete next step" Step 1 (`make install`) is the entry point. Don't skip it even if `aws --version` works — the repo expects specific install paths.
