# Phase 1: Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-04
**Phase:** 01-foundation
**Areas discussed:** Tailwind major version, shadcn-ready scope, Second route choice, Tooling extras (Prettier + TS strictness)

---

## Tailwind major version

| Option | Description | Selected |
|--------|-------------|----------|
| Tailwind v4 | CSS-first config via `@theme` directive in globals.css. Natural mirror of `_design-reference/styles.css`'s `--color-*` / `--fs-*` / `--r-*` tokens — copy in almost verbatim. Next.js 16 create-next-app default. shadcn 2.x supports v4. Faster builds (Oxide engine). | ✓ |
| Tailwind v3 | Battle-tested. `tailwind.config.ts` + globals.css with `@tailwind` directives. Larger third-party ecosystem (older shadcn examples). Tokens duplicated: once in `:root` CSS vars and once in `tailwind.config.ts` theme. | |

**User's choice:** Tailwind v4 (Recommended).
**Notes:** v4's CSS-first model is a direct mirror of how `_design-reference/styles.css` is already structured. Phase 1 ships a minimal globals.css; Phase 2 fills the `@theme` block.

---

## shadcn-ready scope this phase

| Option | Description | Selected |
|--------|-------------|----------|
| Lean: deps only | Install `clsx` + `tailwind-merge` + `class-variance-authority` + `lucide-react`. No `shadcn init`, no `components.json`, no example component. Phase 3 runs `shadcn init` when it actually needs Navbar/Sidebar primitives. | |
| Wired: shadcn init now | Run `pnpm dlx shadcn@latest init` — creates `components.json`, `lib/utils.ts` (with `cn()`), confirms CLI works against Tailwind v4. No example component scaffolded. Catches wiring bugs in Phase 1 instead of Phase 3. | ✓ |
| Full demo: init + one example | Run `shadcn init` AND scaffold one component (e.g. Button) to validate the entire pipeline visually. Adds a component file before Phase 3 owns `components/`. | |

**User's choice:** Wired: shadcn init now (Recommended).
**Notes:** Validates shadcn ↔ Tailwind v4 wiring end-to-end during Phase 1 without leaking component-authoring scope into Phase 1. `lib/utils.ts` is on-charter for FOUND-05 (`lib/` directory must exist).

---

## Second route choice

| Option | Description | Selected |
|--------|-------------|----------|
| /tokens | Phase 1 ships an empty placeholder page at `app/tokens/page.tsx` ("Design tokens — see Phase 2"). Phase 2's DSGN-05 fills the existing page rather than creating a new route. Clean Phase 1 → Phase 2 handoff seam. | ✓ |
| /_health | `app/_health/page.tsx` renders "OK". Pure App-Router-works diagnostic. Phase 2 still needs to create `/tokens` separately. Throwaway route lives forever or gets cleaned up later. | |
| Both /tokens and /_health | Belt-and-suspenders: `/tokens` placeholder + `/_health` probe. Slightly more Phase 1 surface for negligible benefit. | |

**User's choice:** /tokens (Recommended).
**Notes:** Phase 1 → Phase 2 handoff is in-place page replacement, not new-route creation.

---

## Tooling extras: Prettier

| Option | Description | Selected |
|--------|-------------|----------|
| Yes | Install `prettier-plugin-tailwindcss` alongside prettier. Auto-sorts class strings to canonical order. Less diff noise in PRs once components proliferate (Phases 3–10). Pairs well with the "theme variables only" rule. | ✓ |
| No, plain Prettier | Just prettier with default config. Class order is whatever the author types. Smaller dep tree by 1 plugin. | |

**User's choice:** Yes (Recommended).

---

## Tooling extras: TypeScript strictness

| Option | Description | Selected |
|--------|-------------|----------|
| Just `strict: true` (matches FOUND-02 verbatim) | tsconfig.json has only `"strict": true`. Lowest friction for a new codebase. Matches the requirement text exactly. | |
| `strict` + `noUncheckedIndexedAccess` | Adds one extra flag. Catches `array[i]` returning `T` instead of `T \| undefined` — prevents real bugs once we have mock arrays in `lib/api/`. Low noise on greenfield code. | ✓ |
| Maximum strictness | `strict` + `noUncheckedIndexedAccess` + `noImplicitOverride` + `noFallthroughCasesInSwitch` + `exactOptionalPropertyTypes`. Maximally safe but `exactOptionalPropertyTypes` regularly fights React/Next types. | |

**User's choice:** strict + noUncheckedIndexedAccess (Recommended).
**Notes:** `noUncheckedIndexedAccess` is forward-looking for Phase 4's mock-array access; `exactOptionalPropertyTypes` rejected to avoid React/Next type friction.

---

## Claude's Discretion

The following auxiliary decisions were left to the planner — see CONTEXT.md `<decisions>` → `Claude's Discretion`:

- Exact Next.js minor version (resolve at install time, commit lockfile)
- Node version (Node 22 LTS preferred, else 20.9+)
- pnpm version pin via `package.json#packageManager`
- ESLint config — whatever `create-next-app` ships in Next 16
- `.gitignore` — standard `create-next-app` output
- `.env.example` — empty placeholder
- `lib/api/` keep-strategy — `.gitkeep` or stub `index.ts`
- `styles/` vs `app/` location of `globals.css`
- Manrope/Inter weights and CSS-variable names
- TypeScript path alias `@/*`

## Deferred Ideas

- ESLint rule blocking hardcoded hex/px in `app/` and `components/` (DSGN-06 / Phase 2)
- Test runner setup (Vitest / Jest / Playwright / RTL) — out of milestone
- CI workflows (GitHub Actions for `pnpm lint` + `tsc --noEmit`) — out of milestone
- pnpm workspace at repo root — unnecessary while only one JS package
- Husky / lint-staged pre-commit hooks — nice-to-have, not required
- Storybook / Ladle — useful Phase 3+, not justified Phase 1
