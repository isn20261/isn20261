"use client";

/**
 * Phase 14 (INTG-PREF-01..03, issue #133) — preferences screen, real backend.
 *
 * Replaces the Phase 8 local-state-only mock with real GET + POST against the
 * /preferences Lambda via the Phase 12 fetch wrapper.
 *
 * Wire format / strategy decisions: see .planning/phases/14-preferences-integration/14-CONTEXT.md
 *   - Per-toggle optimistic with in-flight dedup + replay queue (rollback on error)
 *   - humor is single-string on the wire — UI is single-select
 *   - genres is a new SectionCard, sourced from lib/api/recommend.ts GENRES
 *   - kebab-case "age-rating" is the wire key; JS local identifier is `ageRating`
 *
 * Lambda quirk workaround: `_post()` in functions/preferences/preferences.py uses
 * `if X is not None` to skip unset fields, which means literal null is a no-op.
 * To clear a single-string field (humor / age-rating), we send "" instead of null.
 * The UI treats both null and "" as "no selection".
 *
 * Auth gate (RequireAuth) and route-group (protected) are inherited from
 * the (app)/(protected) layout; nothing changed there.
 *
 * DSGN-06 escape hatches (each with // non-tokenized inline):
 *   - max-w-[880px]              : column width primitive (already documented)
 *   - text-[36px]                : page title — between Phase 2 steps (28/40)
 *   - tracking-[0.18em]          : eyebrow letter-spacing (already documented)
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Chip } from "@/components/Chip";
import { SectionCard } from "@/components/SectionCard";
import { ChipsSkeleton } from "@/components/ChipsSkeleton";
import {
  GENRES,
  MOODS,
  RATINGS,
  STREAMING_SERVICES,
  type Rating,
} from "@/lib/api/recommend";
import {
  getPreferences,
  savePreferences,
  type Preferences,
} from "@/lib/api/preferences";
import { useApiErrorUx } from "@/lib/api/useApiErrorUx";
import type { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/AuthContext";

const EYEBROW =
  "text-12 font-medium tracking-[0.18em] uppercase text-text-muted";

type Field = keyof Preferences;

export default function PreferencesPage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const inFlight = useRef<Set<Field>>(new Set());
  const replayQueue = useRef<Map<Field, unknown>>(new Map());
  useApiErrorUx(error);

  useEffect(() => {
    let cancelled = false;
    getPreferences().then((res) => {
      if (cancelled) return;
      if (!res.ok) {
        setError(res.error);
        setIsLoading(false);
        return;
      }
      setPrefs(res.data);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function commit<K extends Field>(
    field: K,
    next: Preferences[K],
    prevSnapshot: Preferences,
  ) {
    setPrefs((curr) => (curr ? { ...curr, [field]: next } : curr));
    if (inFlight.current.has(field)) {
      replayQueue.current.set(field, next);
      return;
    }
    inFlight.current.add(field);
    let value: Preferences[K] = next;
    let snapshot = prevSnapshot;
    // Loop: replay any queued supersede after the in-flight request resolves.
    while (true) {
      // Lambda quirk: null in POST is a no-op (functions/preferences/preferences.py
      // `if X is not None`). Translate null → "" for single-string fields so the
      // server actually clears the value. Documented in 14-CONTEXT.md / 14-02-PLAN.md.
      const wireValue =
        value === null && (field === "humor" || field === "age-rating")
          ? ""
          : value;
      const res = await savePreferences({
        [field]: wireValue,
      } as Partial<Preferences>);
      if (!res.ok) {
        setPrefs(snapshot);
        setError(res.error);
        inFlight.current.delete(field);
        replayQueue.current.delete(field);
        return;
      }
      const queued = replayQueue.current.get(field);
      if (queued === undefined) {
        inFlight.current.delete(field);
        return;
      }
      replayQueue.current.delete(field);
      value = queued as Preferences[K];
      snapshot = { ...snapshot, [field]: value };
    }
  }

  function toggleSet(
    arr: readonly string[],
    value: string,
  ): readonly string[] {
    return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
  }

  function toggleSingle(
    curr: string | null,
    value: string,
  ): string | null {
    return curr === value ? null : value;
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
          title="Favorite genres"
          helper="Recommendations will lean toward these."
        >
          {isLoading || !prefs ? (
            <ChipsSkeleton count={6} />
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {GENRES.map((g) => (
                <Chip
                  key={g.id}
                  active={prefs.genres.includes(g.id)}
                  onClick={() =>
                    commit("genres", toggleSet(prefs.genres, g.id), prefs)
                  }
                >
                  {g.label}
                </Chip>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Streaming services"
          helper="Only suggest things on services you actually have."
        >
          {isLoading || !prefs ? (
            <ChipsSkeleton count={6} />
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {STREAMING_SERVICES.map((s) => (
                <Chip
                  key={s.id}
                  active={prefs.subscriptions.includes(s.id)}
                  onClick={() =>
                    commit(
                      "subscriptions",
                      toggleSet(prefs.subscriptions, s.id),
                      prefs,
                    )
                  }
                >
                  <span className="font-display font-extrabold text-11">
                    {s.glyph}
                  </span>
                  <span>{s.name}</span>
                </Chip>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Default mood"
          helper="What you usually want. You can override per recommendation."
        >
          {isLoading || !prefs ? (
            <ChipsSkeleton count={4} />
          ) : (
            <div className="flex flex-wrap gap-2">
              {MOODS.map((m) => (
                <Chip
                  key={m.id}
                  active={prefs.humor === m.id}
                  onClick={() =>
                    commit("humor", toggleSingle(prefs.humor, m.id), prefs)
                  }
                >
                  <span aria-hidden>{m.icon}</span>
                  <span>{m.label}</span>
                </Chip>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Maximum age rating"
          helper="We won't go beyond this."
        >
          {isLoading || !prefs ? (
            <ChipsSkeleton count={5} />
          ) : (
            <div className="flex flex-wrap gap-2">
              {RATINGS.map((r) => (
                <Chip
                  key={r}
                  active={r === prefs["age-rating"]}
                  onClick={() =>
                    commit(
                      "age-rating",
                      toggleSingle(prefs["age-rating"], r) as Rating | null,
                      prefs,
                    )
                  }
                  className="min-w-16"
                >
                  {r}
                </Chip>
              ))}
            </div>
          )}
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
