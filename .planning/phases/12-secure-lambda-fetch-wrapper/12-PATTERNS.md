# Phase 12: Secure Lambda Fetch Wrapper - Pattern Map

**Mapped:** 2026-05-12
**Files analyzed:** 8 (5 new, 3 modified)
**Analogs found:** 7 / 8 (one new file — `useApiErrorUx.ts` — has no in-repo analog; planner uses RESEARCH/shadcn Sonner docs)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `frontend/web/lib/api/client.ts` (NEW) | service / api-seam | request-response (HTTP) | `frontend/web/lib/api/auth.ts` | role-match (both are React-free seams with module-init env validation, async source-of-truth, exception-translating boundary) |
| `frontend/web/lib/api/errors.ts` (NEW, may co-locate in client.ts) | utility / types | n/a (type-only) | `frontend/web/lib/api/auth.ts:40-54` (typed error classes) | role-match (P12 deliberately diverges to discriminated union — analog shows convention for naming + co-locating) |
| `frontend/web/lib/api/useApiErrorUx.ts` (NEW) | hook | event-driven (renders side-effect from prop) | `frontend/web/components/RequireAuth.tsx:22-27` (useEffect-on-prop-change pattern) | partial (no other React hooks in repo) |
| `frontend/web/components/ui/sonner.tsx` (NEW — shadcn-generated) | component (UI primitive) | n/a (provider mount) | `frontend/web/components/ui/popover.tsx` | role-match (shadcn-CLI-generated, base-nova style, `cn()` + token classNames, no hex literals) |
| `frontend/web/lib/api/recommend.real.ts` (NEW — demonstrator) | service / api-seam | request-response | `frontend/web/lib/api/recommend.ts` (mock) | exact (drop-in replacement signature, returns `Promise<Result<Movie, ApiError>>` instead of `Promise<Movie>`) |
| `frontend/web/app/layout.tsx` (MOD) | route / root-shell | n/a (provider mount) | `frontend/web/app/layout.tsx` itself (already mounts `<AuthProvider>`) | exact (same file, same pattern — add `<Toaster />` sibling) |
| `frontend/web/lib/auth/AuthContext.tsx` (MOD) | context provider | event-driven (mount effect) | `frontend/web/lib/auth/AuthContext.tsx:53-65` (existing rehydrate effect) | exact (extend the existing `useEffect` block) |
| `frontend/web/.env.example` (MOD) | config | n/a | existing `frontend/web/.env.example` | exact (just append a key — already partially present per file read) |

---

## Pattern Assignments

### `frontend/web/lib/api/client.ts` (service / api-seam, request-response)

**Analog:** `frontend/web/lib/api/auth.ts`

**Why this analog:** Both files are the *single* React-free seam that wraps an external SDK / network surface, validate env vars once at module init, expose async functions that the React layer consumes, and translate vendor-shaped errors into a stable typed surface. Phase 12's wrapper is structurally a sibling of Phase 11's auth seam — same architectural slot, different protocol.

**File-level docstring pattern** (`auth.ts:1-19`):

```ts
/**
 * Cognito-direct auth seam (Pattern B).
 *
 * Talks to the Cognito User Pool from the browser using amazon-cognito-identity-js.
 * ...
 * Public surface kept stable for the rest of the app:
 *   - signUp / signIn / signOut / getSession
 *   ...
 */
```

Copy: a 10-20-line file header naming what the seam is, what it wraps, and listing the public surface (`apiGet`, `apiPost`, `setOnUnauthorized`, `ApiError`, `Result`).

**Module-init env-var validation** (`auth.ts:56-68`):

```ts
let cachedPool: CognitoUserPool | null = null;
function getPool(): CognitoUserPool {
  if (cachedPool) return cachedPool;
  const UserPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
  const ClientId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID;
  if (!UserPoolId || !ClientId) {
    throw new Error(
      "Missing NEXT_PUBLIC_COGNITO_USER_POOL_ID or NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID. Copy .env.example to .env.local.",
    );
  }
  cachedPool = new CognitoUserPool({ UserPoolId, ClientId });
  return cachedPool;
}
```

Copy verbatim, swapping for `NEXT_PUBLIC_API_BASE_URL`:

