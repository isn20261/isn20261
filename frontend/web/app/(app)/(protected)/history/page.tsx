"use client";

/**
 * Phase 9 (HIST-01..05, issue #98) — history screen.
 *
 * Lists past recommendations grouped by time period (Today / Yesterday /
 * Last week / Earlier). Lives inside (app)/(protected)/ so the Phase 5
 * RequireAuth gate covers HIST-02.
 *
 * Local-only delete: filters the entry from in-memory state. Persistence
 * is a v2 concern (real backend writes through the recommend module).
 *
 * DSGN-06 escape hatches (each with // non-tokenized inline):
 *   - max-w-[920px]              : column width primitive
 *   - text-[36px]                : page title — between Phase 2 steps (28/40)
 *   - tracking-[0.18em]          : eyebrow letter-spacing (already documented)
 *   - tracking-[0.02em]          : group-label letter-spacing recipe
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { HistoryRow } from "@/components/HistoryRow";
import { getHistory, type HistoryGroup } from "@/lib/api/history";

const EYEBROW = "text-12 font-medium tracking-[0.18em] uppercase text-text-muted";

export default function HistoryPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<readonly HistoryGroup[] | null>(null);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await getHistory();
      if (!cancelled) setGroups(result);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleGroups = useMemo(() => {
    if (!groups) return [];
    return groups
      .map((g) => ({
        label: g.label,
        entries: g.entries.filter((e) => !removedIds.has(e.id)),
      }))
      .filter((g) => g.entries.length > 0);
  }, [groups, removedIds]);

  function handleDelete(id: string) {
    setRemovedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }

  return (
    <div className="max-w-[920px] mx-auto px-6 md:px-10 py-10 md:py-14">
      <p className={`${EYEBROW} mb-2`}>Library</p>
      {/* non-tokenized: text-[36px] page title — between Phase 2 steps (28/40) */}
      <h1 className="font-display text-[36px] font-extrabold tracking-[-0.02em] leading-[1.05] text-text-primary">
        History
      </h1>
      <p className="text-text-secondary text-14 mt-2 mb-8">
        Every recommendation we&apos;ve served you, with the mood and filters you
        had on.
      </p>

      {groups === null ? (
        <div className="flex flex-col gap-2 animate-pulse" aria-busy="true">
          <div className="h-[118px] rounded-xl bg-surface" />
          <div className="h-[118px] rounded-xl bg-surface" />
          <div className="h-[118px] rounded-xl bg-surface" />
        </div>
      ) : visibleGroups.length === 0 ? (
        <EmptyState
          title="Your history is empty."
          body="Recommendations you've gotten will show up here."
          ctaLabel="Pick a movie for me"
          ctaHref="/"
        />
      ) : (
        <div className="flex flex-col gap-8 animate-fade-up [animation-delay:60ms]">
          {visibleGroups.map((g) => (
            <section key={g.label}>
              {/* non-tokenized: tracking-[0.02em] is the reference group-label recipe */}
              <h2 className="font-display font-bold text-14 text-text-secondary tracking-[0.02em] mb-3.5">
                {g.label}
              </h2>
              <div className="flex flex-col gap-2">
                {g.entries.map((e) => (
                  <HistoryRow
                    key={e.id}
                    entry={e}
                    onView={() => router.push("/recommendation")}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
