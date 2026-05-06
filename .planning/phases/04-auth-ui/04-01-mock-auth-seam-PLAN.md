---
phase: 04
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/web/lib/api/auth.ts
  - frontend/web/components/ui/popover.tsx
  - frontend/web/package.json
  - frontend/web/pnpm-lock.yaml
autonomous: true
requirements: [AUTH-04, AUTH-05]
must_haves:
  truths:
    - "lib/api/auth.ts exports signIn / signUp / signOut / getSession plus MOCK_LATENCY_MS / SESSION_KEY / USERS_KEY constants"
    - "signUp throws UsernameExistsException on duplicate email; signIn throws NotAuthorizedException on unknown email or wrong password"
    - "On success, signIn / signUp write a Cognito-shaped Session object to recommend-a.session in localStorage"
    - "shadcn Popover primitive is scaffolded at components/ui/popover.tsx and ready for AccountMenu consumption"
  artifacts:
    - path: "frontend/web/lib/api/auth.ts"
      provides: "Cognito-shaped mock auth seam (D-02..D-04)"
      contains: "UsernameExistsException, NotAuthorizedException, signIn, signUp, signOut, getSession"
    - path: "frontend/web/components/ui/popover.tsx"
      provides: "shadcn Popover primitive (D-07)"
      contains: "Popover, PopoverTrigger, PopoverContent"
  key_links:
    - from: "frontend/web/lib/api/auth.ts"
      to: "window.localStorage"
      via: "SESSION_KEY = 'recommend-a.session', USERS_KEY = 'recommend-a.users'"
      pattern: "localStorage\\.(getItem|setItem|removeItem)"
    - from: "frontend/web/components/ui/popover.tsx"
      to: "@radix-ui/react-popover"
      via: "shadcn-generated re-export"
      pattern: "@radix-ui/react-popover"
---

<objective>
Land the foundational pieces every other Phase 4 plan depends on: the typed Cognito-shaped mock auth seam at `lib/api/auth.ts`, and the shadcn Popover primitive at `components/ui/popover.tsx`. No UI surface is touched in this plan — these are the contracts later plans implement against.

Purpose: AUTH-04 (Cognito-shaped seam) and AUTH-05 (token storage) are blocking dependencies for the login/register pages (Plan 03) and the AccountMenu wiring (Plan 04). Get the contracts written and the Popover scaffolded before any UI consumer references them.

Output: One typed TS module (`lib/api/auth.ts`), one shadcn-generated primitive file (`components/ui/popover.tsx`), and the npm dependency `@radix-ui/react-popover` added to `package.json` / `pnpm-lock.yaml`.
</objective>

<execution_context>
@/home/aluno/Downloads/isn20261/.claude/get-shit-done/workflows/execute-plan.md
@/home/aluno/Downloads/isn20261/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/04-auth-ui/04-CONTEXT.md
@.planning/phases/04-auth-ui/04-UI-SPEC.md
@.planning/phases/04-auth-ui/04-PATTERNS.md
@CLAUDE.md
@frontend/web/AGENTS.md
@frontend/web/lib/utils.ts
@frontend/web/components.json

<interfaces>
<!-- The exact public surface lib/api/auth.ts must export. Downstream plans (03, 04) import from these names. -->

```ts
// lib/api/auth.ts — public surface
export const MOCK_LATENCY_MS: readonly [number, number]; // [400, 700] (D-03)
export const SESSION_KEY: 'recommend-a.session';
export const USERS_KEY: 'recommend-a.users';

export type Session = {
  AccessToken: string;        // mock UUID via crypto.randomUUID()
  IdToken: string;            // mock UUID
  RefreshToken: string;       // mock UUID
  ExpiresAt: number;          // Date.now() + 3_600_000
  user: { email: string; sub: string };
};

export class UsernameExistsException extends Error {
  name: 'UsernameExistsException';
}
export class NotAuthorizedException extends Error {
  name: 'NotAuthorizedException';
}

export function signIn(input: { email: string; password: string }): Promise<Session>;
export function signUp(input: { email: string; password: string }): Promise<Session>;
export function signOut(): void;
export function getSession(): Session | null;
```

