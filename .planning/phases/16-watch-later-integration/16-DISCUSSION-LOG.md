# Phase 16: Watch-Later Lambda Integration — Discussion Log

**Date:** 2026-05-14
**Participants:** User (Nicolas), Claude
**Outcome:** 2 decisions locked + 1 hard backend gap documented; ready for plan-phase.

---

## 1. Scope intake

Phase 16 = issue #135. Read + add (+ remove per issue spec). Pulled forward as part of the batch 14/15/16 execution. Branch off `backend-integration`.

## 2. Backend gap discovery

Inspected `functions/watch_later/watch_later.py` and `__main__.py:343-344`:
- Handler dispatch covers ONLY `GET` and `POST`. PUT falls through to "Method not allowed".
- API Gateway has routes ONLY for `GET /api/v1/watch-later` and `POST /api/v1/watch-later`. No PUT or DELETE.

User clarified: *"delete será feito através do put. verifique a possibilidade se está implementada e documente."*

**Verification result: NOT IMPLEMENTED.** Both Lambda handler and API Gateway lack PUT support.

## 3. Decisions

### D-01 UI shape: **minimal title + added-at** (Option A)
Same logic as Phase 15. Wire returns `{title, "added-at"}`; UI degrades to render only that. MovieCard grid dropped; row list with relative-time on the right.

### D-02 Remove operation: **ship without remove** (forced by backend gap)
With no PUT/DELETE, the UI can't offer a working remove button. Phase 16 ships:
- `/watch-later` page: NO remove button.
- `/recommendation` Save toggle: add-only (once clicked, stays saved this session; no un-save).
- Open v2.1 follow-up to add backend PUT/DELETE.

This is a divergence from issue #135 AC ("Botão 'remove' → DELETE real; o item some.") but justified by the verified backend state. Documented in commit body + SUMMARY + PR description.

### Issue #135 also explicitly required the Phase 14 strategy mirror
Per ROADMAP §Phase 16 Notes: "Add/remove update strategy should mirror Phase 14's choice (optimistic vs conservative) unless the plan explicitly justifies divergence."

Phase 14 = per-toggle optimistic + in-flight dedup + replay queue.

Phase 16 simplification (justified):
- Only one button per recommendation (no multi-field), so single-shot in-flight guard (no replay queue needed).
- Only add, no remove (forced by backend gap), so no rollback flip-flop.
- Optimistic UI + toast-on-error + revert is preserved.

## 4. Out-of-scope reaffirmations

- No backend changes (read-only milestone; PUT/DELETE addition is a v2.1 follow-up).
- No idempotency on POST (Lambda quirk; same movieId added twice cross-session creates duplicate rows).
- No movieId in GET response (membership pre-check in /recommendation dropped).
- No /recommendation page Phase 13 rework — Phase 16 touches only the Save toggle.
- No live-AWS smoke (deferred per usual).

## 5. Next steps

1. Write `16-PATTERNS.md`.
2. Write `16-01-PLAN.md` (lib seam + 2 page updates) and `16-02-PLAN.md` (verification gate).
3. User approves plans per `gates.confirm_plan`.
4. Execute, transition, PR.

---

*Logged: 2026-05-14*
