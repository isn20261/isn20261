---
phase: 02-design-system
plan: 03
type: execute
wave: 3
depends_on: [02-01, 02-02]
files_modified:
  - frontend/web/AGENTS.md
  - frontend/web/app/tokens/page.tsx
autonomous: true
requirements: [DSGN-06]
tags: [author-rule, doc-rule, verification, lint, tsc, build, smoke-test]

must_haves:
  truths:
    - "`frontend/web/AGENTS.md` (the file `frontend/web/CLAUDE.md` references via `@AGENTS.md`) documents the post-Phase-2 hard rule: components in `frontend/web/app/` and `frontend/web/components/` may use ONLY Tailwind theme variables — no hardcoded hex / rgba / px-font-size in className or style props (DSGN-06 / D-07)."
    - "`frontend/web/app/tokens/page.tsx` shows a one-line reminder at the top of the rendered page (visible to viewers) that mirrors the rule: 'Author rule: only Tailwind theme variables in components — no hardcoded hex or px.' (D-07)."
    - "End-to-end Phase 2 quality gate passes: `pnpm lint` exits 0, `pnpm exec tsc --noEmit` exits 0, `pnpm build` exits 0."
    - "`pnpm dev` boots and `curl -sw '%{http_code}' http://localhost:3000/tokens` returns 200; the body contains the literal string `recommend-a — design tokens` (the heading authored in plan 02-02)."
    - "A repo-wide grep for hardcoded design values inside `frontend/web/app/` and `frontend/web/components/` (excluding `styles/` and excluding text content / comments) returns zero hits — proves DSGN-06 holds at phase end."
    - "All four ROADMAP Phase-2 success criteria are demonstrably met."
  artifacts:
    - path: "frontend/web/AGENTS.md"
      provides: "Post-Phase-2 author rule documented for every future agent / contributor (DSGN-06 / D-07)"
      contains: "Tailwind theme variables"
    - path: "frontend/web/app/tokens/page.tsx"
      provides: "Visible reminder banner restating the author rule (D-07)"
      contains: "Author rule"
  key_links:
    - from: "frontend/web/CLAUDE.md"
      to: "frontend/web/AGENTS.md"
      via: "the existing `@AGENTS.md` reference at the top of `frontend/web/CLAUDE.md` resolves to the AGENTS.md file this plan extends"
      pattern: "@AGENTS.md"
    - from: "frontend/web/AGENTS.md"
      to: "frontend/web/styles/globals.css"
      via: "the rule section names the `@theme` block as the single source of truth components must consume from"
      pattern: "@theme|globals.css"
---

