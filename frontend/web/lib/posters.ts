/**
 * IMDb / Amazon media poster URL helpers.
 *
 * The catalogue stores every poster at `._V1_SX4000.jpg` — a ~4000px-wide image
 * (~200KB+) for a thumbnail that renders at ~320px. That's the source of the
 * "posters take a moment to load" lag. Amazon's media CDN lets us request a
 * specific width by rewriting the `._V1_<spec>.jpg` segment, so we downscale to
 * what we actually display.
 *
 * Widths we use:
 *   - tiny  (48px)  : 1KB blur-up placeholder (instant)
 *   - card  (300px) : similar-rail cards (~150px @2x)
 *   - hero  (640px) : main recommendation poster (~320px @2x)
 *
 * If a URL doesn't match the rewritable pattern (defensive — not expected for
 * the current catalogue) it's returned unchanged.
 */

const V1_RE = /\._V1_[A-Za-z0-9_,]+\.jpg$/i;

export type PosterWidth = "tiny" | "card" | "hero";

const SPEC: Record<PosterWidth, string> = {
  tiny: "SX48",
  card: "SX300",
  hero: "SX640",
};

/**
 * Rewrite an Amazon media poster URL to a target render width. No-op for URLs
 * that don't carry the `._V1_…​.jpg` size segment.
 */
export function posterAt(url: string, width: PosterWidth): string {
  if (!V1_RE.test(url)) return url;
  return url.replace(V1_RE, `._V1_${SPEC[width]}.jpg`);
}
