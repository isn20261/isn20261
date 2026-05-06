---
phase: 04
plan: 01
subsystem: auth
tags: [auth, mock-seam, cognito-shape, popover, shadcn]
requirements: [AUTH-04, AUTH-05]
dependency-graph:
  requires:
    - frontend/web/lib/utils.ts (cn helper)
    - frontend/web/components.json (shadcn config — base-nova style)
    - frontend/web/styles/globals.css (theme tokens for popover consumer)
  provides:
    - frontend/web/lib/api/auth.ts (Cognito-shaped mock seam)
    - frontend/web/components/ui/popover.tsx (shadcn Popover primitive)
  affects:
    - downstream Plan 03 (login/register pages — consume signIn/signUp/UsernameExistsException/NotAuthorizedException)
    - downstream Plan 04 (AccountMenu — consumes Popover + signOut)
tech-stack:
  added: []  # @base-ui/react was already a dep from Phase 1; no new deps
  patterns:
    - "Cognito-shaped Error subclasses with overridden name field"
    - "typeof window === 'undefined' guards for SSR-safe localStorage access"
    - "Object.prototype.hasOwnProperty.call to defeat prototype-pollution"
    - "JSON.parse defensive shape check (reject non-plain-object / array / null)"
key-files:
  created:
    - frontend/web/lib/api/auth.ts
    - frontend/web/components/ui/popover.tsx
  modified: []
decisions:
  - "shadcn 'base-nova' style uses @base-ui/react, not @radix-ui/react-popover (Phase 1 already shipped @base-ui/react ^1.4.1)"
  - "Mock latency stays randomized 400-700 ms via MOCK_LATENCY_MS const; test override path documented"
  - "Plain-text password storage in recommend-a.users accepted per CONTEXT D-02 (mock, not security boundary)"
metrics:
  duration: ~10 min
  completed: 2026-05-06
---

# Phase 04 Plan 01: Mock Auth Seam Summary

**One-liner:** Typed Cognito-shaped mock auth seam at `lib/api/auth.ts` (signIn/signUp/signOut/getSession + UsernameExistsException/NotAuthorizedException + Session type, backed by `recommend-a.session` and `recommend-a.users` localStorage keys) plus shadcn-generated Popover primitive at `components/ui/popover.tsx` — the two contracts every other Phase 4 plan depends on.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create typed Cognito-shaped mock auth seam at `lib/api/auth.ts` (D-02..D-04, AUTH-04, AUTH-05) | `0f047e8` | `frontend/web/lib/api/auth.ts` |
| 2 | Scaffold shadcn Popover primitive at `components/ui/popover.tsx` (D-07) | `85b3dcb` | `frontend/web/components/ui/popover.tsx` |

## Public Surface (Plan 03/04 consumers can now import)

```ts
// from "@/lib/api/auth"
export const MOCK_LATENCY_MS = [400, 700] as const;
export const SESSION_KEY = "recommend-a.session" as const;
export const USERS_KEY   = "recommend-a.users"   as const;

export type Session = {
  AccessToken: string;
  IdToken: string;
  RefreshToken: string;
  ExpiresAt: number;
  user: { email: string; sub: string };
};

export class UsernameExistsException extends Error { /* name = 'UsernameExistsException' */ }
export class NotAuthorizedException  extends Error { /* name = 'NotAuthorizedException'  */ }

export async function signUp({ email, password }): Promise<Session>;
export async function signIn({ email, password }): Promise<Session>;
export function signOut(): void;
export function getSession(): Session | null;
```

```ts
// from "@/components/ui/popover"
export { Popover, PopoverTrigger, PopoverContent, PopoverHeader, PopoverTitle, PopoverDescription };
```

The Popover module additionally exports `PopoverHeader` / `PopoverTitle` / `PopoverDescription` (shadcn `base-nova` style emits these); the plan's interface contract for downstream consumers (`Popover` / `PopoverTrigger` / `PopoverContent`) is satisfied — extra exports are inert / available for later use.

## Verification

| Gate | Command | Result |
|------|---------|--------|
| Typecheck | `cd frontend/web && pnpm tsc --noEmit` | exit 0 |
| Lint | `cd frontend/web && pnpm lint` | exit 0 |
| Production build | `cd frontend/web && pnpm build` | exit 0 (5 static pages prerendered, no consumers yet — expected) |

