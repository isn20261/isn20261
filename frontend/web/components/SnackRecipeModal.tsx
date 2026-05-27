"use client";

/**
 * A two-state floating card shown while the recommendation fetch is in
 * flight: a centered recipe modal during loading, a small popcorn bubble
 * in the top-right when minimized. The two states are separate elements
 * cross-faded via opacity — no morphing layout, just fade-out / fade-in.
 *
 * `isLoading` from the consumer forces the open state. `userOpen` is the
 * self-managed re-open after a load completes. When loading kicks in again
 * (next /recommend fetch), userOpen resets so the modal re-opens centered.
 */

import { useEffect, useState } from "react";
import { ExternalLink, Minimize2, Popcorn } from "lucide-react";
import type { SnackRecipe } from "@/lib/data/snack-recipes";
import { cn } from "@/lib/utils";

type Props = {
  recipe: SnackRecipe;
  isLoading: boolean;
};

export function SnackRecipeModal({ recipe, isLoading }: Props) {
  const [userOpen, setUserOpen] = useState(false);

  useEffect(() => {
    if (isLoading) setUserOpen(false);
  }, [isLoading]);

  const open = isLoading || userOpen;

  return (
    <>
      {/* Open state — centered recipe card */}
      <div
        aria-hidden={!open}
        className={cn(
          // non-tokenized: top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 centering recipe; w-[min(420px,92vw)] modal width primitive.
          "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[min(420px,92vw)] rounded-lg bg-surface-elevated border border-border-strong shadow-lg transition-opacity duration-300 ease-out",
          open ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-3">
            {/* non-tokenized: text-12 tracking-[0.18em] eyebrow recipe matches recommendation header */}
            <p className="text-12 font-medium tracking-[0.18em] uppercase text-accent flex items-center gap-2">
              <Popcorn size={14} aria-hidden />
              Enquanto isso…
            </p>
            <button
              type="button"
              onClick={() => setUserOpen(false)}
              disabled={isLoading}
              aria-label="Minimizar"
              className="text-text-muted hover:text-text-primary transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-sm"
            >
              <Minimize2 size={16} aria-hidden />
            </button>
          </div>
          {/* non-tokenized: leading-[1.15] tightens recipe-title display */}
          <h2 className="font-display text-20 font-extrabold text-text-primary leading-[1.15] mb-2">
            {recipe.title}
          </h2>
          {/* non-tokenized: text-[15px] body size between Phase 2 steps to match recommendation hero */}
          <p className="text-text-secondary text-[15px] leading-[1.55] mb-5">
            {recipe.description}
          </p>
          <a
            href={recipe.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-accent hover:bg-accent-hover text-on-accent text-14 font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
          >
            <ExternalLink size={14} aria-hidden />
            Ver receita
          </a>
          {isLoading && (
            <p className="text-12 text-text-muted mt-4 flex items-center gap-2">
              <span
                aria-hidden
                className="inline-block w-1.5 h-1.5 rounded-full bg-accent animate-pulse"
              />
              Buscando sua recomendação…
            </p>
          )}
        </div>
      </div>

      {/* Mini state — top-right popcorn bubble */}
      <button
        type="button"
        aria-hidden={open}
        aria-label="Ver receita"
        tabIndex={open ? -1 : 0}
        onClick={() => setUserOpen(true)}
        className={cn(
          // non-tokenized: top-20 right-6 mini bubble position; w-14 h-14 mini bubble size primitive.
          "fixed top-6 right-6 z-50 w-14 h-14 rounded-full bg-surface-elevated border border-border-strong shadow-lg flex items-center justify-center text-accent hover:border-accent transition-opacity duration-300 ease-out focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
          open ? "opacity-0 pointer-events-none" : "opacity-100",
        )}
      >
        <Popcorn
          size={22}
          aria-hidden
          className={isLoading ? "animate-pulse" : undefined}
        />
      </button>
    </>
  );
}
