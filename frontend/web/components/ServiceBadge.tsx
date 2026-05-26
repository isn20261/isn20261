/**
 * Phase 7 (RECO-01, issue #96) — where-to-watch tile.
 *
 * Server Component. Renders a service name + availability kind in a
 * surface-bordered tile with the service's first letter as a 32×32
 * mini-glyph on the left.
 */

import type { Service } from "@/lib/api/recommend";

const KIND_LABEL: Record<Service["kind"], string> = {
  included: "Incluso",
  rent: "Alugar",
  buy: "Comprar",
};

export function ServiceBadge({ service }: { service: Service }) {
  const isIncluded = service.kind === "included";
  return (
    <div className="flex items-center gap-2.5 px-3 py-2 rounded-md bg-surface border border-border">
      {/* non-tokenized: 32×32 mini-glyph tile — fixed size primitive */}
      <div className="w-8 h-8 rounded-md bg-surface-2 flex items-center justify-center font-display font-extrabold text-12 text-text-primary">
        {service.name[0]}
      </div>
      <div className="flex flex-col">
        <span className="text-13 font-semibold text-text-primary">
          {service.name}
        </span>
        {/* non-tokenized: text-10 + tracking-[0.06em] is the reference availability label recipe */}
        <span
          className={`text-10 tracking-[0.06em] uppercase ${isIncluded ? "text-success" : "text-text-muted"}`}
        >
          {KIND_LABEL[service.kind]}
        </span>
      </div>
    </div>
  );
}