```ts
let cachedBase: string | null = null;
function getBaseUrl(): string {
  if (cachedBase) return cachedBase;
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!raw) {
    throw new Error(
      "Missing NEXT_PUBLIC_API_BASE_URL. Copy .env.example to .env.local and fill in the Pulumi `api_internal_url` stack output.",
    );
  }
  cachedBase = raw.replace(/\/+$/, ""); // defensive: strip trailing slash per CONTEXT decision
  return cachedBase;
}
```

The lazy-cache pattern (`if (cachedX) return cachedX`) is the project's idiomatic module-init: it lets the throw happen at first call rather than at import time, which keeps tests (that mock env) ergonomic.

**Async source-of-truth call pattern** (`auth.ts:194-207`):

```ts
export function getSession(): Promise<Session | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  const user = getPool().getCurrentUser();
  if (!user) return Promise.resolve(null);
  return new Promise((resolve) => {
    user.getSession((err: Error | null, cognitoSession: CognitoUserSession | null) => {
      if (err || !cognitoSession || !cognitoSession.isValid()) {
        resolve(null);
        return;
      }
      resolve(toSession(cognitoSession));
    });
  });
}
```

This is the wrapper's authority: it calls `getSession()` once per request to pull a fresh-validated IdToken, no caching, no manual refresh orchestration. Pattern to copy:

```ts
import { getSession } from "@/lib/api/auth";

async function authorizedHeaders(): Promise<Record<string, string> | null> {
  const session = await getSession(); // Cognito SDK refreshes internally
  if (!session) return null;            // null -> caller fires onUnauthorized
  return { Authorization: `Bearer ${session.IdToken}` }; // IdToken, not AccessToken — JWT authorizer
}
```

**SSR guard pattern** (`auth.ts:189, 195, 219`):

```ts
if (typeof window === "undefined") return;          // signOut
if (typeof window === "undefined") return Promise.resolve(null);  // getSession
if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") { ... }
```

Apply to: the dev-only `setOnUnauthorized` registration shouldn't crash during SSR — guard any storage/window touchpoints. Pure fetch + AbortController are SSR-safe, but the `onUnauthorized` callback registry should default to a no-op on the server.

**Module-scoped callback registry pattern** (no direct in-repo analog; closest is `cachedPool` at `auth.ts:56`):

The `cachedPool` mutable-module-singleton pattern transfers directly:

```ts
let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(cb: () => void): void {
  onUnauthorized = cb;
}

function fireUnauthorized(): void {
  if (onUnauthorized) onUnauthorized();
}
```

**Error-translation boundary pattern** (`auth.ts:70-90`):

```ts
function translateError(err: unknown): Error {
  const e = err as { name?: string; code?: string; message?: string };
  const name = e?.name ?? e?.code ?? "";
  const msg = e?.message ?? "Authentication failed.";
  switch (name) {
    case "UsernameExistsException":
      return new UsernameExistsException(msg);
    case "NotAuthorizedException":
      return new NotAuthorizedException(msg);
    // ...
    default:
      return err instanceof Error ? err : new Error(msg);
  }
}
```

P12 diverges to a `Result` discriminated union (locked in CONTEXT), but the *structure* of this function is the model: take an unknown vendor shape, narrow it, return a stable typed value. Copy as `classifyResponse(response, body) -> ApiError`:

```ts
async function classifyError(response: Response, cause?: Error): Promise<ApiError> {
  const status = response.status;
  let body: unknown = null;
  try { body = await response.json(); } catch { /* non-JSON 5xx — surface generic */ }
  const message = sanitize(extractMessage(body)) ?? defaultMessageForStatus(status);
  if (status === 401) return { kind: "unauthorized", message };
  if (status === 403) return { kind: "forbidden", status: 403, message };
  if (status >= 400 && status < 500) {
    const fields = extractFields(body); // optional Record<string, string>
    return { kind: "validation", status, message, fields };
  }
  return { kind: "server", status, message, cause };
}
```

The defensive `try { body = await response.json(); } catch {}` is required because per CONTEXT.md assumption 2, non-JSON 502s from API Gateway are possible.

---

### `frontend/web/lib/api/errors.ts` (utility / types, type-only)

