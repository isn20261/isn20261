/**
 * Phase 6 (HOME-03, issue #95) — primary home CTA.
 *
 * Server Component. Wraps `next/link` so navigation is client-side and the
 * link prefetches /recommendation on hover. Phase 7 may swap to a button
 * with onClick if the flow needs client-side state before navigation.
 *
 * DSGN-06 escape hatches:
 *   - min-w-[280px] / md:min-w-[320px]   : CTA min-width primitives
 *   - h-[60px] / md:h-[76px]             : CTA height primitives (above h-14 = 56)
 *   - text-[17px]                        : between Phase 2 type-scale steps (16/20)
 *   - tracking-[-0.01em]                 : button letter-spacing recipe
 *   - shadow-[…]                         : composed amber CTA glow + inset highlight
 */

import Link from "next/link";
import { Sparkles } from "lucide-react";

export function HeroCTA() {
  return (
    <Link
      href="/recommendation"
      className="
        inline-flex items-center justify-center gap-2
        min-w-[280px] md:min-w-[320px]
        h-[60px] md:h-[76px]
        px-8 rounded-md
        bg-accent hover:bg-accent-hover text-on-accent
        font-display font-semibold text-16 md:text-[17px] tracking-[-0.01em]
        shadow-[0_0_0_1px_rgba(255,255,255,0.05)_inset,0_18px_48px_rgba(245,181,68,0.35),0_4px_14px_rgba(245,181,68,0.4)]
        transition-colors duration-150
        focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2
      "
    >
      <Sparkles size={20} aria-hidden />
      Pick a movie for me
    </Link>
  );
}
