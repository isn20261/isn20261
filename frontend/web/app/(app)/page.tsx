"use client";

/**
 * Phase 6 (HOME-01..05, issue #95) — home / hero screen (collage variant).
 *
 * Client Component because the bottom-of-page section forks on auth state
 * (signup nudge for logged-out, plain spacing for logged-in this phase —
 * Phase 7 will round-trip and add the rails).
 *
 * Layout single-render-tree: HomeBackdrop (absolute, behind) + Navbar (chrome)
 * + the hero column (eyebrow + display heading + body + HeroCTA) +
 * conditional signup nudge.
 *
 * DSGN-06 escape hatches (each gets a // non-tokenized comment inline):
 *   - tracking-[0.18em]                  : eyebrow letter-spacing widget
 *   - text-[17px]                        : body large step (between 16/20)
 *   - leading-[1.05] / md:leading-[1.02] : display heading line-height
 *   - tracking-[-0.03em]                 : display heading letter-spacing
 *   - max-w-[880px] / max-w-[560px]      : hero text container widths
 *   - bg-[linear-gradient(...)]          : signup nudge soft-amber background
 */

import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { HomeBackdrop } from "@/components/HomeBackdrop";
import { HeroCTA } from "@/components/HeroCTA";
import { useAuth } from "@/lib/auth/AuthContext";

export default function HomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <section className="relative isolate w-full min-h-screen overflow-hidden">
      <HomeBackdrop />

      <div className="relative z-10">
        <Navbar variant="home" />

        <div className="flex flex-col items-center text-center px-6 md:px-10 pt-10 md:pt-20 pb-16 gap-7">
          {/* non-tokenized: tracking-[0.18em] is the reference .eyebrow letter-spacing widget */}
          <p className="text-12 font-medium tracking-[0.18em] uppercase text-text-muted">
            Tonight, on the couch
          </p>

          {/* non-tokenized: leading-[1.05]/[1.02] + tracking-[-0.03em] match the reference .display-lg recipe */}
          {/* non-tokenized: max-w-[880px] is the hero heading container width primitive */}
          <h1 className="font-display text-40 md:text-64 font-extrabold tracking-[-0.03em] leading-[1.05] md:leading-[1.02] max-w-[880px] text-text-primary">
            One button. <span className="text-accent">One movie</span>.
            <br />
            Decided.
          </h1>

          {/* non-tokenized: text-[17px] sits between Phase 2 type-scale steps (16/20) */}
          {/* non-tokenized: max-w-[560px] is the hero body container width primitive */}
          <p className="text-text-secondary text-14 md:text-[17px] leading-[1.5] max-w-[560px]">
            Stop scrolling for forty minutes. We&apos;ll pick something good for
            you in three seconds.
          </p>

          <HeroCTA />
        </div>

        {!isAuthenticated && <SignupNudge />}
      </div>
    </section>
  );
}

function SignupNudge() {
  return (
    <div className="px-6 md:px-10 pb-16">
      {/* non-tokenized: bg-[linear-gradient(...)] is the soft-amber/white card recipe; promote if Phase 7 reuses */}
      <div className="max-w-[1120px] mx-auto rounded-2xl border border-border bg-[linear-gradient(135deg,rgba(245,181,68,0.06),rgba(255,255,255,0.02))] px-7 py-7 md:px-8 md:py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div>
          <h3 className="font-display text-20 font-bold text-text-primary">
            Save what catches your eye.
          </h3>
          <p className="text-text-secondary text-14 mt-1.5 max-w-[560px]">
            Sign up and we&apos;ll remember every recommendation, build a watch
            later queue, and learn what you actually love.
          </p>
        </div>
        <div className="flex gap-2 self-stretch md:self-auto">
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-4 h-10 rounded-md text-14 font-semibold text-text-secondary hover:text-text-primary border border-border-strong transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-4 h-10 rounded-md text-14 font-semibold bg-accent hover:bg-accent-hover text-on-accent transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
          >
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}
