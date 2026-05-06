---
phase: 04
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/web/components/Field.tsx
autonomous: true
requirements: [AUTH-03]
must_haves:
  truths:
    - "Field renders a labelled input with floating-label that lifts on focus or when input has content"
    - "Field shows an inline error in text-danger / border-danger when error prop is set; falls back to text-text-muted hint when only hint is set"
    - "Field with type='password' shows a working show/hide eye toggle that swaps Eye ↔ EyeOff and toggles input type between 'password' and 'text'"
    - "Every Field input has a programmatic <label htmlFor> association via useId()"
  artifacts:
    - path: "frontend/web/components/Field.tsx"
      provides: "Reusable form input primitive (D-08)"
      contains: "export function Field"
      min_lines: 60
  key_links:
    - from: "frontend/web/components/Field.tsx"
      to: "@/lib/utils"
      via: "cn() helper for conditional className"
      pattern: "import \\{ cn \\}"
    - from: "frontend/web/components/Field.tsx"
      to: "lucide-react"
      via: "Eye / EyeOff icons"
      pattern: "from .lucide-react."
---

<objective>
Build the reusable `<Field>` Client Component that all three auth pages (login, register, forgot stub) consume. Implements the floating-label visual from `_design-reference/auth.jsx:38-69` re-authored fresh per CLAUDE.md hard rule #2 (no JSX import from `_design-reference/`).

Purpose: AUTH-03 (client-side validation with inline error messaging) needs a single component that owns both the input visual and the error/hint slot. Centralizing this in `<Field>` means Plan 03 (login/register pages) does not need to re-implement input geometry, focus states, or error treatment per page.

Output: One Client Component file at `components/Field.tsx` with the exact `FieldProps` type from CONTEXT D-08, plus floating-label CSS, show/hide password toggle, and tokenized error/hint rendering.
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
@frontend/web/components/Sidebar.tsx
@frontend/web/lib/utils.ts

<interfaces>
<!-- Public surface that Plan 03 imports from. Component is the single source of input visuals across the auth pages. -->

```tsx
// components/Field.tsx — public surface
type FieldProps = {
  label: string;
  type?: 'text' | 'email' | 'password';
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  name?: string;
  autoComplete?: string;
  disabled?: boolean;
};

export function Field(props: FieldProps): JSX.Element;
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Author Field.tsx Client Component with floating label, show/hide toggle, and tokenized error/hint slot (D-08, AUTH-03)</name>
  <files>frontend/web/components/Field.tsx</files>
  <read_first>
    - frontend/web/components/Field.tsx (will be new — confirm currently absent)
    - frontend/web/components/Sidebar.tsx (analog: Client Component, "use client" placement, doc-comment style, lucide imports, cn() conditional className pattern, focus-ring pattern, type Props alias)
    - frontend/web/lib/utils.ts (the cn() helper this component imports)
    - frontend/_design-reference/auth.jsx lines 38-69 (visual source of truth — read for floating-label geometry, gap-6, error/hint typography 11px, eye toggle position; do NOT import per CLAUDE.md hard rule #2)
    - frontend/_design-reference/styles.css lines 152-184 (.input geometry: height 48, padding 18px 14px 6px, font-size 14, border-radius var(--r-md); .input-label floating CSS; .input.error border-color)
    - .planning/phases/04-auth-ui/04-CONTEXT.md §"D-08 Reusable Field" (full props signature + visual contract verbatim)
    - .planning/phases/04-auth-ui/04-UI-SPEC.md §"Component Inventory — <Field>" (floating-label Tailwind sibling pattern with peer/peer-placeholder-shown utilities); §"Spacing Scale" (pt-[18px], top-[14px] arbitrary values); §"Typography" (text-[10px] / text-[13px] for label states); §"Color" (border-border / border-danger / focus:border-accent / bg-surface / focus:bg-surface-elevated)
    - .planning/phases/04-auth-ui/04-PATTERNS.md §"frontend/web/components/Field.tsx" (byte-exact code excerpts: useId pattern, useState toggle, cn conditional, full floating-label className strings, error/hint slot)
    - frontend/web/AGENTS.md (DSGN-06 author rule: only Tailwind theme variables; no inline style; documented escape hatches require // non-tokenized: comments)
  </read_first>
  <action>
Create `frontend/web/components/Field.tsx`. This is a Client Component (`"use client"` directive at byte 0) implementing the floating-label input pattern from the design reference, re-authored fresh from `_design-reference/auth.jsx:38-69` per CLAUDE.md hard rule #2 (NEVER import from `_design-reference/`).

**File structure (in this exact order):**

1. **`"use client"` directive** at byte 0 (matches `Sidebar.tsx:1`):
```tsx
"use client";
```

2. **File-header doc-comment** documenting the DSGN-06 escape hatches (mandatory — every arbitrary value below has a `// non-tokenized: ...` comment per AGENTS.md):
```tsx
/**
 * Phase 4 (AUTH-03, issue #93) — reusable form input with floating label.
 *
 * Re-authored fresh from frontend/_design-reference/auth.jsx:38-69 per CLAUDE.md
 * hard rule #2 (no JSX import from _design-reference/).
 *
 * Used by app/(auth)/login/page.tsx and app/(auth)/register/page.tsx as the
 * single source of input visuals (UI-SPEC verification hook #5: pages may not
 * use raw <input type="email|password"> — they must go through <Field>).
 *
 * DSGN-06 escape hatches (all confined to this file — see UI-SPEC §"Spacing
 * exceptions" and §"Typography"):
 *   - pt-[18px]              : input top inset (floating-label geometry anchor — reference styles.css:157)
 *   - top-[14px] / top-1.5   : resting / lifted label position (reference styles.css:171, 179)
 *   - text-[10px]            : lifted label size (below Phase 2 type scale; second occurrence in codebase)
 *   - text-[13px]            : resting label size (between text-12 and text-14)
 *   - tracking-[0.06em]      : lifted label letter-spacing (reference styles.css:181)
 */
```

