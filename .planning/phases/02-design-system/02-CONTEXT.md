# Phase 2: Design System — Context

**Gathered:** 2026-05-05
**Status:** Ready for planning
**Source:** Issue #91 acceptance criteria (user-supplied) + ROADMAP §"Phase 2"

<domain>
## Phase Boundary

Mirror every visual token defined in `frontend/_design-reference/styles.css` (`:root` block) into Tailwind v4's `@theme` directive at `frontend/web/styles/globals.css` so any developer can write Tailwind utility classes (`bg-bg`, `text-primary`, `font-display`, `text-16`, `rounded-md`, `shadow-md`, `w-rail`, etc.) and get values that match the reference exactly. Populate the existing `/tokens` placeholder route (created in Phase 1) with a visible token gallery proving zero drift. Implements DSGN-01..06 (issue #91).

**User-stated intent (issue #91 verbatim):**
> Objetivo: Facilitar o uso e organização das cores, espaçamentos, fontes e etc.
> Checklist: Cores globais, Tipografia
> Critério de aceite: Possibilitar a utilização por meio de variáveis do tailwind das propriedades de UI (cor, espaçamento etc.)

**Not in this phase:** Layout chrome (Phase 3 / LAYT-01..05 — navbar, sidebar, footer, page wrapper), shadcn primitives beyond `cn()` already in place (Phase 3+), any actual screen content (Phases 6–10), motion/animation tokens (out of milestone scope), light-theme variants (out of milestone scope — only the dark theme defined in `_design-reference/styles.css` ships).

</domain>

<decisions>
## Implementation Decisions

### Token Authoring Strategy

- **D-01:** Tokens are authored exclusively via Tailwind v4's `@theme` block in `frontend/web/styles/globals.css`. **No `tailwind.config.ts` is created** — Phase 1 (D-01) locked the CSS-first approach; reintroducing a JS config now would split the source of truth. Every CSS variable from `_design-reference/styles.css:5-50` (`--color-*`, `--fs-*`, `--font-*`, `--r-*`, `--shadow-*`, `--rail-w`, `--tab-h`) maps 1:1 to a `@theme` entry under the matching Tailwind v4 namespace (`--color-*`, `--text-*` for type sizes via `--text-{N}` namespace, `--font-*`, `--radius-*`, `--shadow-*`, `--spacing-*` for layout sizes).

- **D-02:** Token names are copied **verbatim** from `_design-reference/styles.css`. No paraphrasing. `--color-bg` → `--color-bg` (Tailwind utility `bg-bg`). `--color-surface-elevated` → `--color-surface-elevated` (utility `bg-surface-elevated`). `--color-on-accent` → `--color-on-accent` (utility `text-on-accent` and `bg-on-accent`). This is load-bearing for the no-drift guarantee and for the success criterion that "the rendered colors match the CSS-variable values exactly."

- **D-03:** Type-scale tokens (`--fs-12`..`--fs-64`) are authored under Tailwind v4's `--text-*` namespace as `--text-12`, `--text-14`, `--text-16`, `--text-20`, `--text-28`, `--text-40`, `--text-64`. This produces `text-12`/`text-14`/`text-16`/`text-20`/`text-28`/`text-40`/`text-64` utilities matching the success criteria literally. Numeric token names (not `xs`/`sm`/`md`) are intentional — they preserve the px values inline at the call site, eliminating a translation layer.

- **D-04:** Font-family tokens reuse the `--font-display` and `--font-body` CSS variables already exposed on `<html>` by Phase 1's `next/font/google` wiring. Tailwind's `@theme` block declares `--font-display` and `--font-body` resolving to `var(--font-display)` and `var(--font-body)` — Tailwind utilities `font-display` and `font-body` then resolve through to the Next-injected fonts. Fallback stack (`'Manrope'`, `system-ui`, `-apple-system`, `sans-serif`) is preserved in the Tailwind theme entries to match `_design-reference/styles.css:35-36`.

- **D-05:** Radii (`--r-sm`/`md`/`lg`/`xl` = 6/10/16/22 px) map to Tailwind's `--radius-sm`/`md`/`lg`/`xl`, producing utilities `rounded-sm`/`md`/`lg`/`xl`. Shadows (`--shadow-md`/`lg`) map to `--shadow-md`/`lg`, producing utilities `shadow-md`/`lg`. Layout tokens (`--rail-w` = 64px, `--tab-h` = 64px) are exposed as `--spacing-rail` and `--spacing-tab` so that `w-rail`, `h-rail`, `w-tab`, `h-tab` (and any other size utility) all resolve to the locked 64px values. This honors the success criterion phrasing literally: `w-rail = 64px`, `h-tab = 64px`.

### Tokens Demo Route

- **D-06:** The Phase 1 placeholder at `app/tokens/page.tsx` is replaced with a token gallery that renders, in one screen and grouped by category:
  - **Colors:** swatch grid for every color token; each swatch shows the token name, the resolved hex/rgba, and a visual chip painted with the corresponding Tailwind utility. Order: bg → surface → surface-elevated → surface-2 → border → border-strong → text-primary → text-secondary → text-muted → accent → accent-hover → accent-soft → on-accent → success → warning → danger.
  - **Typography:** for each type-scale step (12, 14, 16, 20, 28, 40, 64), one row showing the size in both the display and body fonts (Manrope and Inter) with the lorem text "The quick brown fox jumps over the lazy dog" — so any drift in font loading or sizing is spottable at a glance.
  - **Radii:** four squares with `rounded-sm`/`md`/`lg`/`xl`, labeled with the px value.
  - **Shadows:** two cards with `shadow-md` and `shadow-lg`, on the page background, labeled with the token name.
  - **Layout sizes:** two filled rectangles demonstrating `w-rail h-tab` (64×64) and `h-tab` band, labeled with their px values.

  The page is a server component, no client-only state, no shadcn primitives (still empty in this phase). Authored with Tailwind utilities only — proves the tokens work at the call site.

### Hardcode Forbiddance Mechanism

- **D-07:** DSGN-06 ("only Tailwind theme variables — hardcoded hex/px values forbidden in component files") is enforced **via documented author rule** in `CLAUDE.md` (already present: "After Phase 2: only Tailwind theme variables in components — no hardcoded hex/px"). No ESLint rule is added in this phase — a custom rule would need to permit `box-sizing` resets, breakpoint queries, and font-feature-settings, and writing it correctly is out of scope vs. the doc rule. Phase 2 ships a `frontend/web/CLAUDE.md` reminder section if one isn't already there, plus a one-line reminder at the top of the tokens demo route. PR review is the enforcement surface. (Future ticket can layer in `eslint-plugin-no-magic-numbers` style rule if drift is observed during screen phases.)

### Globals.css Reset Carry-Over

- **D-08:** The base reset rules from `_design-reference/styles.css:53-86` (box-sizing, margin/padding zeroing, body background/color/font, button/input/anchor resets) are carried over into `globals.css` **outside** the `@theme` block (under a `@layer base` directive) so the reference page's baseline behavior survives without becoming a Tailwind utility. The `#root` selector from the reference is omitted (Next.js App Router doesn't use it). The `html, body` selectors stay.

