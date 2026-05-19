# Phase 12: Secure Lambda Fetch Wrapper — Discussion Log

**Date:** 2026-05-12
**Mode:** `/gsd-discuss-phase 12` (default)
**Selected gray areas:** All 4

For audit / retrospective only. Downstream agents (researcher, planner, executor) read `12-CONTEXT.md`, not this file.

---

## Gray area presentation

Four areas presented, all four selected:

1. Token refresh model
2. ApiError shape + return convention
3. Error UX wiring
4. API base URL config + Lambda contract verification

---

## Area 1 — Token refresh model

**Question:** How should the wrapper handle token expiry / 401s?

**Options:**
- ✅ **Pre-emptive: call `getSession()` before EVERY request** (Recommended) — SDK auto-refreshes inside `getSession()`; if null, short-circuit with UnauthorizedError + logout.
- Reactive: fetch with cached token, on 401 call `getSession()` and retry once.
- Manual RefreshToken orchestration (sub-issue's original spec).

**Decision:** Pre-emptive. Reasoning: the Cognito SDK already auto-refreshes inside `getSession()` (`lib/api/auth.ts:199`), so manual orchestration duplicates SDK behavior and introduces a concurrent-refresh dedup problem. Pre-emptive refresh makes 401s rare; if one still happens, treat it as unauthorized without retry (retry budget = 0 by design).

---

## Area 2 — ApiError shape + return convention

**Question 1:** How should the wrapper signal failure?

- ✅ **Discriminated union `Result<T, ApiError>`** (Recommended)
- Throw typed error classes (matches Phase 11's auth seam)

**Decision:** Result type. Auth seam errors are recovery-driven (caller branches); HTTP errors are presentation-driven (which toast / inline). Result + discriminator gives planner and executor a compile-time-checked surface.

**Question 2:** Which fields should ApiError carry?

- ✅ **kind + status + message + cause** (Recommended)
- Minimal: kind + message only
- Maximal: kind + status + message + cause + serverCode + retryable

**Decision:** 5-kind union with kind/status/message/cause + optional `validation.fields` map. `message` is user-safe (backend internals sanitized). `cause` for logging only — never rendered. See CONTEXT for the full union type.

---

## Area 3 — Error UX wiring

**Question 1:** Where should error-class-aware UX live?

- ✅ **Wrapper triggers logout on unauthorized; callers handle the rest via a React hook** (Recommended)
- All UX inside `client.ts` (singleton toast store)
- Pure data — no side effects from wrapper

**Decision:** `client.ts` is React-free. Accepts an `onUnauthorized` callback registered once by `AuthProvider`. Other UX (toast / inline) is the caller's job via a reusable hook.

**Question 2:** How does a screen decide what error UX to render?

- ✅ **One reusable hook `useApiErrorUx(error)`** (Recommended)
- Per-screen handling (no shared hook)

**Decision:** Reusable hook. Fires `toast.error(message)` for network / server / forbidden, no-ops for unauthorized (wrapper already redirected), lets caller render inline UX for validation (forms need per-field highlighting).

**Follow-up question:** Toast library?

- ✅ **Add `sonner` via shadcn** (Recommended)
- Build in-house toast
- Decide in plan-phase

**Decision:** Sonner via shadcn. Lightweight, dark-theme friendly, matches existing shadcn primitives.

---

## Area 4 — API base URL config + Lambda contract verification

**Question 1:** Env var name for the API Gateway base URL?

- ✅ **`NEXT_PUBLIC_API_BASE_URL`** (Recommended) — matches existing `NEXT_PUBLIC_COGNITO_*` convention
- `NEXT_PUBLIC_API_GATEWAY_URL`
- `NEXT_PUBLIC_BACKEND_URL`

**Decision:** `NEXT_PUBLIC_API_BASE_URL`. Updates `.env.example`. ONBOARDING.md (Phase 17) will document how to extract from `pulumi stack output`.

**Question 2:** Lambda response shapes — verify now or defer?

- ✅ **Defer to per-screen phases (13–16)** (Recommended)
- Verify all 4 endpoints now during Phase 12

**Decision:** Defer. Phase 12 ships generic helpers (`apiGet<T>`, `apiPost<T>`); Phases 13–16 each read their own Lambda handler and write the typed function for their endpoint. FETCH-05 is interpreted as "satisfied across the phase block, not solely by Phase 12." Phase 12 writes one demonstrator typed function (likely recommend, kept side-by-side with the existing mock to avoid touching Phase 13's scope).

---

## Deferred ideas

Captured in `<deferred>` section of CONTEXT.md:

- Retry on 5xx — v2.1
- Service worker / offline cache — v2.1
- Telemetry / structured request logging — v2.1
- Per-endpoint custom timeouts — current design (caller-provided signal) is sufficient
- Rate-limit (429) UX — wrapper buckets 429 into `server`; split into a `rateLimited` kind only if it becomes a real issue

---

## Claude's discretion

The following are NOT covered by user decisions and the planner / executor will choose:

- File layout — single `client.ts` vs splitting into `client.ts` + `errors.ts` + `useApiErrorUx.ts`
- Whether the demonstrator typed function lives in `lib/api/recommend.real.ts` (side-by-side with the mock) or somewhere else
- Internal naming (e.g. `authedFetch` vs `apiCall` vs `lambdaCall`)
- Whether to add `apiPut` / `apiDelete` helpers in Phase 12 even though no current route uses them
- Sonner theming details — must consume design tokens per DSGN-06
- Where exactly `setOnUnauthorized(signOut)` is wired in `AuthProvider` (mount effect or render-phase ref)

---

*Discussion completed: 2026-05-12*