**Analog:** `frontend/web/lib/api/auth.ts:40-54` (typed error classes co-located in seam)

**Note on file split:** The auth seam co-locates the `UsernameExistsException` etc. classes inside `auth.ts` itself. The repo has no precedent for splitting types into a sibling file. **Recommendation for planner:** start with everything in `client.ts` (matching the auth-seam pattern); only split out `errors.ts` if `client.ts` crosses ~250 lines. The CONTEXT lists `errors.ts` as "or co-located in client.ts — your call based on patterns" — patterns say co-locate.

**Typed exports pattern** (`auth.ts:30-36, 40-54`):

```ts
export type Session = {
  AccessToken: string;
  IdToken: string;
  RefreshToken: string;
  ExpiresAt: number;
  user: { email: string; sub: string };
};

export class UsernameExistsException extends Error {
  override name = "UsernameExistsException" as const;
}
```

P12 type contract (from CONTEXT decisions, written in the auth-seam style):

```ts
export type Result<T, E> = { ok: true; data: T } | { ok: false; error: E };

export type ApiError =
  | { kind: "network"; message: string; cause?: Error }
  | { kind: "unauthorized"; message: string }
  | { kind: "forbidden"; status: 403; message: string }
  | { kind: "validation"; status: number; message: string; fields?: Record<string, string> }
  | { kind: "server"; status: number; message: string; cause?: Error };
```

---

### `frontend/web/lib/api/useApiErrorUx.ts` (hook, event-driven)

**Analog:** `frontend/web/components/RequireAuth.tsx:22-27` (closest in-repo hook-style effect)

**Match quality:** partial — there are no custom hooks in the repo yet (`useAuth` is a context-reader, not an effect-driving hook). `RequireAuth`'s `useEffect`-on-prop-change is the closest behavioural twin.

**Imports pattern** (`RequireAuth.tsx:13-15`, `AuthContext.tsx:14-21`):

```ts
"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
```

The project uses the `"use client"` directive at the top, type-only imports inline (`type ReactNode`), `@/` alias for `frontend/web/`, and `next/navigation` for router/path.

**useEffect-on-prop pattern** (`RequireAuth.tsx:22-27`):

```ts
useEffect(() => {
  if (!isLoading && !isAuthenticated) {
    const from = encodeURIComponent(pathname);
    router.replace(`/login?from=${from}`);
  }
}, [isLoading, isAuthenticated, pathname, router]);
```

Copy this shape for `useApiErrorUx`:

```ts
"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import type { ApiError } from "@/lib/api/client";

export function useApiErrorUx(error: ApiError | null): void {
  useEffect(() => {
    if (!error) return;
    switch (error.kind) {
      case "network":
      case "server":
      case "forbidden":
        toast.error(error.message);
        return;
      case "unauthorized":
        return; // wrapper already fired onUnauthorized -> AuthContext.signOut -> redirect
      case "validation":
        return; // caller renders inline; toast would be wrong (per CONTEXT decision)
      default: {
        const _exhaustive: never = error;
        return _exhaustive;
      }
    }
  }, [error]);
}
```

The `_exhaustive: never` pattern enforces the discriminated-union exhaustiveness mentioned in CONTEXT.md decision 1.

---

### `frontend/web/components/ui/sonner.tsx` (component / UI primitive)

**Analog:** `frontend/web/components/ui/popover.tsx`

**Why this analog:** It's the only existing `components/ui/` shadcn-CLI-generated file. It establishes the project's conventions for: shadcn `base-nova` style (per `components.json`), `cn` utility import, token-only `className` strings (no hex / no px literals — DSGN-06), `"use client"` directive, and `data-slot` attributes for shadcn-style component identity.

**Imports + structure pattern** (`popover.tsx:1-6`):

```ts
"use client"

import * as React from "react"
import { Popover as PopoverPrimitive } from "@base-ui/react/popover"

import { cn } from "@/lib/utils"
```

Note: no semicolons, double-quoted strings — match this exactly. The shadcn CLI will install Sonner; if the generated file uses semicolons (default Sonner template does), keep them — consistency-with-the-CLI-output trumps consistency-with-popover, since both are shadcn-managed.

