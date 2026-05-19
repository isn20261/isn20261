---
phase: 13-recommendation-lambda-integration
plan: 04
type: execute
wave: 4
depends_on:
  - 13-01
  - 13-02
  - 13-03
files_modified: []
autonomous: false
requirements:
  - INTG-RECO-01
  - INTG-RECO-02
user_setup: []
must_haves:
  truths:
    - "Visiting /recommendation while authenticated triggers a real GET /api/v1/recommend request visible in DevTools Network — Authorization: Bearer header present — and the rendered title + 'Watch on {service}' CTA href match the Lambda response."
    - "Cutting the network (DevTools Offline) on /recommendation renders the wrapper's error-class-aware UX (sonner toast + 'Try again' button) — not a blank page, not an unhandled exception."
    - "git grep -ni 'mock' frontend/web/lib/api/recommend* returns 0 hits."
    - "git grep -nE 'from \"@/lib/api/recommend\"' frontend/web/app/\\(app\\)/recommendation/page.tsx returns 0 hits (recommendation screen imports route through recommend.real only)."
    - "The 'Similar films' rail is not visible on the /recommendation screen at any breakpoint, and the layout above it (poster header, where-to-watch row, cast/director grid) matches the Phase 7 design reference within the constraint that 8 Phase-7-only fields are conditionally omitted."
    - "Phase 14/15/16 screens (preferences, watch-later, MovieCard usages, HistoryRow usages) still compile and render — the recommend.ts keep-list is intact."
    - "An empty/null payload code path is reachable: code inspection confirms getRecommendationReal returns Result<RecommendedMovie | null, ApiError> and the screen branches on status === 'empty'. (Live forcing of an empty payload is impossible against the current Lambda which always returns a movie — documented as a defensive code path in the SUMMARY.)"
  artifacts:
    - path: ".planning/phases/13-recommendation-lambda-integration/13-04-SUMMARY.md"
      provides: "End-of-phase verification report: automated grep gates results, manual smoke results (online + offline), screenshot evidence references, Phase 13 closure attestation."
      contains: "Block A, Block B, Block C, Block D, Block E"
  key_links:
    - from: "verification gate (this plan)"
      to: "ROADMAP §Phase 13 Success Criteria 1–4"
      via: "automated grep block + manual smoke block + code-inspection block"
      pattern: "Success Criterion 1|Success Criterion 2|Success Criterion 3|Success Criterion 4"
---

<objective>
End-of-phase verification gate for Phase 13. Combines automated grep gates (executable by Claude), code-inspection gates (executable by Claude), and a manual live-AWS smoke walkthrough (user-driven via a `checkpoint:human-verify` step). The outcome is a `13-04-SUMMARY.md` that attests each of the four ROADMAP success criteria, plus the implicit success criteria from the verification anchoring (similar-films rail hidden, keep-list intact).

Purpose: Phase 13 is the first per-screen integration in v2.0. The four success criteria are observable behaviors against live AWS infrastructure, not just static code shape. The automated gates in plans 13-01/02/03 prove the code SHAPE; this plan proves the RUNTIME behavior. The manual smoke mirrors Phase 12's Scenario harness pattern (12-04-SUMMARY.md) so future v2.0 phases inherit a consistent verification rhythm.

