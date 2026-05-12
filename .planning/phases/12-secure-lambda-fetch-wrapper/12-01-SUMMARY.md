---
phase: 12-secure-lambda-fetch-wrapper
plan: 01
subsystem: infra
tags: [sonner, toaster, shadcn, env-config, dsgn-06]

# Dependency graph
requires:
  - phase: 02-design-system
    provides: "@theme tokens in styles/globals.css (--color-surface, --color-text-primary, --color-border, --color-success, --color-danger, --color-warning, --radius-md) — Sonner CSS-var overrides point at these"
  - phase: 05-auth-context
    provides: "AuthProvider mounted in app/layout.tsx — Toaster mounts as a sibling, not a child"
provides:
  - "Tokenized <Toaster /> primitive at frontend/web/components/ui/sonner.tsx (theme=dark, project-token style overrides, zero hex/rgba/hsl literals)"
  - "<Toaster /> mounted exactly once in app/layout.tsx as a sibling of <AuthProvider>"
  - "NEXT_PUBLIC_API_BASE_URL slot in .env.example documented with Pulumi source hint (pulumi stack output api_internal_url → __main__.py:600) and an sa-east-1 example value"
affects:
  - 12-02-fetch-wrapper-core (consumes NEXT_PUBLIC_API_BASE_URL at module init; setOnUnauthorized lands in client.ts ready for AuthContext.tsx to register signOut)
  - 12-03-use-api-error-ux (calls toast.error(...) — relies on the Toaster being mounted)
  - "Phases 13–16 (per-screen integrations) consume useApiErrorUx, which consumes Sonner"

# Tech tracking
tech-stack:
  added:
    - "sonner@^2.0.7 (toast library, ~3KB gz, lands in client bundle only when a screen imports toast)"
    - "next-themes@^0.4.6 (pulled in as a transitive shadcn template dep; NOT imported by components/ui/sonner.tsx — kept in package.json to avoid drift on future shadcn add invocations)"
  patterns:
    - "shadcn template → audit-then-rewrite: ship the CLI output but replace non-project token names with project token names before committing"
    - "Library-internal CSS-var passthrough: style props on shadcn primitives may set library-internal CSS variables (--normal-bg, --error-text, etc.) to var(--color-surface) etc. — these are not design-system properties and don't violate DSGN-06's spirit even though they trip the blunt grep -nE 'style=\\{' check"

key-files:
  created:
    - "frontend/web/components/ui/sonner.tsx (tokenized dark-locked Toaster, 70 lines)"
  modified:
    - "frontend/web/app/layout.tsx (added Toaster import + 1-line JSX mount)"
    - "frontend/web/.env.example (appended 2 comment lines documenting Pulumi source + example value)"
    - "frontend/web/package.json (added sonner + next-themes deps via shadcn add)"
    - "frontend/web/pnpm-lock.yaml (lockfile update)"

key-decisions:
  - "Replaced shadcn template's theme=\"system\" + useTheme() with hardcoded theme=\"dark\" — project is dark-locked per CLAUDE.md / 12-PATTERNS.md, no theme switcher will ship in v2.0"
  - "Repointed Sonner's internal CSS vars (--normal-bg, --normal-text, --normal-border, --border-radius) from the shadcn-default token names (--popover, --popover-foreground, --border, --radius — none of which exist in this project's @theme block) to project tokens (--color-surface, --color-text-primary, --color-border, --radius-md). Added per-status overrides (--error-text → --color-danger, --success-text → --color-success, --warning-text → --color-warning, --info-text → --color-text-primary)"
  - "Kept next-themes in package.json even though useTheme() was removed from sonner.tsx — removing it would create drift the next time shadcn add is invoked and is not worth the churn. It is not imported anywhere in app/ or components/, so it has zero bundle cost"
  - "Used data-slot=\"sonner-toaster\" attribute for consistency with the existing popover.tsx convention"
  - "<Toaster /> mounts OUTSIDE <AuthProvider> in app/layout.tsx — avoids re-render churn on session state changes (the Sonner provider is auth-agnostic)"