**Tokenized className pattern** (`popover.tsx:39-44`):

```ts
className={cn(
  "z-50 flex w-72 origin-(--transform-origin) flex-col gap-2.5 rounded-lg bg-popover p-2.5 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden duration-100 ...",
  className
)}
```

**Critical:** every color is a token class (`bg-popover`, `text-popover-foreground`, `ring-foreground/10`), every radius is a token (`rounded-lg`), every shadow is a token (`shadow-md`). Zero hex literals. The default shadcn Sonner template may include `bg-background text-foreground` — that's fine. If it includes anything like `bg-white` or hex inline, replace with tokens from `frontend/web/styles/globals.css:25-49` (`--color-bg`, `--color-surface`, `--color-text-primary`, `--color-danger` for error toasts, `--color-success` for success, etc.).

**Project-specific tokens available for Sonner theming** (`styles/globals.css:25-49`):

```
--color-bg            (page background)
--color-surface       (#131316 — likely toast bg)
--color-surface-elevated
--color-border / --color-border-strong
--color-text-primary / --color-text-secondary / --color-text-muted
--color-accent / --color-accent-hover
--color-success       (#4ade80 — success toast)
--color-warning       (#f59e0b)
--color-danger        (#f87171 — error toast)
```

If the shadcn Sonner template uses `theme="system"`, force it to `theme="dark"` (matches the project's locked dark theme) and pass `toastOptions={{ classNames: { ... } }}` with token classes if needed.

---

### `frontend/web/lib/api/recommend.real.ts` (demonstrator typed function, request-response)

**Analog:** `frontend/web/lib/api/recommend.ts` (the mock)

**Match quality:** exact — this is intentionally a near-drop-in. The CONTEXT.md open-question resolution recommends option (a): keep the mock untouched, add `recommend.real.ts` alongside.

**Mock signature to replace** (`recommend.ts:292-297`):

```ts
export async function getRecommendation(): Promise<Movie> {
  await new Promise((resolve) => setTimeout(resolve, PICK_LATENCY_MS));
  const idx = Math.floor(Math.random() * MOVIES.length);
  return MOVIES[idx] as Movie;
}
```

**Real signature pattern** (consume the wrapper):

```ts
import type { Movie } from "@/lib/api/recommend";
import { apiGet, type Result, type ApiError } from "@/lib/api/client";

export async function getRecommendationReal(): Promise<Result<Movie, ApiError>> {
  return apiGet<Movie>("/api/v1/recommend");
}
```

The path `/api/v1/recommend` comes from `__main__.py:321`:

```python
create_route("/api/v1/recommend", "GET", recommend_lambda, auth_id=authorizer.id)
```

Phase 12 should NOT swap the screen yet — Phase 13 does that atomically. Phase 12's executor verifies the real call works (e.g. a temporary dev button or a unit test calling against a mocked `fetch`), then leaves the demonstrator in place for Phase 13 to consume.

**Re-export of `Movie` type** — `recommend.real.ts` does NOT redefine `Movie`; it imports the `Movie` type from `recommend.ts`. The Movie shape *might* change when Phase 13 reads the real Lambda handler; Phase 12's demonstrator deliberately reuses the mock shape and lets P13 widen/narrow it.

---

### `frontend/web/app/layout.tsx` (route / root-shell, MODIFIED)

**Analog:** itself — current state already mounts `<AuthProvider>`.

**Current state** (`app/layout.tsx:25-37`):

```tsx
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fontDisplay.variable} ${fontBody.variable}`}>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
```

**Modification pattern:** mount `<Toaster />` as a sibling inside `<body>`, *outside* `<AuthProvider>` (or inside — Sonner is provider-agnostic; outside avoids re-render churn on auth changes). Add the import next to the existing `AuthProvider` import:

```tsx
import { AuthProvider } from "@/lib/auth/AuthContext";
import { Toaster } from "@/components/ui/sonner";

// ...

<body>
  <AuthProvider>{children}</AuthProvider>
  <Toaster />
