---
phase: 12-secure-lambda-fetch-wrapper
plan: 02
subsystem: api-seam
tags: [fetch-wrapper, cognito, auth, api-gateway, dsgn-06-free, react-free-seam]

# Dependency graph
requires:
  - phase: 11-cognito-auth
    provides: "lib/api/auth.ts — getSession() (async, SSR-guarded, returns Session | null with IdToken; Cognito SDK refreshes internally); signOut() (clears localStorage user); Session type with IdToken field"
  - phase: 12-secure-lambda-fetch-wrapper
    plan: 01
    provides: "NEXT_PUBLIC_API_BASE_URL slot in .env.example (with Pulumi source hint) — read at first call by getBaseUrl() with strip-trailing-slash defense"
provides:
  - "React-free typed fetch seam at frontend/web/lib/api/client.ts (293 lines, single fetch() call in the codebase)"
  - "Result<T, ApiError> discriminated union return type (T-12-01..06 mitigated via sanitization + status-keyed fallbacks)"
  - "5-kind ApiError union (network | unauthorized | forbidden | validation | server) with exhaustive TS narrowing validated by scratch-file check"
  - "apiGet<T>(path, opts?) and apiPost<T>(path, body, opts?) public methods — Phases 13–16 consume these to replace mocks"
  - "setOnUnauthorized(cb) module-scoped callback registry — fires on (a) pre-emptive getSession() null OR (b) in-flight 401; retry budget = 0 per CONTEXT D-01"
  - "AbortController-based 10s default timeout with caller-signal composition via composeSignals()"
  - "T-12-02 mitigation: RequestOptions has no `headers` slot — caller cannot inject Authorization. Wrapper builds headers from scratch every request."
  - "T-12-03 mitigation: only session.IdToken is read; session.AccessToken NEVER referenced (grep-verified = 0)"
  - "T-12-01 / T-12-06 mitigation: sanitizeMessage() strips Authorization echoes + stack frames + collapses whitespace + caps at 240 chars; extractBackendMessage() reads only the `message` field of a JSON body"
  - "AuthProvider mount-effect registers signOut as the wrapper's onUnauthorized callback (separate useEffect with [signOut] deps; rehydrate effect + signIn/signUp/signOut useCallbacks unchanged)"
affects:
  - 12-03-use-api-error-ux (will consume `import type { ApiError } from "@/lib/api/client"` — discriminated union narrowing locked here)
  - 12-04-real-recommend-demonstrator (will call apiGet<Movie>("/api/v1/recommend") — single fetch-seam validated end-to-end)
  - "Phases 13–16 (recommend / preferences / history / watch-later swaps) — each per-screen integration writes one typed function consuming apiGet/apiPost; FETCH-06 (single seam, no raw fetch) verified at Plan 12-04 and again here for regression"

# Tech tracking
tech-stack:
  added: []   # no new packages — wrapper is built on standard browser fetch + AbortController
  patterns:
    - "React-free seam pattern: module-scoped callback registry (`onUnauthorized: (() => void) | null`) plus a typed setter (`setOnUnauthorized(cb)`) — lets React layers wire signOut without coupling the seam to React imports"
    - "Pre-emptive token refresh: `await getSession()` before EVERY request. Cognito SDK refreshes the IdToken internally when near expiry; if it returns null the wrapper short-circuits with `{ kind: 'unauthorized' }` and fires the callback. Retry budget = 0 — the pre-emptive refresh IS the budget."
    - "Single source of header injection: RequestOptions deliberately omits a `headers` field; wrapper rebuilds the headers object on every request. T-12-02 mitigation enforced at the type level."
    - "Defensive `try { body = await response.json(); } catch {}` around error body parsing — handles API Gateway 502 HTML responses cleanly without crashing the error path"
    - "Compose-signals timeout pattern: wrapper creates its own AbortController for the 10s timeout, attaches a one-shot abort listener to the caller's signal, returns `{ signal, cancelTimeout }` so the caller is wired into both abort paths"

key-files:
  created:
    - "frontend/web/lib/api/client.ts (293 lines — React-free typed fetch seam; only file in the codebase with a `fetch(` call)"
  modified:
    - "frontend/web/lib/auth/AuthContext.tsx (1 import line + 1 7-line useEffect block; purely additive — rehydrate effect + signIn/signUp/signOut useCallbacks unchanged)"

