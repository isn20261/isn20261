# Phase 12: Secure Lambda Fetch Wrapper — Context

**Gathered:** 2026-05-12
**Status:** Ready for planning
**Milestone:** v2.0 — Backend Integration
**Umbrella issue:** #127

<domain>
## Phase Boundary

Phase 12 ships **the single typed seam** every authenticated frontend → API Gateway v2 → Lambda call routes through, plus the React hook that translates `ApiError` into user UX. Each per-screen phase (13–16) consumes this wrapper to replace its mock with a real Lambda call.

**In scope this phase:**
- `frontend/web/lib/api/client.ts` — typed wrapper with pre-emptive IdToken injection
- `ApiError` discriminated union + `Result<T, ApiError>` return shape
- `onUnauthorized` callback mechanism (React-free wrapper, AuthProvider registers the logout callback)
- `useApiErrorUx(error)` hook for toast / inline / no-op UX
- Toast infrastructure (Sonner via shadcn) mounted in root layout
- `NEXT_PUBLIC_API_BASE_URL` env var + .env.example update
- Exercise the wrapper in at least one real call site to prove end-to-end (likely a thin recommendation call to validate the path, though the full Phase 13 swap stays in Phase 13)

**Out of scope this phase (deferred to Phases 13–16):**
- Typed function signatures per Lambda endpoint with real response shapes — each integration phase reads its own Lambda handler and narrows types in its plan
- Replacing the mocks in `lib/api/{recommend,preferences,history,watch-later}.ts`
- Persistence/optimistic-update strategies (per-screen decision)

</domain>

<decisions>
## Implementation Decisions

### Token refresh model — Pre-emptive `getSession()` per request

**Locked:** Wrapper calls `getSession()` from `@/lib/api/auth` **before every request**. The Cognito SDK already auto-refreshes the IdToken inside `getSession()` (verified in `frontend/web/lib/api/auth.ts:199` — `user.getSession(...)` validates against the User Pool and refreshes if needed). If `getSession()` returns `null`, the wrapper invokes the registered `onUnauthorized` callback (which calls `AuthContext.signOut()`) and returns `{ ok: false, error: { kind: 'unauthorized', ... } }` without making the fetch.

**Why:** the SDK's own refresh path is the source of truth. Reimplementing manual RefreshToken orchestration (the sub-issue's original assumption) duplicates SDK behavior, adds the concurrent-refresh dedup problem, and risks divergence from how AuthContext rehydrates on mount.

**Implication for FETCH-03:** the "single-retry refresh-then-replay on 401" requirement is satisfied **pre-emptively** rather than reactively. 401s should be rare. If one *does* happen anyway (e.g., backend revokes a token mid-session), the wrapper does NOT retry — it treats 401 as `UnauthorizedError`, fires `onUnauthorized`, and returns the error. The retry budget is zero by design because the pre-emptive refresh is the budget.

### Return convention — `Result<T, ApiError>` discriminated union

**Locked:** Every wrapper function returns `Promise<Result<T, ApiError>>` where:

```ts
type Result<T, E> = { ok: true; data: T } | { ok: false; error: E };
```

Callers `if (!res.ok) { ... }` and switch on `res.error.kind`. TypeScript enforces exhaustive handling.

