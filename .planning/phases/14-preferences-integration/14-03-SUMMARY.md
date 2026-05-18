# Phase 14 · Plan 14-03 — Phase Close SUMMARY

**Completed:** 2026-05-14
**Phase status:** ✅ Complete (live-AWS smoke SKIPPED-AWS-DEFERRED)
**Plans executed:** 14-01 ✅, 14-02 ✅, 14-03 ✅ (this doc + transition)
**Branch:** `feature/issue-133-preferences-integration` → opens PR into `backend-integration`
**Commits:** `abaaa62` (context), `266ba2e` (plans), `e75ca0b` (rename fix), `752bae9` (14-01), `12638da` (14-02), `<this-hash>` (14-03 + transition)

---

## Goal restated and verified

Phase 14 ships the **first read+write screen integrated against the real backend**: the preferences screen consumes `/api/v1/preferences` (GET + POST) through the Phase 12 fetch wrapper, with documented update strategy (per-toggle optimistic with replay-queue rollback) that Phase 16 (watch-later) will mirror.

---

## Block A — Static gates (all green)

| Gate | Result |
|---|---|
| `pnpm exec tsc --noEmit` | ✅ clean |
| `pnpm lint` | ✅ clean (after 1-line eslint-disable on pre-existing smoke harness — documented in 14-01-SUMMARY §"Deviation 2") |
| `pnpm build` | ✅ 14/14 pages prerendered, /preferences static |
| `git grep -n 'mock' lib/api/preferences.ts` | ✅ 0 hits |
| `git grep -nE '\bfetch\(' lib/api/preferences.ts 'app/(app)/(protected)/preferences/'` | ✅ 0 hits |
| `git grep -nE 'className=.*#[0-9a-fA-F]{3,6}' 'app/' 'components/'` (sans tokens.tsx) | ✅ 0 hits |
| `git grep -nE 'style=\{' 'app/' 'components/'` | ⚠️ 2 pre-existing hits (`MovieCard.tsx:50`, `ui/sonner.tsx:43`) — neither introduced by Phase 14. Logged as follow-up in §"Deferred items". |

## Block B — UI compliance (deferred-with-smoke for live interaction; layout pass green)

The build output prerendering /preferences confirms the page is a valid static route. Visual fidelity at 3 breakpoints (375 / 768 / 1440) requires a live dev server to exercise the chip layouts and skeleton states. Layout-only check (no auth, no Lambda) is logged as part of the run-when-home checklist.

Section order verified by code review of `preferences/page.tsx`:
1. **Favorite genres** (NEW) — chips from `GENRES`
2. Streaming services — chips from `STREAMING_SERVICES`
3. Default mood — chips from `MOODS`, single-select (new behavior)
4. Maximum age rating — chips from `RATINGS`, single-select (unchanged behavior, kept)
5. Account — email / password / sign-out (unchanged)

## Block C — Live-AWS smoke (SKIPPED-AWS-DEFERRED, per user 2026-05-14)

**Run-when-home checklist** (mirroring 12-04-SUMMARY.md pattern):

```
[ ] cd frontend/web
[ ] NEXT_PUBLIC_API_BASE_URL=<pulumi stack output api_internal_url>
[ ] pnpm dev
[ ] Sign in as a confirmed teammate account
[ ] Visit /preferences

— GET path —
[ ] Network panel: GET /api/v1/preferences fires on mount
[ ] Status 200; response body matches { genres: [], subscriptions: [], "age-rating": null|"...", humor: null|"..." }
[ ] Skeleton renders briefly; then chips render with active state matching the response

— POST path (each section) —
[ ] Toggle a genre chip ON
[ ] Network panel: POST /api/v1/preferences fires; body { genres: [<id>] }; status 200
[ ] AWS console / DynamoDB: GetItem on recommend-a.users by sub
[ ] preferences.genres contains the toggled id
[ ] Toggle the same genre OFF
[ ] POST fires with body { genres: [] }; preferences.genres becomes []

— Single-string field (humor) —
[ ] Click a humor chip → POST { humor: "<id>" } → DynamoDB has preferences.humor = "<id>"
[ ] Click the SAME humor chip again (deselect) → POST { humor: "" } → DynamoDB has preferences.humor = ""
[ ] (Validates the null → "" Lambda quirk workaround)

— Persistence —
[ ] Hard-refresh /preferences → all toggled values render persisted from real GET

— Error UX —
[ ] DevTools → Network → Offline; toggle a chip
[ ] Toast renders the network-kind error message
[ ] Chip rolls back to its prior state

— Unauthorized path —
[ ] In DevTools Application tab, locate Cognito keys (CognitoIdentityServiceProvider.<pool-id>.<client-id>.<sub>.idToken etc)
[ ] Force-expire by editing idToken to an invalid string, OR delete keys
[ ] Toggle a chip → wrapper detects 401 → fires onUnauthorized → AuthContext.signOut → RequireAuth redirects to /login

— Empty-state (brand-new account) —
[ ] Use a freshly-signed-up account with no prior /preferences interaction
[ ] Mount: GET returns 200 with { genres: [], subscriptions: [], "age-rating": null, humor: null }
[ ] All chips render unselected; no crash, no banner needed (chips themselves are the empty state)

— Three-breakpoint visual check —
[ ] 375px: no horizontal scroll; chips wrap; 4-5 chips per row max
[ ] 768px: layout balanced; chips wrap with 6-8 per row
[ ] 1440px: column maxes at ~880px (max-w-[880px] escape hatch); centered
```