key-decisions:
  - "Dropped `async` keyword from `export function apiGet` / `export function apiPost` signatures (kept the implementation Promise-returning by directly returning `request<T>(...)`). The plan's spec §11 wrote `export async function apiGet`, but the acceptance criterion grep was `export function apiGet`. Both forms are semantically identical (`async function f(): Promise<X>` ≡ `function f(): Promise<X> { return promise; }`); chose the non-async form to satisfy the literal grep gate without behavioural drift."
  - "Sanitization message length cap = 240 chars; cap'd messages get an ellipsis (`…` U+2026, the same character the project's UI-SPEC already permits for truncation). Per T-12-01 the message field is the only path from backend → user UI, so 240 chars is the upper bound a toast can render without wrapping into a paragraph."
  - "Default fallback messages for 401 / 403 / 404 / 4xx / 5xx are keyed by HTTP status — backend silence (missing `message` field) or backend failure-of-sanitization (message sanitized to empty) both surface a fallback rather than nothing. This is the T-12-06 fallback rail."
  - "ApiError union encodes `status: 403` as a literal for the `forbidden` kind so call sites can narrow without re-checking; other kinds use `status: number` because we don't want to lock 4xx/5xx codes at the type layer."
  - "Caller signal composition: if `callerSignal.aborted === true` at the time we wire up, immediately propagate via `controller.abort(callerSignal.reason)` rather than relying on the `addEventListener('abort')` listener (which only fires on transition false→true). Edge case that would otherwise leak an already-aborted caller signal."
  - "Auth context wiring: separate useEffect for setOnUnauthorized(signOut), NOT merged into the existing rehydrate effect (different concerns, different deps, easier to reason about). Placed AFTER the signOut useCallback declaration so `signOut` is in lexical scope; placed BEFORE the isAuthenticated/value const block so the file reads top-down (state → effects → derived values → JSX)."

patterns-established:
  - "Auth-seam pattern for non-Cognito remote surfaces: file-header docstring listing the public surface and locked decisions, lazy-cached env-init with descriptive throw, async source-of-truth call, error-translating boundary that returns a typed discriminated union. Future seams (e.g. v2.1 telemetry, v2.1 service worker) should follow this shape."
  - "Discriminated-union vs typed-error-class divergence rule: recovery-driven errors (auth: 'caller branches on UserNotConfirmedException') use typed classes (Phase 11 pattern); presentation-driven errors (HTTP: 'which toast / inline message') use Result + discriminator (Phase 12 pattern). The two coexist in lib/api/."
  - "Threat-model-driven type design: the threat model said 'caller cannot inject Authorization headers'; the public RequestOptions type therefore has no `headers` slot. Type system enforces T-12-02 at compile time — defence-in-depth past mere documentation."

requirements-completed:
  - FETCH-01
  - FETCH-02
  - FETCH-03
  - FETCH-04
  - FETCH-06

# Metrics
duration: ~8m
completed: 2026-05-12
---

# Phase 12 Plan 02: client.ts Wrapper + AuthContext Wiring Summary

**React-free typed fetch wrapper landed at `frontend/web/lib/api/client.ts` (293 lines, single `fetch()` call in the codebase) with pre-emptive IdToken injection, 5-kind `ApiError` discriminated union, 10s `AbortController` timeout, and a module-scoped `onUnauthorized` callback registry that `AuthProvider` registers `signOut` against on mount. Every authenticated frontend → API Gateway v2 call from Phases 13–16 routes through this seam.**

## Performance

- **Duration:** ~8m
- **Tasks:** 2
- **Files modified:** 2 (1 created, 1 modified)
- **Lines of code:** 293 (client.ts) + 9 added to AuthContext.tsx = 302 LOC

## Task Commits

Both tasks committed atomically on `feature/issue-131-fetch-wrapper`:

1. **Task 1: Author `frontend/web/lib/api/client.ts`** — `8d8336e` (feat)
2. **Task 2: Register `setOnUnauthorized(signOut)` in AuthProvider** — `4457103` (feat)

## Section Ordering in `client.ts`

The file reads top-to-bottom as specified in the plan §"Critical implementation notes" / 12-PATTERNS.md mirror:

