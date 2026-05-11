---
phase: 01-foundation
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/web/package.json
  - frontend/web/pnpm-lock.yaml
  - frontend/web/tsconfig.json
  - frontend/web/next.config.ts
  - frontend/web/eslint.config.mjs
  - frontend/web/.prettierrc
  - frontend/web/.prettierignore
  - frontend/web/.gitignore
  - frontend/web/.env.example
  - frontend/web/.nvmrc
  - frontend/web/next-env.d.ts
  - frontend/web/postcss.config.mjs
autonomous: true
requirements:
  - FOUND-01
  - FOUND-02
  - FOUND-03
must_haves:
  truths:
    - "frontend/web/ is a real Next.js 16 + TypeScript project with a committed lockfile"
    - "TypeScript runs in strict mode and rejects unchecked array indexing"
    - "Prettier auto-orders Tailwind class strings via prettier-plugin-tailwindcss"
    - "Node and pnpm versions are pinned so a fresh clone resolves the same toolchain"
  artifacts:
    - path: "frontend/web/package.json"
      provides: "Next.js 16 manifest, pinned engines.node + packageManager, scripts (dev/build/start/lint), Prettier deps"
      contains: "\"next\""
    - path: "frontend/web/tsconfig.json"
      provides: "Strict TS config (per D-05) with @/* path alias"
      contains: "\"strict\": true"
    - path: "frontend/web/.prettierrc"
      provides: "Prettier config registering prettier-plugin-tailwindcss (per D-04)"
      contains: "prettier-plugin-tailwindcss"
    - path: "frontend/web/eslint.config.mjs"
      provides: "ESLint flat config from create-next-app (per Discretion)"
      contains: "next/core-web-vitals"
    - path: "frontend/web/.nvmrc"
      provides: "Node major version pin matching engines.node"
    - path: "frontend/web/.gitignore"
      provides: "Standard Next.js ignores; excludes .env* except .env.example"
      contains: ".next"
    - path: "frontend/web/.env.example"
      provides: "Empty placeholder (per Discretion); Cognito/Lambda vars added in Phase 4+"
  key_links:
    - from: "frontend/web/package.json"
      to: "frontend/web/pnpm-lock.yaml"
      via: "pnpm install resolution"
      pattern: "next.*16"
    - from: "frontend/web/tsconfig.json"
      to: "TypeScript compiler"
      via: "pnpm exec tsc --noEmit"
      pattern: "noUncheckedIndexedAccess.*true"
    - from: "frontend/web/package.json"
      to: ".nvmrc"
      via: "shared Node major (engines.node)"
      pattern: "engines.*node.*22"
---

<objective>
Bootstrap the Next.js 16 + TypeScript project at `frontend/web/` and lock the toolchain (Node, pnpm, ESLint flat config, Prettier with the Tailwind plugin, strict TS with `noUncheckedIndexedAccess`). Implements REQ FOUND-01, FOUND-02, and the lint-setup portion of FOUND-03. The dev server, font wiring, and routes are NOT in scope here — they land in plans 02–04.

Purpose: Provide every later plan in this phase with a runnable, lint-clean, type-strict skeleton. Without this, plan 02 (Tailwind v4 + shadcn init) has nothing to install into.

