"use client";

/**
 * Phase 6 (HOME-03, issue #95) — primary home CTA.
 *
 * Layered 3D push-down button (preview pass — user-pasted reference).
 * Three stacked layers inside the Link:
 *   - shadow: bg-black/25 ground plane (translateY +2 → +4 hover → +1 active)
 *   - edge:   amber side-band gradient (the visible "depth" of the chip)
 *   - front:  bg-accent face (translateY -4 → -6 hover → -2 active)
 *
 * Spring curve cubic-bezier(.3,.7,.4,1.5) on hover gives a tiny overshoot;
 * the rest-state and active-state use cubic-bezier(.3,.7,.4,1) without
 * overshoot. 600ms outbound, 250ms hover engage, 34ms active mash.
 *
 * DSGN-06 escape hatches:
 *   - rounded-xl                                      : matches reference radius (12px = our --radius-xl is 22px... actually rounded-xl is 22px in our theme, OK)
 *   - hsl(38_X%_Y%) gradient stops                    : amber edge band — no Phase 2 token for accent shadows yet
 *   - cubic-bezier transitions                        : custom timing recipe
 *   - min-w-[280px] / md:min-w-[320px], h-[60px] / md:h-[76px] : hero CTA size primitives
 */

import Link from "next/link";
import { Sparkles } from "lucide-react";

export function HeroCTA() {
  return (
    <Link
      href="/recommendation"
      className="
        group relative inline-block cursor-pointer select-none
        outline-offset-4
        [touch-action:manipulation]
        transition-[filter] duration-[250ms]
        hover:[filter:brightness(1.1)]
      "
    >
      {/* Shadow ground-plane */}
      <span
        aria-hidden
        className="
          absolute inset-0 rounded-xl
          bg-black/25 will-change-transform
          translate-y-[2px]
          transition-transform duration-[600ms] ease-[cubic-bezier(0.3,0.7,0.4,1)]
          group-hover:translate-y-[4px] group-hover:duration-[250ms] group-hover:ease-[cubic-bezier(0.3,0.7,0.4,1.5)]
          group-active:translate-y-[1px] group-active:duration-[34ms]
        "
      />
      {/* Edge — the visible depth of the chip */}
      {/* non-tokenized: amber edge gradient — no Phase 2 token for accent-shade yet */}
      <span
        aria-hidden
        className="
          absolute inset-0 rounded-xl
          bg-[linear-gradient(to_left,hsl(38_70%_24%)_0%,hsl(38_75%_38%)_8%,hsl(38_75%_38%)_92%,hsl(38_70%_24%)_100%)]
        "
      />
      {/* Front face */}
      <span
        className="
          relative inline-flex items-center justify-center gap-2
          min-w-[280px] md:min-w-[320px]
          h-[60px] md:h-[76px]
          px-8 rounded-xl
          bg-accent text-on-accent
          font-display font-semibold text-16 md:text-[17px] tracking-[-0.01em]
          will-change-transform
          -translate-y-1
          transition-transform duration-[600ms] ease-[cubic-bezier(0.3,0.7,0.4,1)]
          group-hover:-translate-y-1.5 group-hover:duration-[250ms] group-hover:ease-[cubic-bezier(0.3,0.7,0.4,1.5)]
          group-active:-translate-y-0.5 group-active:duration-[34ms]
          focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2
        "
      >
        <Sparkles size={20} aria-hidden />
        Pick a movie for me
      </span>
    </Link>
  );
}
