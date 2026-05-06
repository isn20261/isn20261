"use client";

/**
 * Phase 5 (AUTH-09, AUTH-11, AUTH-13, issue #94) — protected-route gate.
 *
 * Renders {children} only when the auth context reports authenticated.
 * Unauthenticated visitors are redirected to /login?from=<path> so the
 * login flow can return them after sign-in. While the context is still
 * rehydrating from localStorage, renders nothing (no flash of /login,
 * no flash of protected content).
 */

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";

export function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const from = encodeURIComponent(pathname);
      router.replace(`/login?from=${from}`);
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  if (isLoading || !isAuthenticated) {
    return <div className="min-h-screen" aria-busy="true" />;
  }

  return <>{children}</>;
}