3. **Imports** (matches `Sidebar.tsx:23-27` import-shape):
```tsx
import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
```

4. **Prop-type alias** (verbatim from CONTEXT D-08; use `type` not `interface` per project convention):
```tsx
type FieldProps = {
  label: string;
  type?: 'text' | 'email' | 'password';
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  name?: string;
  autoComplete?: string;
  disabled?: boolean;
};
```

5. **Named function export** (NOT default — `app/` files default-export, `components/` files named-export):
```tsx
export function Field({
  label,
  type = 'text',
  value,
  onChange,
  error,
  hint,
  name,
  autoComplete,
  disabled,
}: FieldProps) {
  const reactId = useId();
  const inputId = `${reactId}-input`;
  const msgId = `${reactId}-msg`;

  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword && show ? 'text' : type;

  const message = error ?? hint;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative">
        <input
          id={inputId}
          name={name}
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          autoComplete={autoComplete}
          placeholder=" "
          aria-describedby={message ? msgId : undefined}
          aria-invalid={error ? true : undefined}
          /* non-tokenized: pt-[18px] is the input top inset for the floating-label geometry — reference styles.css:157. */
          className={cn(
            "peer w-full h-12 px-3.5 pt-[18px] pb-1.5 bg-surface text-text-primary text-14 leading-none rounded-md border outline-none transition-colors duration-150 focus:bg-surface-elevated focus:border-accent disabled:cursor-not-allowed",
            error ? "border-danger" : "border-border"
          )}
        />
        <label
          htmlFor={inputId}
          /* non-tokenized: top-[14px] resting / top-1.5 lifted; text-[13px] resting / text-[10px] lifted; tracking-[0.06em] lifted — reference styles.css:171-183 */
          className="pointer-events-none absolute left-3.5 top-[14px] text-[13px] font-normal text-text-muted leading-none transition-all duration-150 peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-medium peer-focus:tracking-[0.06em] peer-focus:uppercase peer-focus:text-text-secondary peer-[&:not(:placeholder-shown)]:top-1.5 peer-[&:not(:placeholder-shown)]:text-[10px] peer-[&:not(:placeholder-shown)]:font-medium peer-[&:not(:placeholder-shown)]:tracking-[0.06em] peer-[&:not(:placeholder-shown)]:uppercase peer-[&:not(:placeholder-shown)]:text-text-secondary"
        >
          {label}
        </label>
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-sm"
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {message && (
        <p
          id={msgId}
          aria-live="polite"
          className={cn(
            "text-12 leading-tight",
            error ? "text-danger" : "text-text-muted"
          )}
        >
          {message}
        </p>
      )}
    </div>
  );
}
```

**Critical implementation notes:**

