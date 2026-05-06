/**
 * Phase 3 (LAYT-04, issue #92) — chrome composer for the (app) route group.
 *
 * Composes Sidebar + optional `header` slot + page content + Footer with the
 * responsive content offsets from UI-SPEC §Responsive Behavior:
 *   - md+ : pl-rail (= 64 px) so content clears the fixed left rail
 *   - <md : pb-tab (= 64 px) so content scrolls clear of the fixed bottom tab bar
 *
 * Server Component. Sidebar (Client) is a child — Next.js handles the boundary.
 * The `header` prop is optional: pages opt-in to a Navbar (CONTEXT D-03).
 * Footer is unconditional in the (app) group (UI-SPEC §Component Inventory).
 */

import type { ReactNode } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Footer } from "@/components/Footer";

type PageLayoutProps = Readonly<{
  header?: ReactNode;
  children: ReactNode;
}>;

export function PageLayout({ header, children }: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-bg text-text-primary font-body">
      <Sidebar />
      <div className="md:pl-rail pb-tab md:pb-0 min-h-screen flex flex-col">
        {header}
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
