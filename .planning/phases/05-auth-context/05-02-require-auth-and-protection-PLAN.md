---
phase: 05
plan: 02
type: execute
depends_on: [1]
files_modified:
  - frontend/web/components/RequireAuth.tsx                       # NEW
  - frontend/web/app/(app)/(protected)/layout.tsx                 # NEW route-group
  - frontend/web/app/(app)/(protected)/preferences/page.tsx       # stub for testing redirect
  - frontend/web/lib/api/auth.ts                                  # add forceExpire() test hook
autonomous: true
requirements: [AUTH-09, AUTH-11, AUTH-13]
---

<objective>
Wrap protected routes in a `RequireAuth` gate that redirects to `/login?from=<path>` when not authenticated, renders children when authenticated, and shows a no-flash skeleton during initial rehydration. Add a `(protected)` nested route group inside `(app)/` so future Phase 8/9/10 pages drop straight into it. Add a manual expiry test hook in the seam so the expiry redirect can be verified without waiting an hour.
</objective>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md  §"Phase 5"
@.planning/phases/05-auth-context/05-01-context-and-chrome-wiring-PLAN.md
@frontend/web/lib/auth/AuthContext.tsx
@frontend/web/lib/api/auth.ts
@frontend/web/app/(app)/layout.tsx
</context>

<tasks>

<task name="1: RequireAuth Client Component">
Create `frontend/web/components/RequireAuth.tsx`. Client Component.

Behavior:
- Calls `useAuth()` and `useRouter()` + `usePathname()`.
- In a `useEffect`, when `!isLoading && !isAuthenticated`, call `router.replace(\`/login?from=${encodeURIComponent(pathname)}\`)`.
- While `isLoading`, render a minimal skeleton (a centered spinner or empty `<div className="min-h-screen" />` — no chrome flash). Don't render `children` during loading.
- When authenticated, render `{children}`.
- Use `router.replace` not `router.push` so the protected URL doesn't end up in browser history.

Pattern detail: avoid the "render-then-redirect flash" by gating `children` behind `isAuthenticated` strictly.
</task>

<task name="2: (protected) nested route group + layout">
Create `frontend/web/app/(app)/(protected)/layout.tsx`. Server Component that wraps children in `<RequireAuth>` (RequireAuth is the Client boundary).

```tsx
import { RequireAuth } from "@/components/RequireAuth";
export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}
```

Why a nested group: Phase 6 hero (`/`) is public, the tokens gallery (`/tokens`) is public, but `/preferences`, `/history`, `/watch-later` will all be protected. The `(protected)` group is the single place that gate lives. Phase 8/9/10 just put their pages inside.
</task>

<task name="3: /preferences stub page (Phase 5 test target)">
Create `frontend/web/app/(app)/(protected)/preferences/page.tsx`. Server Component, minimal placeholder:

```tsx
export default function PreferencesPage() {
  return (
    <div className="p-10">
      <h1 className="font-display text-28 font-semibold text-text-primary">Preferences</h1>
      <p className="text-text-secondary text-14 mt-2">Phase 8 (PREF-01..05) will fill this page.</p>
    </div>
  );
}
```

Reason: Phase 5 success criterion #2 requires a real protected URL to test the redirect. `/preferences` was already named in the ROADMAP success criterion, and Phase 8 will replace this stub in place.
</task>

<task name="4: Login page reads ?from=… and redirects back">
Edit `frontend/web/app/(auth)/login/page.tsx`. After successful `signIn`, instead of always `router.push('/')`, read `searchParams.get('from')` (via `useSearchParams()`), validate that it starts with `/` and isn't `/login` / `/register` / `/forgot` (avoid redirect loops), and push there. Fall back to `/` if absent or invalid.

Same for `register/page.tsx` (a fresh user typically has no `from` — but for symmetry, do the same).

Why: AUTH-09 specifies "redirect back to the originally-requested protected URL after sign-in."
</task>

<task name="5: forceExpire() test hook in lib/api/auth.ts">
Edit `frontend/web/lib/api/auth.ts`. Add an exported function:

```ts
export function forceExpire(): void {
  if (typeof window === "undefined") return;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      parsed.ExpiresAt = Date.now() - 1000;
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(parsed));
    }
  } catch { /* ignore */ }
}
```

Plus expose it on `window.__authTest = { forceExpire }` only in development:

```ts
// at module bottom, conditional:
if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
  (window as unknown as { __authTest?: { forceExpire: typeof forceExpire } }).__authTest = { forceExpire };
}
```

Why: AUTH-13 requires a verifiable expiry path. This hook lets the manual smoke run `window.__authTest.forceExpire()` in devtools, then refresh — context's rehydrate path detects the expired session and clears it. Real Cognito (v2) replaces this with refresh-token rotation; the rehydrate path doesn't change.

Update AuthContext rehydration logic (from plan 05-01) to also handle a tab-focus check: on `window.focus`, re-read `getSession()` and if expired, call signOut + redirect. Optional — only if the simple rehydrate-on-mount isn't enough to satisfy AUTH-11.
</task>

</tasks>

<verification>
After all tasks ship:
- `cd frontend/web && pnpm tsc --noEmit && pnpm lint && pnpm build` exit 0
- Manual smoke (boot `pnpm dev`, clear localStorage):
  1. **AUTH-09**: visit `/preferences` while logged-out → URL becomes `/login?from=%2Fpreferences`; sign in with valid creds → URL pushes to `/preferences` (the original target), and the stub page renders.
  2. **AUTH-08**: visit `/preferences` while logged-in → renders directly, no redirect.
  3. **AUTH-10**: while on `/preferences`, click Sidebar avatar → AccountMenu → Sign out → URL goes to `/login`. Now type `/preferences` in the address bar → redirected back to `/login?from=%2Fpreferences`. (Subsequent navigation to a protected route is gated.)
  4. **AUTH-11**: refresh while on `/preferences` (logged-in) → page rerenders with no logout flicker, no flash of `/login`.
  5. **AUTH-13**: in devtools console, run `window.__authTest.forceExpire()` then refresh → redirected to `/login`.
  6. **AUTH-12**: navigate from `/preferences` to (when added) any other protected route or back via browser back-button — no unauthenticated flash at any point.
</verification>

<success_criteria>
1. RequireAuth gates the (protected) route group; unauthenticated visitors land on /login.
2. Logged-in users render protected pages directly.
3. Refresh preserves the session (no logout flicker, no flash).
4. Logout clears context and gates subsequent navigation.
5. Forced expiry redirects to /login.
6. tsc / lint / build green.
</success_criteria>