- **`placeholder=" "` (single literal space)**: required for the `:placeholder-shown` CSS selector to work without rendering a visible placeholder. UI-SPEC §"Component Inventory — <Field>" is explicit on this.
- **Floating-label CSS uses Tailwind peer/sibling utilities, NOT inline `style={{ }}`**: the design reference uses `:not(:placeholder-shown)` cascade in plain CSS. Tailwind v4 expresses this via `peer-[&:not(:placeholder-shown)]:` arbitrary variant — NOT as inline style. UI-SPEC verification hook #2 forbids `style={{` in Phase 4 files.
- **`useId()` is mandatory**: UI-SPEC verification hook #13 greps for `useId()` in `Field.tsx`. The pattern `const reactId = useId(); const inputId = \`${reactId}-input\`;` is the load-bearing accessibility contract — every input gets a programmatic label association.
- **Error wins**: when both `error` and `hint` are provided, error wins (D-08). Implemented via `const message = error ?? hint` — the message slot renders error if set, else hint if set, else nothing. Color picks via `cn()` conditional: `text-danger` if `error`, else `text-text-muted`.
- **Show/hide eye button**: only renders when `type === 'password'`. Toggle is a `<button type="button">` (NOT `<input>`, NOT a `<Link>`) because it triggers an action (toggle internal `show` state) without submitting the form. `aria-label` swaps based on current state per UI-SPEC §"Accessibility minimums".
- **Disabled state**: forwarded to the `<input>` via the HTML `disabled` attribute. Visual: `cursor-not-allowed` (per UI-SPEC §"Empty / loading / disabled states" — no greyed-out wash because the brief 400-700ms latency does not warrant a heavier state visual).
- **No hex colors, no inline px font-sizes outside the documented `text-[10px]` / `text-[13px]` / `pt-[18px]` / `top-[14px]` / `tracking-[0.06em]` escape hatches**, each of which has its `// non-tokenized: ...` comment per AGENTS.md.
- **No default export** — match every existing component file in the project (`Sidebar.tsx`, `Navbar.tsx`, `BrandMark.tsx`, etc. all use named `export function`).
  </action>
  <verify>
    <automated>cd frontend/web && pnpm tsc --noEmit && pnpm lint</automated>
    Plus the following grep checks (each must pass):
    - `head -c 12 frontend/web/components/Field.tsx` starts with `"use client";`
    - `grep -c "export function Field" frontend/web/components/Field.tsx` returns ≥ 1
    - `grep -c "useId()" frontend/web/components/Field.tsx` returns ≥ 1 (UI-SPEC hook #13)
    - `grep -c "useState" frontend/web/components/Field.tsx` returns ≥ 1
    - `grep -c "from \"lucide-react\"" frontend/web/components/Field.tsx` returns ≥ 1
    - `grep -c "Eye\|EyeOff" frontend/web/components/Field.tsx` returns ≥ 4 (import + 2 conditional renders + button label conditions)
    - `grep -c 'placeholder=" "' frontend/web/components/Field.tsx` returns ≥ 1 (single literal space)
    - `grep -c "border-danger" frontend/web/components/Field.tsx` returns ≥ 1
    - `grep -c "border-border" frontend/web/components/Field.tsx` returns ≥ 1
    - `grep -c "text-danger" frontend/web/components/Field.tsx` returns ≥ 1
    - `grep -c "text-text-muted" frontend/web/components/Field.tsx` returns ≥ 1
    - `grep -c "focus:border-accent" frontend/web/components/Field.tsx` returns ≥ 1
    - `grep -c "peer-\[&:not(:placeholder-shown)\]" frontend/web/components/Field.tsx` returns ≥ 1 (floating-label sibling selector)
    - `grep -c "aria-invalid" frontend/web/components/Field.tsx` returns ≥ 1
    - `grep -c "aria-describedby" frontend/web/components/Field.tsx` returns ≥ 1
    - `grep -c "aria-live" frontend/web/components/Field.tsx` returns ≥ 1
    - `grep -E "className=.*#[0-9a-fA-F]{3,6}" frontend/web/components/Field.tsx` returns 0 hits (no hex literals — DSGN-06)
    - `grep -E "style=\\{" frontend/web/components/Field.tsx` returns 0 hits (no inline style — UI-SPEC hook #2)
    - `grep -c "non-tokenized:" frontend/web/components/Field.tsx` returns ≥ 2 (escape-hatch comments)
  </verify>
  <acceptance_criteria>
    - File `frontend/web/components/Field.tsx` exists, byte 0 is `"use client";`.
    - File-header doc-comment lists every DSGN-06 escape hatch used (`pt-[18px]`, `top-[14px]`, `text-[10px]`, `text-[13px]`, `tracking-[0.06em]`).
    - Imports `useId` and `useState` from react, `Eye` and `EyeOff` from lucide-react, `cn` from `@/lib/utils`. No other imports.
    - Exports a NAMED function `Field` (not default).
    - `FieldProps` type matches CONTEXT D-08 exactly: `label`, optional `type` constrained to `'text' | 'email' | 'password'`, `value`, `onChange`, optional `error`, `hint`, `name`, `autoComplete`, `disabled`.
    - Input has `placeholder=" "` (single literal space) — verified by `grep`.
    - Input className uses `cn()` to switch between `border-border` (default) and `border-danger` (when `error` set).
    - Input on focus: `focus:border-accent` and `focus:bg-surface-elevated` — verified.
    - Floating label uses `peer-[&:not(:placeholder-shown)]` sibling selector for the lifted state — NOT inline style.
    - Show/hide eye toggle renders ONLY when `type === 'password'`; uses `<button type="button">`; swaps `Eye` ↔ `EyeOff` icons (size 16); aria-label swaps `"Show password"` ↔ `"Hide password"`.
    - Error/hint slot renders below input: `text-12 text-danger` when error set, `text-12 text-text-muted` when only hint set; nothing if neither set.
    - Error/hint paragraph has `aria-live="polite"` and `id={msgId}`; input has `aria-describedby={msgId}` and `aria-invalid` when error set.
    - File contains zero hex literals in className strings — `git grep -nE 'className=.*#[0-9a-fA-F]{3,6}' frontend/web/components/Field.tsx` returns 0 hits.
    - File contains zero `style={` props — `git grep -nE 'style=\\{' frontend/web/components/Field.tsx` returns 0 hits.
    - Every arbitrary Tailwind value (`pt-[18px]`, `top-[14px]`, `text-[10px]`, `text-[13px]`, `tracking-[0.06em]`) has a `// non-tokenized: ...` comment near the className it appears in.
    - `cd frontend/web && pnpm tsc --noEmit` exits 0.
    - `cd frontend/web && pnpm lint` exits 0.
  </acceptance_criteria>
  <done>
    `<Field>` is implemented per the action body, all verifications pass, file is staged for commit. Plan 03 (login + register pages) can now `import { Field } from "@/components/Field"` against the contract specified in `<interfaces>` above.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| user keystrokes → Field input value | Untrusted text could attempt XSS via reflected error / hint string in the message slot. |
| `aria-describedby` ↔ `id` linkage | A duplicate id collision could break screen-reader announcements (low severity). |

## STRIDE Threat Register (ASVS L1)

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-04-08 | Tampering | `error` / `hint` props rendered into the message `<p>` | low → **mitigate** | mitigate | React's default JSX text rendering escapes string interpolation — no `dangerouslySetInnerHTML` is used or permitted in this component. The `<p>` body uses `{message}` (text-node interpolation), not `{ __html: message }`. UI-SPEC and CLAUDE.md hard rule #2 forbid `dangerouslySetInnerHTML` Phase-wide. |
| T-04-09 | Information disclosure | `placeholder=" "` (single space) — could be misread by assistive tech | low → **accept** | accept | The `<label htmlFor={inputId}>` association via `useId()` is the primary accessible name; the placeholder is decorative geometry only. Screen readers announce the `<label>` text, not the placeholder. |
| T-04-10 | Tampering | `useId()` collision across multiple Field instances | low → **accept** | accept | React's `useId()` is collision-safe by design — each call site receives a unique deterministic id derived from the component tree position. No mitigation needed. |
| T-04-11 | Elevation of privilege | Show/hide toggle revealing password to a shoulder-surfer | low → **accept** | accept | This is intentional UX (the user opted in by clicking the eye toggle). The button has an explicit `aria-label` so the action is discoverable. |
</threat_model>

<verification>
After this plan ships:
- `cd frontend/web && pnpm tsc --noEmit && pnpm lint && pnpm build` all exit 0.
- `git grep -nE "from .[\"']@/components/Field" frontend/web/` returns 0 hits BEFORE Plan 03 lands — Field is unconsumed in this plan.
- Manual rendering check (deferred to Plan 05 verification): mount Field at `/tokens` ad-hoc or rely on Plan 03's login page to be the first consumer.
</verification>

<success_criteria>
1. `components/Field.tsx` exists and exports a `Field` function with the exact `FieldProps` from CONTEXT D-08.
2. Floating-label visual is implemented via Tailwind peer/sibling utilities (no inline `style`).
3. Show/hide toggle works for `type="password"`.
4. Error/hint slot uses `text-danger` / `text-text-muted` tokens.
5. `pnpm tsc --noEmit && pnpm lint` from `frontend/web/` exit 0.
6. Plan 03 can import `Field` and consume the typed props.
</success_criteria>

<output>
After completion, create `.planning/phases/04-auth-ui/04-02-SUMMARY.md` documenting:
- Final file path and line count of `components/Field.tsx`.
- The exact list of arbitrary Tailwind values used and their `// non-tokenized: ...` justifications.
- Confirmation that the floating-label was implemented with peer/sibling utilities (no inline style).
- Any deviations from the action.
</output>
