/**
 * Phase 14 — Mount-time loading skeleton for chip-style preference sections.
 *
 * DSGN-06 compliant: tokens-only (bg-surface-2, rounded-md) + animate-pulse.
 * Reused by Phase 16 (watch-later) if its empty state needs a chip-style
 * placeholder; the prop API is intentionally minimal.
 */

type Props = {
  count?: number;
};

export function ChipsSkeleton({ count = 5 }: Props) {
  return (
    <div className="flex flex-wrap gap-2.5" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-9 w-24 rounded-md bg-surface-2 animate-pulse"
        />
      ))}
    </div>
  );
}
