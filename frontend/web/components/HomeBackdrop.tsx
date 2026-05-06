/**
 * Phase 6 (HOME-01, issue #95) — collage backdrop.
 *
 * Server Component. Renders 8 placeholder posters in a 4-col grid, blurred
 * heavily, with a centered radial vignette pulling focus to the hero. The
 * grid is extended -inset-[8%] so posters bleed past the viewport edge.
 *
 * Phase 7 will swap picsum URLs for real movie posters when the recommendation
 * dataset lands. Backdrop is decorative — alt="" on every img.
 *
 * DSGN-06 escape hatches (carry over from reference home.jsx:38-57):
 *   - -inset-[8%]                                : poster bleed primitive
 *   - blur-3xl saturate-110 opacity-55           : blur blend recipe
 *   - bg-[radial-gradient(...)] with rgba lit's : multi-stop vignette overlay
 *     The rgba(10,10,11,...) literals are the bg-color expressed at varying
 *     opacities; until a --color-bg-vignette token exists they sit inline.
 */

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export function HomeBackdrop() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 -z-10 overflow-hidden bg-bg"
    >
      {/* non-tokenized: -inset-[8%] is the reference bleed primitive (home.jsx:41) */}
      {/* non-tokenized: blur-3xl saturate-110 opacity-55 — three-utility recipe matching the reference filter chain */}
      <div className="absolute -inset-[8%] grid grid-cols-4 gap-2 blur-3xl saturate-110 opacity-55">
        {SEEDS.map((seed) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={seed}
            src={`https://picsum.photos/seed/recommend-a-${seed}/320/460`}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ))}
      </div>
      {/* non-tokenized: multi-stop radial vignette — the rgba(10,10,11,...) literals are the bg color at varying opacities; promote to --color-bg-vignette if Phase 7+ reuses this recipe */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_80%_at_50%_40%,rgba(10,10,11,0.55)_0%,rgba(10,10,11,0.92)_70%,var(--color-bg)_100%)]" />
    </div>
  );
}
