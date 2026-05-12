"use client";

/**
 * Phase 12 (FETCH-07) — Reusable error UX hook.
 *
 * Maps an ApiError discriminated union to the project's user-facing UX policy:
 *   - network / server / forbidden  → toast.error(message)
 *   - unauthorized                  → no-op (wrapper already fired onUnauthorized → signOut → RequireAuth redirects to /login)
 *   - validation                    → no-op (caller renders inline form messages from error.fields)
 *
 * Pass the current ApiError (or null) every render; the hook fires its
 * side-effect when the error reference changes.
 *
 * Example:
 *   const [error, setError] = useState<ApiError | null>(null);
 *   useApiErrorUx(error);
 *   // ... in your submit handler: const res = await apiGet(...); if (!res.ok) setError(res.error);
 *
 * Note: only the user-safe message string is passed to toast — the upstream
 * cause field is an upstream-logging-only surface (T-12-01b mitigation) and is
 * deliberately never referenced from this file.
 */

import { useEffect } from "react";
import { toast } from "sonner";
import type { ApiError } from "@/lib/api/client";

export function useApiErrorUx(error: ApiError | null): void {
  useEffect(() => {
    if (!error) return;
    switch (error.kind) {
      case "network":
      case "server":
      case "forbidden":
        toast.error(error.message);
        return;
      case "unauthorized":
        return; // wrapper already fired onUnauthorized -> AuthContext.signOut -> RequireAuth redirects
      case "validation":
        return; // caller renders inline (toast on validation is wrong: the form needs to highlight specific fields)
      default: {
        const _exhaustive: never = error;
        void _exhaustive;
        return;
      }
    }
  }, [error]);
}
