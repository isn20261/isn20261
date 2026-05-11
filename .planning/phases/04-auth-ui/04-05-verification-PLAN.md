---
phase: 04
plan: 05
type: execute
wave: 3
depends_on: [1, 2, 3, 4]
files_modified: []
autonomous: false
requirements: [AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07]
must_haves:
  truths:
    - "All 16 UI-SPEC verification hooks pass against the shipped Phase 4 surface"
    - "tsc --noEmit, lint, and build all exit 0 for frontend/web"
    - "Manual 3-breakpoint check confirms /login, /register, /forgot, and the AccountMenu popover match the reference design at ~375 / ~768 / 1440 px"
    - "End-to-end manual flow passes: register a new email → observe localStorage → sign out → sign back in (issue #93 acceptance criterion)"
  artifacts:
    - path: ".planning/phases/04-auth-ui/04-05-SUMMARY.md"
      provides: "Phase 4 verification record with grep outputs, browser screenshots, and acceptance-criteria checklist"
      contains: "AUTH-01..07 PASS"
  key_links:
    - from: "all Phase 4 files"
      to: "Phase 2 design tokens"
      via: "no hex literals, no inline px font-sizes outside documented escape hatches"
      pattern: "DSGN-06 verified"
    - from: "/login + /register"
      to: "lib/api/auth + localStorage"
      via: "register-then-sign-in end-to-end"
      pattern: "issue #93 acceptance"
---

<objective>
End-of-phase verification gate. No production code changes. Run every UI-SPEC verification hook, the build/lint/typecheck triumvirate, and the manual 3-breakpoint visual check + register-then-sign-in end-to-end smoke. Fail-fast on any regression.

Purpose: Phase 4 ships seven AUTH requirements (AUTH-01..07) across four prior plans. This plan is the closure gate that proves the goals were met before transition to Phase 5. It is a CHECKPOINT plan — Task 2 (manual verification) requires human input.

Output: A `04-05-SUMMARY.md` documenting all verification results, plus an explicit go/no-go for `/gsd:transition` to Phase 5.
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
@CLAUDE.md
@frontend/web/AGENTS.md
@.planning/phases/04-auth-ui/04-01-SUMMARY.md
@.planning/phases/04-auth-ui/04-02-SUMMARY.md
@.planning/phases/04-auth-ui/04-03-SUMMARY.md
@.planning/phases/04-auth-ui/04-04-SUMMARY.md
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Run all 16 UI-SPEC verification hooks + tsc/lint/build (autonomous)</name>
  <files></files>
  <read_first>
    - .planning/phases/04-auth-ui/04-UI-SPEC.md §"Verification Hooks" (the 16 git grep recipes)
    - frontend/web/AGENTS.md §"How to verify before pushing" (DSGN-06 enforcement greps)
  </read_first>
  <action>
Run every verification hook from UI-SPEC §"Verification Hooks" (all 16) plus the standard tsc/lint/build pipeline. Capture each command's output verbatim into `.planning/phases/04-auth-ui/04-05-SUMMARY.md` under a section `## Automated Verification Results`.

**Step 1 — Run from `frontend/web/`:**

```bash
cd frontend/web && pnpm tsc --noEmit
cd frontend/web && pnpm lint
cd frontend/web && pnpm build
```

All three MUST exit 0. If any fails, STOP — do not proceed to manual verification. Fix in the upstream plan and re-run.

**Step 2 — Run UI-SPEC verification hooks 1–16 (each must produce the expected hit count):**