## Block D — Acceptance criteria mapping (issue #133)

| Issue #133 AC | Phase 14 coverage |
|---|---|
| `GET /preferences` real popula a tela (Network panel) | ✅ Code path (Block A); ⏳ smoke (Block C) |
| Edit + save dispara `POST` real (issue says `PUT/POST`; user clarified only POST exists); reload mostra o valor persistido | ✅ Code path; ⏳ smoke (Block C round-trip) |
| Estratégia (otimista vs conservadora) documentada no PLAN | ✅ `14-CONTEXT.md` §"Resolved decisions" + `14-02-PLAN.md` §"Goal" + §"Implementation notes" + page docstring |
| Cair a rede durante save → renderiza o caminho de falha da estratégia escolhida | ✅ Code path (rollback + `useApiErrorUx` toast); ⏳ smoke (Block C offline test) |
| Conta nova sem preferências → empty state OU default-prefs, não crash | ✅ Code path (chips render unselected for `[]` arrays and `null` scalars); ⏳ smoke (Block C empty-state test) |
| `git grep -n 'mock' frontend/web/lib/api/preferences*` → 0 hits | ✅ Block A4 |

## Deferred items (logged in STATE.md transition)

1. **Block C live-AWS smoke** — run when home AWS environment available. Checklist preserved above.
2. **`if X is not None` Lambda quirk** — backend cleanup for v2.1. Cleanest fix: differentiate `null` (clear) from missing (skip). Current frontend workaround sends `""` for single-string deselect.
3. **Pre-existing `style={` in MovieCard.tsx:50 + ui/sonner.tsx:43** — neither introduced by Phase 14. Review needed: are these design-system properties (forbidden) or dynamic non-system properties (allowed)? Not blocking Phase 14 PR.
4. **Smoke harness `/smoke` deletion** — STATE.md "Pending Todos" already tracks this for Phase 17. Phase 14 added a 1-line eslint-disable to silence a pre-existing react-hooks/purity violation; deletion will remove this entirely.

## Hand-off to Phase 15 (History)

- The `lib/api/history.ts` mock is the next file to replace. The pattern is **identical** to `lib/api/preferences.ts`: typed thin wrappers (`getHistory()`) over `apiGet`. Read-only — no save path, no optimistic strategy.
- ChipsSkeleton is available if Phase 15 needs a similar empty-list pattern, but history is row-style — a `<HistoryRowSkeleton />` is likely more appropriate.
- Error UX policy is unchanged: mount-fetch error → `useApiErrorUx` toast.

## Hand-off to Phase 16 (Watch-Later)

- **Update strategy:** mirror Phase 14's per-toggle optimistic + replay-queue + rollback. The `commit()` function in `preferences/page.tsx` is the canonical reference — copy-shape, adjust for watch-later's add/remove ops (1 op per movie click instead of toggle-array-or-single).
- **`ChipsSkeleton`** is available; reuse if watch-later has a chip-style empty placeholder. List-style is more likely — a row-skeleton fits better.
- **Lambda contract** for watch-later — read functions/watch_later/ in Phase 16's CONTEXT to confirm shape; assume similar quirks apply (`if X is not None` etc.).

---

## Phase 14 — Final state

- ✅ INTG-PREF-01 (GET integration)
- ✅ INTG-PREF-02 (POST integration)
- ✅ INTG-PREF-03 (loading/error/empty + strategy documented)
- ⏳ Live-AWS smoke: DEFERRED with checklist preserved

Phase 14 is **complete-pending-smoke**. PR opens against `backend-integration` after this commit + transition.

---

*Plan: 14-03-SUMMARY.md*
*Phase closed by Claude (Haiku 4.5) under /gsd discuss → plan → execute → verify-static flow*
