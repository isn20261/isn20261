---
phase: 03-layout
plan: 05
type: execute
wave: 4
depends_on: ["03-01", "03-02", "03-03", "03-04"]
files_modified:
  - .planning/phases/03-layout/03-05-VERIFICATION.md
autonomous: false
requirements:
  - LAYT-01
  - LAYT-02
  - LAYT-03
  - LAYT-04
  - LAYT-05
user_setup: []

must_haves:
  truths:
    - "All 5 verification greps from UI-SPEC §Verification Hooks return the expected counts (4 of them must return 0 hits; the middot grep returns ≥ 3 hits)."
    - "`pnpm tsc --noEmit`, `pnpm lint`, and `pnpm build` all exit 0 from `frontend/web/`."
    - "Visiting `/` and `/tokens` in `pnpm dev` shows the chrome (Sidebar + Footer) wrapping the placeholder content / token gallery — URL paths unchanged."
    - "At ~375 px viewport width, NO horizontal scroll appears, the bottom tab bar is visible, the desktop rail is hidden, content has bottom padding clearing the tab bar."
    - "At ~768 px viewport width (and 1440 px), the desktop rail is visible at left, the tab bar is hidden, content is offset by the rail width."
    - "Active sidebar item highlighting works: visiting `/` highlights Home; visiting `/tokens` does NOT highlight any of the 5 nav items (because `/tokens` is not in the NAV_ITEMS array — that's correct)."
  artifacts:
    - path: ".planning/phases/03-layout/03-05-VERIFICATION.md"
      provides: "End-of-phase verification report with all grep results, build/lint/tsc exit codes, 3-breakpoint screenshots or written observations"
      min_lines: 50
  key_links:
    - from: "checkpoint:human-verify task"
      to: "developer running pnpm dev + DevTools 375/768/1440 viewport check"
      via: "manual verification per LAYT-05"
      pattern: "n/a (human gate)"
---

<objective>
End-of-phase verification gate. Run the 5 pinned verification greps from UI-SPEC §Verification Hooks, confirm `pnpm tsc --noEmit` / `pnpm lint` / `pnpm build` are all green, then perform the LAYT-05 3-breakpoint manual visual check at 375 / 768 / 1440 px and capture observations into `03-05-VERIFICATION.md`. This plan exists because LAYT-05 ("Layout components are responsive at ~375px / ~768px / 1440px") cannot be verified by an automated grep — it requires a human eye on a running dev server.

Purpose: Before opening the PR back into `frontend`, prove the full quality gate from UI-SPEC + ROADMAP §"Phase 3" Success Criteria #1-4 is satisfied. This is the gate that LAYT-05 needs and the documented verification hook contract demands.
Output: One markdown report at `.planning/phases/03-layout/03-05-VERIFICATION.md` summarizing all checks, plus a human checkpoint signing off on the 3-breakpoint visual review.
</objective>

