/**
 * Phase 3 (LAYT-04, issue #92) — `(app)` route-group layout.
 *
 * Wraps every page under app/(app)/ with the chrome composer (PageLayout).
 * Route group `(app)` is URL-cosmetic — pages keep their original URL paths.
 *
 * Per CONTEXT D-Discretion: this layout does NOT pre-render a Navbar header.
 * Pages opt into a top bar by including <Navbar variant="..." /> in their
 * own JSX. (Phase 6 home will pass it; detail screens skip it, matching the
 * reference design.)
 *
 * Server Component (Sidebar inside PageLayout is the client boundary).
 */

import { PageLayout } from "@/components/PageLayout";

export default function AppGroupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <PageLayout>{children}</PageLayout>;
}
