/**
 * Phase 3 (LAYT-03, issue #92) — global footer (in-flow disclaimer block).
 *
 * Composed by `<PageLayout>` after the page content slot. Hidden on auth routes —
 * `(auth)/layout.tsx` does NOT render Footer (the AuthShell has its own internal
 * disclaimer slot per UI-SPEC §Component Inventory).
 *
 * Server Component. No props. No client interactivity.
 */

import { BrandMark } from "@/components/BrandMark";

export function Footer() {
  return (
    <footer className="border-t border-border py-6 px-5 md:px-10 flex flex-col md:flex-row items-center md:justify-between gap-4 text-text-muted text-12 font-body">
      <div className="flex items-center gap-3">
        <BrandMark size={24} withWord={false} />
        <span>Cinedica, o melhor site de recomendação de filmes</span>
      </div>
    </footer>
  );
}
