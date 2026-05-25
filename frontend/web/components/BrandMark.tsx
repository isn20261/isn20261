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
          <linearGradient id="cinedica-bg" x1="0" x2="1" y1="0" y2="1">
            {/* non-tokenized: SVG <stop stopColor> can't be reached by Tailwind — see UI-SPEC §Color Escape Hatches */}
            <stop offset="0" stopColor="var(--color-accent)" />
            <stop offset="1" stopColor="var(--color-accent-hover)" />
          </linearGradient>
        </defs>
        {/* non-tokenized: SVG <rect fill> can't be reached by Tailwind — see UI-SPEC §Color Escape Hatches */}
        <rect x="1" y="1" width="30" height="30" rx="8" fill="url(#cinedica-bg)" />
        {/* non-tokenized: SVG <path fill> can't be reached by Tailwind — see UI-SPEC §Color Escape Hatches */}
        <path
          d="M21 12 C17 9 9 10.5 9 16 C9 21.5 17 23 21 20 L21 17.5 C18 21 12 19.5 12 16 C12 12.5 18 11 21 14.5 Z"
          fill="var(--color-on-accent)"
        />
      </svg>
      {withWord && (
        // non-tokenized: brand-mark wordmark size 18px is outside the Phase 2 type scale (12/14/16/20/28/40/64) — see UI-SPEC §Typography
        <span className="font-display font-extrabold tracking-tight text-[18px] text-text-primary leading-tight">
          Cinedica
        </span>
      )}
    </span>
  );
}
