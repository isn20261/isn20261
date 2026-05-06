/**
 * Phase 8 (PREF-01, issue #97) — titled card with optional helper text.
 *
 * Server Component — pure JSX. Used by Preferences for each section
 * (Streaming services / Default mood / Max age rating / Account).
 *
 * DSGN-06 escape hatch:
 *   - text-[17px] for the title — between Phase 2 type-scale steps (16/20)
 */

import type { ReactNode } from "react";

type SectionCardProps = {
  title: string;
  helper?: string;
  children: ReactNode;
};

export function SectionCard({ title, helper, children }: SectionCardProps) {
  return (
    <section className="bg-surface border border-border rounded-xl p-6">
      {/* non-tokenized: text-[17px] title size — between Phase 2 steps */}
      <h3 className="font-display font-bold text-[17px] text-text-primary">
        {title}
      </h3>
      {helper && (
        <p className="text-13 text-text-secondary mt-1.5 mb-4">{helper}</p>
      )}
      <div className={helper ? "" : "mt-3.5"}>{children}</div>
    </section>
  );
}