### Claude's Discretion

The planner may pick defensible defaults for the following — surfacing them creates churn, not value:

- **Exact hex casing in `@theme`** — match the reference's lowercase form (`#0a0a0b`, `#f5b544`).
- **`rgba(...)` vs `oklch(...)` for accent-soft** — use the reference's `rgba(245, 181, 68, 0.12)` verbatim. The `oklch ~ 0.78 / 0.15 / 75` comment in the reference is informational; do not switch to oklch in the theme.
- **Tokens-route layout** — single page, vertical sections, no chrome (Phase 3 hasn't shipped yet). Implementer's call on spacing, headings, and section ordering as long as every token from D-06's bullet list appears.
- **Whether `@theme` is split** between sub-files — keep all tokens in `styles/globals.css` for this phase. A future split (e.g., `styles/tokens/colors.css`) is fine but unnecessary now.
- **Font weights to load** — already pinned in Phase 1 (400/500/600/700 for both Manrope and Inter). Phase 2 does not extend.
- **Use of `@theme` vs `@theme inline`** — planner picks; the `inline` variant resolves variables at build time (smaller runtime), the non-inline keeps them as runtime CSS vars (Phase 9+ tweaks panel friendly). Default to **non-inline `@theme`** so the runtime CSS-variable surface is preserved (matches the reference's `:root` model and keeps the future tweaks-panel option open).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Visual Design Source of Truth
- `frontend/_design-reference/styles.css` — CSS-variable definitions to mirror **verbatim**. The `:root` block at lines 3–50 is the spec. The base resets at lines 53–86 are partially carried over (D-08).

### Project & Roadmap
- `.planning/PROJECT.md` — milestone scope, core value, locked decisions, constraints (theme-vars-only, no JSX imports from `_design-reference/`)
- `.planning/ROADMAP.md` §"Phase 2: Design System" — phase goal, 4 success criteria, GitHub issue #91 mapping
- `.planning/REQUIREMENTS.md` §"Design System (issue #91)" — DSGN-01..06 atomic requirements
- `.planning/STATE.md` — current phase, completed Phase 1
- `CLAUDE.md` (root) and `frontend/web/CLAUDE.md` (if present) — milestone hard rules

### Phase 1 Handoff
- `.planning/phases/01-foundation/01-CONTEXT.md` — Phase 1 locked decisions (D-01..D-05) — esp. D-01 (Tailwind v4 CSS-first, no `tailwind.config.ts`) and D-03 (`/tokens` placeholder lives at `app/tokens/page.tsx`)
- `.planning/phases/01-foundation/01-04-SUMMARY.md` — what Phase 1 actually delivered (final state of `frontend/web/`)
- `frontend/web/styles/globals.css` — the file Phase 2 extends (currently a minimal Tailwind import + Phase 2 placeholder comment)
- `frontend/web/app/layout.tsx` — already wires `--font-display` / `--font-body` on `<html>` via `next/font/google`
- `frontend/web/app/tokens/page.tsx` — Phase 1 placeholder; Phase 2 replaces its contents

</canonical_refs>

<specifics>
## Specific Token Reference (extracted from `_design-reference/styles.css`)

For reviewer convenience — the planner and executor MUST verify against the actual file, not this excerpt.

```
Colors:
  --color-bg:                #0a0a0b
  --color-surface:           #131316
  --color-surface-elevated:  #1c1c20
  --color-surface-2:         #232328
  --color-border:            #2a2a30
  --color-border-strong:     #3a3a42
  --color-text-primary:      #f5f5f6
  --color-text-secondary:    #a4a4ad
  --color-text-muted:        #6c6c76
  --color-accent:            #f5b544
  --color-accent-hover:      #ffc560
  --color-accent-soft:       rgba(245, 181, 68, 0.12)
  --color-on-accent:         #1a1305
  --color-success:           #4ade80
  --color-warning:           #f59e0b
  --color-danger:            #f87171

Type scale:
  --fs-12 .. --fs-64 = 12 / 14 / 16 / 20 / 28 / 40 / 64 px

Fonts:
  --font-display: 'Manrope', system-ui, -apple-system, sans-serif
  --font-body:    'Inter',   system-ui, -apple-system, sans-serif

Radii:
  --r-sm = 6 px / --r-md = 10 px / --r-lg = 16 px / --r-xl = 22 px

Shadows:
  --shadow-md: 0 6px 24px rgba(0,0,0,.35)
  --shadow-lg: 0 24px 60px rgba(0,0,0,.5)

Layout:
  --rail-w: 64 px
  --tab-h:  64 px
```

</specifics>

<deferred>
## Deferred Ideas

- **Light-theme variants** — only the dark theme is defined in the reference and this milestone. Light theme is post-v1 if pursued at all.
- **Motion / transition tokens** — the reference defines a few `transition` durations on buttons (`.15s`, `.12s`); they are not currently part of any DSGN requirement and live as one-off values inline. Promote to tokens only if a Phase 4+ component duplicates them.
- **ESLint rule for hardcoded hex/px** — D-07 keeps DSGN-06 as a doc rule for now. Re-evaluate after screen phases ship if drift is observed in PR review.
- **Token splitting into multiple files** — out of scope for Phase 2 (one `globals.css` is the rule).

</deferred>

---

*Phase: 02-design-system*
*Context gathered: 2026-05-05*
