/**
 * Phase 5 (AUTH-09, issue #94) — gated nested route group inside (app).
 *
 * All pages under app/(app)/(protected)/ render only when the auth context
 * reports authenticated. Phase 8 (preferences), Phase 9 (history), and
 * Phase 10 (watch-later) drop their pages inside this group; they don't
 * need to import RequireAuth themselves.
 *
 * Server Component — RequireAuth (Client) is the boundary.
 */

import { RequireAuth } from "@/components/RequireAuth";

export default function ProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <RequireAuth>{children}</RequireAuth>;
}