patterns-established:
  - "Plan 12-01 establishes the precedent: shadcn template files are audited against the project's @theme block before commit. Any token name the template references that does not exist in styles/globals.css MUST be rewritten to a project token. Future shadcn add invocations follow the same audit-then-rewrite flow."
  - "Toaster mount placement: as a sibling of every other root-level provider, inside <body>, AFTER <AuthProvider>{children}</AuthProvider>. Phases 13–16 should NOT add a second Toaster — there is exactly one."
  - ".env.example pattern for Pulumi-sourced values: comment block contains (a) the rule (no trailing slash), (b) the Pulumi command to retrieve the value, (c) the file:line reference to the stack output, (d) an example value showing the expected shape. Future env vars sourced from Pulumi should follow this 4-line comment pattern."

requirements-completed:
  - FETCH-06
  - FETCH-07

# Metrics
duration: 4m 27s
completed: 2026-05-12
---

# Phase 12 Plan 01: Sonner Toaster Foundation + API Base URL Slot Summary

**Tokenized dark-locked Sonner Toaster mounted once in app/layout.tsx, plus the NEXT_PUBLIC_API_BASE_URL env slot documented with the Pulumi source hint — Plan 12-02 can now call `toast.error(...)` and read the API base URL at module init.**

## Performance

- **Duration:** 4m 27s
- **Started:** 2026-05-12T22:22:22Z
- **Completed:** 2026-05-12T22:26:49Z
- **Tasks:** 3
- **Files modified:** 5 (1 created, 4 modified)

## Accomplishments

- Sonner installed via `pnpm dlx shadcn@latest add sonner` (invoked through the local `./node_modules/.bin/shadcn` binary after `pnpm` was installed to a user-local npm prefix — see Issues Encountered).
- `components/ui/sonner.tsx` audited against DSGN-06 and rewritten so every CSS-variable reference points at a real project token (the shadcn template's defaults reference `--popover` / `--border` / `--radius`, which this project does NOT define).
- `theme="dark"` hardcoded; `useTheme()` import from `next-themes` removed (project is dark-locked, no theme switcher in v2.0 scope).
- `<Toaster />` mounted exactly once in `app/layout.tsx` as a sibling of `<AuthProvider>`, immediately after `<AuthProvider>{children}</AuthProvider>`.
- `.env.example` `NEXT_PUBLIC_API_BASE_URL` block extended with two new comment lines: the Pulumi source hint (`pulumi stack output api_internal_url`, file:line `__main__.py:600`) and an example value showing the expected `https://*.execute-api.sa-east-1.amazonaws.com` shape.
- Full verification clean: `pnpm exec tsc --noEmit`, `pnpm lint`, and `pnpm build` (under Node 22) all exit 0; all 11 static routes prerender successfully.

## Task Commits

Each task was committed atomically on `feature/issue-131-fetch-wrapper`:

1. **Task 1: Install Sonner via shadcn CLI with DSGN-06 audit** — `b7b36d3` (chore)
2. **Task 2: Mount `<Toaster />` in app/layout.tsx** — `df7f938` (feat)
3. **Task 3: Document NEXT_PUBLIC_API_BASE_URL Pulumi source** — `e77826e` (docs)

## Files Created/Modified

- `frontend/web/components/ui/sonner.tsx` (NEW, 70 lines) — Tokenized dark-locked `<Toaster />` primitive. Style overrides wire Sonner's internal CSS vars (`--normal-bg`, `--error-text`, etc.) to project tokens. `theme="dark"` hardcoded. Exports a single named `Toaster` component.
- `frontend/web/app/layout.tsx` — Added `import { Toaster } from "@/components/ui/sonner";` next to the existing AuthProvider import; inserted `<Toaster />` as a sibling of `<AuthProvider>{children}</AuthProvider>` inside `<body>`. No other changes (font setup, metadata, html lang/className untouched).
- `frontend/web/.env.example` — Appended two comment lines to the existing `NEXT_PUBLIC_API_BASE_URL` block: Pulumi source hint and an example value. Key value remains empty.
- `frontend/web/package.json` — Added `sonner@^2.0.7` and `next-themes@^0.4.6` to dependencies (shadcn CLI side-effect; `next-themes` is not imported anywhere).
- `frontend/web/pnpm-lock.yaml` — Lockfile updated to reflect the two new top-level dependencies and the resolved transitive graph.

## Decisions Made

See `key-decisions` in the frontmatter for the full list. The most consequential one is the **audit-then-rewrite shadcn template flow**: the CLI-generated `sonner.tsx` referenced four CSS variables (`--popover`, `--popover-foreground`, `--border`, `--radius`) that do NOT exist in this project's `@theme` block. Shipping it as-is would have produced toasts with `unset` background / text / border — visually broken but technically passing every grep in the plan's acceptance criteria. The audit catches this and points the style vars at real project tokens (`--color-surface`, `--color-text-primary`, `--color-border`, `--radius-md`) plus per-status overrides for success/error/warning toasts.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] pnpm not on PATH; installed to user-local npm prefix**

