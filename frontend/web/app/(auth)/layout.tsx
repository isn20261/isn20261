/**
 * Phase 3 (LAYT-04, issue #92) — `(auth)` route-group layout.
 *
 * Centered-card chrome for /login + /register (Phase 4 fills these pages).
 * Re-authored fresh from `_design-reference/auth.jsx:3-35` per CLAUDE.md rule #2.
 *
 * Does NOT render Sidebar (no rail / no tab bar on auth routes).
 * Does NOT render the global Footer — its own internal disclaimer is below the card.
 *
 * Server Component. Default export per Next.js layout contract.
 *
 * Note: this file is shipped in Phase 3 even though /login and /register pages
 * land in Phase 4 (CONTEXT D-06) — shipping the layout shape now avoids a
 * Phase-4 layout-decision detour.
 */

import { BrandMark } from "@/components/BrandMark";

export default function AuthGroupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-bg">
      {/* size primitive: card max-width 420px with 20px gutters at <420px viewports — see UI-SPEC §Component Inventory (auth) row */}
      {/* approximation: bg-surface/75 stands in for reference rgba(20,20,22,.75) */}
      <div className="relative w-[min(420px,calc(100%-40px))] py-10 px-8 bg-surface/75 border border-border rounded-lg backdrop-blur-lg shadow-lg">
        <div className="flex justify-center mb-7">
          <BrandMark size={36} />
        </div>
        {children}
      </div>
      <div className="absolute bottom-6 left-0 right-0 text-center text-text-muted text-12 font-body">
        Cinedica, o melhor site de recomendação de filmes
      </div>
    </div>
  );
}
