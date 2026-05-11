/**
 * Phase 9 (HIST-05, issue #98) — shared empty-state card.
 *
 * Server Component. Reused by Phase 10 (Watch Later) for the
 * empty-queue card. Title + body + optional CTA Link.
 */

import Link from "next/link";

type EmptyStateProps = {
  title: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
};

export function EmptyState({ title, body, ctaLabel, ctaHref }: EmptyStateProps) {
  return (
    <div className="bg-surface border border-border rounded-xl p-10 md:p-14 text-center">
      <h2 className="font-display text-20 font-bold text-text-primary">
        {title}
      </h2>
      <p className="text-text-secondary text-14 mt-2 max-w-[480px] mx-auto">
        {body}
      </p>
      {ctaLabel && ctaHref && (
        <Link
          href={ctaHref}
          className="inline-flex items-center justify-center mt-6 px-5 h-12 rounded-md bg-accent hover:bg-accent-hover text-on-accent text-14 font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
        >
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