- **Found during:** Task 1 (Install Sonner via shadcn CLI).
- **Issue:** The plan instructs `pnpm dlx shadcn@latest add sonner`, but neither `pnpm` nor `corepack` was available on the executor's `PATH`. The local `./node_modules/.bin/shadcn` binary detected the project's `packageManager: pnpm@10.33.3` field and tried to spawn `pnpm` directly, failing with `ENOENT`.
- **Fix:** Installed pnpm to `$HOME/.local/share/npm-global` via `npm install -g pnpm@10.33.3` (after setting `npm config set prefix` to a user-writable location, since `/usr/local/lib/node_modules` was not writable). Symlinked to `$HOME/.local/bin/pnpm` and re-ran the shadcn CLI through the local binary with `pnpm` on PATH.
- **Files modified:** None in-repo. Tooling-only change.
- **Verification:** `pnpm --version` reports `10.33.3` (matches `package.json` `packageManager`); shadcn CLI completed and created `components/ui/sonner.tsx` plus updated `package.json` + `pnpm-lock.yaml`.
- **Committed in:** Captured indirectly in `b7b36d3` (the resulting `package.json` + `pnpm-lock.yaml` diffs).

**2. [Rule 3 - Blocking] Node 18 → Node 22 switch for `pnpm build` acceptance check**

- **Found during:** Task 2 (Mount `<Toaster />` in app/layout.tsx).
- **Issue:** The system Node binary at `/usr/bin/node` is `v18.20.4`. Next.js 16.2.4 requires Node `>=20.9.0` (per `package.json` engines: `>=22.0.0`). `pnpm build` failed with `You are using Node.js 18.20.4. For Next.js, Node.js version ">=20.9.0" is required.` This is the Task 2 acceptance criterion that catches RSC/client-boundary regressions — it MUST pass before commit.
- **Fix:** Sourced `~/.nvm/nvm.sh` (nvm was present but not auto-loaded in this shell), ran `nvm install 22 && nvm use --delete-prefix 22`, then prepended the nvm Node 22 bin to PATH. A follow-up `pnpm install` was needed to fetch the platform-specific `@tailwindcss/oxide-linux-x64-gnu` native binary (Tailwind's optional dependency that wasn't installed under the original Node 18 environment).
- **Files modified:** None in-repo. Tooling-only change.
- **Verification:** `pnpm build` under Node 22 completed in ~5s with all 11 static routes prerendered (`/`, `/_not-found`, `/confirm`, `/forgot`, `/history`, `/login`, `/preferences`, `/recommendation`, `/register`, `/tokens`, `/watch-later`). Zero RSC/client-boundary errors.
- **Committed in:** Captured indirectly in `df7f938` (the `app/layout.tsx` diff that the build validated).

**3. [Rule 2 - Missing Critical] Rewired shadcn template CSS vars to project tokens**

- **Found during:** Task 1 (DSGN-06 audit of generated `components/ui/sonner.tsx`).
- **Issue:** The shadcn-generated template ships with `style={{ "--normal-bg": "var(--popover)", "--normal-text": "var(--popover-foreground)", "--normal-border": "var(--border)", "--border-radius": "var(--radius)" }}`. None of `--popover` / `--popover-foreground` / `--border` / `--radius` are defined in this project's `styles/globals.css` `@theme` block (verified by grepping for `^\s*--(color|radius)-` — only `--color-bg`, `--color-surface`, `--color-text-primary`, `--color-border`, `--radius-{sm,md,lg,xl}`, etc. exist). The Sonner toaster would render with `unset` background, text, border, and corner radius — visually broken even though the plan's grep-based acceptance check (`#[0-9a-fA-F]{3,6}|rgba?\(|hsl\(`) returns zero hits.
- **Fix:** Replaced the four template overrides with project-token references (`var(--color-surface)`, `var(--color-text-primary)`, `var(--color-border)`, `var(--radius-md)`) and added per-status overrides so success toasts use `--color-success`, error toasts use `--color-danger`, warning toasts use `--color-warning`, and info toasts use `--color-text-primary`. Also dropped the `useTheme()` import and hardcoded `theme="dark"` (project is dark-locked).
- **Files modified:** `frontend/web/components/ui/sonner.tsx`
- **Verification:** DSGN-06 grep (`#[0-9a-fA-F]{3,6}|rgba?\(|hsl\(`) returns 0 hits; `grep -n 'theme="dark"'` returns 1 hit; `pnpm exec tsc --noEmit` and `pnpm lint` both exit 0.
- **Committed in:** `b7b36d3` (Task 1 commit).

