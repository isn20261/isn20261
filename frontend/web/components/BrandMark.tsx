/**
 * Phase 3 (LAYT-01..04, issue #92) — Brand mark.
 *
 * Re-authored fresh from frontend/_design-reference/shared.jsx:4-29 per
 * CLAUDE.md hard rule #2 (no JSX import from _design-reference/).
 *
 * DSGN-06 escape hatch (the ONLY one in this file):
 * SVG <stop stopColor>, <rect fill> and <path fill> attribute values cannot
 * be reached by Tailwind utilities — they reference the CSS custom properties
 * directly via var(...). See UI-SPEC §Color Escape Hatches.
 *
 * The wordmark <span> uses Tailwind utilities only (no inline style).
 */

type BrandMarkProps = {
  size?: number;
  withWord?: boolean;
};

export function BrandMark({ size = 28, withWord = true }: BrandMarkProps) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        aria-hidden
        role="img"
      >
        <defs>
          <linearGradient id="ra-bg" x1="0" x2="1" y1="0" y2="1">
            {/* non-tokenized: SVG <stop stopColor> can't be reached by Tailwind — see UI-SPEC §Color Escape Hatches */}
            <stop offset="0" stopColor="var(--color-accent)" />
            <stop offset="1" stopColor="var(--color-accent-hover)" />
          </linearGradient>
        </defs>
        {/* non-tokenized: SVG <rect fill> can't be reached by Tailwind — see UI-SPEC §Color Escape Hatches */}
        <rect x="1" y="1" width="30" height="30" rx="8" fill="url(#ra-bg)" />
        {/* non-tokenized: SVG <path fill> can't be reached by Tailwind — see UI-SPEC §Color Escape Hatches */}
        <path
          d="M11 22V10h6.2c2.4 0 4 1.5 4 3.7 0 1.7-.9 2.9-2.4 3.4l3 4.9h-3l-2.7-4.5h-2.4V22zm2.7-6.7h3c1.2 0 2-.6 2-1.6s-.8-1.6-2-1.6h-3z"
          fill="var(--color-on-accent)"
        />
      </svg>
      {withWord && (
        // non-tokenized: brand-mark wordmark size 18px is outside the Phase 2 type scale (12/14/16/20/28/40/64) — see UI-SPEC §Typography
        <span className="font-display font-extrabold tracking-tight text-[18px] text-text-primary leading-tight">
          Recommend<span className="text-accent">·</span>a
        </span>
      )}
    </span>
  );
}
