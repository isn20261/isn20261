/**
 * Phase 6 (HOME-01, issue #95) — collage backdrop.
 *
 * Server Component. Renders 8 placeholder posters in a 4-col grid, blurred
 * with a centered radial vignette pulling focus to the hero. Posters bleed
 * past the viewport edge via -inset-[8%].
 *
 * Stacking: section parent uses `isolate`; this layer is `absolute inset-0`
 * with no z-index (paints first in DOM), hero content above it sits at z-10.
 * Each tile carries a bg-surface-2 fallback so the collage shape is visible
 * even before picsum images load (or if the network blocks them).
 *
 * Phase 7 will swap picsum URLs for real movie posters.
 *
 * DSGN-06 escape hatches:
 *   - -inset-[8%]                                : poster bleed primitive
 *   - blur-2xl saturate-150                      : blur+saturation recipe (lighter than reference 3xl/110 — reference reads dimmer than intended)
 *   - bg-[radial-gradient(...)] w/ rgba literals : softened vignette overlay
 *     (rgba(10,10,11,...) is the bg color at varying opacities — promote to
 *      --color-bg-vignette if Phase 7+ reuses this recipe)
 */

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export function HomeBackdrop() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 overflow-hidden bg-bg"
    >
      {/* non-tokenized: -inset-[8%] is the reference bleed primitive */}
      {/* non-tokenized: blur-2xl saturate-150 — softer than reference recipe so the collage actually shows under the vignette */}
      <div className="absolute -inset-[8%] grid grid-cols-4 gap-2 blur-2xl saturate-150">
        {SEEDS.map((seed) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={seed}
            src={`https://picsum.photos/seed/recommend-a-${seed}/320/460`}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover bg-surface-2"
          />
        ))}
      </div>
      {/* non-tokenized: multi-stop radial vignette — softened from reference (.55/.92 → .30/.72) so the blurred posters remain visible at the hero center */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_95%_85%_at_50%_40%,rgba(10,10,11,0.30)_0%,rgba(10,10,11,0.72)_60%,var(--color-bg)_100%)]" />
    </div>
  );
}