---

**Total deviations:** 3 auto-fixed (2 blocking environment issues, 1 missing-critical correctness fix).
**Impact on plan:** All three were necessary. The two environment fixes (pnpm install + Node 22 switch) were prerequisites to running the plan's own verification commands. The DSGN-06 rewire was required for the Toaster to render at all — the shadcn template's CSS vars resolve to `unset` in this project's token namespace. No scope creep; no app logic added beyond what the plan specified.

## Issues Encountered

1. **shadcn CLI is interactively pnpm-aware** — it reads `packageManager` from `package.json` and shells out to pnpm directly, ignoring whatever runner was used to invoke shadcn itself. Even invoking the local `./node_modules/.bin/shadcn` binary fails if pnpm isn't on PATH. Resolution: installed pnpm to a user-local npm prefix (see deviation 1).
2. **Node 18 vs Node 22** — Next.js 16's hard floor is Node 20.9+. Switched via nvm; required a follow-up `pnpm install` to populate `@tailwindcss/oxide`'s platform-specific native binary (see deviation 2).
3. **shadcn template references non-existent tokens** — the audit step caught this; rewired to project tokens (see deviation 3). Future shadcn add invocations on this project should expect the same audit-then-rewrite flow.
4. **`next-themes` arrived as a transitive shadcn dep but is not used** — keeping it in `package.json` to avoid drift on future shadcn add runs. Documented in the commit message and frontmatter `tech-stack.added`.

## User Setup Required

None — no external service configuration required by this plan. The `NEXT_PUBLIC_API_BASE_URL` slot is documented in `.env.example` but left empty; populating it is a Phase 17 onboarding concern (`pulumi stack output api_internal_url`) and is exercised end-to-end starting with Plan 12-02's wrapper module init.

## Next Phase Readiness

- **Plan 12-02 can now author `frontend/web/lib/api/client.ts`** with:
  - `setOnUnauthorized(callback)` ready to be imported by `AuthContext.tsx`'s mount effect (the registration target lands in 12-02).
  - `getBaseUrl()` reading `process.env.NEXT_PUBLIC_API_BASE_URL` at first call with a clear throw message — the env slot exists and is documented.
- **Plan 12-03 can author `useApiErrorUx`** importing `toast` from `sonner` — the `<Toaster />` mount is live, `toast.error(...)` will render styled dark-theme toasts using the project tokens.
- **No blockers** for Plan 12-02 or Plan 12-03. The threat surface introduced by this plan (rendering arbitrary strings via `toast.error`) is mitigated upstream in Plan 12-02's `classifyError` (T-12-06a in the threat register).

## Threat Flags

None — this plan introduced no new network endpoints, auth paths, file access, or schema changes. The `<Toaster />` portal is a rendering surface only; threat surface is bounded by Plan 12-02's `message` field discipline as documented in the plan's `<threat_model>` register (T-12-06a `mitigate` disposition, sanitization deferred to `client.ts`).

## Known Stubs

None introduced by this plan. (The pre-existing `description: "Movie recommendation app — coming soon."` in `app/layout.tsx` metadata is from Phase 1 and out of scope.)

## Self-Check: PASSED

All claimed artifacts verified:
- `frontend/web/components/ui/sonner.tsx` exists
- `frontend/web/app/layout.tsx` exists
- `frontend/web/.env.example` exists
- `.planning/phases/12-secure-lambda-fetch-wrapper/12-01-SUMMARY.md` exists

All claimed commits verified:
- `b7b36d3` (Task 1: chore — Sonner via shadcn + DSGN-06 audit)
- `df7f938` (Task 2: feat — mount Toaster in root layout)
- `e77826e` (Task 3: docs — document NEXT_PUBLIC_API_BASE_URL Pulumi source)

---
*Phase: 12-secure-lambda-fetch-wrapper*
*Completed: 2026-05-12*