Grep verification (Task 1):
- `export class UsernameExistsException` — 1 hit
- `export class NotAuthorizedException` — 1 hit
- `recommend-a.session` — 2 hits (const + signOut removeItem)
- `recommend-a.users` — 4 hits (const + readUsers/writeUsers references)
- `MOCK_LATENCY_MS = [400, 700]` — 1 hit
- `crypto.randomUUID()` — 4 hits (AccessToken + IdToken + RefreshToken + sub)
- `AccessToken` — 2 hits (Session type + issueSession)
- `ExpiresAt` — 2 hits
- `Date.now() + ONE_HOUR_MS` — 1 hit
- `typeof window === "undefined"` — 5 hits (every storage path gated; one extra in `delay`-adjacent helpers — total ≥ 4 required)
- `Object.prototype.hasOwnProperty.call` — 2 hits (signIn + signUp)

Grep verification (Task 2):
- `PopoverTrigger` — 2 hits (function decl + export)
- `PopoverContent` — 2 hits
- `@base-ui/react/popover` — 1 hit (import)

## Deviations from Plan

### [Rule 1 - Plan Assumption Mismatch] shadcn primitive uses @base-ui/react, not @radix-ui/react-popover

- **Found during:** Task 2 (`pnpm dlx shadcn@latest add popover`)
- **Issue:** The plan's `must_haves.key_links` and §verification expected `@radix-ui/react-popover` to land in `package.json` / `pnpm-lock.yaml`. The actual generated `components/ui/popover.tsx` imports from `@base-ui/react/popover` because `frontend/web/components.json` is configured with `style: "base-nova"`, which is shadcn's Base-UI–backed style (not the default Radix-backed style). `@base-ui/react ^1.4.1` was already a dependency from Phase 1 (Plan 01-02 shadcn init).
- **Fix:** Accepted the shadcn CLI output as-is — no manual edits per UI-SPEC §"Component Inventory" (do-not-modify generated files). The primitive's role (Popover/Trigger/Content named exports for AccountMenu consumption in Plan 04) is fully satisfied; the upstream library identity (Base-UI vs Radix) is implementation-internal to the shadcn primitive and does not affect any consumer. No new dependencies were added.
- **Files modified:** none (the deviation is in expectations, not in implementation)
- **Plan §key_links impact:** the `pattern: "@radix-ui/react-popover"` link no longer matches by string; the equivalent invariant for `base-nova` is `@base-ui/react/popover` and is satisfied by the generated file.
- **Forward signal:** the plan's `pnpm-lock.yaml` modification target is empty in this commit because no dep was added. The lockfile diff for this plan is therefore zero bytes — intentional, not a miss.

### Other Deviations

None — Task 1 executed verbatim per the plan's action body.

## Auth Gates

None.

## Known Stubs

None — this plan creates contracts only; no UI surface is touched. Plan 03 and Plan 04 will land the consumers.

## Self-Check

- File `frontend/web/lib/api/auth.ts` — FOUND
- File `frontend/web/components/ui/popover.tsx` — FOUND
- Commit `0f047e8` (Task 1) — FOUND
- Commit `85b3dcb` (Task 2) — FOUND

## Self-Check: PASSED

## Forward Notes for Plan 03 / Plan 04

- **Plan 03 (login/register pages):** import `signIn` / `signUp` / `UsernameExistsException` / `NotAuthorizedException` from `@/lib/api/auth`. The submit handlers should `try { await signIn(...) } catch (err) { ... }` and inspect `err.name` (the load-bearing identifier) to decide which form-banner copy to display. Do NOT reach into `localStorage` from the page — the seam owns the keys.
- **Plan 04 (AccountMenu):** import `Popover` / `PopoverTrigger` / `PopoverContent` from `@/components/ui/popover` and `signOut` from `@/lib/api/auth`. The default `<PopoverContent>` className references `bg-popover` / `text-popover-foreground` (which are NOT defined in our `@theme` block); the consumer MUST pass an override className like `bg-surface-elevated border border-border rounded-md shadow-lg` per UI-SPEC §"Color" — `cn()` merge resolves the override correctly.