```ts
// components/ui/popover.tsx — shadcn-generated re-exports
export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor } from '...';
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Create typed Cognito-shaped mock auth seam at lib/api/auth.ts (D-02..D-04, AUTH-04, AUTH-05)</name>
  <files>frontend/web/lib/api/auth.ts</files>
  <read_first>
    - frontend/web/lib/api/auth.ts (will be new — confirm currently empty / .gitkeep only)
    - frontend/web/lib/utils.ts (analog: export style + named function exports + zero side effects on import)
    - frontend/web/components/Sidebar.tsx lines 29-43 (analog: `type` aliases + `as const` constants pattern)
    - frontend/web/components/BrandMark.tsx lines 1-13 (analog: doc-comment file-header style)
    - .planning/phases/04-auth-ui/04-CONTEXT.md §"Implementation Decisions" D-02..D-04 (verbatim shape spec)
    - .planning/phases/04-auth-ui/04-UI-SPEC.md §"Component Inventory" row "lib/api/auth.ts" (public surface contract)
    - .planning/phases/04-auth-ui/04-PATTERNS.md §"frontend/web/lib/api/auth.ts" (export-style + doc-comment + as const + type alias + Cognito-shaped error class patterns, with byte-exact code)
  </read_first>
  <action>
Create `frontend/web/lib/api/auth.ts` with the FULL public surface specified below. This is a typed mock seam — the real Cognito SDK will replace it in v2 (INTG-01..04). Plain-text password storage is acceptable per CONTEXT D-02 because this is a mock, not a security boundary; document this in the file-header doc-comment.

**Module structure (in this order):**

1. **File-header doc-comment** (verbatim shape from PATTERNS §"frontend/web/lib/api/auth.ts"):
```ts
/**
 * Phase 4 (AUTH-04, AUTH-05, issue #93) — typed mock auth seam.
 *
 * Cognito-shaped surface that the real Cognito SDK will replace in v2 (INTG-01..04).
 * Persists registered users in `recommend-a.users` localStorage key (CONTEXT D-02);
 * persists the active session in `recommend-a.session` (CONTEXT D-04).
 * Throws Cognito-shaped error names: UsernameExistsException, NotAuthorizedException.
 *
 * Module is import-safe (no top-level localStorage access — every read/write happens
 * inside an exported function). Tests may override MOCK_LATENCY_MS to [0, 0] (D-03).
 *
 * Plain-text password storage in `recommend-a.users` is acceptable for this mock
 * (D-02): the real Cognito SDK in v2 will hold passwords server-side. This module
 * is the swap point — INTG-01 replaces these four exported functions one-for-one.
 */
```

2. **Module constants** (use `as const` per the `Sidebar.tsx` `NAV_ITEMS` pattern):
```ts
export const MOCK_LATENCY_MS = [400, 700] as const;
export const SESSION_KEY = 'recommend-a.session' as const;
export const USERS_KEY = 'recommend-a.users' as const;

const ONE_HOUR_MS = 3_600_000;
```

3. **Type aliases** (use `type` not `interface` — matches every existing project file):
```ts
export type Session = {
  AccessToken: string;
  IdToken: string;
  RefreshToken: string;
  ExpiresAt: number;
  user: { email: string; sub: string };
};

type Credentials = { email: string; password: string };

type UsersMap = Record<string, { password: string; sub: string }>;
```

4. **Cognito-shaped error subclasses** (the `name` field is the load-bearing identifier — UI-SPEC verification hook #11 greps for these exact strings):
```ts
export class UsernameExistsException extends Error {
  override name = 'UsernameExistsException' as const;
}

