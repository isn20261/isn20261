---
phase: 05
plan: 01
type: execute
depends_on: []
files_modified:
  - frontend/web/lib/auth/AuthContext.tsx          # NEW
  - frontend/web/app/layout.tsx                    # mount AuthProvider
  - frontend/web/components/Sidebar.tsx            # derive loggedIn from useAuth
  - frontend/web/components/Navbar.tsx             # become Client, derive from useAuth
  - frontend/web/components/AccountMenu.tsx        # use useAuth().signOut
  - frontend/web/app/(auth)/login/page.tsx         # use useAuth().signIn
  - frontend/web/app/(auth)/register/page.tsx      # use useAuth().signUp
autonomous: true
requirements: [AUTH-08, AUTH-10, AUTH-12]
---

<objective>
Stand up the global AuthContext + AuthProvider + useAuth hook, mount it at the root layout, and rewire the chrome (Sidebar/Navbar/AccountMenu) and the auth pages (login/register) to read from / write to context. Result: after a successful login the chrome flips to the logged-in state immediately and survives a page refresh; logout flips it back.

This plan does NOT add route protection — that's plan 05-02. Goal here is "context exists, all consumers go through it."
</objective>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md  §"Phase 5"
@frontend/web/lib/api/auth.ts
@frontend/web/components/Sidebar.tsx
@frontend/web/components/Navbar.tsx
@frontend/web/components/AccountMenu.tsx
@frontend/web/app/layout.tsx
@frontend/web/app/(auth)/login/page.tsx
@frontend/web/app/(auth)/register/page.tsx
</context>

<tasks>

<task name="1: AuthContext + Provider + useAuth hook">
Create `frontend/web/lib/auth/AuthContext.tsx`. Client Component (`"use client"`).

Shape:
```ts
type AuthState = {
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;        // derived: session !== null && !isExpired(session)
  user: { email: string; sub: string } | null;  // derived from session.user
  signIn: (creds: { email: string; password: string }) => Promise<void>;
  signUp: (creds: { email: string; password: string }) => Promise<void>;
  signOut: () => void;
};
```

Behavior:
- On mount: call `getSession()` from `@/lib/api/auth`. If it returns a session whose `ExpiresAt > Date.now()`, set state. If expired, clear via `signOut()` from the seam and set null. Set `isLoading: false` after first read.
- `signIn` / `signUp` wrap the seam functions, then update state with the returned Session.
- `signOut` calls the seam's `signOut()` then sets `session: null`.
- Export `AuthProvider` (default consumer pattern) and `useAuth()` hook that throws if used outside the provider.

No `localStorage` access in render — only inside `useEffect` for rehydration.
</task>

<task name="2: Mount AuthProvider at root layout">
Edit `frontend/web/app/layout.tsx`. Wrap `{children}` in `<AuthProvider>`. Root layout must remain a Server Component; AuthProvider is a Client Component imported as a child — Next.js handles the boundary.

Place AuthProvider INSIDE `<body>` so server-rendered HTML still streams unaffected.
</task>

<task name="3: Sidebar reads useAuth() instead of prop default">
Edit `frontend/web/components/Sidebar.tsx`.
- Remove the `loggedIn` and `userName` props (or keep them as optional override for tests, default to context).
- Internally call `useAuth()` and derive `loggedIn = isAuthenticated`, `userName = user?.email.split("@")[0] ?? "there"` (Phase 4 used hardcoded "June" — replace).
- Sidebar is already a Client Component, so no boundary change.
- Update the avatar initials TODO: now derive from email-prefix (e.g. `demo@x.com` → `DE`). Single line: `userName.slice(0, 2).toUpperCase()`.
</task>

<task name="4: Navbar becomes Client, reads useAuth()">
Edit `frontend/web/components/Navbar.tsx`.
- Add `"use client"` directive at byte 0.
- Drop the `loggedIn` and `userName` props (or keep as overrides — same as Sidebar).
- Internally call `useAuth()` to drive the logged-in vs logged-out branch and the greeting userName.
- Mobile variant doesn't need auth — leave that branch unchanged.

This is a deliberate reversal of the Phase 4 "Navbar stays Server" decision — Phase 5 explicitly needs it to react to context changes, and there's no SSR data we'd lose.
</task>

<task name="5: AccountMenu Sign-out uses context">
Edit `frontend/web/components/AccountMenu.tsx`.
- Replace `import { signOut } from "@/lib/api/auth"` with `import { useAuth } from "@/lib/auth/AuthContext"`.
- In the component, call `const { signOut } = useAuth();` and use that in `handleSignOut`. The `router.push('/login')` after signOut stays the same.

This makes the chrome flip immediately on sign-out (context state updates synchronously, before the route change resolves).
</task>

<task name="6: Login + Register pages call useAuth()">
Edit `frontend/web/app/(auth)/login/page.tsx`:
- Replace direct `signIn` / `NotAuthorizedException` import with `useAuth()` for signIn; keep importing `NotAuthorizedException` from the seam for the instanceof check (it's a type/class, not a runtime call).
- In `handleSubmit`: call `await signIn({ email, password })` from context (not the seam).

Same for `frontend/web/app/(auth)/register/page.tsx` with `signUp` / `UsernameExistsException`.

Why: login/register need the context to update so the chrome on `/` reflects the new session immediately when `router.push('/')` lands.
</task>

</tasks>

<verification>
After all tasks ship:
- `cd frontend/web && pnpm tsc --noEmit && pnpm lint && pnpm build` exit 0
- Manual smoke (boot `pnpm dev`):
  1. With localStorage cleared, visit `/` → sidebar avatar shows the User icon (logged-out state)
  2. Register a new user → URL pushes to `/` → sidebar avatar now shows initials (logged-in state)
  3. Hard-refresh `/` → sidebar still shows initials (rehydration works)
  4. Click avatar → AccountMenu opens → click Sign out → URL pushes to `/login`, sidebar back to User icon
  5. Sign in again → chrome flips back to logged-in
- `recommend-a.session` written on signIn/signUp, removed on signOut, persists across refresh
</verification>

<success_criteria>
1. AuthContext exists with `useAuth` hook + AuthProvider; mounted at root.
2. Sidebar avatar reflects auth state across refresh, login, and logout — without any explicit `loggedIn` prop wiring at the page level.
3. Navbar (when used by a page) reflects the same.
4. Login / register / sign-out all flow through the context, not direct seam calls.
5. tsc / lint / build green.
</success_criteria>