```bash
cd frontend/web

# Hook 1: No hex / rgba / hsl literals in className strings under (auth)/ or new components.
git grep -nE 'className=.*#[0-9a-fA-F]{3,6}' -- 'app/(auth)/' 'components/Field.tsx' 'components/AccountMenu.tsx'
git grep -nE 'className=.*rgba?\(' -- 'app/(auth)/' 'components/Field.tsx' 'components/AccountMenu.tsx'
# Expected: 0 hits each.

# Hook 2: No inline style props in Phase 4 files.
git grep -nE 'style=\{' -- 'app/(auth)/' 'components/Field.tsx' 'components/AccountMenu.tsx'
# Expected: 0 hits.

# Hook 3: No JSX imports from _design-reference/.
git grep -nE "from ['\"].*_design-reference" -- 'app/' 'components/' 'lib/'
# Expected: 0 hits.

# Hook 4: localStorage key strings centralized — only lib/api/auth.ts contains them.
git grep -nF "'recommend-a.session'" -- 'app/' 'components/' 'lib/'
git grep -nF "'recommend-a.users'" -- 'app/' 'components/' 'lib/'
# Expected: hits ONLY in lib/api/auth.ts.

# Hook 5: No raw <input> for email/password in pages — must go through <Field>.
git grep -nE '<input\s' -- 'app/(auth)/'
# Expected: only the Terms <input type="checkbox"> in register/page.tsx is allowed.

# Hook 6: Copy verbatim — five strings.
git grep -nF "Welcome back." -- 'app/(auth)/login/'
git grep -nF "Make it yours." -- 'app/(auth)/register/'
git grep -nF "Pick up your queue and history." -- 'app/(auth)/login/'
git grep -nF "Save recommendations, build a queue, learn what you love." -- 'app/(auth)/register/'
git grep -nF "I agree to the Terms and Privacy Policy." -- 'app/(auth)/register/'
# Expected: each ≥ 1 hit.

# Hook 7: Validation error copy verbatim.
git grep -nF "Enter a valid email" -- 'app/(auth)/'
git grep -nF "Min 6 characters" -- 'app/(auth)/login/'
git grep -nF "Use at least 8 characters" -- 'app/(auth)/register/'
git grep -nF "Passwords don't match" -- 'app/(auth)/register/'
# Expected: each ≥ 1 hit.

# Hook 8: API-error banner copy verbatim.
git grep -nF "Incorrect email or password." -- 'app/(auth)/login/'
git grep -nF "An account with this email already exists." -- 'app/(auth)/register/'
# Expected: 1 hit each.

# Hook 9: Forgot stub copy.
git grep -nF "Password reset is coming in a future update." -- 'app/(auth)/forgot/'
git grep -nF "← Back to sign in" -- 'app/(auth)/forgot/'
# Expected: 1 hit each. Second tests U+2190 byte-exact.

# Hook 10: Apostrophe sanity — straight ASCII, NOT curly.
git grep -nF "Passwords don't match" -- 'app/(auth)/register/'   # straight (1 hit expected)
git grep -nF "Passwords don't match" -- 'app/(auth)/register/'   # curly (0 hits expected)

# Hook 11: Cognito-shaped error names only in lib/api/auth.ts + page submit handlers.
git grep -nE 'UsernameExistsException|NotAuthorizedException' -- 'app/' 'components/' 'lib/'
# Expected: hits ONLY in lib/api/auth.ts (definitions) and the two page-level submit handlers (catch-and-map blocks).

# Hook 12: Session shape only in lib/api/auth.ts.
git grep -nE 'AccessToken|IdToken|RefreshToken|ExpiresAt' -- 'app/' 'components/' 'lib/'
# Expected: hits ONLY in lib/api/auth.ts.

# Hook 13: Field uses useId().
git grep -nF "useId()" -- 'components/Field.tsx'
# Expected: ≥ 1 hit.

# Hook 14: AccountMenu wired into BOTH Sidebar and Navbar.
git grep -nF "AccountMenu" -- 'components/Sidebar.tsx' 'components/Navbar.tsx'
# Expected: ≥ 1 hit each.

# Hook 15: router.push('/') in both submit handlers.
git grep -nE "router\.push\(['\"]/['\"]?\)" -- 'app/(auth)/login/' 'app/(auth)/register/'
# Expected: 1 hit each.

# Hook 16: MOCK_LATENCY_MS exported.
git grep -nF "MOCK_LATENCY_MS" -- 'lib/api/auth.ts'
# Expected: ≥ 1 hit.
```

**Step 3 — Run AGENTS.md DSGN-06 enforcement greps** (broader scope than UI-SPEC hook 1):
```bash
cd frontend/web
# Phase-wide: no hex inside any className in app/ or components/ (excluding tokens gallery).
git grep -nE 'className=.*#[0-9a-fA-F]{3,6}|#[0-9a-fA-F]{3,6}.*className=' -- 'app/' 'components/' | grep -v 'app/tokens/page.tsx'
# Expected: no output.

# No inline style props in app/ or components/.
git grep -nE 'style=\{' -- 'app/' 'components/'
# Expected: no output.
```