Output: A `frontend/web/` directory containing `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `eslint.config.mjs`, `.prettierrc`, `.prettierignore`, `.gitignore`, `.env.example`, `.nvmrc`, `next.config.ts`, `next-env.d.ts`, `postcss.config.mjs` — all committed.
</objective>

<execution_context>
@/home/aluno/Downloads/isn20261/.claude/get-shit-done/workflows/execute-plan.md
@/home/aluno/Downloads/isn20261/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/STATE.md
@.planning/phases/01-foundation/01-CONTEXT.md
@.planning/phases/01-foundation/01-PATTERNS.md
</context>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| developer host -> upstream npm registry | `pnpm create next-app`, `pnpm install`, `pnpm dlx shadcn` resolve and execute third-party JS during scaffold |
| committed lockfile -> future CI / fresh clones | `pnpm-lock.yaml` is the supply-chain anchor for every later install |
| `.gitignore` -> committed repo | Filters which dotfiles ever reach origin (especially `.env*`) |

## STRIDE Threat Register

severity_max: low

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-01 | Tampering (supply chain) | `package.json` + `pnpm-lock.yaml` | mitigate | Pin `engines.node` (Node 22 LTS), pin `packageManager` to exact `pnpm@<x.y.z>` resolved at install, commit `pnpm-lock.yaml` so reproducible installs are enforced. Use only `pnpm create next-app@latest` and `pnpm dlx shadcn@latest` (later plans) — no curl-to-bash, no untrusted scripts. |
| T-01-02 | Information Disclosure (secrets in repo) | `.gitignore`, `.env.example` | mitigate | `.gitignore` MUST contain `.env*` with an explicit allowance for `.env.example` only. `.env.example` MUST be empty (or a single comment) — no real keys, no Cognito IDs, no Pulumi outputs. Phase 1 has zero secrets to leak; this control prevents accidental leakage when Phase 4+ wires real env vars. |
| T-01-03 | Tampering (lint/format bypass) | `eslint.config.mjs`, `.prettierrc` | accept | Phase 1 uses the stock `create-next-app` flat ESLint config and a minimal Prettier config registering only `prettier-plugin-tailwindcss`. Custom rules (e.g. DSGN-06 hex/px ban) are deferred to Phase 2 per CONTEXT.md `<deferred>`. Acceptable: phase scope is bootstrap, not policy enforcement. |
| T-01-04 | Repudiation (no auth, no network, no user input) | All Phase-1 surfaces | accept | Phase 1 has no auth flow, no network calls, no user input handling, and no secrets. Cognito/Lambda secret handling is explicitly Phase 4+ territory and is NOT introduced here. |

**Note:** No high-severity threats. No `dangerouslySetInnerHTML`, no `eval`, no third-party runtime scripts in this plan's surface area.
</threat_model>

<tasks>

<task type="auto">
  <name>Task 1: Scaffold Next.js 16 project at frontend/web/ with create-next-app</name>
  <files>
    frontend/web/package.json,
    frontend/web/pnpm-lock.yaml,
    frontend/web/next.config.ts,
    frontend/web/eslint.config.mjs,
    frontend/web/.gitignore,
    frontend/web/next-env.d.ts,
    frontend/web/postcss.config.mjs,
    frontend/web/tsconfig.json,
    frontend/web/.nvmrc,
    frontend/web/.env.example
  </files>
  <read_first>
    .planning/phases/01-foundation/01-CONTEXT.md (D-01, D-05, and the entire `Claude's Discretion` block — Node version, pnpm version, ESLint config style, .gitignore, .env.example, path alias),
    .planning/phases/01-foundation/01-PATTERNS.md (Convention 1, 6, and the "package.json" + "tsconfig.json" + "eslint.config.mjs" sections),
    CLAUDE.md (hard rule #1 — frontend lives at frontend/web/)
  </read_first>
  <action>
    Run scaffold from the repo root (`/home/aluno/Downloads/isn20261/`):

    ```bash
    cd frontend && pnpm create next-app@latest web \
      --typescript \
      --tailwind \
      --app \
      --eslint \
      --no-src-dir \
      --turbopack \
      --import-alias='@/*' \
      --use-pnpm \
      --skip-install
    cd web && pnpm install
    ```

    The flags map to CONTEXT.md Discretion items: `--no-src-dir` (no `src/` — folder layout is `app/components/lib/...` flat under `web/`), `--import-alias='@/*'` (path alias), `--use-pnpm` (pnpm only — backend uses uv, no shared workspace), `--turbopack` (Next 16 default), `--tailwind` (gets Tailwind v4 + PostCSS plugin per D-01).

    After scaffold, do NOT remove anything yet — plan 02 will reorganize globals.css. But DO modify these files now:

    1. **`frontend/web/package.json`** — read it, then add the following keys to the existing JSON object (preserve everything create-next-app emitted, including `dependencies`, `devDependencies`, `scripts`):
       ```json
       "engines": { "node": ">=22.0.0" },
       "packageManager": "pnpm@<EXACT_VERSION>"
       ```
       Where `<EXACT_VERSION>` is whatever `pnpm -v` returns on the install host (run `pnpm -v` and substitute literally — e.g. `pnpm@9.12.3`). Must be pinned to a single version, not a range.

    2. **`frontend/web/.nvmrc`** — write a single line containing `22` (matches the Node major in `engines.node`). No trailing whitespace beyond the newline.

    3. **`frontend/web/tsconfig.json`** — read what create-next-app emitted, then ensure `compilerOptions` contains BOTH of these keys (add if missing, replace if create-next-app omitted them):
       ```json
       "strict": true,
       "noUncheckedIndexedAccess": true
       ```
       Per D-05, do NOT add `noImplicitOverride`, `noFallthroughCasesInSwitch`, or `exactOptionalPropertyTypes` — they are deliberately out of scope. Confirm `"baseUrl": "."` and `"paths": { "@/*": ["./*"] }` exist (create-next-app emits these with `--import-alias='@/*'`). Leave every other create-next-app-emitted key untouched.

    4. **`frontend/web/.gitignore`** — read what create-next-app emitted (it already excludes `.next/`, `node_modules/`, `*.log`, build outputs). Ensure it contains an `.env*` block that excludes everything except `.env.example`. If create-next-app's default already does this, leave it. If not, append:
       ```
       # local env files
       .env*
       !.env.example
       ```

    5. **`frontend/web/.env.example`** — create with a single comment line:
       ```
       # Phase 1 ships zero env vars. Cognito / Lambda vars land in Phase 4+ when lib/api/ is filled.
       ```

    Do NOT create or modify: `app/`, `components/`, `lib/`, `public/` (plan 03 owns the folder skeleton), `styles/globals.css` (plan 02 owns Tailwind entry), `components.json` or `lib/utils.ts` (plan 02's shadcn init).

    The scaffold will create `app/page.tsx`, `app/layout.tsx`, and `app/globals.css` as defaults — leave them in place for now. Plans 02 and 03 will reshape them.
  </action>
  <verify>
    <automated>
      cd /home/aluno/Downloads/isn20261/frontend/web && \
      test -f package.json && \
      test -f pnpm-lock.yaml && \
      test -f tsconfig.json && \
      test -f next.config.ts && \
      test -f eslint.config.mjs && \
      test -f .nvmrc && \
      test -f .env.example && \
      test -f .gitignore && \
      grep -q '"next"' package.json && \
      grep -q '"strict": true' tsconfig.json && \
      grep -q '"noUncheckedIndexedAccess": true' tsconfig.json && \
      grep -q '"@/\*"' tsconfig.json && \
      grep -q '"engines"' package.json && \
      grep -q '"packageManager": "pnpm@' package.json && \
      grep -qE '^22(\.|$)' .nvmrc && \
      grep -qE '^\.env\*' .gitignore && \
      grep -q '!.env.example' .gitignore
    </automated>
  </verify>
  <acceptance_criteria>
    - `frontend/web/package.json` exists and contains `"next"` (any v16.x.x).
    - `frontend/web/package.json` contains `"engines": { "node": ">=22.0.0" }` (or stricter pin like `">=22.0.0 <23.0.0"`).
    - `frontend/web/package.json` contains `"packageManager": "pnpm@<x.y.z>"` with an exact version (regex: `pnpm@\d+\.\d+\.\d+`).
    - `frontend/web/package.json` `scripts` object contains `dev`, `build`, `start`, `lint` (verifiable: `node -e 'const p=require("./frontend/web/package.json"); ["dev","build","start","lint"].forEach(k=>{if(!p.scripts[k])throw new Error(k)})'` exits 0).
    - `frontend/web/pnpm-lock.yaml` exists and is non-empty (`test -s frontend/web/pnpm-lock.yaml` exits 0).
    - `frontend/web/tsconfig.json` contains `"strict": true` AND `"noUncheckedIndexedAccess": true` AND `"@/*": ["./*"]`.
    - `frontend/web/tsconfig.json` does NOT contain `"exactOptionalPropertyTypes"` (per D-05).
    - `frontend/web/.nvmrc` first line matches `^22(\.|$)` (just `22` or `22.x.x`).
    - `frontend/web/.env.example` exists, is non-empty (single comment line), and contains zero lines matching `^[A-Z_]+=` (no real assignments).
    - `frontend/web/.gitignore` contains a line matching `^\.env\*` AND a line matching `^!\.env\.example`.
    - `cd frontend/web && pnpm exec tsc --noEmit` exits 0 (no TS errors against the create-next-app default `app/page.tsx` and `app/layout.tsx` under strict + noUncheckedIndexedAccess).
  </acceptance_criteria>
  <done>
    Project scaffolded, toolchain pinned, strict TS enforced. `pnpm exec tsc --noEmit` passes. ESLint config is the create-next-app default (a separate task verifies `pnpm lint`).
  </done>
</task>

<task type="auto">
  <name>Task 2: Add Prettier with prettier-plugin-tailwindcss and confirm lint passes</name>
  <files>
    frontend/web/.prettierrc,
    frontend/web/.prettierignore,
    frontend/web/package.json
  </files>
  <read_first>
    frontend/web/package.json (the file Task 1 produced — to see existing devDependencies and avoid duplicate installs),
    .planning/phases/01-foundation/01-CONTEXT.md (D-04 — Prettier + prettier-plugin-tailwindcss is mandatory; pairs with theme-vars-only rule from Phase 2),
    .planning/phases/01-foundation/01-PATTERNS.md (the ".prettierrc" section — defensible defaults, no opinionated overrides)
  </read_first>
  <action>
    Per D-04, install Prettier + the Tailwind class-sort plugin and wire them up.

    1. Install (from `frontend/web/`):
       ```bash
       cd /home/aluno/Downloads/isn20261/frontend/web && \
       pnpm add -D prettier prettier-plugin-tailwindcss
       ```
       This appends `prettier` and `prettier-plugin-tailwindcss` to `devDependencies` in `package.json` and updates `pnpm-lock.yaml`.

    2. Create **`frontend/web/.prettierrc`** with exactly this content (literal JSON — no comments, no trailing newline issues):
       ```json
       {
         "plugins": ["prettier-plugin-tailwindcss"]
       }
       ```
       Per D-04 + PATTERNS.md ".prettierrc" section: register the plugin only. Phase 1 does NOT litigate quote style, semicolons, print width, or any other Prettier option — defaults are fine.

    3. Create **`frontend/web/.prettierignore`** with this content:
       ```
       # Auto-generated and lock files
       .next
       node_modules
       pnpm-lock.yaml
       next-env.d.ts
       ```
       Mirrors `.gitignore` philosophy — don't reformat generated artifacts.

    4. Append a `format` script to `package.json` `scripts` (preserve all existing scripts; add this one):
       ```json
       "format": "prettier --write ."
       ```
       And a check-only counterpart for CI use later:
       ```json
       "format:check": "prettier --check ."
       ```

    Do NOT modify ESLint config (use create-next-app's flat config as-is per Discretion). Do NOT add `eslint-config-prettier` or `eslint-plugin-prettier` — modern ESLint flat configs do not collide with Prettier defaults, and Phase 1 is not litigating style rules.
  </action>
  <verify>
    <automated>
      cd /home/aluno/Downloads/isn20261/frontend/web && \
      test -f .prettierrc && \
      test -f .prettierignore && \
      grep -q "prettier-plugin-tailwindcss" .prettierrc && \
      grep -q '"prettier":' package.json && \
      grep -q '"prettier-plugin-tailwindcss":' package.json && \
      grep -q '"format":' package.json && \
      pnpm exec prettier --check .prettierrc .prettierignore && \
      pnpm lint
    </automated>
  </verify>
  <acceptance_criteria>
    - `frontend/web/.prettierrc` exists, parses as valid JSON (`node -e 'JSON.parse(require("fs").readFileSync("frontend/web/.prettierrc"))'` exits 0), and the parsed object has `plugins` containing the literal string `"prettier-plugin-tailwindcss"`.
    - `frontend/web/.prettierignore` exists and contains `.next`, `node_modules`, `pnpm-lock.yaml`, `next-env.d.ts` (one per line).
    - `frontend/web/package.json` `devDependencies` contains BOTH `prettier` AND `prettier-plugin-tailwindcss` (verifiable: `node -e 'const p=require("./frontend/web/package.json"); if(!p.devDependencies.prettier||!p.devDependencies["prettier-plugin-tailwindcss"])process.exit(1)'` exits 0).
    - `frontend/web/package.json` `scripts.format` equals `"prettier --write ."` and `scripts["format:check"]` equals `"prettier --check ."`.
    - `cd frontend/web && pnpm exec prettier --check .prettierrc .prettierignore` exits 0 (Prettier itself runs without crashing).
    - `cd frontend/web && pnpm lint` exits 0 against the create-next-app-emitted `app/page.tsx` and `app/layout.tsx` (proves FOUND-03's lint portion).
  </acceptance_criteria>
  <done>
    Prettier installed with the Tailwind plugin registered. `pnpm lint` (FOUND-03 lint portion) passes against the scaffolded code. Format scripts are available for later phases. Lockfile updated.
  </done>
</task>

</tasks>

<verification>
After both tasks:
- `cd frontend/web && pnpm exec tsc --noEmit` exits 0 — proves FOUND-02 (strict TS) compiles cleanly against scaffolded code.
- `cd frontend/web && pnpm lint` exits 0 — proves FOUND-03's lint portion.
- `git status` from repo root shows the new `frontend/web/` tree as untracked (or staged if executor commits per atomic-commit policy).
- `frontend/web/package.json` contains pinned `engines.node` and `packageManager` — proves toolchain reproducibility.
- `frontend/web/.gitignore` excludes `.env*` except `.env.example` — proves T-01-02 mitigation.
</verification>

<success_criteria>
- Plan 01 ends with a runnable Next.js project on disk at `frontend/web/`.
- Strict TypeScript (with `noUncheckedIndexedAccess`) compiles the scaffolded `app/page.tsx` and `app/layout.tsx` without errors.
- ESLint flat config (create-next-app default) reports zero errors via `pnpm lint`.
- Prettier with `prettier-plugin-tailwindcss` is installed and registered.
- Toolchain is pinned: `engines.node`, `packageManager`, `.nvmrc`, committed `pnpm-lock.yaml`.
- No secrets, no Google Fonts CDN, no `dangerouslySetInnerHTML`, no `eval` introduced.
- `lib/api/`, `styles/`, custom routes, font loading — all out of scope for plan 01 and remain untouched (or in their create-next-app default state) for plans 02–04 to handle.
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation/01-01-SUMMARY.md` capturing:
- Exact Next.js, React, TypeScript, pnpm, Node versions installed (read from `package.json` and `pnpm -v`).
- Whether create-next-app emitted `app/globals.css` AND/OR an existing CSS file path (so plan 02 knows what to reorganize).
- Confirmation `pnpm lint` and `pnpm exec tsc --noEmit` both exit 0.
- Any deviation from D-05 strictness flags (none expected).
</output>
