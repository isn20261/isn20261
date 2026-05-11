/**
 * Phase 6 (HOME-01, issue #95) — gradient backdrop variant.
 *
 * Two radial gradients layered on the dark bg:
 *   - amber ellipse from top-center (uses --color-accent at 18%)
 *   - purple circle from bottom-right (one-off violet at 15%)
 * Editorial, calm — no images, no animation, no network dependency.
 *
 * Stacking: section parent uses `isolate`; this layer is `absolute inset-0`
 * with no z-index (paints first in DOM), hero content above sits at z-10.
 *
 * DSGN-06 escape hatches:
 *   - The amber stop is rgba derivation of --color-accent (#f5b544 →
 *     rgba(245,181,68,0.18)). Until a --color-accent-glow token exists
 *     it sits inline with a // non-tokenized note.
 *   - The purple stop rgba(120,80,180,.15) is a one-off accent-companion
 *     (no token in Phase 2 theme). Same rule: inline with note.
 */

export function HomeBackdrop() {
  return (
    <div
      aria-hidden
      className="
        absolute inset-0 overflow-hidden bg-bg
        bg-[radial-gradient(ellipse_120%_80%_at_50%_30%,rgba(245,181,68,0.18)_0%,transparent_55%),radial-gradient(circle_at_80%_70%,rgba(120,80,180,0.15)_0%,transparent_50%)]
      "
    >
      {/* non-tokenized: rgba(245,181,68,0.18) is --color-accent at 18% — editorial amber wash */}
      {/* non-tokenized: rgba(120,80,180,0.15) is a one-off violet accent-companion, no Phase 2 token yet */}
    </div>
  );
}