<execution_context>
@/home/aluno/Downloads/isn20261/.claude/get-shit-done/workflows/execute-plan.md
@/home/aluno/Downloads/isn20261/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/03-layout/03-CONTEXT.md
@.planning/phases/03-layout/03-UI-SPEC.md
@.planning/phases/03-layout/03-PATTERNS.md
@.planning/phases/03-layout/03-01-deps-and-brand-mark-PLAN.md
@.planning/phases/03-layout/03-02-sidebar-PLAN.md
@.planning/phases/03-layout/03-03-navbar-and-footer-PLAN.md
@.planning/phases/03-layout/03-04-page-layout-and-route-groups-PLAN.md
@frontend/web/AGENTS.md
@CLAUDE.md
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Run all 5 UI-SPEC verification hooks and the build/lint/tsc trio; record results</name>
  <files>.planning/phases/03-layout/03-05-VERIFICATION.md</files>
  <read_first>
    - .planning/phases/03-layout/03-UI-SPEC.md §Verification Hooks (lines 264-288 — the 5 pinned grep recipes)
    - frontend/web/AGENTS.md §"How to verify before pushing" (the DSGN-06 grep recipes — partial overlap with UI-SPEC)
    - All previous Phase-3 SUMMARY files: 03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md, 03-04-SUMMARY.md (so the report can link back to per-plan results)
  </read_first>
  <action>
    Run each command below from `frontend/web/`. Capture exit codes and grep hit counts. Then write `.planning/phases/03-layout/03-05-VERIFICATION.md` with the full results.

    **Verification Hook 1 — No hex/rgba in className** (UI-SPEC §Verification Hooks #1):

    ```bash
    cd frontend/web
    git grep -nE 'className=.*#[0-9a-fA-F]{3,6}' -- 'app/' 'components/' | grep -v 'app/(app)/tokens/page.tsx'
    git grep -nE 'className=.*rgba?\(' -- 'app/' 'components/'
    ```
    Expected: BOTH return 0 lines.

    **Verification Hook 2 — No inline `style={` props except documented exceptions** (UI-SPEC §Verification Hooks #2):

    ```bash
    git grep -nE 'style=\{' -- 'app/' 'components/'
    ```
    Expected: 0 lines (Phase 3's "exception" — SVG `var(--color-*)` references in BrandMark — uses raw HTML attribute syntax `fill="var(--color-on-accent)"`, NOT a `style={...}` prop, so this grep should still return 0 hits).

    **Verification Hook 3 — No JSX imports from `_design-reference/`** (UI-SPEC §Verification Hooks #3):

    ```bash
    git grep -nE "from ['\"].*_design-reference" -- 'app/' 'components/'
    ```
    Expected: 0 lines.

    **Verification Hook 4 — Middot character in 3 places, no hyphen variant** (UI-SPEC §Verification Hooks #4):

    ```bash
    git grep -nF 'Recommend·a' -- 'components/' 'app/'
    git grep -nF 'Recommend-a' -- 'components/' 'app/'
    ```
    Expected: first command returns ≥ 3 hits (BrandMark wordmark, Footer disclaimer, `(auth)/layout.tsx` disclaimer); second command returns 0 hits.

    **Verification Hook 5 — Sidebar uses tokens, not literal 64** (UI-SPEC §Verification Hooks #5):

    ```bash
    git grep -nE '\b64px\b|width:\s*64\b|height:\s*64\b' -- 'components/Sidebar.tsx'
    ```
    Expected: 0 lines.

    **Build / Lint / TS gate:**

    ```bash
    pnpm tsc --noEmit ; echo "tsc=$?"
    pnpm lint        ; echo "lint=$?"
    pnpm build       ; echo "build=$?"
    ```
    Expected: all three exit code 0. Record build output's route table — should include `/` and `/tokens`.

    **Artifact existence (Roadmap §Phase 3 Success Criterion #2: components are reusable in `frontend/web/components/`):**

    ```bash
    test -f components/BrandMark.tsx
    test -f components/Sidebar.tsx
    test -f components/Navbar.tsx
    test -f components/Footer.tsx
    test -f components/PageLayout.tsx
    test -f 'app/(app)/layout.tsx'
    test -f 'app/(auth)/layout.tsx'
    test -f 'app/(app)/page.tsx'
    test -f 'app/(app)/tokens/page.tsx'
    ! test -f app/page.tsx
    ! test -f app/tokens/page.tsx
    ```
    Expected: every one exits 0.

    Now write the report to `.planning/phases/03-layout/03-05-VERIFICATION.md` with the following structure:

    ```markdown
    # Phase 3 — Verification Report

    **Date:** {today's date}
    **Branch:** feature/issue-92-layout
    **Phase:** 03-layout (issue #92)

    ## Verification Hook Results (UI-SPEC §Verification Hooks)

    | # | Check | Expected | Actual | Status |
    |---|-------|----------|--------|--------|
    | 1a | hex in className | 0 | {actual} | PASS/FAIL |
    | 1b | rgba in className | 0 | {actual} | PASS/FAIL |
    | 2 | inline style={ | 0 | {actual} | PASS/FAIL |
    | 3 | _design-reference imports | 0 | {actual} | PASS/FAIL |
    | 4a | Recommend·a (middot) | >= 3 | {actual} | PASS/FAIL |
    | 4b | Recommend-a (hyphen) | 0 | {actual} | PASS/FAIL |
    | 5 | 64px in Sidebar.tsx | 0 | {actual} | PASS/FAIL |

    ## Toolchain Gate

    | Command | Exit Code | Status |
    |---------|-----------|--------|
    | pnpm tsc --noEmit | {code} | PASS/FAIL |
    | pnpm lint | {code} | PASS/FAIL |
    | pnpm build | {code} | PASS/FAIL |

    Build output route table:
    {paste relevant lines from `pnpm build` showing `/` and `/tokens` routes}

    ## Artifact Existence

    | Path | Status |
    |------|--------|
    | components/BrandMark.tsx | EXISTS / MISSING |
    | components/Sidebar.tsx | EXISTS / MISSING |
    | components/Navbar.tsx | EXISTS / MISSING |
    | components/Footer.tsx | EXISTS / MISSING |
    | components/PageLayout.tsx | EXISTS / MISSING |
    | app/(app)/layout.tsx | EXISTS / MISSING |
    | app/(auth)/layout.tsx | EXISTS / MISSING |
    | app/(app)/page.tsx | EXISTS / MISSING |
    | app/(app)/tokens/page.tsx | EXISTS / MISSING |
    | app/page.tsx (must be REMOVED) | REMOVED / STILL EXISTS |
    | app/tokens/page.tsx (must be REMOVED) | REMOVED / STILL EXISTS |

    ## Requirements Coverage

    | Requirement | Plan(s) Implementing | Verified Via |
    |-------------|----------------------|--------------|
    | LAYT-01 Navbar | 03-03 | components/Navbar.tsx exists, exports `Navbar` named, two variants |
    | LAYT-02 Sidebar | 03-02 | components/Sidebar.tsx exists, "use client", usePathname, 5 NAV_ITEMS |
    | LAYT-03 Footer | 03-03 | components/Footer.tsx exists, contains middot disclaimer + 2 stubs |
    | LAYT-04 Page wrapper | 03-04 | components/PageLayout.tsx exists, composes Sidebar + header? + children + Footer; (app)/layout.tsx wraps in PageLayout |
    | LAYT-05 Responsive 375/768/1440 | 03-02, 03-04 + manual check (Task 2) | Tailwind `md:` breakpoint utilities + manual viewport check |

    ## Notes / Deviations

    {Any deviations from UI-SPEC, escape hatches added, tokens promoted to globals.css, etc. Should ideally be empty — UI-SPEC pre-locked all decisions.}
    ```

    If ANY verification hook returns unexpected counts or any toolchain command exits non-zero: STOP. Report the failure clearly in the report and DO NOT advance to Task 2 (the manual checkpoint). The phase is not ready to ship.
  </action>
  <verify>
    <automated>cd frontend/web && pnpm tsc --noEmit && pnpm lint && pnpm build && test -f ../../.planning/phases/03-layout/03-05-VERIFICATION.md</automated>
  </verify>
  <acceptance_criteria>
    - `cd frontend/web && pnpm tsc --noEmit` exits 0 (recorded in report).
    - `cd frontend/web && pnpm lint` exits 0 (recorded in report).
    - `cd frontend/web && pnpm build` exits 0 (recorded in report) AND build output route table includes `/` and `/tokens`.
    - All 5 UI-SPEC verification hooks return their expected counts:
      - Hook 1a (hex in className): 0 hits
      - Hook 1b (rgba in className): 0 hits
      - Hook 2 (inline style={ ): 0 hits
      - Hook 3 (_design-reference imports): 0 hits
      - Hook 4a (Recommend·a with middot): >= 3 hits
      - Hook 4b (Recommend-a with hyphen): 0 hits
      - Hook 5 (literal 64 in Sidebar.tsx): 0 hits
    - All 5 component files exist; both route-group layouts exist; both migrated pages exist; both old `app/page.tsx` and `app/tokens/page.tsx` are removed.
    - `.planning/phases/03-layout/03-05-VERIFICATION.md` exists with all four tables filled in (Verification Hook Results, Toolchain Gate, Artifact Existence, Requirements Coverage).
    - The report's "Notes / Deviations" section is either empty OR explicitly lists every escape hatch / promoted token / drift acceptance with rationale.
  </acceptance_criteria>
  <done>
    Automated verification report written; all 5 UI-SPEC hooks pass; tsc + lint + build all green; all artifacts in place. The phase is mechanically verified — only the 3-breakpoint visual check (Task 2) remains.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 2: Human 3-breakpoint visual verification (LAYT-05)</name>
  <what-built>
    Phase 3 chrome (Sidebar + Navbar + Footer + PageLayout + AuthShell) wrapping the existing Phase-1 placeholder root page and the Phase-2 token gallery. Per ROADMAP §"Phase 3" Success Criterion #3 (and milestone CLAUDE.md acceptance bar) the layout MUST match the reference at three breakpoints (~375 / ~768 / 1440 px) with no horizontal scroll at 375.
  </what-built>
  <how-to-verify>
    1. From `frontend/web/`, start the dev server: `pnpm dev`. Wait for `Local: http://localhost:3000` in the console.

    2. Open Chrome (or Firefox) DevTools → toggle Device Toolbar (Cmd-Shift-M / Ctrl-Shift-M).

    3. **Mobile breakpoint (~375 px) — visit `http://localhost:3000/`:**
       - Set viewport to **375 × 812** (iPhone X size).
       - Verify: NO horizontal scroll bar visible. The desktop left rail is HIDDEN. The bottom tab bar is VISIBLE at exactly 64 px height with 5 items (Home / History / Pick / Watch later / Preferences). The central Pick item shows a 52 × 52 amber circle with a soft amber glow shadow. Content (`recommend-a — coming soon` + paragraph + token-page link) is visible above the tab bar — the bottom of the content is NOT hidden behind the fixed tab bar (because of the `pb-tab` offset). Footer with disclaimer + About/Privacy stubs is visible by scrolling — it appears ABOVE the fixed tab bar inside the scrollable content area.
       - Click the central Pick CTA — URL changes to `/recommendation` (will 404 — fine, that's Phase 7).
       - Use the browser back button to return to `/`. The Home item should now be highlighted (in this case highlight is just `text-text-primary` color since mobile tab bar's active style is text-color only, not the rail's amber bar).

    4. **Tablet breakpoint (~768 px) — same URL `http://localhost:3000/`:**
       - Set viewport to **768 × 1024**.
       - Verify: At exactly 768 px the rail SHOULD be visible (Tailwind's `md:` = `min-width: 768px`). The bottom tab bar should be HIDDEN. The rail shows BrandMark at top + 5 nav icons + bottom avatar. Content is offset by 64 px from the left (the `md:pl-rail`). NO horizontal scroll. Footer renders in row layout (`md:flex-row`).

    5. **Desktop breakpoint (1440 px) — same URL:**
       - Set viewport to **1440 × 900**.
       - Verify: Same desktop chrome as 768 px. Content fills the wider area. Rail still 64 px wide at left. Footer in row layout.

    6. **Active state — visit `http://localhost:3000/tokens`:**
       - At desktop viewport (≥ 768): NONE of the 5 sidebar items should be highlighted (`/tokens` is not in the 5-route NAV_ITEMS — that's expected; `/tokens` is a meta route). The token gallery renders with its swatches inside the chrome.
       - URL path is exactly `/tokens` (NOT `/(app)/tokens` — confirms route groups are URL-cosmetic per CONTEXT D-06).

    7. **(auth) layout — visit `http://localhost:3000/login`:**
       - This will 404 (Phase 4 hasn't shipped pages yet). That is the EXPECTED state — confirm the 404 is the standard Next.js 404 (NOT a stack trace, NOT a build error). The `(auth)` layout file exists but with no child page, Next.js does not generate a route — this is correct behavior.

    8. **Hover and focus states (desktop only):**
       - Hover over an inactive sidebar item — icon color should transition from muted to primary over ~150 ms.
       - Tab through the sidebar with the keyboard — each item should show a focus ring.

    9. Document the verification: append a section to `.planning/phases/03-layout/03-05-VERIFICATION.md`:

       ```markdown
       ## Manual 3-Breakpoint Check (LAYT-05)

       **Verified by:** {your name / handle}
       **Date:** {today}

       | Breakpoint | URL | Horizontal scroll? | Sidebar visible? | Tab bar visible? | Footer visible? | Pass? |
       |-----------|-----|--------------------|------------------|------------------|-----------------|-------|
       | 375 × 812 | / | NO | hidden | yes | yes (above tab bar) | PASS/FAIL |
       | 768 × 1024 | / | NO | yes (rail) | hidden | yes (row layout) | PASS/FAIL |
       | 1440 × 900 | / | NO | yes (rail) | hidden | yes (row layout) | PASS/FAIL |
       | 1440 × 900 | /tokens | NO | yes (rail) | hidden | yes | PASS/FAIL |
       | 1440 × 900 | /login | n/a (404 expected) | n/a | n/a | n/a | PASS (404 is expected) |

       **Notes / discrepancies vs reference design:**
       {Any visual drift you spotted vs `_design-reference/`. Acceptable drift: 2-4 px. Larger drift: file as a deferred polish ticket.}
       ```
  </how-to-verify>
  <resume-signal>
    Type `approved` to accept the visual review and unlock Phase 3 PR creation. Type `issues: {description}` to flag specific drift / breakage that requires a Plan 06 fixup before merging. Type `revise: {plan-id}` to send a specific Plan back to the planner.
  </resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| n/a (verification only) | This plan runs greps and a dev server. No new code, no new attack surface. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-03-15 | Tampering | Verification report | accept | Report is human-authored Markdown captured into `.planning/`. Standard git commit attribution applies. |
| T-03-16 | Repudiation | Manual checkpoint | mitigate | The `resume-signal` handshake (`approved` / `issues: ...` / `revise: ...`) is captured in the GSD execution log; the verifier name is recorded in the manual-check section of `03-05-VERIFICATION.md`. |
</threat_model>

<verification>
- All 5 UI-SPEC verification hooks pass with documented expected counts.
- `pnpm tsc --noEmit` / `pnpm lint` / `pnpm build` all exit 0.
- `.planning/phases/03-layout/03-05-VERIFICATION.md` exists and is complete (all four automated tables + the manual 3-breakpoint table).
- Human checkpoint signed off (`approved` resume signal received).
</verification>

<success_criteria>
- Phase 3 is mechanically and visually verified ready to ship.
- All 5 LAYT requirements (LAYT-01..05) have a documented PASS in the requirements coverage table.
- ROADMAP §"Phase 3" Success Criteria #1 (chrome visible on routes), #2 (reusable components in `components/`), #3 (3-breakpoint match, no 375 horizontal scroll), #4 (page wrapper exposes content slot) are all confirmed.
- The PR opening into `frontend` (issue #92) is unblocked.
</success_criteria>

<output>
After completion, create `.planning/phases/03-layout/03-05-SUMMARY.md` covering:
- Verification hook results (one line per hook)
- Toolchain gate exit codes
- Manual 3-breakpoint summary (PASS/FAIL per breakpoint)
- The human verifier's `resume-signal` value
- Link to `03-05-VERIFICATION.md` for the full report
- Recommendation: `READY TO SHIP` or `BLOCKED — see {plan-id} fixup`
</output>