export class NotAuthorizedException extends Error {
  override name = 'NotAuthorizedException' as const;
}
```
Construct messages explicitly when throwing (see signIn / signUp below) — do not rely on the default Error message.

5. **Internal helpers** (no exports — all import-safe):
```ts
function delay(): Promise<void> {
  const [min, max] = MOCK_LATENCY_MS;
  if (max <= 0) return Promise.resolve();
  const ms = Math.floor(min + Math.random() * (max - min));
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readUsers(): UsersMap {
  if (typeof window === 'undefined') return {};
  const raw = window.localStorage.getItem(USERS_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    // Defensive: reject non-object shapes (prototype-pollution / corruption guard)
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as UsersMap;
  } catch {
    return {};
  }
}

function writeUsers(users: UsersMap): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function issueSession(email: string, sub: string): Session {
  return {
    AccessToken: crypto.randomUUID(),
    IdToken: crypto.randomUUID(),
    RefreshToken: crypto.randomUUID(),
    ExpiresAt: Date.now() + ONE_HOUR_MS,
    user: { email, sub },
  };
}

function writeSession(session: Session): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}
```
The `Object.prototype.hasOwnProperty.call(...)` check below in signIn / signUp guards against prototype-pollution from a corrupted `recommend-a.users` blob (the `JSON.parse` defensive shape check above is the first line of defence).

6. **Exported functions** (D-02..D-04 verbatim behavior):

```ts
export async function signUp({ email, password }: Credentials): Promise<Session> {
  await delay();
  const users = readUsers();
  if (Object.prototype.hasOwnProperty.call(users, email)) {
    throw new UsernameExistsException('An account with the given email already exists.');
  }
  const sub = crypto.randomUUID();
  users[email] = { password, sub };
  writeUsers(users);
  const session = issueSession(email, sub);
  writeSession(session);
  return session;
}

export async function signIn({ email, password }: Credentials): Promise<Session> {
  await delay();
  const users = readUsers();
  // Same error for unknown email AND wrong password — avoids user enumeration (D-02).
  const record = Object.prototype.hasOwnProperty.call(users, email) ? users[email] : undefined;
  if (!record || record.password !== password) {
    throw new NotAuthorizedException('Incorrect email or password.');
  }
  const session = issueSession(email, record.sub);
  writeSession(session);
  return session;
}

export function signOut(): void {
  if (typeof window === 'undefined') return;
  // Removes session ONLY — recommend-a.users persists so a demo user can sign back in (D-04).
  window.localStorage.removeItem(SESSION_KEY);
}

