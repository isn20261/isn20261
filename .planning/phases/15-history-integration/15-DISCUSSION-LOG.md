# Phase 15: History Lambda Integration — Discussion Log

**Date:** 2026-05-14
**Participants:** User (Nicolas), Claude
**Outcome:** 2 decisions locked (UI shape, grouping); ready for plan-phase.

---

## 1. Scope intake

Phase 15 = issue #134, the History Lambda integration. Read-only screen. Pulled forward as part of the batch Phase 14/15/16 execution. Independent of Phase 14 at the `lib/api/*` boundary, so branch cut from `backend-integration` directly rather than stacking on top of `feature/issue-133-preferences-integration`.

## 2. Schema-gap discovery

Read `functions/history/history.py` — Lambda returns `[{title, "recommended-at"}]` per row. Confirmed by `docs/inconsistencias.md §2` ("genre intentionally absent"). The shape is far thinner than the Phase 9 mock (`HistoryEntry = { id, movie: Movie, when, mood }` — Movie has poster, runtime, year, etc.).

Brought 2 decisions to user:

### D-01 UI shape: **minimal (title + relative-time)** [locked]

Picked Option A. Trade-offs:
- (chosen) Faithful to wire; simplest implementation; loses Phase 9 richness.
- Rejected B (decorate via MOVIES lookup) — works only for mock data; fails on real backend with non-mock titles.
- Rejected C (placeholder poster) — splits the difference but keeps unused infrastructure (HistoryRow with movie type).
- Rejected D (ask backend to enrich) — backend read-only this milestone.

### D-02 Grouping: **compute locally from timestamps** [locked]

Picked Option A. Rationale:
- Preserves Phase 9 visual structure (Today / Yesterday / Last week / Earlier).
- Algorithm is ~20 LOC; no `date-fns` dep needed.
- Lambda already sorts newest-first, so within-group order is preserved.

## 3. Out-of-scope reaffirmations

- No backend changes.
- No `<HistoryRow />` rewrite — it's orphaned. Logged for Phase 17 cleanup.
- No delete-entry path — no DELETE endpoint exists.
- No pagination — render-all for v2.0; flag for v2.1.
- No live-AWS smoke this PR.

## 4. Branch strategy note

Branched from `backend-integration` not from the Phase 14 branch. Phases 13/14/15/16 are independent at `lib/api/*` boundary. Phase 14 also touched STATE.md / ROADMAP.md, so when Phase 15 PR opens we expect to need a merge or rebase on those docs. Conflict is benign — both phases append distinct entries.

## 5. Next steps

1. Write `15-PATTERNS.md`.
2. Write `15-01-PLAN.md` (lib seam + page rewrite) and `15-02-PLAN.md` (verification gate).
3. User confirms plans per `gates.confirm_plan`.
4. Execute, transition, PR.

---

*Logged: 2026-05-14*
