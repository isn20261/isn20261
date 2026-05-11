---
phase: 01-foundation
plan: 04
type: execute
wave: 4
depends_on: ["01-01", "01-02", "01-03"]
files_modified:
  - frontend/web/app/page.tsx
  - frontend/web/app/tokens/page.tsx
autonomous: true
requirements:
  - FOUND-03
  - FOUND-06
  - FOUND-07
must_haves:
  truths:
    - "`pnpm dev` (run from frontend/web/) boots the app and the root route `/` renders a placeholder page"
    - "Navigating to `/tokens` renders successfully — proves App Router multi-route wiring"
    - "`pnpm lint` exits 0 against the full project including the two new routes"
    - "`pnpm exec tsc --noEmit` exits 0 with strict + noUncheckedIndexedAccess"
    - "`pnpm build` succeeds AND the produced .next/ output contains zero references to fonts.googleapis.com (proves no Google Fonts CDN at runtime)"
  artifacts:
    - path: "frontend/web/app/page.tsx"
      provides: "Root `/` placeholder route — `recommend-a — coming soon` text. Phase 6 (HOME-01..05) replaces this entirely."
      contains: "recommend-a"
    - path: "frontend/web/app/tokens/page.tsx"
      provides: "Second `/tokens` placeholder route — proves App Router multi-route wiring AND establishes the file Phase 2 (DSGN-05) fills in place"
      contains: "Design tokens"
  key_links:
    - from: "Browser at http://localhost:3000/"
      to: "frontend/web/app/page.tsx"
      via: "Next.js App Router root segment"
      pattern: "export default function"
    - from: "Browser at http://localhost:3000/tokens"
      to: "frontend/web/app/tokens/page.tsx"
      via: "Next.js App Router /tokens segment"
      pattern: "export default function"
    - from: "Build output `.next/`"
      to: "self-hosted font files under .next/static/media/"
      via: "next/font/google build-time download (wired in plan 03)"
      pattern: "no fonts.googleapis.com references"
---