1. File-header docstring (28 lines — names the seam, lists locked decisions, lists public surface)
2. Single import: `{ getSession } from "@/lib/api/auth"` (no other imports — React-free)
3. Public type exports: `Result<T, E>`, `ApiError` (5-kind union), `RequestOptions` (no `headers` slot)
4. Env-init: `DEFAULT_TIMEOUT_MS = 10_000` + `getBaseUrl()` with lazy cache, descriptive throw, and trailing-slash strip
5. onUnauthorized registry: module-scoped `onUnauthorized: (() => void) | null`, `setOnUnauthorized(cb)` exported, `fireUnauthorized()` private
6. `authorizedHeaders()` — single source of Authorization injection (reads `session.IdToken` ONLY)
7. Sanitization helpers: `MAX_USER_MESSAGE_LEN = 240`, `sanitizeMessage`, `extractBackendMessage`, `extractValidationFields`, `defaultMessageForStatus`
8. `classifyError(response, cause?)` — translates non-2xx Response → ApiError; defensive `try { body = await response.json(); } catch {}` for non-JSON 5xx
9. `composeSignals(timeoutMs, callerSignal?)` — wrapper AbortController + caller signal; pre-aborted caller signal handled correctly
10. `request<T>(method, path, body, opts)` — core private function (49 lines); the ONLY `fetch(` call in the codebase
11. Public exports: `apiGet<T>(path, opts?)` and `apiPost<T>(path, body, opts?)` — thin wrappers that delegate to `request<T>`

## Accomplishments

- All 5 acceptance grep gates on `client.ts` pass:
  - `export function apiGet` / `export function apiPost` / `export function setOnUnauthorized` / `export type ApiError` / `export type Result` — each appears exactly once
  - `session.IdToken` — 1 reference (FETCH-01 satisfied: IdToken injection)
  - `session.AccessToken` — **0 references** (T-12-03 mitigation verified)
  - `"use client"` — **0 references** (React-free seam verified)
  - `NEXT_PUBLIC_API_BASE_URL` — 2 references (env-init + throw message)
  - `AbortController` — 3 references (FETCH-04 satisfied: 10s timeout)
  - All 5 `kind: "<name>"` strings present in `classifyError` (FETCH-02 satisfied: all 5 ApiError kinds emitted)
  - Exactly **1** `fetch(` call in code (FETCH-06 satisfied; double-checked: `grep -rE '\bfetch\(' app/ components/ lib/` returns only `lib/api/client.ts`)
- All 5 acceptance grep gates on `AuthContext.tsx` pass on intent:
  - `import { setOnUnauthorized } from "@/lib/api/client"` — 1 (Task 2 import added)
  - `setOnUnauthorized(signOut)` — 1 (Task 2 effect added)
  - 2 `useEffect(...)` call sites (rehydrate + new registration); 3 raw `useEffect` matches in the file because the `useEffect` import counts (see Deviations §1)
  - 1 `getSession()` call site (rehydrate effect intact); 3 raw `getSession` matches because the import line + 1 word in the new comment count (see Deviations §1)
  - `seamSignOut()` — 1 (signOut callback intact, no regression)
- Discriminated-union exhaustiveness validated: a scratch file with a `switch (e.kind)` against all 5 ApiError kinds plus a `default: { const _: never = e; }` arm compiles cleanly under `pnpm exec tsc --noEmit`. The compiler will catch any future kind addition that misses a call-site update.
- `pnpm exec tsc --noEmit` exits 0
- `pnpm lint` exits 0
- `pnpm build` (Node 22 via nvm) prerenders all 11 static routes cleanly — no RSC/client-boundary regressions from the AuthContext mod
- `frontend/web/.env.example`, `frontend/web/components/`, `frontend/web/styles/globals.css`, and the four `lib/api/` mocks (`recommend.ts` / `history.ts` / `watch-later.ts` and any others) were **not** touched — scope discipline held

## Files Created/Modified

- `frontend/web/lib/api/client.ts` (NEW, 293 lines) — React-free typed fetch seam. Single import (`getSession`), zero React imports, zero `"use client"` directive. Module-scoped callback registry. 5-kind ApiError union with status-keyed fallbacks. AbortController timeout with caller-signal composition. Single `fetch(` call in the codebase.
- `frontend/web/lib/auth/AuthContext.tsx` — Added one import (`setOnUnauthorized` from `@/lib/api/client`, on a new line right after the existing `@/lib/api/auth` import) and one 7-line `useEffect` block (with `[signOut]` deps) placed AFTER the `signOut = useCallback(...)` declaration and BEFORE the `isAuthenticated` const. Net additive diff: +9 lines, -0 lines. The existing rehydrate effect, all three useCallbacks, the context value, the AuthContext.Provider JSX, and the `useAuth` hook are untouched.

