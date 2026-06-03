"use client";

/**
 * Phase 3 (LAYT-02, issue #92) mobile tab bar — extracted from Sidebar and
 * fixed for issue #216.
 *
 * The bug: the old <nav> carried BOTH `flex` and `grid grid-cols-5` (two
 * conflicting `display` values), so the 5 columns weren't actually equal —
 * cells sized to content. Combined with "Assistir depois" being the only
 * two-word label (it wraps to two lines while the others stay on one), its icon
 * sat higher than the rest → the "bugged icon" in the report.
 *
 * The fix:
 *   1. The nav is a real grid (the caller supplies display/position via
 *      `className`; this component no longer hardcodes a conflicting `flex`).
 *   2. Every label lives in a fixed-height (h-5) box, vertically centered, and
 *      is clamped to two lines. So a one-line and a two-line label occupy the
 *      same vertical space and every icon lands on the same baseline regardless
 *      of label length.
 *
 * Positioning/visibility is intentionally NOT baked in — Sidebar passes the
 * `md:hidden fixed …` chrome, while the #216 preview page renders it `relative`
 * inside device frames (where `md:hidden` would otherwise hide it).
 *
 * DSGN-06 escape hatches (mirroring Sidebar's, see UI-SPEC §Color/Spacing):
 *   - bg-bg/90             : tab-bar backdrop opacity (reference rgba(8,8,9,…))
 *   - w-[52px] h-[52px]    : central Pick CTA circle (size primitive)
 *   - shadow-[0_6px_…]     : amber CTA glow (one-off shadow shape)
 *   - text-[10px]          : tab label font-size (below Phase 2 type scale)
 */

import Link from "next/link";
import { NAV_ITEMS, isActive } from "@/lib/nav";
import { cn } from "@/lib/utils";

type MobileTabBarProps = {
  pathname: string;
  /** Positioning + visibility chrome supplied by the caller (fixed vs preview). */
  className?: string;
};

export function MobileTabBar({ pathname, className }: MobileTabBarProps) {
  return (
    <nav
      className={cn(
        "h-tab grid grid-cols-5 items-center px-1.5 bg-bg/90 backdrop-blur-lg border-t border-border",
        className,
      )}
      aria-label="Navegação principal"
    >
      {NAV_ITEMS.map(({ href, label, Icon, exact, primary }) => {
        const active = isActive(pathname, href, exact);

        if (primary) {
          return (
            <Link
              key={href}
              href={href}
              title={label}
              aria-label={label}
              className="flex flex-col items-center justify-center p-2"
            >
              {/* non-tokenized: w-[52px] h-[52px] is the exact reference 52×52 px CTA — see UI-SPEC §Spacing Scale row 13 */}
              {/* non-tokenized: shadow-[0_6px_18px_rgba(245,181,68,0.35)] amber CTA glow — see UI-SPEC §Color Escape Hatches #1 */}
              <span className="w-[52px] h-[52px] rounded-full bg-accent text-on-accent flex items-center justify-center shadow-[0_6px_18px_rgba(245,181,68,0.35)]">
                <Icon size={22} />
              </span>
            </Link>
          );
        }

        return (
          <Link
            key={href}
            href={href}
            title={label}
            aria-label={label}
            className={cn(
              "flex flex-col items-center justify-center gap-1 px-1 py-1.5 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
              active ? "text-text-primary" : "text-text-muted hover:text-text-primary",
            )}
          >
            <Icon size={20} className="shrink-0" />
            {/* Fixed-height label box sized to exactly two lines (h-6 = 24px =
                2 × text-[10px] × leading-[1.2]), vertically centered and clamped
                to 2 lines. Every cell is therefore the same height, so each icon
                lands on the same baseline whether the label is one word
                ("Início") or two ("Assistir depois") — the #216 fix. */}
            <span className="flex h-6 items-center justify-center">
              {/* non-tokenized: text-[10px] is below Phase 2 type scale (smallest = text-12) — see UI-SPEC §Typography */}
              <span className="text-[10px] font-medium leading-[1.2] text-center line-clamp-2">
                {label}
              </span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