export function getSession(): Session | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed as Session;
  } catch {
    return null;
  }
}
```

**Key constraints:**
- ZERO top-level side effects — no `localStorage` access at module-load time (so RSC tree-shaking and tests can `import` without a window).
- The `typeof window === 'undefined'` guards are mandatory; this module may be imported by Server Components transitively, and any top-level localStorage access would crash SSR.
- Use `crypto.randomUUID()` directly (Node 20+ and all modern browsers expose it on `globalThis.crypto`; no import needed).
- The `Object.prototype.hasOwnProperty.call(users, email)` pattern is intentional — `users[email]` alone would resolve `__proto__` against the prototype chain (XSS / prototype-pollution surface; threat T-04-02 in the threat model).
- The plain-text password storage is the documented accepted mock-risk (threat T-04-03). Do NOT add hashing — that would diverge from the real Cognito SDK swap point and add work the v2 swap will discard.
- No external imports needed (`crypto.randomUUID()` is a global in Node 20+ / browsers).

This file is import-safe for both Server and Client components. Page-level submit handlers (Plan 03) and the AccountMenu (Plan 04) consume the four exported functions; they MUST NOT reach into localStorage directly (UI-SPEC verification hook #4 enforces single-source key strings).
  </action>
  <verify>
    <automated>cd frontend/web && pnpm tsc --noEmit && pnpm lint</automated>
    Plus the following grep checks (each must pass):
    - `grep -c "export class UsernameExistsException" frontend/web/lib/api/auth.ts` returns ≥ 1
    - `grep -c "export class NotAuthorizedException" frontend/web/lib/api/auth.ts` returns ≥ 1
    - `grep -c "'recommend-a.session'" frontend/web/lib/api/auth.ts` returns ≥ 1
    - `grep -c "'recommend-a.users'" frontend/web/lib/api/auth.ts` returns ≥ 1
    - `grep -c "MOCK_LATENCY_MS = \[400, 700\]" frontend/web/lib/api/auth.ts` returns ≥ 1
    - `grep -c "crypto.randomUUID()" frontend/web/lib/api/auth.ts` returns ≥ 4 (AccessToken + IdToken + RefreshToken + sub)
    - `grep -c "AccessToken" frontend/web/lib/api/auth.ts` returns ≥ 2 (type + issueSession assignment)
    - `grep -c "ExpiresAt" frontend/web/lib/api/auth.ts` returns ≥ 2
    - `grep -c "Date.now() + 3_600_000\|Date.now() + ONE_HOUR_MS" frontend/web/lib/api/auth.ts` returns ≥ 1
    - `grep -c "typeof window === 'undefined'" frontend/web/lib/api/auth.ts` returns ≥ 4 (one per exported function that touches storage)
    - `grep -c "Object.prototype.hasOwnProperty.call" frontend/web/lib/api/auth.ts` returns ≥ 2 (signIn + signUp prototype-pollution guard)
  </verify>
  <acceptance_criteria>
    - File `frontend/web/lib/api/auth.ts` exists.
    - File begins with `/**` doc-comment header (no `"use client"` directive — this is a TS module, not a React component).
    - Exports the four function names verbatim: `signIn`, `signUp`, `signOut`, `getSession`.
    - Exports the three constants verbatim: `MOCK_LATENCY_MS`, `SESSION_KEY`, `USERS_KEY`.
    - Exports the two error classes verbatim with `name` property set to the matching string literal.
    - Exports the `Session` type with all five fields: `AccessToken`, `IdToken`, `RefreshToken`, `ExpiresAt`, `user`.
    - `signUp` throws `UsernameExistsException` on duplicate email; on success writes BOTH `recommend-a.users` (registration map) AND `recommend-a.session` (active session).
    - `signIn` throws `NotAuthorizedException` for unknown email OR wrong password (same exception, same message).
    - `signOut` removes ONLY `recommend-a.session` from localStorage (does NOT clear `recommend-a.users`).
    - `getSession` returns `Session | null`, defensively handles parse failures.
    - All localStorage access is gated by `typeof window === 'undefined'` guards.
    - Module has zero top-level side effects (verifiable by `node -e "require('...')"` not crashing in a non-browser context — but since this is a `.ts` file, the proxy is `pnpm tsc --noEmit` succeeding without a `window`-related diagnostic).
    - `pnpm tsc --noEmit` exits 0.
    - `pnpm lint` exits 0.
  </acceptance_criteria>
  <done>
    Module is implemented per the action body, all verifications pass, file is staged for commit. Page-level handlers in Plan 03 and AccountMenu in Plan 04 can now `import { signIn, signUp, signOut } from "@/lib/api/auth"` against the contract specified in `<interfaces>` above.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Scaffold shadcn Popover primitive at components/ui/popover.tsx (D-07, AUTH-06 dependency)</name>
  <files>
    frontend/web/components/ui/popover.tsx
    frontend/web/package.json
    frontend/web/pnpm-lock.yaml
  </files>
  <read_first>
    - frontend/web/components.json (confirms shadcn config: style "base-nova", aliases, iconLibrary lucide)
    - frontend/web/package.json (confirms current dependencies before shadcn add — to spot-check the diff)
    - frontend/web/components/ui/.gitkeep (or empty — confirms components/ui/ has no prior occupant)
    - .planning/phases/04-auth-ui/04-CONTEXT.md §"D-07 First shadcn primitive" (rationale + command)
    - .planning/phases/04-auth-ui/04-UI-SPEC.md §"Registry Safety" (block: official shadcn `popover` only, no third-party registries)
    - .planning/phases/04-auth-ui/04-PATTERNS.md §"frontend/web/components/ui/popover.tsx" (generation command + do-not-modify rule)
  </read_first>
  <action>
Run the shadcn CLI to scaffold the Popover primitive into `components/ui/popover.tsx`. This is the FIRST primitive in `components/ui/`. The generated file is owned by the shadcn CLI — DO NOT edit it manually after generation. Token-purity is achieved at the consumer (AccountMenu in Plan 04) via `className` overrides on `<PopoverContent>`, not by editing the primitive.

**Step 1 — Run the generator from `frontend/web/`:**
```bash
cd frontend/web && pnpm dlx shadcn@latest add popover
```

If the CLI prompts about overwriting (it shouldn't — `components/ui/popover.tsx` does not exist yet), accept defaults. The CLI will:
- Install `@radix-ui/react-popover` as a dependency in `package.json` and update `pnpm-lock.yaml`.
- Generate `components/ui/popover.tsx` with named exports `Popover`, `PopoverTrigger`, `PopoverContent`, `PopoverAnchor`.

**Step 2 — Verify the generated file is unmodified shadcn output.** Open `frontend/web/components/ui/popover.tsx` and confirm:
- Top of file uses `"use client"` (Radix is a client primitive — shadcn always emits this).
- Imports from `@radix-ui/react-popover` and `@/lib/utils` (the `cn` helper).
- Exports include at minimum `Popover`, `PopoverTrigger`, `PopoverContent`.
- File contains the standard shadcn-supplied `PopoverContent` className (something like `z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out ...`). This default className references `bg-popover` / `text-popover-foreground` which may not exist in our `@theme` block — this is FINE because Plan 04's AccountMenu passes its own `className` to `<PopoverContent>` (using `bg-surface-elevated border-border rounded-md shadow-lg`), and Tailwind's `cn` merge resolves the override.

**Step 3 — DO NOT modify the generated file.** If the CLI emitted any token references that don't exist in our theme (e.g. `bg-popover`), leave them — they are inert when overridden via the consumer's `className` prop. UI-SPEC §"Component Inventory" row for popover.tsx is explicit on this point.

**Step 4 — Confirm the dependency landed in lockfile.** Spot-check `frontend/web/package.json` `dependencies` includes `@radix-ui/react-popover` with a version constraint. Spot-check `frontend/web/pnpm-lock.yaml` contains a corresponding entry.

**Step 5 — Run `pnpm install`** if the CLI did not auto-install (it usually does, but be defensive):
```bash
cd frontend/web && pnpm install
```

**Step 6 — Run typecheck and lint** to confirm the generated file integrates cleanly with the existing tsconfig + ESLint:
```bash
cd frontend/web && pnpm tsc --noEmit && pnpm lint
```
Both must exit 0. If lint emits warnings on the generated file (shadcn output sometimes uses double-quotes vs the project's preference, or has slightly different formatting), DO NOT modify the generated file to satisfy lint. Instead, if lint blocks the commit, add a one-line ESLint or Prettier ignore comment at the top of the generated file scoped to the offending rule. (Expected outcome: no warnings — this codebase already accepts shadcn-generated formatting from Phase 1.)
  </action>
  <verify>
    <automated>cd frontend/web && pnpm tsc --noEmit && pnpm lint</automated>
    Plus the following file/dependency checks:
    - `test -f frontend/web/components/ui/popover.tsx` (file exists)
    - `grep -c "PopoverTrigger" frontend/web/components/ui/popover.tsx` returns ≥ 2 (import + export)
    - `grep -c "PopoverContent" frontend/web/components/ui/popover.tsx` returns ≥ 2
    - `grep -c "@radix-ui/react-popover" frontend/web/components/ui/popover.tsx` returns ≥ 1
    - `grep -c "@radix-ui/react-popover" frontend/web/package.json` returns ≥ 1
    - `grep -c "@radix-ui/react-popover" frontend/web/pnpm-lock.yaml` returns ≥ 1
  </verify>
  <acceptance_criteria>
    - File `frontend/web/components/ui/popover.tsx` exists.
    - File starts with `"use client"` directive (shadcn-generated).
    - File exports `Popover`, `PopoverTrigger`, and `PopoverContent` (named exports).
    - File imports from `@radix-ui/react-popover`.
    - `frontend/web/package.json` has `@radix-ui/react-popover` listed under `dependencies` (any version constraint shadcn picks is fine).
    - `frontend/web/pnpm-lock.yaml` is updated and committed alongside `package.json`.
    - The generated `components/ui/popover.tsx` is byte-identical to the shadcn CLI output (no manual edits — verified by inspection).
    - `cd frontend/web && pnpm tsc --noEmit` exits 0.
    - `cd frontend/web && pnpm lint` exits 0.
  </acceptance_criteria>
  <done>
    Popover primitive is generated and committed; `@radix-ui/react-popover` is in the lockfile; downstream Plan 04 (AccountMenu) can `import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"`.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser → window.localStorage | Untrusted browser-extension or DOM injection could read/write `recommend-a.session` and `recommend-a.users`. Mock-only — not a real auth boundary. |
| TS module → JSON.parse(localStorage value) | Corrupted or attacker-supplied JSON could trigger prototype pollution if naively spread. |
| transitive npm dependency (@radix-ui/react-popover) | Supply-chain risk — pinned via pnpm-lock.yaml. |

## STRIDE Threat Register (ASVS L1 — `security_enforcement: true`, block on `high`)

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-04-01 | Information disclosure | `recommend-a.users` localStorage value | high (in production) → **accept (mock)** | accept | Plain-text password storage is acceptable per CONTEXT D-02 because this is a typed mock seam, not a security boundary. The real Cognito SDK in v2 (INTG-01) holds passwords server-side and never persists them client-side. The file-header doc-comment in `lib/api/auth.ts` documents the gap explicitly so it does not hide in v2. v2 SUMMARY checklist item: confirm `recommend-a.users` localStorage key is removed when INTG-01 swaps the seam. |
| T-04-02 | Tampering | `recommend-a.users` JSON.parse → users[email] resolution | medium → **mitigate** | mitigate | Use `Object.prototype.hasOwnProperty.call(users, email)` in `signIn` and `signUp` instead of `users[email]` directly. Reject non-plain-object parse results (`null`, arrays, primitives) before treating them as a UsersMap. Both guards are mandatory in Task 1. |
| T-04-03 | Denial of service | Corrupted localStorage value (manual edit, browser extension) | low → **mitigate** | mitigate | Wrap `JSON.parse` in try/catch in both `readUsers()` and `getSession()`; on failure return empty map / null so the UI degrades gracefully (signed-out + empty registration map) instead of crashing. |
| T-04-04 | Repudiation | Mock session has no audit trail | n/a (mock) → **accept** | accept | Mock seam — INTG-01..04 introduces real Cognito audit logs in v2. Out of scope for Phase 4. |
| T-04-05 | Information disclosure | `getSession()` SSR call could leak session into a Server Component render | medium → **mitigate** | mitigate | Every exported function gates localStorage access with `typeof window === 'undefined'` guard; `getSession()` returns `null` on the server. No Phase 4 page calls `getSession()` from a Server Component (login/register are Client; forgot stub is Server but does not call `getSession`); Plan 03 verification hook ensures this. |
| T-04-06 | Elevation of privilege | npm supply-chain — `@radix-ui/react-popover` transitive deps | low → **accept** | accept | shadcn registry is the project's vetted source (per CONTEXT D-07 + UI-SPEC §"Registry Safety"). `pnpm-lock.yaml` pins exact versions. No third-party registries declared. |
| T-04-07 | Tampering | shadcn-generated popover.tsx defaults reference tokens (`bg-popover`) not in `@theme` | low → **accept** | accept | Defaults are inert because AccountMenu (Plan 04) passes a full `className` override on every `<PopoverContent>` invocation. No editing of the generated file (per UI-SPEC §"Component Inventory"). |
</threat_model>

<verification>
After both tasks ship:
- `cd frontend/web && pnpm tsc --noEmit && pnpm lint && pnpm build` all exit 0.
- `git grep -nE "from .[\"']@/lib/api/auth" frontend/web/` returns 0 hits BEFORE Plan 03/04 land — this plan does not create consumers, only the contract.
- `node -e "console.log(require('@radix-ui/react-popover').version || 'present')"` from `frontend/web/` confirms the dependency resolves.
</verification>

<success_criteria>
1. `lib/api/auth.ts` exists and exports the full surface listed in `<interfaces>`. AUTH-04 (Cognito-shaped seam) and AUTH-05 (token storage in localStorage) requirements have a concrete artifact.
2. `components/ui/popover.tsx` exists, is unmodified shadcn output, and `@radix-ui/react-popover` is in the lockfile.
3. `pnpm tsc --noEmit && pnpm lint` from `frontend/web/` exit 0.
4. No UI surface changes (no pages, no components reference these files yet — Plan 03 / Plan 04 will).
</success_criteria>

<output>
After completion, create `.planning/phases/04-auth-ui/04-01-SUMMARY.md` documenting:
- The exact file paths created.
- The `@radix-ui/react-popover` version pinned in pnpm-lock.yaml.
- Any deviations from the action (none expected).
- Confirmation that downstream plans (03, 04) can now import from `@/lib/api/auth` and `@/components/ui/popover`.
</output>