Output: `.planning/phases/13-recommendation-lambda-integration/13-04-SUMMARY.md` with five blocks (A–E) attested, plus the closure recommendation (OK to open PR `feature/issue-132-reco-integration` → `backend-integration`).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/13-recommendation-lambda-integration/13-CONTEXT.md
@.planning/phases/13-recommendation-lambda-integration/13-01-type-narrowing-and-adapter-PLAN.md
@.planning/phases/13-recommendation-lambda-integration/13-02-screen-swap-and-states-PLAN.md
@.planning/phases/13-recommendation-lambda-integration/13-03-mock-deletion-PLAN.md
@.planning/phases/12-secure-lambda-fetch-wrapper/12-04-PLAN.md
@frontend/web/lib/api/recommend.real.ts
@frontend/web/lib/api/recommend.ts
@frontend/web/app/(app)/recommendation/page.tsx
@frontend/web/app/(app)/(protected)/smoke/page.tsx
@frontend/_design-reference/detail.jsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Block A — Automated grep gates against ROADMAP success criterion #2</name>
  <files></files>
  <read_first>
    - .planning/ROADMAP.md §"Phase 13: Recommendation Lambda Integration" Success Criteria 1–4
    - .planning/phases/13-recommendation-lambda-integration/13-CONTEXT.md §"Mock-deletion scope"
  </read_first>
  <action>
    Run each of the following grep gates and record exit code + (if non-empty) the matching lines. The expected result is documented per gate; record PASS / FAIL per gate in the Block A section of the SUMMARY.

    Gate A1 — recommend* contains no "mock" (case-insensitive, word or substring):
    `git grep -ni 'mock' frontend/web/lib/api/recommend.ts frontend/web/lib/api/recommend.real.ts`
    Expected: empty output, exit 1.

    Gate A2 — recommendation screen imports route through recommend.real only:
    `git grep -nE 'from "@/lib/api/recommend"' 'frontend/web/app/(app)/recommendation/page.tsx'`
    Expected: empty output, exit 1.
    `git grep -nE 'from "@/lib/api/recommend.real"' 'frontend/web/app/(app)/recommendation/page.tsx'`
    Expected: exactly one match.

    Gate A3 — the deleted symbols are gone from recommend.ts:
    `git grep -nE '\b(MOVIES|getRecommendation|getSimilar|PICK_LATENCY_MS)\b' frontend/web/lib/api/recommend.ts`
    Expected: empty output, exit 1. (Note: `getRecommendation` matches the bare name only — `getRecommendationReal` in `recommend.real.ts` is a different word and a different file.)

    Gate A4 — the keep-list is intact in recommend.ts (count exact, do not miscount):
    `git grep -cE '^export (type|const) (Movie|Service|STREAMING_SERVICES|MOODS|RATINGS|Rating|posterUrl|backdropUrl)\b' frontend/web/lib/api/recommend.ts`
    Expected: ≥ 8 (one per kept export — Movie, Service, STREAMING_SERVICES, MOODS, RATINGS, Rating, posterUrl, backdropUrl).

    Gate A5 — recommendation/page.tsx exposes the four discriminated render states:
    `git grep -nE '"(loading|ready|empty|error)"' 'frontend/web/app/(app)/recommendation/page.tsx' | wc -l`
    Expected: ≥ 4 distinct literal-string occurrences.

    Gate A6 — similar-films rail comment marker present:
    `git grep -nE 'similar-films rail hidden' 'frontend/web/app/(app)/recommendation/page.tsx'`
    Expected: ≥ 1 hit. (Exact phrasing fixed by plan 13-02's task action.)

    Gate A7 — DSGN-06 hex / inline-style audit on the modified file:
    `git grep -nE 'style=\{' 'frontend/web/app/(app)/recommendation/page.tsx'`
    Expected: empty output.
    `git grep -nE 'className=.*#[0-9a-fA-F]{3,6}' 'frontend/web/app/(app)/recommendation/page.tsx'`
    Expected: empty output.
    (The existing `bg-[linear-gradient(to_bottom,rgba(...))]` literals stay — they were present pre-Phase-13 and are documented in the file header as load-bearing escape hatches.)

    Gate A8 — Watch-on CTA is a real anchor with safe rel attribute:
    `git grep -nE 'rel="noopener noreferrer"' 'frontend/web/app/(app)/recommendation/page.tsx'`
    Expected: ≥ 1 hit (the Watch-on `<a>` CTA).

    Gate A9 — `/smoke` page is still on disk (Phase 17 owns deletion):
    `ls 'frontend/web/app/(app)/(protected)/smoke/page.tsx'`
    Expected: exit 0; file present.

    Gate A10 — recommend.real.ts contract surface:
    `git grep -nE 'export (type|interface) RecommendationResponse' frontend/web/lib/api/recommend.real.ts`
    Expected: ≥ 1 hit.
    `git grep -nE 'export (type|interface) RecommendedMovie' frontend/web/lib/api/recommend.real.ts`
    Expected: ≥ 1 hit.
    `git grep -nE 'Promise<Result<RecommendedMovie \| null, ApiError>>' frontend/web/lib/api/recommend.real.ts`
    Expected: ≥ 1 hit (signature line of getRecommendationReal).

    Record results inline in the SUMMARY's Block A table: gate id | command | expected | actual | PASS/FAIL.
  </action>
  <verify>
    <automated>cd /home/aluno/Downloads/isn20261 &amp;&amp; ! git grep -ni 'mock' frontend/web/lib/api/recommend.ts frontend/web/lib/api/recommend.real.ts &amp;&amp; ! git grep -nE 'from "@/lib/api/recommend"' 'frontend/web/app/(app)/recommendation/page.tsx' &amp;&amp; git grep -nE 'from "@/lib/api/recommend.real"' 'frontend/web/app/(app)/recommendation/page.tsx' &amp;&amp; ! git grep -nE '\b(MOVIES|getRecommendation|getSimilar|PICK_LATENCY_MS)\b' frontend/web/lib/api/recommend.ts</automated>
  </verify>
  <acceptance_criteria>
    - All 10 gates (A1 through A10) execute and record PASS in the Block A table of the SUMMARY.
    - The compound `<automated>` verify command — which chains the four most load-bearing gates (mock removed, recommendation screen does NOT import recommend.ts, recommendation screen DOES import recommend.real, deleted-symbol-list is gone from recommend.ts) — exits 0.
    - If any gate fails, the SUMMARY records the failure and the executor does NOT proceed to the manual smoke block. Failure here means plan 13-01/02/03 left work undone.
  </acceptance_criteria>
  <done>
    Block A of `13-04-SUMMARY.md` is filled in with 10 PASS rows, OR the executor has surfaced a specific failure pointing back at the responsible plan (13-01, 13-02, or 13-03) for revision.
  </done>
</task>

<task type="auto">
  <name>Task 2: Block B — Build / lint / typecheck gates</name>
  <files></files>
  <read_first>
    - frontend/web/package.json (verify `lint`, `tsc` or `typecheck`, `build` scripts exist)
  </read_first>
  <action>
    Run the three core gates and record exit codes in the Block B section of the SUMMARY.

    Gate B1: `cd frontend/web && pnpm tsc --noEmit` — expected exit 0.
    Gate B2: `cd frontend/web && pnpm lint` — expected exit 0.
    Gate B3: `cd frontend/web && pnpm build` — expected exit 0.

    If any gate fails, capture the last 40 lines of stderr/stdout in the SUMMARY for diagnosis. Pass means the 6 consumer files of `recommend.ts` (preferences, watch-later, MovieCard, HistoryRow, ServiceBadge, and the smoke page transitively via recommend.real) all still resolve their imports under strict TypeScript.
  </action>
  <verify>
    <automated>cd /home/aluno/Downloads/isn20261/frontend/web &amp;&amp; pnpm tsc --noEmit &amp;&amp; pnpm lint &amp;&amp; pnpm build</automated>
  </verify>
  <acceptance_criteria>
    - All three gates exit 0.
    - Block B of the SUMMARY records exit codes plus a one-line note per gate (e.g. "B1: pnpm tsc --noEmit → exit 0, 0 errors").
  </acceptance_criteria>
  <done>
    Block B is filled with three PASS rows or actionable failure logs.
  </done>
</task>

<task type="auto">
  <name>Task 3: Block C — Code-inspection gates for empty / error / data branches</name>
  <files></files>
  <read_first>
    - frontend/web/app/(app)/recommendation/page.tsx (final post-plan-13-02 form)
    - frontend/web/lib/api/recommend.real.ts (final post-plan-13-01 form)
    - frontend/web/lib/api/useApiErrorUx.ts (the error-class routing source)
  </read_first>
  <action>
    Read each file (one Read call per file is enough — extract everything in one pass) and verify the four code-inspection items below. Each item is a structural assertion that the runtime behavior is wired correctly. Record PASS or FAIL with a 1-2 line evidence quote in the Block C section of the SUMMARY.

    C1 — Empty-payload branch exists. `recommendation/page.tsx` contains a render branch keyed on `status === "empty"` that renders the empty-state copy (not a skeleton, not a crash). Evidence: quote the JSX block. The Lambda always returns a movie today, so this is a defensive code path; the existence of the branch is the verifiable artifact.

    C2 — Error-payload branch fires useApiErrorUx. `recommendation/page.tsx` contains `useApiErrorUx(error)` at the component top level, and the error setter is called from the `if (!res.ok)` arm of `fetchOne`. Evidence: quote both the hook invocation and the `setError(res.error)` call.

    C3 — Adapter is the sole kebab-key reader. Across `frontend/web/`, the string `"streaming-services"` (the kebab key) appears ONLY in `lib/api/recommend.real.ts`. Verify via `git grep -n '"streaming-services"' frontend/web/`. Expected: all hits are in `frontend/web/lib/api/recommend.real.ts` (the type definition and the adapter's bracket-string read).

    C4 — Live deep-link is wired. `recommendation/page.tsx` contains an anchor whose href reads from `streamingServices[0].url` (or the equivalent destructured `primaryService.url`). Evidence: quote the `<a href={...}>` line.

    Record results in the Block C table: id | assertion | file:line | PASS/FAIL.
  </action>
  <verify>
    <automated>cd /home/aluno/Downloads/isn20261 &amp;&amp; git grep -nE 'status === "empty"' 'frontend/web/app/(app)/recommendation/page.tsx' &amp;&amp; git grep -n 'useApiErrorUx' 'frontend/web/app/(app)/recommendation/page.tsx' &amp;&amp; test $(git grep -lc '"streaming-services"' frontend/web | wc -l) -le 1 &amp;&amp; git grep -nE 'streamingServices\[0\]' 'frontend/web/app/(app)/recommendation/page.tsx'</automated>
  </verify>
  <acceptance_criteria>
    - C1 PASS: an `status === "empty"` branch is structurally present.
    - C2 PASS: `useApiErrorUx(error)` invocation present AND `setError(res.error)` call present.
    - C3 PASS: `"streaming-services"` (with the literal quotes) appears in at most one file (`recommend.real.ts`).
    - C4 PASS: an `<a>` whose href reads from `streamingServices[0].url` (or the destructured local) is present.
    - The compound `<automated>` command exits 0.
  </acceptance_criteria>
  <done>
    Block C is filled with four PASS rows or actionable failure references.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
    Phase 13 — recommendation screen now consumes the live `/api/v1/recommend` Lambda through the Phase 12 fetch wrapper. The four ROADMAP success criteria (live data rendered, mock-free code path, network-cut error UX, empty-state defensive branch) are all in code. Automated gates A / B / C have passed. The remaining verification is the live-AWS smoke walkthrough — only the user can run this because it requires their AWS environment (the same one that was deferred in Phase 12-04 per STATE.md: "Phase 12 live-AWS smoke deferred until user is back at home AWS environment").
  </what-built>
  <how-to-verify>
    Pre-flight (one-time):
    1. Confirm `.env.local` in `frontend/web/` has `NEXT_PUBLIC_API_BASE_URL` pointing at the dev API Gateway (the same value Phase 12 used).
    2. Confirm `pulumi stack output` (in your home AWS environment) still shows the `recommend` Lambda wired at `/api/v1/recommend` and that the JWT authorizer is attached (per `__main__.py:321`). If `origin/main`'s PR #137 has been merged anywhere, do NOT pull it onto `backend-integration` — that PR strips JWT from dev routes and masks the auth path (CONTEXT §"Architecture / Strategy" decision: do not merge main yet).
    3. From `frontend/web/`, run `pnpm dev`. Open `http://localhost:3000`.

    Scenario 1 — Live data renders (ROADMAP success criterion #1):
    a. Sign in with a confirmed Cognito user (the same flow Phase 12 smoke used).
    b. Open DevTools → Network panel, filter on `recommend`.
    c. Navigate to `/recommendation`.
    d. Expected: exactly one `GET <NEXT_PUBLIC_API_BASE_URL>/api/v1/recommend` request appears, with `Authorization: Bearer eyJ...` header. Status 200.
    e. Expected: the rendered title matches the response body's `title` field. The "Watch on {service}" button label matches `streaming-services[0].name`. Clicking the button opens `streaming-services[0].url` in a new tab.
    f. Click "Recommend another". Expected: a second `GET /api/v1/recommend` appears in Network; the title updates (or stays the same if RNG returns the same movie — the network call is the success bar, not the title diff).
    Record: title rendered, response body sample, button href value, screenshot of the rendered page.

    Scenario 2 — Network-cut renders error UX (ROADMAP success criterion #3):
    a. Still signed in, on `/recommendation` with a successful render visible.
    b. DevTools → Network → toggle "Offline" (or "Throttling: Offline").
    c. Click "Recommend another".
    d. Expected: a sonner toast appears with copy similar to "Network error. Please check your connection." (exact copy is whatever `client.ts:240-249` produces). The screen transitions to the error branch showing eyebrow "Something went wrong", the heading copy from plan 13-02, body "We couldn't load a recommendation right now.", and a "Try again" accent button.
    e. Toggle Network back to "Online". Click "Try again". Expected: a fresh `GET /api/v1/recommend` succeeds and the screen returns to the data branch.
    Record: toast appeared yes/no, error screen screenshot, recovery confirmed yes/no.

    Scenario 3 — Similar-films rail is hidden (verification-anchoring criterion #5):
    a. On `/recommendation` (data branch), scroll to the bottom of the rendered page.
    b. Expected: no "Similar films" heading visible. No horizontal-scrolling MovieCard list visible.
    c. View source / DevTools Elements: locate the JSX comment marker containing "similar-films rail hidden" — it should be in the DOM as an HTML comment OR absent from the rendered DOM entirely (Next.js can strip JSX comments at build). Either is acceptable; the source-level grep gate in Block A already proved the comment is in the file.
    Record: screenshot showing the section below cast/director ends cleanly with no rail.

    Scenario 4 — Phase 7 fields gracefully omitted (verification-anchoring criterion implicit in success criterion #1):
    a. On `/recommendation` (data branch), inspect the metadata strip below the title.
    b. Expected: the strip shows ONLY the genre (e.g. "crime" capitalized to "Crime"). It does NOT show `undefined% match`, `undefined`, `undefined`, or em-dashes for year/runtime/rating/match.
    c. Expected: no synopsis paragraph appears (the Lambda returns no synopsis).
    d. Expected: no Director / Cast grid appears (the Lambda returns neither).
    Record: screenshot of the data branch showing only title + genre + Where-to-watch + actions.

    Scenario 5 — Phase 14/15/16 screens still render (verification-anchoring criterion #6):
    a. Navigate to `/preferences`. Expected: page renders without error; STREAMING_SERVICES / MOODS / RATINGS / Rating still resolve. Pick a preference; no crash.
    b. Navigate to `/watch-later`. Expected: page renders; `type Movie` still resolves. List shows whatever localStorage holds.
    c. Navigate to `/history` (Phase 9 screen). Expected: page renders; `posterUrl` from HistoryRow still works.
    Record: each route loads cleanly, no console error related to imports from `@/lib/api/recommend`.

    Scenario 6 — `/smoke` is still operational (CONTEXT §"Phase 12 cleanup"):
    a. Navigate to `/smoke`.
    b. Click "Refresh session info". Expected: session preview renders.
    c. Click "Call getRecommendationReal()". Expected: the JSON output shows `{ ok: true, data: { title: "...", genre: "...", streamingServices: [...] } }` — note the post-adapter camelCase shape.
    Record: screenshot of the JSON pane showing the camelCase adapter output.

    If ANY scenario fails: do NOT type "approved". Describe the failure in the response signal so plan 13-01 / 13-02 / 13-03 can be revised.
  </how-to-verify>
  <resume-signal>
    Type "approved" if Scenarios 1–6 all passed. Otherwise describe which scenario failed and what was observed.
  </resume-signal>
</task>

<task type="auto">
  <name>Task 5: Block E — Write 13-04-SUMMARY.md attesting all gates and the closure recommendation</name>
  <files>
    - .planning/phases/13-recommendation-lambda-integration/13-04-SUMMARY.md
  </files>
  <read_first>
    - .planning/phases/12-secure-lambda-fetch-wrapper/12-04-PLAN.md (Phase 12 verification SUMMARY structure — mirror this format for consistency)
    - The Block A / B / C tables already filled in by Tasks 1–3
    - The user's response signal from the manual smoke checkpoint (Task 4) — quote the user's "approved" or failure description directly
  </read_first>
  <action>
    Write `.planning/phases/13-recommendation-lambda-integration/13-04-SUMMARY.md` with the following sections:

    ## Phase 13 Verification Summary

    Date: (executor fills with today)
    Branch: `feature/issue-132-reco-integration` off `backend-integration`
    Plans verified: 13-01, 13-02, 13-03

    ## Block A — Automated grep gates (10 gates)
    Table: id | command | expected | actual | PASS/FAIL.
    Populate from Task 1 output.

    ## Block B — Build / lint / typecheck (3 gates)
    Table: id | command | exit code | PASS/FAIL.
    Populate from Task 2 output.

    ## Block C — Code-inspection gates (4 assertions)
    Table: id | assertion | file:line | PASS/FAIL.
    Populate from Task 3 output.

    ## Block D — Manual live-AWS smoke (6 scenarios)
    Quote the user's response signal from Task 4. For each of the 6 scenarios, record PASS / FAIL / SKIPPED-AWS-DEFERRED. If the user typed "approved", mark all 6 PASS and reference the scenario descriptions from Task 4. If the user reported a failure, mark the failing scenario FAIL with their description.

    ## Block E — Closure recommendation
    State explicitly:
    - Whether all 23 gates (10 A + 3 B + 4 C + 6 D) passed.
    - Whether ROADMAP §Phase 13 Success Criteria #1, #2, #3, #4 are each ATTESTED (each criterion maps to specific blocks: #1 → Scenario 1 + Gate A2 + Gate A10; #2 → Gate A1 + Gate A2 + Gate A3 + Gate A4; #3 → Scenario 2 + Gate C2; #4 → Scenario 4 + Gate C1 (with the documented note that an empty payload is a defensive code path against the current Lambda)).
    - Whether implicit criteria #5 (similar-films rail hidden) and #6 (keep-list intact / Phase 14/15/16 still compile) are ATTESTED (Gate A6 + Scenario 3 → #5; Gate A4 + Gate B1 + Scenario 5 → #6).
    - Final recommendation: "Phase 13 OK to PR" OR "Phase 13 BLOCKED — see Block X scenario Y".

    ## Post-phase pending items (forward into STATE.md)
    - `/smoke` page deletion remains a Phase 17 todo (already in STATE.md — re-affirm).
    - Issue #70 (OMDb + Streaming Availability enrichment) is the upgrade path for the conditionally-omitted Phase 7 fields and for restoring the Similar Films rail.
    - The placeholder `kind: "included"` on ServiceBadge will be replaced by real tier data once issue #70 lands.

    Write the file in Markdown. No fenced code blocks except for the grep gate commands and quoted file:line snippets — those need monospace.
  </action>
  <verify>
    <automated>test -f /home/aluno/Downloads/isn20261/.planning/phases/13-recommendation-lambda-integration/13-04-SUMMARY.md &amp;&amp; grep -q "Block E" /home/aluno/Downloads/isn20261/.planning/phases/13-recommendation-lambda-integration/13-04-SUMMARY.md &amp;&amp; grep -qE 'OK to PR|BLOCKED' /home/aluno/Downloads/isn20261/.planning/phases/13-recommendation-lambda-integration/13-04-SUMMARY.md</automated>
  </verify>
  <acceptance_criteria>
    - `13-04-SUMMARY.md` exists at the expected path.
    - It contains all five blocks (A, B, C, D, E) with the required tables / signal quotes.
    - Block E contains an explicit closure recommendation phrase ("Phase 13 OK to PR" or "Phase 13 BLOCKED").
    - The four ROADMAP success criteria are each individually attested with cross-references to the gates that prove them.
  </acceptance_criteria>
  <done>
    `13-04-SUMMARY.md` is on disk with all five blocks populated. Phase 13 closure is either recommended OR explicitly blocked with a specific gate reference.
  </done>
</task>

</tasks>

<verification>
- Block A grep gates all pass (recommend.ts is mock-free, recommendation/page.tsx imports route through recommend.real only, deleted symbols are gone, the keep-list is intact, four discriminated render branches exist, similar-films comment marker present, DSGN-06 clean, Watch-on anchor has rel attribute, /smoke still on disk, recommend.real.ts contract surface visible).
- Block B build/lint/tsc all pass — proving every consumer of the trimmed recommend.ts still resolves.
- Block C code-inspection gates pass — proving the empty branch + error branch + adapter boundary + deep-link wiring are structurally correct.
- Block D manual smoke is user-attested — proving runtime behavior against live AWS.
- Block E ties each ROADMAP success criterion to the gates that attest it, and produces a single closure recommendation.
</verification>

<success_criteria>
- All 23 verification gates either PASS or are recorded with a specific failure attributable to a prior plan (13-01 / 13-02 / 13-03).
- If any gate fails, the SUMMARY identifies the responsible plan and the orchestrator can route to gap-closure or revision.
- If all gates pass, the SUMMARY recommends "Phase 13 OK to PR" and Phase 13 is ready to merge to `backend-integration` per the v2.0 branching rule.
</success_criteria>

<output>
After completion: `.planning/phases/13-recommendation-lambda-integration/13-04-SUMMARY.md` is the only artifact (no code changes in this plan — verification is read-only). STATE.md will be updated by `/gsd:transition`, not by this plan.
</output>
</content>
</invoke>