**Why not throw typed errors (matching Phase 11's auth seam):** auth seam errors are recovery-driven (caller branches on `UserNotConfirmedException` etc.); HTTP errors are presentation-driven (which toast / inline message). Result + discriminator gives the planner / executor a single compile-time-checked surface and avoids `try/catch` everywhere a screen does data fetching.

### ApiError shape — 5-kind union with kind / status / message / cause

**Locked:**

```ts
type ApiError =
  | { kind: 'network'; message: string; cause?: Error }
  | { kind: 'unauthorized'; message: string }
  | { kind: 'forbidden'; status: 403; message: string }
  | { kind: 'validation'; status: number; message: string; fields?: Record<string, string> }
  | { kind: 'server'; status: number; message: string; cause?: Error };
```

**Field rules:**
- `kind` is the discriminator. Five values, exhaustively checkable.
- `status`: HTTP status (`network` omits it — no response received; `unauthorized` omits it — the wrapper short-circuits before the fetch when pre-emptive refresh fails).
- `message`: **user-safe string**. Backend-provided error text is sanitized (strip stack traces, internals) before being put here. Hardcoded fallback if backend message is missing.
- `cause`: original `Error` for logging. Never rendered to users.
- `validation.fields`: optional per-field error map (`{ email: 'must be a valid email' }`) so forms can render inline messages from a 4xx response.

### Error UX wiring — React-free wrapper + AuthProvider-registered callback + reusable hook

**Locked:**

1. **`client.ts` is React-free** — no `useAuth`, no React imports. This makes it unit-testable without `<AuthProvider>` and prevents accidental coupling.

2. **`onUnauthorized` callback** — `client.ts` exposes `setOnUnauthorized(callback: () => void)`. `AuthProvider` calls this once on mount with `signOut` from its own context. When the wrapper detects an unauthorized condition (pre-emptive `getSession()` returns null, OR an in-flight request returns 401), it invokes the callback before returning the error to the caller.

3. **`useApiErrorUx(error: ApiError | null)` hook** — screens import this and pass their current error state. Hook fires `toast.error(message)` for `network` / `server` / `forbidden`, no-ops for `unauthorized` (the wrapper already logged out and redirected), and lets the caller render its own inline UX for `validation` (toast on validation feels wrong because the form needs to highlight specific fields).

4. **Toast library — Sonner via shadcn.** `bun x shadcn@latest add sonner`, mount `<Toaster />` once in `app/layout.tsx` root. Sonner is lightweight (~3kb gz), supports the existing dark theme, and is the shadcn-default choice.

### API base URL configuration

**Locked:** Env var name = `NEXT_PUBLIC_API_BASE_URL`. Read once at wrapper module init; throw with a clear error if unset (same pattern as the Cognito pool init in `lib/api/auth.ts:59-65`). `frontend/web/.env.example` must be updated to include it. The full origin (e.g. `https://abc123.execute-api.us-east-1.amazonaws.com`) — paths like `/api/v1/recommend` are appended by the wrapper. **No trailing slash** in the env value.

### Lambda contract verification — deferred to Phase 13–16 plan-phases

**Locked:** Phase 12 ships **generic** wrapper helpers (`apiGet<T>(path)`, `apiPost<T>(path, body)`, etc.) that return `Promise<Result<T, ApiError>>`. Per-endpoint typed functions (`getRecommendation()`, `getHistory()`, `putPreferences()`, ...) are **not** in Phase 12's scope — each integration phase (13–16) reads its own Lambda handler under `functions/` to lock the response shape and writes the typed function then.

**FETCH-05 interpretation:** Phase 12 partially fulfills FETCH-05 by writing **one** typed function as a demonstrator (recommendation is the natural choice — single endpoint, simple shape). Phases 13–16 each contribute their own typed functions. The acceptance criterion "one typed TS function per Lambda endpoint" is satisfied across the phase block, not solely by Phase 12.

### Concurrent-request race conditions

**Locked, follows from pre-emptive refresh:** because every request awaits its own `getSession()` call and the Cognito SDK caches the in-memory session (no network call when token is still valid), concurrent requests don't race on refresh. The dedup-via-shared-promise pattern flagged in the ROADMAP risk note is **not needed** because we don't orchestrate refresh manually.

### Timeout — `AbortController` per request, default 10s

**Locked:** Each wrapper call creates an `AbortController` with a 10s `setTimeout`. Callers can override by passing a `signal` in the request options (composed with the wrapper's signal so either can abort the request). On timeout, the wrapper returns `{ kind: 'network', message: 'Request timed out', cause: AbortError }`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents (researcher, planner, executor) MUST read these before working.**

### Auth seam (Phase 11) — what the wrapper builds on
- `frontend/web/lib/api/auth.ts` — Cognito-direct seam. The wrapper imports `getSession()` from here. `signOut()` is invoked through the `onUnauthorized` callback registered by AuthProvider.
- `frontend/web/lib/auth/AuthContext.tsx` — React context. `AuthProvider` registers `signOut` as the wrapper's onUnauthorized callback on mount.

### API Gateway routes (Pulumi)
- `__main__.py:252-323` — Lambda creation + route definitions. Routes used by Phases 13–16: `GET /api/v1/recommend`, `GET /api/v1/history`, `GET /api/v1/preferences`, `POST /api/v1/preferences`, `GET /api/v1/watch-later`, `POST /api/v1/watch-later`. All routes use the JWT authorizer (`auth_id=authorizer.id`).
- `__main__.py:600` — `pulumi.export("api_internal_url", api.api_endpoint)` — this is the value the user copies into `NEXT_PUBLIC_API_BASE_URL` during onboarding.

### Project rules
- `frontend/web/AGENTS.md` — DSGN-06 hard rule. Toast component styling must consume design tokens only (no hex / px-values in components).
- `CLAUDE.md` — milestone hard rules (frontend lives at `frontend/web/`, etc.).

### Milestone artifacts
- `.planning/REQUIREMENTS.md` §"Secure Lambda Fetch Wrapper (Phase 12)" — FETCH-01..07 acceptance criteria.
- `.planning/ROADMAP.md` §"Phase 12: Secure Lambda Fetch Wrapper" — goal, success criteria, risks.

### Existing API mocks (will be consumed by Phases 13–16, not modified in P12)
- `frontend/web/lib/api/recommend.ts` — `Movie` + `MOVIES` shape. P12's demonstrator typed function uses this shape if it touches recommend; full swap is P13.
- `frontend/web/lib/api/history.ts`
- `frontend/web/lib/api/watch-later.ts`

</canonical_refs>

<code_context>
## Code Context

### Reusable assets

- **`getSession()`** (`lib/api/auth.ts:194-207`) — async, returns `Session | null`. Auto-refreshes via Cognito SDK. **This is the wrapper's auth source.**
- **`Session` type** (`lib/api/auth.ts:30-36`) — has `IdToken`, `AccessToken`, `RefreshToken`, `ExpiresAt`, `user`. Wrapper uses `IdToken` only (API Gateway JWT authorizer expects the IdToken, not AccessToken).
- **AuthProvider mount path** (`lib/auth/AuthContext.tsx:49-65`) — `useEffect` calls `getSession()` on mount. The same place will call `setOnUnauthorized(signOut)`.
- **shadcn primitives** — components/ui/ has existing shadcn components. Sonner installs alongside them via the same CLI.

### Patterns to follow

- **Env-var validation pattern** — `lib/api/auth.ts:59-65` throws with a helpful message if Cognito env vars are unset. Wrapper does the same for `NEXT_PUBLIC_API_BASE_URL`.
- **Typed error classes** — Phase 11 uses `class XException extends Error` for auth errors. Phase 12 deliberately diverges (Result type, not throw) because HTTP errors are presentation-driven, not recovery-driven.
- **Design tokens hard rule (DSGN-06)** — toast styling MUST use Tailwind theme variables only. Sonner accepts a `theme` prop and CSS variables; the planner should ensure the integration doesn't introduce hex literals into `app/` or `components/`.

### Open question for planner

- **Where does the demonstrator call site live?** Options: (a) keep `lib/api/recommend.ts` mock untouched and add a `lib/api/recommend.real.ts` that uses the wrapper, to prove the surface; (b) make Phase 12 partially swap recommend.ts so Phase 13 inherits a half-done swap. Recommend (a) — keeps Phase 13's atomic swap clean.

</code_context>

<specifics>
## Specific References

- **Pattern B / Cognito-direct architecture** — per umbrella #127. Frontend talks directly to Cognito (sign-up/login) and to API Gateway v2 (data). No backend-for-frontend (BFF) layer.
- **Sub-issue draft for Phase 12** — captured in the discussion log; downstream agents should treat that as the GitHub-facing scope summary.

</specifics>

<deferred>
## Noted for Later

- **Retry on 5xx** — deliberately NOT implemented in P12 to avoid masking backend regressions. Revisit in v2.1 if observability data shows transient 5xx is a real UX issue.
- **Service worker / offline cache** — v2.1.
- **Telemetry / structured request logging** — v2.1.
- **Per-endpoint custom timeouts** — current design lets callers pass their own `signal`, which is sufficient. Default-per-endpoint timeout config can come later if a Lambda is consistently slow.
- **Rate-limit UX (429 handling)** — wrapper currently buckets 429 into `server` kind. If we hit rate limits in practice, split into a `rateLimited` kind with a `retryAfter` field.

</deferred>

<assumptions>
## Assumptions to Verify in Planning

- **Sonner shadcn integration works in Next.js 16 + App Router with the project's Tailwind v4 setup.** The planner should run `bun x shadcn@latest add sonner` early to confirm the install path matches the existing pattern (`components/ui/sonner.tsx` etc.). If it doesn't, fall back to a minimal in-house toast (~50 lines).
- **API Gateway returns JSON for both success and error responses.** Wrapper assumes `await response.json()` is safe on error paths. If any Lambda returns non-JSON (HTML 502 from API GW failure, etc.), the wrapper must catch the parse error and surface a `network` or `server` kind with a sane message.
- **`getSession()` is reliable when called concurrently.** The Cognito SDK should serialize internally; this is reasonable but worth a smoke test in the executor.

</assumptions>

---

*Phase: 12-secure-lambda-fetch-wrapper*
*Context gathered: 2026-05-12 via /gsd-discuss-phase 12*
