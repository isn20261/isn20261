"use client";

/**
 * A two-state floating card shown around the recommendation fetch: a recipe
 * card anchored BOTTOM-RIGHT while loading (and for a short linger after), then
 * a small popcorn bubble in the same corner once it auto-collapses.
 *
 * Why bottom-right (not centered): the /recommend fetch is very fast, so a
 * centered modal used to flash in and out jarringly. Anchoring the card where
 * the bubble lives means the open→mini transition is an in-place shrink, not a
 * fly-across, and a brief post-fetch linger keeps the recipe readable even on a
 * sub-second fetch.
 *
 * Timing:
 *   - isLoading true            → card open (forced).
 *   - isLoading true → false    → keep the card open for LINGER_MS, then
 *                                 auto-collapse to the bubble.
 *   - user clicks minimize      → collapse immediately (cancels the linger).
 *   - user clicks the bubble    → re-open the card (stays until minimized).
 *   - next fetch (isLoading true) → re-opens.
 *
 * The two visual states are separate elements cross-faded via opacity — no
 * layout morphing.
 */

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Minimize2, Popcorn } from "lucide-react";
import type { SnackRecipe } from "@/lib/data/snack-recipes";
import { cn } from "@/lib/utils";

type Props = {
  recipe: SnackRecipe;
  isLoading: boolean;
};

// How long the card lingers after a fetch completes before auto-collapsing.
const LINGER_MS = 2500;

export function SnackRecipeModal({ recipe, isLoading }: Props) {
  // The card is open when any of these hold:
  //   - isLoading (derived from props — no state needed)
  //   - lingering: the brief post-fetch hold before auto-collapse
  //   - reopened: the user re-opened it from the bubble
  // Minimizing clears lingering+reopened.
  const [lingering, setLingering] = useState(false);
  const [reopened, setReopened] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  // Tracks the previous isLoading to detect the true→false edge during render
  // (the React-recommended "adjust state while rendering" pattern — avoids
  // synchronous setState inside an effect, i.e. react-hooks/set-state-in-effect).
  const [prevLoading, setPrevLoading] = useState(isLoading);
  const lingerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  function clearLinger() {
    if (lingerTimer.current) {
      clearTimeout(lingerTimer.current);
      lingerTimer.current = null;
    }
  }

  // Edge-detect during render: when a fetch just finished, start lingering.
  if (prevLoading !== isLoading) {
    setPrevLoading(isLoading);
    if (!isLoading) setLingering(true); // fetch settled → hold briefly
  }

  // The effect only SCHEDULES the collapse timer (and cleans it up). The
  // setState happens in the timer callback, outside the render pass.
  useEffect(() => {
    if (!lingering) return;
    lingerTimer.current = setTimeout(() => {
      lingerTimer.current = null;
      setLingering(false);
    }, LINGER_MS);
    return clearLinger;
  }, [lingering]);

  const open = isMobile
    ? reopened
    : (isLoading || lingering || reopened);

  function minimizeNow() {
    clearLinger();
    setLingering(false);
    setReopened(false);
  }

  return (
    <>
      {/* Open state — recipe card, anchored bottom-right (in-place with the bubble). */}
      <div
        aria-hidden={!open}
        className={cn(
          // non-tokenized: bottom-20 md:bottom-6 right-6 anchor; w-[min(380px,calc(100%-3rem))] responsive modal width.
          "fixed bottom-20 md:bottom-6 right-6 z-50 w-[min(380px,calc(100%-3rem))] rounded-lg bg-surface-elevated border border-border-strong shadow-lg transition-opacity duration-300 ease-out",
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
              onClick={minimizeNow}
              aria-label="Minimizar"
              className="text-text-muted hover:text-text-primary transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-sm"
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

      {/* Mini state — bottom-right popcorn bubble (same corner as the card). */}
      <button
        type="button"
        aria-hidden={open}
        aria-label="Ver receita"
        tabIndex={open ? -1 : 0}
        onClick={() => setReopened(true)}
        className={cn(
          // non-tokenized: bottom-20 md:bottom-6 right-6 mini bubble position; w-14 h-14 mini bubble size primitive.
          "fixed bottom-20 md:bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-surface-elevated border border-border-strong shadow-lg flex items-center justify-center text-accent hover:border-accent transition-opacity duration-300 ease-out focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
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