<objective>
Author the two placeholder routes Phase 1 ships (`/` and `/tokens` per D-03) and run end-to-end verification: dev server boots, both routes render, lint clean, strict TS clean, production build succeeds, and the built `.next/` output contains zero references to `fonts.googleapis.com` (proves "no Google Fonts CDN at runtime" — ROADMAP success criterion #4 + PATTERNS.md Convention 9).

Implements REQ FOUND-06 (`pnpm dev` renders root), FOUND-07 (second route works), and the lint/build portion of FOUND-03. This is the final plan in the phase.

Purpose: Closes the Phase 1 contract. Every ROADMAP success criterion for Phase 1 is provable after this plan completes.

Output: Two minimal route files, plus a verification checkpoint that captures the dev-server smoke test outcome and the build-output font-CDN grep result.
</objective>

<execution_context>
@/home/aluno/Downloads/isn20261/.claude/get-shit-done/workflows/execute-plan.md
@/home/aluno/Downloads/isn20261/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@.planning/phases/01-foundation/01-CONTEXT.md
@.planning/phases/01-foundation/01-PATTERNS.md
@.planning/phases/01-foundation/01-01-SUMMARY.md
@.planning/phases/01-foundation/01-02-SUMMARY.md
@.planning/phases/01-foundation/01-03-SUMMARY.md
</context>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| dev server (`pnpm dev`) -> developer browser | Local-only, no production exposure |
| `pnpm build` output (`.next/`) -> future deploy | Whatever lands here ships to production in later milestones |

## STRIDE Threat Register

severity_max: low

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-04-01 | Information Disclosure (third-party CDN exfil at runtime) | Built `.next/` output | mitigate | The verification task runs `pnpm build` and then `grep -r "fonts.googleapis.com" .next/` — this MUST return zero matches. Plan 03 wired `next/font/google` (build-time download, self-hosted). This grep is the proof, not the assumption. PATTERNS.md Convention 9 + ROADMAP success #4. |
| T-04-02 | Tampering (XSS via placeholder content) | `app/page.tsx`, `app/tokens/page.tsx` | mitigate | Both pages contain ONLY static JSX with literal text — no `dangerouslySetInnerHTML`, no `eval`, no user input rendered, no dynamic HTML. Verifiable by grep on both files. |
| T-04-03 | Tampering (forbidden import) | `app/page.tsx`, `app/tokens/page.tsx` | mitigate | Per CLAUDE.md hard rule #2 / PATTERNS.md Convention 2, neither page may import from `frontend/_design-reference/`. Verifiable by grep — both files MUST contain 0 occurrences of `_design-reference`. |
| T-04-04 | Denial of Service (dev server doesn't boot) | `pnpm dev` smoke test | accept | Local-only impact; if it doesn't boot we surface and fix. The checkpoint task validates this manually-then-automatically (curl on localhost:3000). |

**Note:** No high-severity threats. No auth, no network calls, no user input handling, no secrets in this plan's surface.
</threat_model>

<tasks>

<task type="auto">
  <name>Task 1: Create the two placeholder routes — / and /tokens</name>
  <files>
    frontend/web/app/page.tsx,
    frontend/web/app/tokens/page.tsx
  </files>
  <read_first>
    frontend/web/app/page.tsx (the existing create-next-app placeholder — to be REPLACED entirely),
    frontend/web/app/layout.tsx (from plan 03 — to confirm both fonts and the @/styles/globals.css import are wired; pages do not need to repeat font wiring),
    .planning/phases/01-foundation/01-CONTEXT.md (D-03 — exactly two routes, exact placeholder text and Phase-2/Phase-6 handoff comments; the `<specifics>` "Two-route smoke test" item),
    .planning/phases/01-foundation/01-PATTERNS.md (the "app/page.tsx" + "app/tokens/page.tsx" sections; Convention 7 — two routes only, exactly)
  </read_first>
  <action>
    Per D-03, Phase 1 ships exactly two routes: `/` and `/tokens`. Both are minimal placeholders.

    1. Replace the entire contents of `frontend/web/app/page.tsx` with:

       ```tsx
       /**
        * Phase 1 (FOUND-06) placeholder root route.
        * Phase 6 (HOME-01..05, issue #95) replaces this entirely with the home/hero screen.
        */
       export default function HomePage() {
         return (
           <main>
             <h1>recommend-a — coming soon</h1>
             <p>
               Foundation phase placeholder. The real home screen ships in Phase 6.
             </p>
             <p>
               <a href="/tokens">View design tokens placeholder →</a>
             </p>
           </main>
         );
       }
       ```

       Notes:
       - **No `"use client"` directive** — this is a server component (default in App Router).
       - The `<a href="/tokens">` link gives both manual click-through testing AND a verifiable App-Router-routes-to-second-page artifact.
       - Static JSX only. No imports beyond what's needed (none — React + Next provide the JSX runtime via the project's TS config).
       - Do NOT use Tailwind utility classes for styling (Phase 2 owns the design system; Phase 1 placeholders are intentionally unstyled per PATTERNS.md Convention 4).

    2. Create `frontend/web/app/tokens/` directory if it doesn't exist (`mkdir -p frontend/web/app/tokens`), then write **`frontend/web/app/tokens/page.tsx`** with:

       ```tsx
       /**
        * Phase 1 (FOUND-07) placeholder second route — proves App Router multi-route wiring.
        * Phase 2 (DSGN-05, issue #91) fills THIS file in place with the visible tokens demo
        * (color swatches, type samples, radii, shadows). The file path is locked.
        */
       export default function TokensPage() {
         return (
           <main>
             <h1>Design tokens — populated in Phase 2</h1>
             <p>
               Foundation phase placeholder. Phase 2 (issue #91) replaces this body with
               a visible token demo so design drift against frontend/_design-reference/styles.css
               is spottable in one screen.
             </p>
             <p>
               <a href="/">← Back to home placeholder</a>
             </p>
           </main>
         );
       }
       ```

       Notes:
       - Same conventions as `app/page.tsx`: server component, static JSX, no Tailwind classes, no design tokens.
       - `<a href="/">` mirrors the home → tokens link, makes manual two-way navigation verifiable.

    3. **Do NOT create** any other route under `app/` — no `app/_health/`, no `app/about/`, no `app/login/` (Convention 7).

    4. **Do NOT modify** `app/layout.tsx` (plan 03's font wiring is final), `lib/utils.ts`, `styles/globals.css`, `components.json`, `components/`, or anything outside the two route files above.
  </action>
  <verify>
    <automated>
      cd /home/aluno/Downloads/isn20261/frontend/web && \
      test -f app/page.tsx && \
      test -f app/tokens/page.tsx && \
      grep -q 'export default function' app/page.tsx && \
      grep -q 'export default function' app/tokens/page.tsx && \
      grep -q 'recommend-a' app/page.tsx && \
      grep -q 'Design tokens' app/tokens/page.tsx && \
      grep -q 'href="/tokens"' app/page.tsx && \
      grep -q 'href="/"' app/tokens/page.tsx && \
      [ "$(grep -c '"use client"' app/page.tsx)" = "0" ] && \
      [ "$(grep -c '"use client"' app/tokens/page.tsx)" = "0" ] && \
      [ "$(grep -cE 'dangerouslySetInnerHTML|eval\(|<script' app/page.tsx app/tokens/page.tsx)" = "0" ] && \
      [ "$(grep -c '_design-reference' app/page.tsx app/tokens/page.tsx)" = "0" ] && \
      [ "$(find app -name 'page.tsx' -type f | wc -l)" = "2" ] && \
      pnpm exec tsc --noEmit && \
      pnpm lint
    </automated>
  </verify>
  <acceptance_criteria>
    - `frontend/web/app/page.tsx` exists, contains `export default function`, contains the literal string `recommend-a`, contains `href="/tokens"`.
    - `frontend/web/app/tokens/page.tsx` exists, contains `export default function`, contains the literal string `Design tokens`, contains `href="/"`.
    - Neither page contains `"use client"` (both are server components per D-03 / PATTERNS.md "app/page.tsx" section).
    - Neither page contains `dangerouslySetInnerHTML`, `eval(`, or `<script` (verifiable: `grep -cE "dangerouslySetInnerHTML|eval\(|<script" frontend/web/app/page.tsx frontend/web/app/tokens/page.tsx` returns 0).
    - Neither page contains `_design-reference` (verifiable: `grep -c "_design-reference" frontend/web/app/page.tsx frontend/web/app/tokens/page.tsx` returns 0).
    - `find frontend/web/app -name 'page.tsx' -type f | wc -l` returns exactly `2` (Convention 7 — only two routes exist).
    - `cd frontend/web && pnpm exec tsc --noEmit` exits 0 against the full project including both new routes.
    - `cd frontend/web && pnpm lint` exits 0 against the full project including both new routes.
  </acceptance_criteria>
  <done>
    Both placeholder routes exist with the exact text and structure D-03 specifies. Lint and tsc pass. The Phase 1 → Phase 2 handoff for `/tokens` is locked (Phase 2 fills the existing file in place). The Phase 1 → Phase 6 handoff for `/` is locked (Phase 6 replaces it).
  </done>
</task>

<task type="auto">
  <name>Task 2: End-to-end verification — dev server, build, lint, tsc, font-CDN grep</name>
  <files>
    (no files modified — verification only)
  </files>
  <read_first>
    .planning/phases/01-foundation/01-PATTERNS.md (Convention 9 — verifier MUST grep .next/ for fonts.googleapis.com),
    .planning/phases/01-foundation/01-CONTEXT.md (`<specifics>` "Two-route smoke test" + "No Google Fonts CDN at runtime"),
    .planning/ROADMAP.md (Phase 1 success criteria #1-#4 — every assertion below maps to one of them)
  </read_first>
  <action>
    Run the full Phase-1 verification suite. Capture the OUTPUT of each step in this task's notes (so the SUMMARY.md can reference exact numbers and confirm success criteria).

    Run from `/home/aluno/Downloads/isn20261/frontend/web/`:

    ```bash
    cd /home/aluno/Downloads/isn20261/frontend/web
    ```

    1. **Static checks — must each exit 0:**
       ```bash
       pnpm lint
       pnpm exec tsc --noEmit
       ```
       If either fails, do NOT proceed to the build step — fix and re-run.

    2. **Production build — must exit 0:**
       ```bash
       rm -rf .next
       pnpm build
       ```
       Capture the build summary (Next.js prints route tree showing `/` and `/tokens` — both should appear). Confirm `/` and `/tokens` are listed in the `Route (app)` table.

    3. **Font-CDN grep — must return zero hits (Convention 9 + ROADMAP success #4):**
       ```bash
       grep -r "fonts.googleapis.com" .next/ 2>/dev/null | wc -l
       ```
       Expected output: `0`. This is the proof that Manrope + Inter are self-hosted via `next/font/google` and NOT loaded from the Google Fonts CDN at runtime.

       Also grep the source tree (defensive check):
       ```bash
       grep -rE "fonts\.googleapis\.com|fonts\.gstatic\.com" \
         frontend/web/app frontend/web/components frontend/web/lib frontend/web/styles 2>/dev/null | wc -l
       ```
       Expected output: `0`.

    4. **Dev-server smoke test — must boot and serve both routes:**
       Start the dev server in the background:
       ```bash
       cd /home/aluno/Downloads/isn20261/frontend/web && \
       (pnpm dev >/tmp/recommend-a-dev.log 2>&1 &) && \
       echo "dev pid: $!" && \
       sleep 8
       ```

       Then probe both routes (HTTP 200 expected for each):
       ```bash
       curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/
       curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/tokens
       ```
       Both must print `200`.

       Then verify the rendered HTML contains the placeholder strings:
       ```bash
       curl -s http://localhost:3000/ | grep -c "recommend-a"
       curl -s http://localhost:3000/tokens | grep -c "Design tokens"
       ```
       Both must return >= 1.

       Stop the dev server:
       ```bash
       pkill -f "next dev" || pkill -f "next-server" || true
       ```
       (Use whatever process pattern matches Next 16's dev process. If `pkill` is unavailable, use `kill <pid>` from step start.)

    5. **Summary check — folder skeleton (FOUND-05 final assertion):**
       ```bash
       ls -d frontend/web/{app,components,lib,lib/api,public,styles}
       ```
       Must list all six directories without error.

    Capture all command outputs in the SUMMARY.md (output path below). The plan is complete when every assertion in `<acceptance_criteria>` below holds.
  </action>
  <verify>
    <automated>
      cd /home/aluno/Downloads/isn20261/frontend/web && \
      pnpm lint && \
      pnpm exec tsc --noEmit && \
      rm -rf .next && \
      pnpm build && \
      [ "$(grep -r 'fonts.googleapis.com' .next/ 2>/dev/null | wc -l)" = "0" ] && \
      [ "$(grep -rE 'fonts\.googleapis\.com|fonts\.gstatic\.com' app components lib styles 2>/dev/null | wc -l)" = "0" ] && \
      ls -d app components lib lib/api public styles >/dev/null && \
      (pnpm dev >/tmp/recommend-a-dev.log 2>&1 &) && \
      sleep 10 && \
      [ "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/)" = "200" ] && \
      [ "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/tokens)" = "200" ] && \
      [ "$(curl -s http://localhost:3000/ | grep -c 'recommend-a')" -ge "1" ] && \
      [ "$(curl -s http://localhost:3000/tokens | grep -c 'Design tokens')" -ge "1" ] && \
      (pkill -f 'next dev' 2>/dev/null || pkill -f 'next-server' 2>/dev/null || true)
    </automated>
  </verify>
  <acceptance_criteria>
    - `cd frontend/web && pnpm lint` exits 0 (FOUND-03 lint portion — final assertion).
    - `cd frontend/web && pnpm exec tsc --noEmit` exits 0 (FOUND-02 strict TS — final assertion).
    - `cd frontend/web && pnpm build` exits 0 AND its output lists both `/` and `/tokens` in the route table.
    - `grep -r "fonts.googleapis.com" frontend/web/.next/ | wc -l` returns exactly `0` (Convention 9 + ROADMAP success #4 — proves no Google Fonts CDN at runtime).
    - `grep -rE "fonts\.googleapis\.com|fonts\.gstatic\.com" frontend/web/app frontend/web/components frontend/web/lib frontend/web/styles | wc -l` returns exactly `0` (defensive source-tree check).
    - `pnpm dev` boots without crashing within 10 seconds (logs at `/tmp/recommend-a-dev.log` show `Ready` or equivalent).
    - `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/` returns `200` (FOUND-06 — root route renders).
    - `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/tokens` returns `200` (FOUND-07 — second route renders, App Router wired).
    - `curl -s http://localhost:3000/` HTML contains the literal string `recommend-a` (proves the page actually rendered, not just an HTTP-200 from a 404 page).
    - `curl -s http://localhost:3000/tokens` HTML contains the literal string `Design tokens`.
    - `ls -d frontend/web/{app,components,lib,lib/api,public,styles}` exits 0 (FOUND-05 — final assertion that all six directories exist).
    - The dev server is stopped after the smoke test (no orphan `next dev` process left running).
  </acceptance_criteria>
  <done>
    Every Phase 1 ROADMAP success criterion is provably met:
    1. `pnpm dev` boots and `/` renders. ✓ (curl 200 + body grep)
    2. `/tokens` renders. ✓ (curl 200 + body grep — App Router multi-route wiring proven)
    3. `pnpm lint` exits 0 AND `pnpm exec tsc --noEmit` exits 0 under strict + noUncheckedIndexedAccess. ✓
    4. Folder skeleton exists AND no Google Fonts CDN at runtime. ✓ (ls + double grep on .next/ + source tree)
  </done>
</task>

</tasks>

<verification>
After both tasks, the entire Phase 1 contract is provably met:
- Two routes exist and render HTTP 200 with correct body text.
- Lint, strict TS, and production build all pass.
- The built output ships zero references to the Google Fonts CDN — Manrope + Inter are self-hosted under `.next/static/media/` per `next/font/google`'s build-time download.
- The folder skeleton (FOUND-05) is final — six directories present, `lib/api/` and `components/` empty, ready for Phase 4 and Phase 3 respectively.
- No `_design-reference/` imports anywhere in `frontend/web/`.
- No XSS vectors (`dangerouslySetInnerHTML`, `eval`, untrusted input rendering) introduced.
</verification>

<success_criteria>
- ROADMAP Phase 1 success criterion #1: `pnpm dev` boots, `/` renders. ✓
- ROADMAP Phase 1 success criterion #2: `/tokens` renders, App Router proven. ✓
- ROADMAP Phase 1 success criterion #3: `pnpm lint` exits 0, `tsc --noEmit` strict exits 0. ✓
- ROADMAP Phase 1 success criterion #4: All required folders exist; Manrope+Inter via `next/font` (not CDN). ✓
- REQ FOUND-03 (lint passes), FOUND-06 (dev boots root), FOUND-07 (second route works) — all closed.
- All seven FOUND-01..07 are now satisfied across plans 01–04.
- Phase 1 ready for `/gsd-execute-phase` follow-up commit + PR into `frontend` (per CLAUDE.md hard rule #5: branch is `feature/issue-90-foundation`, PR target is `frontend`).
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation/01-04-SUMMARY.md` capturing:
- Captured `pnpm build` output (specifically the route table showing `/` and `/tokens`).
- Exact `wc -l` output of the `.next/` font-CDN grep (must be 0).
- Exact `wc -l` output of the source-tree font-CDN grep (must be 0).
- HTTP status codes returned by the dev-server probes for `/` and `/tokens` (both 200).
- Confirmation `pnpm dev` was stopped cleanly (no orphan process).
- Final state of `frontend/web/` tree at end of Phase 1: list of top-level directories and key config files.
- Total Phase 1 artifact count and a one-line "Phase 1 ready for PR into `frontend` branch" sign-off.
</output>