## Decisions Made

See `key-decisions` in the frontmatter for the full list. The most consequential one is the **async-keyword drop** on the public `apiGet` / `apiPost` exports: the plan's spec §11 wrote `export async function apiGet`, but the acceptance criterion grep was `export function apiGet`. Both forms are semantically identical (a non-async function that returns a Promise is the same as an async function that awaits-and-returns). Dropping `async` satisfies the literal grep gate without any behavioural change; the typed return signature `Promise<Result<T, ApiError>>` is preserved.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Spec/Acceptance Mismatch] `useEffect` and `getSession` raw grep counts in Task 2 acceptance**

- **Found during:** Task 2 grep verification.
- **Issue:** The plan's Task 2 acceptance criteria included `grep -c 'useEffect' frontend/web/lib/auth/AuthContext.tsx` returns `2` and `grep -c 'getSession' frontend/web/lib/auth/AuthContext.tsx` returns `1`. The actual counts are 3 and 3, because the literal grep matches don't distinguish between import lines, call sites, and comment-text mentions. The file imports `useEffect` (1 match) and uses it twice (2 matches) = 3 total. Similarly imports `getSession` (1 match), uses it once in the rehydrate effect (1 match), and mentions it once in my new effect's comment (1 match) = 3 total.
- **Fix:** No source edit. The plan's underlying intent — "2 useEffect calls: existing rehydrate + new registration" and "1 getSession call: existing rehydrate intact, no regression" — is satisfied. The plan's grep counts were authored without accounting for the `import {...}` line and incidental word matches in comments. Verified by line-by-line inspection: `useEffect` appears on lines 18 (import), 54 (rehydrate call), 83 (new registration call); `getSession` appears on lines 23 (import), 58 (rehydrate call), 85 (comment text).
- **Files modified:** None.
- **Committed in:** N/A (no source change needed; intent of the plan held).

**2. [Rule 1 - Spec/Acceptance Mismatch] `export function apiGet` grep vs `export async function` spec text**

- **Found during:** Task 1 grep verification.
- **Issue:** Plan's Task 1 spec §11 wrote `export async function apiGet<T>(...)`; Task 1 acceptance criterion required `grep -c 'export function apiGet'` returns 1. The two forms are mutually exclusive in the literal — an `async function` source line will NOT match the non-async grep. Both forms produce identical runtime behaviour.
- **Fix:** Dropped the `async` keyword from `apiGet` and `apiPost` and let them return the Promise from `request<T>(...)` directly. Identical type signature `Promise<Result<T, ApiError>>`, identical runtime behaviour, satisfies the literal grep.
- **Files modified:** `frontend/web/lib/api/client.ts` (lines 273-285).
- **Committed in:** `8d8336e` (Task 1 commit — caught and fixed before the commit).

---

**Total deviations:** 2 auto-fixed (both spec/acceptance literal mismatches, both Rule 1 — bug-in-spec rather than bug-in-code). No scope creep; no app logic added beyond the plan; no files touched outside the explicit `<files>` list.

## Issues Encountered

1. **Pre-existing unstaged `.planning/STATE.md` and `.planning/ROADMAP.md` modifications on disk before this plan started.** Not introduced by me — `git diff --stat` shows 4 / 19 line drift inherited from an earlier orchestration step. Left untouched per `<sequential_execution>` directive ("Do NOT update STATE.md or ROADMAP.md — the orchestrator owns those writes after the plan completes."). Both files remain unstaged after the plan's two commits.
2. **Node 22 switch via `source ~/.nvm/nvm.sh && nvm use 22`** carried over from Plan 12-01 — the host's default `/usr/bin/node` is still Node 18.20.4, below Next.js 16.2.4's `>=20.9.0` floor. `pnpm build` won't run without the nvm switch. Documented in 12-01-SUMMARY.md deviation §2; reapplied here without further mitigation needed.

## User Setup Required

