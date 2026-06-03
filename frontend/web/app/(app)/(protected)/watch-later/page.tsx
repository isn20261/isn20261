"use client";

/**
 * Phase 16 (INTG-WTCL-01..03, issue #135) — watch-later screen, real backend.
 *
 * Phase 10 used a localStorage-backed MOVIES-decorated grid with a remove
 * button. The real /watch-later Lambda returns only { title, "added-at" }
 * per row and has no PUT/DELETE verb (verified 2026-05-14). Phase 16
 * degrades the UI to a minimal title + relative-time row list, drops the
 * remove button (no backend support), and ships read + add only.
 *
 * v2.1 follow-ups: backend PUT/DELETE for remove; richer GET response
 * (poster URL, mood, etc.) to restore the Phase 10 grid; idempotency on
 * POST to prevent duplicate adds.
 *
 * DSGN-06 escape hatches (each marked // non-tokenized inline):
 *   - max-w-[920px]              : column width primitive (matches Phase 15 history)
 *   - text-[36px]                : page title — between Phase 2 steps (28/40)
 *   - tracking-[0.18em]          : eyebrow letter-spacing (already documented)
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import {
  getWatchLater,
  type WatchLaterItem,
} from "@/lib/api/watch-later";
import { useApiErrorUx } from "@/lib/api/useApiErrorUx";
import type { ApiError } from "@/lib/api/client";
import { relativeTime } from "@/lib/time";

const EYEBROW = "text-12 font-medium tracking-[0.18em] uppercase text-text-muted";

export default function WatchLaterPage() {
  const router = useRouter();
  const [items, setItems] = useState<readonly WatchLaterItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPicking, setIsPicking] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  useApiErrorUx(error);

  // The v1 /watch-later GET returns `title` = the raw movieId the client POSTed,
  // which for live recommendations is `live:${movie.title}`. Strip that prefix
  // before any display or catalogue lookup.
  function cleanTitle(raw: string): string {
    return raw.startsWith("live:") ? raw.slice(5) : raw;
  }

  async function handleMovieClick(rawTitle: string) {
    const title = cleanTitle(rawTitle);
    const { findMovieIdByTitle } = await import("@/lib/api/movie");
    const movieId = findMovieIdByTitle(title);
    if (movieId) router.push(`/movie?id=${movieId}`);
  }

  // "Surpreenda-me desta lista" (issue #221): pick a random saved movie and
  // open its /movie/[movieId] detail page. The v1 /watch-later GET returns only
  // titles, so we resolve title→movieId through the catalogue seam, loaded via
  // a dynamic import so the ~647KB catalogue is fetched on click, not on page
  // load. Titles that don't map to the catalogue are skipped; if none resolve
  // we fall back to a fresh recommendation.
  async function handleSurprise() {
    if (!items || items.length === 0 || isPicking) return;
    setIsPicking(true);
    try {
      const { findMovieIdByTitle } = await import("@/lib/api/movie");
      const resolvable = items
        .map((item) => findMovieIdByTitle(cleanTitle(item.title)))
        .filter((id): id is string => id !== null);
      const picked =
        resolvable.length > 0
          ? resolvable[Math.floor(Math.random() * resolvable.length)]
          : undefined;
      router.push(picked ? `/movie?id=${picked}` : "/recommendation");
    } finally {
      setIsPicking(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    getWatchLater().then((res) => {
      if (cancelled) return;
      if (!res.ok) {
        setError(res.error);
        setIsLoading(false);
        return;
      }
      setItems(res.data);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const count = items?.length ?? 0;
  const now = new Date();

  return (
    <div className="max-w-[920px] mx-auto px-6 md:px-10 py-10 md:py-14">
      <div className="flex items-end justify-between gap-5 mb-7 flex-wrap">
        <div>
          <p className={`${EYEBROW} mb-2`}>Biblioteca</p>
          {/* non-tokenized: text-[36px] page title — between Phase 2 steps (28/40) */}
          <h1 className="font-display text-[36px] font-extrabold tracking-[-0.02em] leading-[1.05] text-text-primary">
            Assistir depois
          </h1>
          <p className="text-text-secondary text-14 mt-2">
            <span className="text-text-primary font-semibold">
              {count} {count === 1 ? "filme" : "filmes"}
            </span>{" "}
            salvos.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSurprise}
          disabled={count === 0 || isPicking}
          aria-busy={isPicking}
          className={`
            inline-flex items-center gap-2 h-12 px-5 rounded-md
            bg-accent hover:bg-accent-hover text-on-accent
            text-14 font-semibold
            transition-colors duration-150
            focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2
            disabled:pointer-events-none disabled:opacity-50
          `}
        >
          <Sparkles size={16} aria-hidden />
          Surpreenda-me desta lista
        </button>
      </div>

      {isLoading || items === null ? (
        <div
          className="flex flex-col gap-2 animate-pulse"
          aria-busy="true"
          aria-label="Carregando lista de assistir depois"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 rounded-md bg-surface" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="Sua fila está vazia."
          body="Receba uma recomendação e salve o que chamar sua atenção. Tudo que você salvar aparece aqui."
          ctaLabel="Escolha um filme pra mim"
          ctaHref="/"
        />
      ) : (
        <div className="flex flex-col gap-2 animate-fade-up [animation-delay:60ms]">
          {items.map((item, idx) => (
            <button
              key={`${item["added-at"]}-${idx}`}
              type="button"
              onClick={() => handleMovieClick(item.title)}
              className="flex items-center justify-between w-full px-4 py-3 rounded-md bg-surface border border-border text-left hover:bg-surface-elevated transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
            >
              <span className="text-14 font-medium text-text-primary truncate pr-4">
                {cleanTitle(item.title)}
              </span>
              <span className="text-12 text-text-muted shrink-0">
                {relativeTime(item["added-at"], now)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