</body>
```

Keep `<Toaster />` as the last child so it portals above all content.

---

### `frontend/web/lib/auth/AuthContext.tsx` (context provider, MODIFIED)

**Analog:** itself, lines 53-65 (existing mount effect).

**Existing mount effect** (`AuthContext.tsx:53-65`):

```tsx
useEffect(() => {
  // Rehydrate session from Cognito on mount. The SDK validates / refreshes
  // tokens against the User Pool, so this is async.
  let cancelled = false;
  getSession().then((persisted) => {
    if (cancelled) return;
    if (persisted) setSession(persisted);
    setIsLoading(false);
  });
  return () => {
    cancelled = true;
  };
}, []);
```

**Modification pattern:** Add a *separate* `useEffect` to register the unauthorized callback. Keep it separate from the rehydrate effect — different concerns, different deps, easier to reason about.

```tsx
// add to existing import block at top:
import { setOnUnauthorized } from "@/lib/api/client";

// inside AuthProvider, after the existing useEffect:
useEffect(() => {
  // Register the wrapper's unauthorized callback. The wrapper invokes this
  // when getSession() returns null mid-request OR when an in-flight request
  // returns 401 anyway. signOut clears the Cognito session; RequireAuth
  // (which is already mounted on protected routes) sees isAuthenticated flip
  // and redirects to /login.
  setOnUnauthorized(signOut);
}, [signOut]);
```

**Why a useCallback-stable signOut is required:** `signOut` is already wrapped in `useCallback` (`AuthContext.tsx:77-80`), so the effect runs once on mount. No extra change needed there — just confirm in the plan.

**Note on ordering:** The `setOnUnauthorized` effect should be defined after the rehydrate effect. React runs effects top-down on mount. There's no actual race (the wrapper isn't called before any user interaction), but registering as late as possible avoids any theoretical window where a kicked-off request could fail before the callback registers.

---

### `frontend/web/.env.example` (config, MODIFIED)

**Analog:** itself — current state already has the section structure.

**Current state** (last 3 lines shown via Bash read):

```
# API Gateway base URL (no trailing slash). Lambdas mount under /api/v1.
NEXT_PUBLIC_API_BASE_URL=
```

**Observation:** the key is already present in `.env.example` (likely added during the Cognito phase or pre-emptively). **Planner action:** verify the value is empty and the comment matches Phase 12's locked decision (no trailing slash, paths like `/api/v1/recommend` are appended by the wrapper). If the comment differs from CONTEXT, update the comment; no new key needed.

The Pulumi source for the value is `__main__.py:600` — `pulumi.export("api_internal_url", api.api_endpoint)`. The comment in `.env.example` should reference where the user gets the value: append a hint like `# Get from: pulumi stack output api_internal_url`.

---

## Shared Patterns

### Lazy module-init with cache + descriptive throw
**Source:** `frontend/web/lib/api/auth.ts:56-68`
**Apply to:** `client.ts` (base URL init), any future seam that reads env on first call.

```ts
let cachedX: T | null = null;
function getX(): T {
  if (cachedX) return cachedX;
  const raw = process.env.NEXT_PUBLIC_X;
  if (!raw) {
    throw new Error("Missing NEXT_PUBLIC_X. Copy .env.example to .env.local.");
  }
  cachedX = construct(raw);
  return cachedX;
}
```

Why: error surfaces at first use (not import), test-mockable, deterministic message that hints at the fix.

### SSR / browser-only guards
**Source:** `frontend/web/lib/api/auth.ts:189, 195` and `frontend/web/lib/api/watch-later.ts:22, 35`
**Apply to:** any seam touching `window`, `localStorage`, or DOM-only APIs.

```ts
if (typeof window === "undefined") return Promise.resolve(null); // or return; for sync
```

The wrapper's `fetch` + `AbortController` are SSR-safe (Node 18+ has both), so `client.ts` itself doesn't need this guard for the fetch path — but `setOnUnauthorized` registration is a no-op on server (no React tree).

### Discriminated union + `as const` name
**Source:** `frontend/web/lib/api/auth.ts:41-42`

```ts
export class UsernameExistsException extends Error {
  override name = "UsernameExistsException" as const;
}
```

P12 uses string-literal `kind` discriminators instead of class names, but the *principle* — make the discriminator a const literal so TS narrows it — is the same.

