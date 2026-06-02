"use client";

/**
 * Movie poster with blur-up loading and a graceful error fallback.
 *
 * Loading: a tiny (48px, ~1KB) variant is shown immediately, blurred and
 * scaled up, while the sharp target width loads on top. When the sharp image
 * decodes it cross-fades in over the blur. This kills the "blank box then pop"
 * lag for the right-sized (640px) posters.
 *
 * Error: if the sharp image fails (some catalogue posters 404), we render a
 * film-icon placeholder on a surface tile instead of a broken-image glyph.
 *
 * Consumers pass the *original* catalogue URL; this component derives the tiny
 * and target widths via `posterAt`. `fit` controls object-fit ("contain" for
 * the main hero poster so nothing crops; "cover" for fixed-ratio rail cards).
 *
 * DSGN-06: tokens only (bg-surface-2, text-text-muted). The blur amount and the
 * scale are non-tokenized visual primitives, marked inline.
 */

import { useState } from "react";
import { Film } from "lucide-react";
import { posterAt, type PosterWidth } from "@/lib/posters";
import { cn } from "@/lib/utils";

type Props = {
  /** Original catalogue poster URL (may be undefined / empty). */
  src?: string;
  alt: string;
  /** Target render width. Defaults to "hero". */
  width?: PosterWidth;
  /** object-fit for the sharp image. Defaults to "cover". */
  fit?: "cover" | "contain";
  className?: string;
};

export function PosterImage({
  src,
  alt,
  width = "hero",
  fit = "cover",
  className,
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  // Reset blur-up / error state when the source changes, using the
  // adjust-state-while-rendering pattern (React docs) rather than an effect, so
  // a new poster re-runs the load animation without a synchronous setState in
  // an effect (react-hooks/set-state-in-effect).
  const [prevSrc, setPrevSrc] = useState(src);
  if (prevSrc !== src) {
    setPrevSrc(src);
    setLoaded(false);
    setErrored(false);
  }

  // No usable source, or the sharp image failed → icon placeholder.
  if (!src || errored) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-surface-2 text-text-muted",
          className,
        )}
        aria-label={alt}
        role="img"
      >
        <Film size={32} aria-hidden />
      </div>
    );
  }

  const tiny = posterAt(src, "tiny");
  const sharp = posterAt(src, width);
  const objectFit = fit === "contain" ? "object-contain" : "object-cover";

  return (
    <div className={cn("relative overflow-hidden bg-surface-2", className)}>
      {/* Tiny blurred placeholder — fades out once the sharp image is in. */}
      {!loaded && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={tiny}
          alt=""
          aria-hidden
          /* non-tokenized: blur-[14px] + scale-110 blur-up placeholder recipe */
          className="absolute inset-0 w-full h-full object-cover blur-[14px] scale-110"
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={sharp}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
        className={cn(
          "relative w-full h-full transition-opacity duration-500 ease-out",
          objectFit,
          loaded ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}
