"use client";

/**
 * Phase 8 (PREF-01..05, issue #97) — preferences screen.
 *
 * Lives inside (app)/(protected)/ so the Phase 5 RequireAuth gate guards
 * unauthenticated visitors (PREF-02). Client Component — local React
 * state for chip toggles + useAuth() for the email/sign-out row.
 *
 * Per ROADMAP §"Phase 8 Notes": read-only display this milestone.
 * Toggles update local state for visual feedback only; no persistence.
 * v2 (INTG-02) wires real Cognito user attributes.
 *
 * DSGN-06 escape hatches (each with // non-tokenized inline):
 *   - max-w-[880px]              : column width primitive (already documented)
 *   - text-[36px]                : page title — between Phase 2 steps (28/40)
 *   - tracking-[0.18em]          : eyebrow letter-spacing (already documented)
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Chip } from "@/components/Chip";
import { SectionCard } from "@/components/SectionCard";
import {
  MOODS,
  RATINGS,
  STREAMING_SERVICES,
  type Rating,
} from "@/lib/api/recommend";
import { useAuth } from "@/lib/auth/AuthContext";

const EYEBROW = "text-12 font-medium tracking-[0.18em] uppercase text-text-muted";

export default function PreferencesPage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [services, setServices] = useState<string[]>([
    "netflix",
    "prime",
    "mubi",
  ]);
  const [moods, setMoods] = useState<string[]>(["thoughtful", "chill"]);
  const [rating, setRating] = useState<Rating>("R");

  function toggleSet(arr: string[], value: string): string[] {
    return arr.includes(value)
      ? arr.filter((v) => v !== value)
      : [...arr, value];
  }

  function handleSignOut() {
    signOut();
    router.push("/login");
  }

  const email = user?.email ?? "";
  return (
    <div className="max-w-[880px] mx-auto px-6 md:px-10 py-10 md:py-14">
      <p className={`${EYEBROW} mb-2`}>Account</p>
      {/* non-tokenized: text-[36px] page title — between Phase 2 steps (28/40) */}
      <h1 className="font-display text-[36px] font-extrabold tracking-[-0.02em] leading-[1.05] text-text-primary">
        Preferences
      </h1>
      <p className="text-text-secondary text-14 mt-2">
        Tune the recommendations. Changes save automatically.
      </p>

      <div className="flex flex-col gap-4 mt-8">
        <SectionCard
          title="Streaming services"
          helper="Only suggest things on services you actually have."
        >
          <div className="flex flex-wrap gap-2.5">
            {STREAMING_SERVICES.map((s) => (
              <Chip
                key={s.id}
                active={services.includes(s.id)}
                onClick={() => setServices(toggleSet(services, s.id))}
              >
                <span className="font-display font-extrabold text-11">
                  {s.glyph}
                </span>
                <span>{s.name}</span>
              </Chip>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Default mood"
          helper="What you usually want. You can override per recommendation."
        >
          <div className="flex flex-wrap gap-2">
            {MOODS.map((m) => (
              <Chip
                key={m.id}
                active={moods.includes(m.id)}
                onClick={() => setMoods(toggleSet(moods, m.id))}
              >
                <span aria-hidden>{m.icon}</span>
                <span>{m.label}</span>
              </Chip>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Maximum age rating"
          helper="We won't go beyond this."
        >
          <div className="flex flex-wrap gap-2">
            {RATINGS.map((r) => (
              <Chip
                key={r}
                active={r === rating}
                onClick={() => setRating(r)}
                className="min-w-16"
              >
                {r}
              </Chip>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Account">
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center justify-between gap-4 pb-3.5 border-b border-border">
              <div>
                <p className="text-13 font-semibold text-text-primary">Email</p>
                <p className="text-12 text-text-secondary mt-0.5">{email}</p>
                <p className="text-11 text-text-muted mt-1">
                  Email changes require confirmation from both old and new
                  addresses.
                </p>
              </div>
              <button
                type="button"
                disabled
                className="shrink-0 inline-flex items-center justify-center px-3.5 h-9 rounded-md bg-surface-2 border border-border text-13 font-semibold text-text-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Change
              </button>
            </div>

            <div className="flex items-center justify-between gap-4 pb-3.5 border-b border-border">
              <div>
                <p className="text-13 font-semibold text-text-primary">
                  Password
                </p>
                <p className="text-12 text-text-secondary mt-0.5">
                  Last changed 4 months ago
                </p>
              </div>
              <button
                type="button"
                disabled
                className="shrink-0 inline-flex items-center justify-center px-3.5 h-9 rounded-md bg-surface-2 border border-border text-13 font-semibold text-text-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Change
              </button>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-13 font-semibold text-text-primary">
                  Sign out
                </p>
                <p className="text-12 text-text-secondary mt-0.5">
                  You&apos;ll need to sign back in to see your queue.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3.5 h-9 rounded-md bg-danger/10 border border-danger/40 hover:border-danger text-13 font-semibold text-danger transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              >
                <LogOut size={14} aria-hidden />
                Sign out
              </button>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
