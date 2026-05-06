---
phase: 04
plan: 02
subsystem: auth
tags: [auth, field, floating-label, accessibility, dsgn-06, ui-component]
requirements: [AUTH-03]
dependency-graph:
  requires:
    - frontend/web/lib/utils.ts (cn helper)
    - frontend/web/styles/globals.css (Phase 2 theme tokens — bg-surface, border-border, text-danger, text-text-muted, focus:border-accent, etc.)
    - lucide-react (Eye / EyeOff icons — already a dep from Phase 3)
  provides:
    - frontend/web/components/Field.tsx (D-08 reusable form input primitive)
  affects:
    - downstream Plan 03 (login + register pages — every email/password input must go through <Field> per UI-SPEC verification hook #5)
tech-stack:
  added: []  # No new deps — useId/useState are React core; lucide-react / cn() were already available
  patterns:
    - "Tailwind v4 floating-label via peer + peer-[&:not(:placeholder-shown)] arbitrary variant (no inline style)"
    - "useId() for programmatic <label htmlFor> association (a11y contract)"
    - "Single-literal-space placeholder=\" \" to keep :placeholder-shown toggling without rendering visible text"
    - "Conditional className via cn() to swap border-border <-> border-danger and text-text-muted <-> text-danger"
    - "Show/hide eye toggle via useState that swaps input type between 'password' and 'text'"
key-files:
  created:
    - frontend/web/components/Field.tsx
  modified: []
decisions:
  - "Floating-label implemented with Tailwind peer/sibling utilities (no inline style) — UI-SPEC verification hook #2 satisfied"
  - "Five DSGN-06 escape hatches confined to this single file: pt-[18px] / top-[14px] / text-[10px] / text-[13px] / tracking-[0.06em]; each carries an inline // non-tokenized: comment per AGENTS.md"
  - "Named function export (export function Field) — matches every other components/* file convention; FieldProps is a `type` alias not `interface` per project convention"
  - "Show/hide toggle is a <button type='button'> sibling of the input (not a wrapping element) so tab order falls naturally after the password input and the toggle does not submit the form"
metrics:
  duration: ~5 min (resume of an interrupted run; the original draft was correct on first attempt)
  completed: 2026-05-06
---

# Phase 04 Plan 02: Field Component Summary

**One-liner:** Reusable Client Component `<Field>` (`frontend/web/components/Field.tsx`, 111 LOC) implementing the AUTH-03 floating-label form input — `useId()` label association, password show/hide eye toggle (Eye <-> EyeOff lucide swap with input-type swap), tokenized error/hint slot (`text-danger` / `text-text-muted` with error winning), zero inline `style`, zero hex literals — satisfying every UI-SPEC verification hook for the `<Field>` surface.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Author Field.tsx Client Component with floating label, show/hide toggle, and tokenized error/hint slot (D-08, AUTH-03) | `445f208` | `frontend/web/components/Field.tsx` |

## Public Surface (Plan 03 consumers can now import)

```ts
// from "@/components/Field"
import { Field } from "@/components/Field";

// Props (verbatim from CONTEXT D-08):
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

Behavior contract:
- Floating label sits at `top-[14px] text-[13px] text-text-muted` when input is empty and unfocused.
- On `:focus` OR when input has content (`:not(:placeholder-shown)`), label lifts to `top-1.5 text-[10px] uppercase tracking-[0.06em] text-text-secondary` over `transition-all duration-150`.
- Border swaps `border-border` (default) <-> `border-danger` (when `error` set); `:focus` border becomes `border-accent` and bg becomes `bg-surface-elevated`.
- When `type === 'password'`: a `<button type="button">` toggle renders absolutely positioned at `right-3 top-1/2 -translate-y-1/2`; click swaps internal `show` state which (a) flips icon `Eye` <-> `EyeOff` and (b) flips the rendered input `type` between `'password'` and `'text'`.
- Below the input: a `<p>` renders the message slot — `text-danger` if `error` is set, else `text-text-muted` if only `hint` is set, else nothing. The slot has `aria-live="polite"`; the input has `aria-describedby` pointing at it and `aria-invalid` when error is present.
- Every input has a programmatic `<label htmlFor>` association via `useId()` — the visible floating label IS the accessible name (no separate visually-hidden label needed).

## Verification

| Gate | Command | Result |
|------|---------|--------|
| Typecheck | `cd frontend/web && pnpm tsc --noEmit` | exit 0 |
| Lint | `cd frontend/web && pnpm lint` | exit 0 |
| Production build | `cd frontend/web && pnpm build` | exit 0 (5 static pages prerendered; Field is unconsumed by design until Plan 03 lands) |

Grep verification (against the action body's verify list):
- `head -c 12 frontend/web/components/Field.tsx` starts with `"use client";` ✓
- `grep -c "export function Field"` returns 1 ✓
- `grep -c "useId()"` returns 1 (UI-SPEC hook #13) ✓
- `grep -c "useState"` returns 1 ✓
- `grep -c 'from "lucide-react"'` returns 1 ✓
- `grep -c 'placeholder=" "'` returns 1 (single literal space) ✓
- `grep -c "border-danger"` returns 1; `grep -c "border-border"` returns 1 ✓
- `grep -c "text-danger"` returns 1; `grep -c "text-text-muted"` returns 2 (resting label + hint message) ✓
- `grep -c "focus:border-accent"` returns 1 ✓
- `grep -E "peer-\[&:not\(:placeholder-shown\)\]"` matches 6 occurrences in the floating-label `<label>` className ✓
- `grep -c "aria-invalid"` / `aria-describedby` / `aria-live` each return 1 ✓
- `grep -E 'className=.*#[0-9a-fA-F]{3,6}'` returns 0 hits (DSGN-06) ✓
- `grep -E 'style=\{'` returns 0 hits (UI-SPEC hook #2) ✓
- `grep -c "non-tokenized:"` returns 2 (escape-hatch comments — one on input, one on label) ✓

## DSGN-06 escape hatches used (full inventory, each commented inline)

| Arbitrary value | Where | Reference | Justification |
|-----------------|-------|-----------|---------------|
| `pt-[18px]` | input className (top inset) | `_design-reference/styles.css:157` `padding: 18px 14px 6px` | Floating-label geometry anchor. No Tailwind core scale step at 18px. |
| `top-[14px]` | label resting position | `_design-reference/styles.css:171` `top: 14px` | Resting-label top inset; no core scale step at 14px (closest steps are `top-3`=12px and `top-3.5`=14px — but the latter is named `top-3.5` not `top-14`; we use the bracketed form to keep grep-distinct from spacing). |
| `text-[10px]` | lifted label size | `_design-reference/styles.css:180` `font-size: 10px` | Below smallest Phase 2 token (`text-12`). Second occurrence in codebase (first was Phase 3 mobile tab label per UI-SPEC). |
| `text-[13px]` | resting label size | `_design-reference/styles.css:173` `font-size: 13` | Between `text-12` and `text-14`. Same arbitrary as the auth subtitle (Phase 4). |
| `tracking-[0.06em]` | lifted label letter-spacing | `_design-reference/styles.css:181` `letter-spacing: 0.06em` | Tailwind core has `tracking-wide` (0.025em) and `tracking-wider` (0.05em); neither matches the reference's exact 0.06em. |

All five values are confined to `components/Field.tsx`. Each has a `// non-tokenized: ...` comment near the className it appears in, per AGENTS.md DSGN-06.

## Floating-label implementation note

The reference CSS uses the cascade

```css
.input:not(:placeholder-shown) + .input-label,
.input:focus + .input-label { /* lifted */ }
```

Phase 4 expresses the same contract via Tailwind v4's peer + arbitrary-variant utilities:

```tsx
<input className="peer ..." placeholder=" " />
<label className="
  ... peer-focus:top-1.5 peer-focus:text-[10px]
  ... peer-[&:not(:placeholder-shown)]:top-1.5 peer-[&:not(:placeholder-shown)]:text-[10px]
">
```

The single literal-space `placeholder=" "` keeps `:placeholder-shown` true when the input is empty (so the label sits at rest) and false when the user has typed anything (so the label stays lifted on blur). No inline `style={{ }}` is needed — UI-SPEC verification hook #2 (zero `style={` in Phase 4 files) is satisfied.

## Deviations from Plan

None — the Task 1 action body landed verbatim. The previous executor's draft (interrupted before commit by a network drop) matched every acceptance criterion on first attempt; this resume invocation only had to commit the file and write the SUMMARY/STATE/ROADMAP updates.

## Auth Gates

None.

## Known Stubs

None — `<Field>` is a leaf primitive with a complete contract. It has no consumer in this plan (verified: `git grep -nE 'from .[\"\']@/components/Field' frontend/web/` returns 0 hits), which is the expected state per the plan's `<verification>` block. Plan 03 will be the first consumer.

## Self-Check

- File `frontend/web/components/Field.tsx` — FOUND (111 lines)
- Commit `445f208` (Task 1) — FOUND on `feature/issue-93-auth-ui`

## Self-Check: PASSED

## Forward Notes for Plan 03

- Import via `import { Field } from "@/components/Field"`. The export is **named**, not default.
- Pass `autoComplete="email"` to the email field and `autoComplete="current-password"` (login) / `autoComplete="new-password"` (register) to the password field — `<Field>` forwards directly to the underlying `<input>`.
- Pass `disabled={isSubmitting}` to every field while `signIn` / `signUp` is in flight (UI-SPEC §"Empty / loading / disabled states").
- The component owns the show/hide toggle — Plan 03 must NOT also render its own toggle. For `type="password"` fields, the toggle is automatic.
- The error/hint slot already lives below the input — Plan 03 must NOT render its own field-level error `<p>` outside `<Field>`. Pass the validation error string via the `error` prop.
- The form-level API-error banner (D-10) is a separate surface above the submit button — Plan 03 owns that, NOT `<Field>`.