<objective>
Close the last requirement of Phase 2 — DSGN-06 (the "no hardcoded design values in components" author rule) — by extending `frontend/web/AGENTS.md` (the milestone's per-package agent doc, already wired into `frontend/web/CLAUDE.md` via `@AGENTS.md`) with a clear post-Phase-2 hard rule, and adding a one-line reminder banner at the top of the visible `/tokens` page so the rule is restated where it matters most. Then run the end-to-end Phase 2 verification (lint, tsc, build, dev-server smoke against `/tokens`, and a repo-wide grep gate for hardcoded values) so the phase-exit quality bar is demonstrably met.

Per CONTEXT.md D-07, the enforcement mechanism for DSGN-06 is **a documented author rule + PR review**, not an ESLint custom rule (a correct lint rule would need to permit `box-sizing` resets, breakpoint queries, font-feature-settings, and is out of scope for Phase 2). This plan ships the docs and the end-of-phase verification — the lint rule is deferred per CONTEXT.md `<deferred>`.

Purpose: This is the phase-exit gate. After this plan, Phase 2 is ready for PR into `frontend`.

Output:
- `frontend/web/AGENTS.md` extended with a "Phase 2 onward — design tokens hard rule" section.
- `frontend/web/app/tokens/page.tsx` gets a visible reminder banner at the top of `<main>` (one short line, styled with `bg-accent-soft`/`text-accent`).
- A green end-to-end run: lint + tsc + build + dev smoke + the DSGN-06 grep gate.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
@$HOME/.claude/get-shit-done/references/agent-contracts.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/phases/02-design-system/02-CONTEXT.md
@frontend/web/CLAUDE.md
@frontend/web/AGENTS.md
@frontend/web/styles/globals.css
@frontend/web/app/tokens/page.tsx
@frontend/web/app/page.tsx
@CLAUDE.md
@.planning/phases/02-design-system/02-01-SUMMARY.md
@.planning/phases/02-design-system/02-02-SUMMARY.md

<critical_reminders>
- **Next.js 16 is NOT the Next.js you know.** `frontend/web/AGENTS.md` is the file we are about to extend. Read it as it currently stands (just the "this is NOT the Next.js you know" warning) and APPEND to it — do not delete or rewrite the existing warning.
- **Tailwind v4 (CSS-first) is locked** (Phase 1 D-01). The new doc rule must explicitly forbid `tailwind.config.ts` reintroduction in addition to forbidding hardcoded values.
- **The author rule applies to `app/` and `components/`** — NOT to `styles/globals.css` (which IS the place values are authored) and NOT to the `lib/` directory (which holds typed mocks where literal token values may legitimately appear in test fixtures). Surface this scope precisely.
- **The `/tokens` page is the only file allowed to contain literal hex values inside its JSX text content** (because its purpose is to display them). The grep gate must therefore EXCLUDE the page from the hex-in-className check semantically — but plan 02-02's gate already proved hex never appears in className for that file, only inside text content. Reuse that gate's regex precisely.
</critical_reminders>

<existing_agents_md>
The current contents of `frontend/web/AGENTS.md` (full file — short):

```
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
```

This file is referenced from `frontend/web/CLAUDE.md` via `@AGENTS.md` — extending AGENTS.md is the correct surface for milestone-specific author rules per the existing wiring. Do NOT create a new file or duplicate content into `frontend/web/CLAUDE.md` — keep AGENTS.md as the single source.
</existing_agents_md>

<existing_phase2_tokens_page>
After plan 02-02, `frontend/web/app/tokens/page.tsx` already contains a paragraph in the header that mentions the author rule (per plan 02-02's structural skeleton). This plan promotes that to a visually distinct **banner** at the very top of `<main>` — a single line styled as a callout — so the rule is unmissable. The existing description-paragraph stays.
</existing_phase2_tokens_page>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Extend `frontend/web/AGENTS.md` with the post-Phase-2 author rule</name>
  <files>frontend/web/AGENTS.md</files>
  <action>
Append (do NOT replace) the existing `frontend/web/AGENTS.md` so the final file looks like:

```markdown
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

## Phase 2 onward — design tokens hard rule (DSGN-06 / issue #91)

After Phase 2 ships, **components and routes under `frontend/web/app/` and `frontend/web/components/` MUST consume design values exclusively through Tailwind theme variables** authored in `frontend/web/styles/globals.css`. No hardcoded hex / rgba colors. No hardcoded `font-size` / `padding` / `margin` / `width` / `height` / `border-radius` / `box-shadow` px-values for design-system properties. No `style={{ ... }}` props for properties that have a token (color, font-size, radii, shadows, the rail/tab 64 px sizes).

### Allowed token surface (the only place values are authored)

- `frontend/web/styles/globals.css` `@theme` block — colors, type scale, fonts, radii, shadows, layout sizes (`bg-bg`, `text-12`, `font-display`, `rounded-md`, `shadow-md`, `w-rail`, `h-tab`, etc.).
- Tailwind v4 default theme — flex/grid/gap utilities, the standard spacing scale (`p-4`, `m-2`, `gap-6`), positioning, sizing utilities like `w-full`, `h-screen`. These are not design tokens — they are layout primitives.

### Forbidden in `app/` and `components/`

- Hex / rgba / hsl literals inside a `className` string or a `style=` prop.
- Inline `style={{ fontSize: '14px' }}`-style props for design-system values that have a token.
- Reintroducing `tailwind.config.ts` (Tailwind v4 is CSS-first — see `frontend/web/styles/globals.css`).
- Importing from `frontend/_design-reference/` (CLAUDE.md hard rule #2 — independent of this rule, restated for completeness).

### Allowed elsewhere

- `frontend/web/styles/globals.css` — IS the place tokens are authored.
- `frontend/web/lib/` — typed mocks may contain literal token values inside test fixture data (e.g. a mock movie record with a poster URL); they are not design declarations.
- `frontend/web/app/tokens/page.tsx` (the design-system gallery) — may contain hex/rgba literals as **inline JSX text content** (e.g. `<code>#0a0a0b</code>`) so the human reader can compare rendered output against the token source. The gallery may NOT use those literals in `className` or `style` — only in displayed text. This is enforced by a grep gate.

### Why this is a doc rule, not an ESLint rule (D-07)

A correct lint rule would need to permit `box-sizing` resets, viewport `min-height`, font-feature-settings, and any breakpoint queries — writing it correctly is out of scope vs. a documented rule that PR review checks. If drift is observed in Phases 4–10 PR review, a future ticket will layer in `eslint-plugin-no-magic-numbers`-style enforcement.

### How to verify before pushing

```bash
cd frontend/web
# No hex inside any className in app/ or components/ (excluding the tokens gallery's text content).
git grep -nE 'className=.*#[0-9a-fA-F]{3,6}|#[0-9a-fA-F]{3,6}.*className=' -- 'app/' 'components/' | grep -v 'app/tokens/page.tsx'
# Expected: no output.

# No inline style props in app/ or components/.
git grep -nE 'style=\{' -- 'app/' 'components/'
# Expected: no output.

# No tailwind.config.* (Tailwind v4 CSS-first).
ls tailwind.config.* 2>/dev/null && echo "VIOLATION" || echo "ok"
```
```

Notes for the executor:
- Use the Edit/Write tool. Do NOT use heredoc / `cat <<EOF` Bash redirection.
- Keep the existing two-paragraph "This is NOT the Next.js you know" header unchanged.
- The new section must be added beneath that header with a `## Phase 2 onward — design tokens hard rule (DSGN-06 / issue #91)` heading.

After writing, verify:

```bash
cd frontend/web
# The original "This is NOT the Next.js" warning is preserved.
grep -c 'This is NOT the Next.js you know' AGENTS.md
# Expected: 1

# The new heading exists.
grep -c 'Phase 2 onward — design tokens hard rule' AGENTS.md
# Expected: 1

# The forbidden-list anchor is present.
grep -c 'Forbidden in `app/` and `components/`' AGENTS.md
# Expected: 1
```

Commit:
```
git add frontend/web/AGENTS.md
git commit -m "docs(02-03): document post-Phase-2 design-tokens hard rule (DSGN-06)

Extends frontend/web/AGENTS.md (the file frontend/web/CLAUDE.md
references via @AGENTS.md) with the DSGN-06 author rule per Phase 2
CONTEXT D-07: components in app/ and components/ may consume design
values only through Tailwind theme variables authored in
styles/globals.css — no hardcoded hex / rgba / px in className or
style props. Documents the allowed surface, the forbidden patterns,
the per-directory scope, and the grep gates that verify compliance.

Enforcement is doc + PR review (D-07) — an ESLint rule is deferred
per Phase 2 CONTEXT <deferred> until drift is observed in Phases 4-10."
```
  </action>
  <verify>
    <automated>cd frontend/web && [ "$(grep -c 'This is NOT the Next.js you know' AGENTS.md)" = "1" ] && [ "$(grep -c 'Phase 2 onward — design tokens hard rule' AGENTS.md)" = "1" ] && grep -q 'Tailwind theme variables' AGENTS.md && grep -q 'Forbidden in' AGENTS.md && echo "AGENTS.md GATE PASS"</automated>
  </verify>
  <done>
- `frontend/web/AGENTS.md` keeps its original "This is NOT the Next.js you know" warning paragraph intact.
- A new section `## Phase 2 onward — design tokens hard rule (DSGN-06 / issue #91)` is appended below.
- The new section names the allowed surface (globals.css `@theme` + Tailwind defaults), the forbidden patterns (hex/rgba/px in className or style, `tailwind.config.ts`, `_design-reference/` imports), the allowed-elsewhere scope (`lib/`, `styles/`, the gallery's text content), and the grep gates a future contributor can run.
- The grep-gate prints `AGENTS.md GATE PASS`.
- One commit `docs(02-03): document post-Phase-2 design-tokens hard rule (DSGN-06)`.
  </done>
</task>

<task type="auto">
  <name>Task 2: Add a visible reminder banner at the top of the `/tokens` page</name>
  <files>frontend/web/app/tokens/page.tsx</files>
  <action>
Edit `frontend/web/app/tokens/page.tsx` (which already exists from plan 02-02) to add a one-line callout banner as the FIRST child of `<main>`, BEFORE the existing `<header>`. The banner restates the DSGN-06 author rule for any human visiting the page.

Use the Edit tool. The change is additive — it inserts a `<div>` block right after `<main className="...">`. Do NOT remove or modify any existing content.

Insert this banner (use only Tailwind theme utilities — no hardcoded hex / px):

```tsx
<div
  role="note"
  className="mb-8 rounded-md border border-accent bg-accent-soft p-4 text-14 text-accent"
>
  <strong className="font-display font-semibold">Author rule:</strong>{" "}
  components in <code className="font-mono">app/</code> and{" "}
  <code className="font-mono">components/</code> may use only Tailwind theme variables —
  no hardcoded hex or px. See{" "}
  <code className="font-mono">frontend/web/AGENTS.md</code>.
</div>
```

This banner is visually distinct (amber border on amber-soft background per the design system, using `bg-accent-soft`/`border-accent`/`text-accent` from plan 02-01's `@theme`).

After the edit, verify the file still passes plan 02-02's invariants AND the new banner is present:

```bash
cd frontend/web
# Banner exists.
grep -c 'Author rule:' app/tokens/page.tsx
# Expected: at least 1 (could be 2 if the previous header paragraph also mentions it).

# Plan 02-02's invariants still hold:
grep -cE "['\"]use client['\"]" app/tokens/page.tsx           # 0
grep -cE 'style=\{' app/tokens/page.tsx                       # 0
! grep -qE 'className=.*#[0-9a-fA-F]{3,6}|#[0-9a-fA-F]{3,6}.*className=' app/tokens/page.tsx
grep -cE '_design-reference' app/tokens/page.tsx              # 0

# Banner uses theme utilities (positive assertion).
grep -q -E '\bbg-accent-soft\b' app/tokens/page.tsx
grep -q -E '\bborder-accent\b' app/tokens/page.tsx

pnpm lint
pnpm exec tsc --noEmit
```

Commit:
```
git add frontend/web/app/tokens/page.tsx
git commit -m "feat(02-03): add visible DSGN-06 author-rule banner at /tokens (D-07)

Inserts a one-line callout banner at the top of /tokens restating the
post-Phase-2 design-tokens hard rule (no hardcoded hex/px in components),
pointing to frontend/web/AGENTS.md as the source. Banner uses
bg-accent-soft / border-accent / text-accent — proves the very utility
classes the rule talks about.

D-07 / DSGN-06 visible reminder."
```
  </action>
  <verify>
    <automated>cd frontend/web && grep -q 'Author rule:' app/tokens/page.tsx && [ "$(grep -cE "['\"]use client['\"]" app/tokens/page.tsx)" = "0" ] && [ "$(grep -cE 'style=\{' app/tokens/page.tsx)" = "0" ] && ! grep -qE 'className=.*#[0-9a-fA-F]{3,6}|#[0-9a-fA-F]{3,6}.*className=' app/tokens/page.tsx && [ "$(grep -cE '_design-reference' app/tokens/page.tsx)" = "0" ] && grep -q -E '\bbg-accent-soft\b' app/tokens/page.tsx && grep -q -E '\bborder-accent\b' app/tokens/page.tsx && pnpm lint && pnpm exec tsc --noEmit && echo "BANNER GATE PASS"</automated>
  </verify>
  <done>
- `frontend/web/app/tokens/page.tsx` contains a visible callout banner immediately inside `<main>` (before `<header>`) that says "Author rule: components in app/ and components/ may use only Tailwind theme variables..." and points to `frontend/web/AGENTS.md`.
- The banner styles itself with `bg-accent-soft`, `border-accent`, `text-accent` (utilities defined in plan 02-01's `@theme`).
- All plan 02-02 invariants still hold (no `use client`, no `style={`, no hex in className, no `_design-reference/` imports).
- `pnpm lint` exits 0; `pnpm exec tsc --noEmit` exits 0.
- One commit `feat(02-03): add visible DSGN-06 author-rule banner at /tokens (D-07)`.
- The grep-gate prints `BANNER GATE PASS`.
  </done>
</task>

<task type="auto">
  <name>Task 3: End-to-end Phase 2 verification (lint, tsc, build, dev smoke, DSGN-06 grep gate)</name>
  <files></files>
  <action>
Run the full Phase 2 quality gate. This task produces no source-file changes — verification only. If any check fails, STOP and surface the failure to the user; do not paper over.

```bash
set -e
cd frontend/web

# === Static checks ===
echo "--- pnpm lint ---"
pnpm lint
echo "--- pnpm exec tsc --noEmit ---"
pnpm exec tsc --noEmit
echo "--- pnpm build ---"
pnpm build 2>&1 | tee /tmp/02-03-build.log

# === DSGN-06 repo-wide grep gate (the load-bearing assertion of this phase) ===
echo "--- DSGN-06 grep gate (no hex in className inside app/ + components/, except the tokens gallery's text content) ---"
# Find any line in app/ or components/ where a # hex literal appears on the same line
# as className=. The tokens gallery is allowed because its hex literals appear in
# JSX text content, not in className strings — the regex only matches when both
# patterns are on the same line, so the gallery is naturally excluded.
HEX_HITS=$(git grep -nE 'className=.*#[0-9a-fA-F]{3,6}|#[0-9a-fA-F]{3,6}.*className=' -- 'app/' 'components/' || true)
if [ -n "$HEX_HITS" ]; then
  echo "FAIL: hardcoded hex inside className found:"
  echo "$HEX_HITS"
  exit 1
fi
echo "ok — no hex in className"

echo "--- DSGN-06 grep gate (no inline style props in app/ + components/) ---"
STYLE_HITS=$(git grep -nE 'style=\{' -- 'app/' 'components/' || true)
if [ -n "$STYLE_HITS" ]; then
  echo "FAIL: inline style={...} props found in app/ or components/:"
  echo "$STYLE_HITS"
  exit 1
fi
echo "ok — no inline style props"

echo "--- DSGN-01 (no tailwind.config.*) ---"
if ls tailwind.config.* 2>/dev/null; then
  echo "FAIL: tailwind.config.* exists — Phase 1 D-01 / Phase 2 D-01 forbid it"
  exit 1
fi
echo "ok — no tailwind.config.*"

echo "--- _design-reference imports check (CLAUDE.md hard rule #2) ---"
DR_HITS=$(git grep -nE '_design-reference' -- 'app/' 'components/' 'lib/' 'styles/' || true)
if [ -n "$DR_HITS" ]; then
  echo "FAIL: _design-reference referenced from production code:"
  echo "$DR_HITS"
  exit 1
fi
echo "ok — no _design-reference imports"

# === Dev-server smoke test against /tokens ===
echo "--- pnpm dev smoke test (background, 30s timeout) ---"
# Start dev server in the background with output captured.
nohup pnpm dev > /tmp/02-03-dev.log 2>&1 &
DEV_PID=$!
echo "dev server PID=$DEV_PID — waiting for ready..."

# Poll for readiness (up to 30s).
READY=0
for i in $(seq 1 30); do
  if curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/tokens 2>/dev/null | grep -q '^200$'; then
    READY=1
    break
  fi
  sleep 1
done

if [ "$READY" != "1" ]; then
  echo "FAIL: dev server did not respond 200 at /tokens within 30s"
  echo "--- dev log tail ---"
  tail -50 /tmp/02-03-dev.log || true
  kill -9 "$DEV_PID" 2>/dev/null || true
  exit 1
fi

echo "--- /tokens HTTP smoke ---"
TOKENS_STATUS=$(curl -s -o /tmp/02-03-tokens.html -w '%{http_code}' http://localhost:3000/tokens)
echo "HTTP status: $TOKENS_STATUS"
if [ "$TOKENS_STATUS" != "200" ]; then
  echo "FAIL: /tokens returned HTTP $TOKENS_STATUS"
  kill -9 "$DEV_PID" 2>/dev/null || true
  exit 1
fi

echo "--- /tokens body content checks ---"
# Heading from plan 02-02.
grep -q 'recommend-a — design tokens' /tmp/02-03-tokens.html \
  || grep -q 'recommend-a' /tmp/02-03-tokens.html \
  || { echo "FAIL: /tokens body missing the design tokens heading"; kill -9 "$DEV_PID" 2>/dev/null; exit 1; }

# Banner from this plan.
grep -q 'Author rule' /tmp/02-03-tokens.html \
  || { echo "FAIL: /tokens body missing the DSGN-06 author-rule banner"; kill -9 "$DEV_PID" 2>/dev/null; exit 1; }

# Token names appear in the rendered body (proof the gallery actually rendered).
for TOKEN in 'bg' 'surface' 'accent' 'text-12' 'rounded-md' 'shadow-md' 'rail' 'tab'; do
  grep -q "$TOKEN" /tmp/02-03-tokens.html \
    || { echo "FAIL: /tokens body missing token reference '$TOKEN'"; kill -9 "$DEV_PID" 2>/dev/null; exit 1; }
done
echo "ok — all token references present in body"

# === Cleanup ===
echo "--- stopping dev server ---"
kill "$DEV_PID" 2>/dev/null || true
sleep 1
kill -9 "$DEV_PID" 2>/dev/null || true
# Belt-and-braces cleanup of any orphan next dev processes.
pkill -f 'next dev' 2>/dev/null || true

echo ""
echo "=========================================="
echo "PHASE 2 END-TO-END VERIFICATION: ALL PASS"
echo "=========================================="
echo "  - pnpm lint:                exit 0"
echo "  - pnpm exec tsc --noEmit:   exit 0"
echo "  - pnpm build:               exit 0"
echo "  - DSGN-06 hex gate:         no violations"
echo "  - DSGN-06 inline-style gate: no violations"
echo "  - tailwind.config.*:        absent (D-01 honored)"
echo "  - _design-reference imports: none"
echo "  - GET /tokens HTTP 200:     yes"
echo "  - /tokens body content:     all expected tokens + banner present"
echo "=========================================="
```

This task does not produce a commit (no source-file changes). The verification log itself (lint output, build output, the table at the end) is recorded in `02-03-SUMMARY.md`.

If any step fails: stop, copy the failing output verbatim into the summary, and surface to the user. Do not silently bypass any gate.
  </action>
  <verify>
    <automated>cd frontend/web && pnpm lint && pnpm exec tsc --noEmit && pnpm build 2>&1 | tee /tmp/02-03-build.log && [ -z "$(git grep -nE 'className=.*#[0-9a-fA-F]{3,6}|#[0-9a-fA-F]{3,6}.*className=' -- 'app/' 'components/' || true)" ] && [ -z "$(git grep -nE 'style=\{' -- 'app/' 'components/' || true)" ] && [ ! -f tailwind.config.ts ] && [ ! -f tailwind.config.js ] && [ ! -f tailwind.config.mjs ] && [ -z "$(git grep -nE '_design-reference' -- 'app/' 'components/' 'lib/' 'styles/' || true)" ] && (nohup pnpm dev > /tmp/02-03-dev.log 2>&1 &) && DEV_PID=$! && for i in $(seq 1 30); do curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/tokens 2>/dev/null | grep -q '^200$' && break; sleep 1; done && curl -s -o /tmp/02-03-tokens.html -w '%{http_code}\n' http://localhost:3000/tokens | grep -qE '^200$' && grep -q 'Author rule' /tmp/02-03-tokens.html && grep -q 'recommend-a' /tmp/02-03-tokens.html && pkill -f 'next dev' 2>/dev/null ; echo "PHASE 2 GATE PASS"</automated>
  </verify>
  <done>
- `pnpm lint` exits 0.
- `pnpm exec tsc --noEmit` exits 0 (strict + `noUncheckedIndexedAccess` from Phase 1 D-05).
- `pnpm build` exits 0; no `Error:` / `Unknown at-rule` / `Cannot resolve` lines in build output.
- `git grep` for hex inside className across `app/` and `components/` returns zero matches (DSGN-06 holds).
- `git grep` for `style={` across `app/` and `components/` returns zero matches (DSGN-06 holds).
- No `tailwind.config.*` file exists in `frontend/web/` (Phase 1 D-01 / Phase 2 D-01 honored).
- No code in `app/`, `components/`, `lib/`, or `styles/` references `_design-reference` (CLAUDE.md hard rule #2 holds).
- `pnpm dev` boots; `curl` to `http://localhost:3000/tokens` returns HTTP 200; the response body contains the "recommend-a — design tokens" heading, the "Author rule" banner copy, and all the token-name strings checked above.
- The dev server is cleanly stopped — no orphan `next dev` process visible in `ps aux | grep -E 'next dev'`.
- This task produces no commit (verification only).
- The grep-gate prints `PHASE 2 GATE PASS`.
  </done>
</task>

</tasks>

<verification>
| REQ / ROADMAP success | Verified by |
|---|---|
| DSGN-06 (author rule) | Task 1 (AGENTS.md doc rule) + Task 2 (visible banner at /tokens) + Task 3 (repo-wide grep gates that prove no production file in `app/` or `components/` violates the rule). |
| ROADMAP success #1 (color utilities resolve to reference values) | Task 3's `pnpm build` proves Tailwind compiled the `@theme` block; combined with plan 02-02's gallery (verified rendering at /tokens in Task 3), the rendered colors match the literal values shown alongside each swatch. |
| ROADMAP success #2 (typography / radii / shadows / layout utilities) | Same — proven by build + visible gallery + token-name body grep. |
| ROADMAP success #3 (visible /tokens route renders every token) | Task 3 dev-server smoke: HTTP 200, body contains heading + banner + all token references. |
| ROADMAP success #4 (no hardcoded hex / px in components) | Task 3 DSGN-06 grep gates: zero hits inside `app/` and `components/`. |
</verification>

<success_criteria>
- All four ROADMAP Phase-2 success criteria are demonstrably met.
- All six DSGN requirements are closed (DSGN-01..04 by plan 02-01, DSGN-05 by plan 02-02, DSGN-06 by this plan).
- `frontend/web/AGENTS.md` documents the post-Phase-2 design-tokens hard rule.
- `frontend/web/app/tokens/page.tsx` shows a visible reminder banner pointing to `frontend/web/AGENTS.md`.
- The end-to-end gate (lint + tsc + build + dev smoke + grep gates) prints `PHASE 2 END-TO-END VERIFICATION: ALL PASS`.
- Two commits on `feature/issue-91-design-system` from this plan:
  1. `docs(02-03): document post-Phase-2 design-tokens hard rule (DSGN-06)`
  2. `feat(02-03): add visible DSGN-06 author-rule banner at /tokens (D-07)`
- Phase 2 is ready for the PR `feature/issue-91-design-system → frontend` per CLAUDE.md hard rule #5.
</success_criteria>

<output>
After completion, create `.planning/phases/02-design-system/02-03-SUMMARY.md` per the GSD summary template, including:
- The full text of the new AGENTS.md section.
- A screenshot-equivalent (the banner's literal JSX) confirming the /tokens reminder is in place.
- The end-to-end verification table:

| Check | Command | Result |
|---|---|---|
| TypeScript strict | `pnpm exec tsc --noEmit` | exit 0 |
| ESLint | `pnpm lint` | exit 0 |
| Production build | `pnpm build` | exit 0 |
| DSGN-06 hex-in-className | `git grep -nE 'className=.*#...' -- app/ components/` | 0 hits |
| DSGN-06 inline-style props | `git grep -nE 'style=\{' -- app/ components/` | 0 hits |
| `tailwind.config.*` absent | `ls tailwind.config.*` | absent |
| `_design-reference` imports | `git grep _design-reference -- app/ components/ lib/ styles/` | 0 hits |
| `/tokens` HTTP smoke | `curl -w '%{http_code}' /tokens` | 200 |
| `/tokens` body — heading | grep `recommend-a` | found |
| `/tokens` body — banner | grep `Author rule` | found |
| `/tokens` body — token references | grep `bg surface accent text-12 rounded-md shadow-md rail tab` | all found |

- The two commit SHAs.
- Roll-up: all 6 DSGN requirements closed, all 4 ROADMAP success criteria met. Phase 2 ready for PR into `frontend`.
- Per CONTEXT.md `<deferred>`: light-theme variants, motion tokens, ESLint-rule version of DSGN-06, and token-file splitting remain deferred. Note the surfaces where they'd plug in if revisited later.
</output>