**Step 4 — Capture results into the SUMMARY.** For each hook, record: command, expected, actual, PASS/FAIL. If any FAIL, list the offending file/line and STOP — do not proceed to Task 2 until upstream is fixed.

**Step 5 — Schema sanity check.** Validate that the Phase 4 plan files themselves satisfy the requirement-coverage gate by listing every plan and which AUTH-IDs it claims:
```bash
grep -E "^requirements:" .planning/phases/04-auth-ui/04-*-PLAN.md
```
Confirm the union of all `requirements` arrays across the four prior plans equals exactly `{AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07}`.
  </action>
  <verify>
    <automated>cd frontend/web && pnpm tsc --noEmit && pnpm lint && pnpm build</automated>
    Plus the 16 UI-SPEC verification hooks above. Each must produce its expected hit count.
  </verify>
  <acceptance_criteria>
    - `cd frontend/web && pnpm tsc --noEmit` exits 0.
    - `cd frontend/web && pnpm lint` exits 0.
    - `cd frontend/web && pnpm build` exits 0.
    - Every UI-SPEC verification hook (1–16) produces the expected output (0 hits where forbidden, ≥ 1 hit where required, exact 1 hit where 1 hit is expected).
    - AGENTS.md phase-wide hex / style={ greps return zero output (excluding the documented tokens gallery exception).
    - The seven AUTH requirements (AUTH-01..07) are covered by at least one of the four prior plans' `requirements` frontmatter fields.
    - `04-05-SUMMARY.md` contains a §"Automated Verification Results" section listing every command, expected output, actual output, and PASS/FAIL.
  </acceptance_criteria>
  <done>
    All 16 hooks PASS. SUMMARY records the green automated gate. Manual checkpoint (Task 2) follows.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 2: Manual 3-breakpoint visual + end-to-end register/sign-in/sign-out smoke (human verification)</name>
  <what-built>
    Phase 4 has shipped:
    - `lib/api/auth.ts` — typed Cognito-shaped mock seam (Plan 01)
    - `components/ui/popover.tsx` — shadcn Popover primitive (Plan 01)
    - `components/Field.tsx` — reusable form input with floating label (Plan 02)
    - `app/(auth)/login/page.tsx` — login form with validation + signIn submit (Plan 03)
    - `app/(auth)/register/page.tsx` — register form with validation + signUp submit (Plan 03)
    - `app/(auth)/forgot/page.tsx` — forgot-password stub (Plan 04)
    - `components/AccountMenu.tsx` — popover wrapper with Account + Sign-out items (Plan 04)
    - `components/Sidebar.tsx` and `components/Navbar.tsx` — modified to wrap avatar/greeting in AccountMenu when logged-in (Plan 04)

    Automated gate (Task 1) is GREEN: tsc/lint/build all exit 0; all 16 UI-SPEC verification hooks pass.

    Plan 05 Task 2 is the human checkpoint that closes the four ROADMAP success criteria for Phase 4 (issue #93):
      1. /login + /register match reference design at ~375 / ~768 / 1440
      2. Inline validation errors styled per reference (red border + helper text)
      3. signIn / signUp call the mock seam and write a localStorage session
      4. Logout clears the localStorage session entry
  </what-built>
  <how-to-verify>
**Prep:**

1. Boot the dev server:
   ```bash
   cd frontend/web && pnpm dev
   ```
   Wait for the "ready" message (typically port 3000).

2. Open the dev tools Application tab → Storage → Local Storage. Note the current state of `recommend-a.users` and `recommend-a.session` — clear both before starting if you want a clean slate.

**Step A — End-to-end register/sign-in/sign-out smoke (closes ROADMAP success criteria 3 + 4 + issue #93 acceptance):**

1. Navigate to `http://localhost:3000/register`.
2. Confirm the page renders the AuthShell card + the BrandMark + the verbatim title `Make it yours.` + subtitle + three Fields (Email / Password with hint `At least 8 characters` / Confirm password) + Terms checkbox + `Create account` button.
3. **Test inline validation (closes success criterion 2):**
   - Type a bad email like `foo` → click `Create account` → expect inline error `Enter a valid email` under the email field, red border, and the form does NOT submit (no localStorage write).
   - Fix the email to `demo@example.com`, set password to `short` → expect inline error `Use at least 8 characters` under the password field on next submit.
   - Set password to `validpass1`, leave confirm empty → expect inline error `Passwords don't match` (with STRAIGHT apostrophe — visible on screen rendered the same as ASCII `'`).
   - Match confirm to `validpass1`, leave Terms unchecked → expect inline error `Required` under the Terms row.
   - Check Terms → expect submit to proceed.
4. **Observe localStorage on submit (closes success criterion 3):**
   - In devtools, refresh Local Storage view.
   - Expect `recommend-a.users` to contain a JSON object like `{"demo@example.com":{"password":"validpass1","sub":"<uuid>"}}`.
   - Expect `recommend-a.session` to contain a JSON object with `AccessToken`, `IdToken`, `RefreshToken` (UUIDs), `ExpiresAt` (~now + 1h ms epoch), `user: { email: "demo@example.com", sub: "<uuid>" }`.
   - Expect the URL to be `/` (router.push('/') per D-11).
5. **Test logout (closes success criterion 4 + AUTH-06):**
   - The home page (`/`) is currently the Phase 1 placeholder. Navigate to `/tokens` so the desktop chrome shell mounts (Phase 3 layout group). The Sidebar avatar should show `JR` initials (Phase 3 ships this with `loggedIn={true}` only on routes that pass it explicitly — note: if `/tokens` defaults to `loggedIn={false}`, manually verify on a route that does, e.g. by editing the page temporarily to pass `loggedIn={true}` to `<Sidebar>`, OR by visiting the home `/` page once Phase 5 ships the auth context).
   - Until Phase 5 wires the auth context, the developer can FAKE the logged-in state by editing a page to pass `loggedIn={true}` to the chrome and refresh. **Document in SUMMARY whether the logout test was performed against a faked logged-in state or via Phase 5 integration (Phase 5 is downstream — the manual test here is purely the Phase 4 chrome wiring).**
   - With the chrome showing `loggedIn={true}`, click the Sidebar avatar → expect the AccountMenu popover to open with `Account` (with User icon) and `Sign out` (with LogOut icon, danger color).
   - Click `Sign out` → expect URL to redirect to `/login` and the `recommend-a.session` key to be REMOVED from localStorage. The `recommend-a.users` key should still be present (D-04: signOut does NOT clear users).
6. **Sign back in (closes the issue #93 acceptance criterion):**
   - On `/login`, type `demo@example.com` + `validpass1` → click `Sign in` → expect URL to navigate to `/` and `recommend-a.session` to be re-populated with NEW UUIDs (different from the original session).
7. **Test API-error banner (closes success criterion 3 — failure path):**
   - Sign out (via the AccountMenu) again.
   - On `/login`, type `demo@example.com` + `wrongpassword` → click `Sign in` → expect a red banner above the submit button with copy `Incorrect email or password.` and the form does NOT redirect.
   - On `/register`, type `demo@example.com` (the existing email) + valid password + confirm + Terms → click `Create account` → expect a red banner with copy `An account with this email already exists.`.

**Step B — 3-breakpoint visual check (closes ROADMAP success criterion 1 + AUTH-07):**

For EACH of these three viewport widths (use Chrome DevTools device toolbar):
- ~375px (iPhone SE width)
- ~768px (iPad portrait)
- 1440px (desktop)

Visit `/login`, `/register`, and `/forgot`. Compare against `frontend/_design-reference/auth.jsx:71-160` and the visible reference rendering. Confirm at each breakpoint:
- AuthShell card is centered both axes.
- Card width is `min(420px, calc(100% - 40px))` — at 375px the card is ~335px wide with 20px gutters on either side.
- Title + subtitle + form + bottom-card cluster are all centered.
- Field inputs are full-width inside the card.
- Submit button is full-width, height 56px (h-14).
- Field floating label lifts on focus / when input has content (test by typing and clearing).
- Field show/hide eye toggle works on the password field — clicking swaps `Eye` ↔ `EyeOff` and the input visibility.
- No horizontal scroll at any breakpoint.

**Step C — AccountMenu popover positioning (closes UI-SPEC §Responsive Behavior):**

At 1440px desktop:
- On a route with `loggedIn={true}` chrome, click the Sidebar avatar → popover should open to the RIGHT of the avatar, not clipping the rail.
- Click the Navbar greeting → popover should open BELOW the greeting, right edge aligned to the greeting's right edge (does not clip the viewport edge).
- Press Esc while popover is open → popover closes, focus returns to the trigger.
- Click outside the popover → popover closes.

**Step D — Forgot stub navigation (closes ROADMAP success criterion 1 — full chrome rendering):**

1. From `/login`, click the `Forgot password?` link → expect URL `/forgot`.
2. Confirm the page renders inside the AuthShell card with the title `Reset password — coming soon`, body `Password reset is coming in a future update.`, and a `← Back to sign in` link.
3. Click the back link → expect URL `/login`.

**Step E — Capture results:**

For each step, record in `04-05-SUMMARY.md` under §"Manual Verification Results":
- Step name + sub-step.
- Expected behavior.
- Observed behavior.
- PASS / FAIL.
- Optional: screenshots in `.planning/phases/04-auth-ui/screenshots/` (not required, but helpful for the PR).

If ANY step FAILS, STOP. Do not approve the checkpoint. Open a gap-closure plan via `/gsd-plan-phase 4 --gaps` documenting the failure.
  </how-to-verify>
  <resume-signal>
    Type "approved" if every step in A–E passes. If any step fails, describe the failure(s) verbatim — I will produce a gap-closure plan to fix them.
  </resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Manual smoke → developer's localStorage | Test data persists in dev — developer should clear before / after. |

## STRIDE Threat Register (ASVS L1)

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-04-25 | Information disclosure | Test credentials persisting in dev localStorage | low → **accept** | accept | Mock-only — `recommend-a.users` is dev-machine-local, never deployed. Developer clears before / after smoke testing. The verification SUMMARY documents test creds (`demo@example.com` + `validpass1`) explicitly so future executors clear them rather than reusing. |
| T-04-26 | Tampering | Faked `loggedIn={true}` state during Step A.5 | n/a (test scaffold) → **accept** | accept | The faked logged-in state is a test scaffold for Phase 4 chrome verification only. Phase 5 (AUTH-08..13) wires the real auth context which will replace the faked prop. The SUMMARY explicitly notes this test scaffolding so it doesn't get cargo-culted into Phase 5. |
</threat_model>

<verification>
After this plan ships:
- `.planning/phases/04-auth-ui/04-05-SUMMARY.md` exists with both §"Automated Verification Results" (16 hooks + 3 build commands) and §"Manual Verification Results" (Steps A–E).
- The four ROADMAP success criteria for Phase 4 are explicitly marked PASS in the SUMMARY:
  1. /login + /register match reference design at all 3 breakpoints — PASS / FAIL
  2. Inline validation errors styled per reference — PASS / FAIL
  3. signIn / signUp call the mock seam and write localStorage session — PASS / FAIL
  4. Logout clears the localStorage session — PASS / FAIL
- AUTH-01..07 each marked PASS with their respective evidence locations.
- Issue #93 acceptance criterion ("possibilitar a criação de um usuário e login usando a UI") marked PASS via the register-then-sign-in flow.
</verification>

<success_criteria>
1. Task 1 automated gate: tsc, lint, build, all 16 UI-SPEC hooks pass.
2. Task 2 manual gate: all five Steps (A–E) pass.
3. Phase 4 SUMMARY records all evidence and explicit ROADMAP success-criteria pass markers.
4. User types "approved" — Phase 4 is closed. Next step is `/gsd:transition` to Phase 5.
</success_criteria>

<output>
After completion, finalize `.planning/phases/04-auth-ui/04-05-SUMMARY.md` with:
- §"Automated Verification Results" — every UI-SPEC hook command + expected/actual/PASS-FAIL.
- §"Manual Verification Results" — Steps A–E with observed behavior + PASS/FAIL.
- §"ROADMAP Success Criteria" — explicit PASS/FAIL per criterion (1–4).
- §"Requirement Coverage" — AUTH-01..07 each marked PASS with the plan + file that delivered it.
- §"Issue #93 Acceptance" — register-then-sign-in flow marked PASS with timestamp.
- §"Phase 4 Closure Recommendation" — go/no-go for `/gsd:transition` to Phase 5.
</output>