### Mount-effect with cancellation flag
**Source:** `frontend/web/lib/auth/AuthContext.tsx:53-65`
**Apply to:** any async-on-mount effect (none added in P12, but Phase 13–16 will reuse this when they fetch on mount).

```ts
useEffect(() => {
  let cancelled = false;
  asyncCall().then((data) => {
    if (cancelled) return;
    setState(data);
  });
  return () => { cancelled = true; };
}, []);
```

### Tokenized className-only styling (DSGN-06)
**Source:** `frontend/web/components/ui/popover.tsx:39-44` and `frontend/web/AGENTS.md`
**Apply to:** `components/ui/sonner.tsx`, any toast-related component.

Forbidden in `app/` and `components/`:
- Hex / rgba / hsl literals in `className`
- `style={{ ... }}` for design-system values
- `tailwind.config.*` reintroduction

Allowed token surface: only tokens authored in `frontend/web/styles/globals.css:20-100` `@theme` block (`bg-bg`, `text-text-primary`, `bg-surface`, `text-danger`, etc.) and standard Tailwind v4 layout utilities (`flex`, `gap-4`, `p-2`).

### Imports / aliases convention
**Source:** all files
- Path alias: `@/` -> `frontend/web/`
- `cn` utility: `import { cn } from "@/lib/utils"`
- React types as type-only imports: `import { useEffect, type ReactNode } from "react"`
- `"use client"` directive at top of any file using hooks / context / browser APIs

---

## No Analog Found

| File / Concern | Reason | Planner Guidance |
|----------------|--------|------------------|
| Custom React hook with side-effect (`useApiErrorUx`) | Repo has no `useX` hook beyond `useAuth` (context reader, not effect-driver). The closest is `RequireAuth`'s `useEffect` inline. | Author from first principles using the `RequireAuth` effect shape + Sonner's `toast.error()` API. Single-file, ~30 lines. |
| `AbortController` + `fetch` composition | No existing fetch call in the codebase outside `amazon-cognito-identity-js` internals — all data is mocked via `lib/api/*.ts`. | Standard browser API; reference MDN `AbortSignal.timeout()` or compose `AbortController` + `setTimeout` manually for IE compat (not needed — Next 16 / modern targets only). Compose caller-provided `signal` with the wrapper's by listening to both. |
| Toast theming for token-only DSGN-06 compliance | No existing Sonner / toast component in repo. | Run `bun x shadcn@latest add sonner` per CONTEXT decision; inspect generated `components/ui/sonner.tsx`; if any hex / rgba / fixed-px values appear, replace with tokens from `globals.css:25-49`. Fallback (if shadcn template fights Tailwind v4 CSS-first config) is a ~50-line in-house toast — flagged in CONTEXT assumption 1. |

---

## Metadata

**Analog search scope:**
- `/home/arthur/Code/isn20261/frontend/web/lib/` (api, auth, utils)
- `/home/arthur/Code/isn20261/frontend/web/components/` (ui primitives, RequireAuth)
- `/home/arthur/Code/isn20261/frontend/web/app/` (layout, routes)
- `/home/arthur/Code/isn20261/frontend/web/styles/globals.css` (token surface)
- `/home/arthur/Code/isn20261/__main__.py:252-323` (Lambda routes)
- `/home/arthur/Code/isn20261/frontend/web/components.json` (shadcn config)

**Files scanned (read in full or targeted):** 12

**Key takeaways for planner:**
1. `client.ts` is a structural sibling of `auth.ts` — same React-free seam slot, same env-init pattern, same docstring style, same SSR guard pattern.
2. `useApiErrorUx` is the only file without a strong in-repo analog; build it from the `RequireAuth` effect shape.
3. `components/ui/sonner.tsx` follows the `popover.tsx` token-only pattern — audit shadcn output for DSGN-06 violations and replace hex/px with tokens before committing.
4. `AuthContext.tsx` modification is additive (new `useEffect` for `setOnUnauthorized(signOut)`), zero churn to the existing rehydrate effect.
5. `.env.example` already has the `NEXT_PUBLIC_API_BASE_URL` key — verify, don't re-add.
6. The demonstrator (`recommend.real.ts`) is intentionally a *parallel* file to the mock — Phase 13 atomically swaps the screen later.

**Pattern extraction date:** 2026-05-12