None — no external service configuration. `NEXT_PUBLIC_API_BASE_URL` is documented (Plan 12-01) but remains empty; the wrapper's `getBaseUrl()` will throw with a clear message at first call if Phase 12-04's demonstrator or any later phase tries to use it without `.env.local` populated. This is the intended onboarding gate per CONTEXT decision.

## Next Phase Readiness

- **Plan 12-03 can author `useApiErrorUx`** importing `import type { ApiError } from "@/lib/api/client"` — the 5-kind discriminated union is locked here. Sonner is already mounted (Plan 12-01); `toast.error(error.message)` will render styled dark-theme toasts. The hook's exhaustive switch will type-check against this plan's ApiError shape.
- **Plan 12-04 can write the recommend demonstrator** at `frontend/web/lib/api/recommend.real.ts`: `import { apiGet, type Result, type ApiError } from "@/lib/api/client"` then `export function getRecommendationReal() { return apiGet<Movie>("/api/v1/recommend"); }`. End-to-end smoke against the real API Gateway v2 endpoint is exercised in 12-04, not here.
- **No blockers** for Plans 12-03 or 12-04. Threat surface introduced by this plan is fully mitigated in the wrapper itself (T-12-01 .. T-12-06); Plan 12-04 codifies the no-raw-fetch grep gate as a regression test.

## Threat Flags

None — this plan introduced no new network endpoints, auth paths, file access patterns, or schema changes beyond the public surface described in 12-CONTEXT.md and PLAN.md. The `<threat_model>` in 12-02-PLAN.md (T-12-01 .. T-12-06) is the complete register; every threat with `mitigate` disposition is implemented and grep-verified:

- T-12-01 (Info disclosure via ApiError.message/cause) — `sanitizeMessage` strips Authorization echoes + stack frames; `cause` is only attached for upstream logging, never read by UI.
- T-12-02 (Tampering: caller injects Authorization) — `RequestOptions` type has no `headers` slot; wrapper builds headers from scratch.
- T-12-03 (Auth bypass: AccessToken vs IdToken) — `grep 'session.AccessToken' lib/api/client.ts` = 0.
- T-12-04 (DoS: 401 retry storm) — retry budget = 0; pre-emptive refresh is the budget. Accepted per CONTEXT.
- T-12-05 (Info disclosure / DoS: SSR-time wrapper call) — `getSession()` SSR guard returns null on server; wrapper handles cleanly. `fireUnauthorized` is a no-op on server (no AuthProvider mount).
- T-12-06 (Info disclosure: backend leaks via ApiError.message) — `extractBackendMessage` reads only the `message` field; `sanitizeMessage` provides defence-in-depth; status-keyed fallbacks always available.

## Known Stubs

None introduced by this plan. The wrapper module is the production seam; no placeholder mocks or "coming soon" copy. `apiGet` and `apiPost` are generic and will be exercised end-to-end by Plan 12-04's demonstrator and the four per-screen swaps in Phases 13–16.

## Self-Check: PASSED

All claimed artifacts verified to exist on disk:
- `frontend/web/lib/api/client.ts` — 293 lines, file present
- `frontend/web/lib/auth/AuthContext.tsx` — 113 lines (104 → 113, +9), file present
- `.planning/phases/12-secure-lambda-fetch-wrapper/12-02-SUMMARY.md` — this file, being written

All claimed commits verified on `feature/issue-131-fetch-wrapper`:
- `8d8336e` (Task 1: feat — typed fetch wrapper with pre-emptive IdToken injection)
- `4457103` (Task 2: feat — register signOut as wrapper onUnauthorized callback)

All locked grep gates re-verified at SUMMARY time:
- `session.AccessToken` in `client.ts` → 0 hits (T-12-03 holds)
- `"use client"` in `client.ts` → 0 hits (React-free holds)
- `fetch(` in `client.ts` (code-only) → 1 hit (FETCH-06 holds)
- Raw `fetch(` outside `client.ts` in `app/` / `components/` / `lib/` → 0 hits (FETCH-06 holds across the codebase)
- `setOnUnauthorized(signOut)` in `AuthContext.tsx` → 1 hit (Task 2 registration intact)
- `pnpm exec tsc --noEmit` + `pnpm lint` + `pnpm build` (Node 22) → all exit 0

---
*Phase: 12-secure-lambda-fetch-wrapper*
*Completed: 2026-05-12*
