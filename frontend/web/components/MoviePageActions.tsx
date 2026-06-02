"use client";

/**
 * Issue #221 — action row for the `/movie/[movieId]` detail page.
 *
 * The page itself is a statically-exported server component (no client JS for
 * the catalogue), so the interactive bits live in this small client island:
 *   - "Salvar para assistir depois" — add-only, same `/watch-later` POST the
 *     recommendation screen uses (no membership pre-check / no remove until v2,
 *     so a movie already in the list can be added again — a known app-wide
 *     limitation, see watch-later.ts).
 *   - "Voltar para a lista" — back to /watch-later.
 *
 * The Save button is hidden for guests (the /watch-later Lambda is JWT-only).
 */

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bookmark, BookmarkCheck } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { addWatchLater } from "@/lib/api/watch-later";
import { useApiErrorUx } from "@/lib/api/useApiErrorUx";
import type { ApiError } from "@/lib/api/client";

export function MoviePageActions({ movieId }: { movieId: string }) {
  const { isAuthenticated } = useAuth();
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<ApiError | null>(null);
  const inFlight = useRef(false);
  useApiErrorUx(saveError);

  async function handleSave() {
    if (saved || inFlight.current) return;
    inFlight.current = true;
    setSaved(true); // optimistic
    const res = await addWatchLater(movieId);
    inFlight.current = false;
    if (!res.ok) {
      setSaved(false); // rollback
      setSaveError(res.error);
    }
  }

  return (
    <>
      {isAuthenticated && (
        <button
          type="button"
          onClick={handleSave}
          disabled={saved}
          aria-pressed={saved}
          className="inline-flex items-center gap-2 h-12 px-5 rounded-md bg-surface-2 border border-border hover:border-border-strong text-text-primary text-14 font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 disabled:opacity-70 disabled:cursor-default disabled:hover:border-border"
        >
          {saved ? (
            <BookmarkCheck size={16} aria-hidden />
          ) : (
            <Bookmark size={16} aria-hidden />
          )}
          {saved ? "Salvo" : "Salvar para assistir depois"}
        </button>
      )}
      <Link
        href="/watch-later"
        className="inline-flex items-center gap-2 h-12 px-5 rounded-md text-text-secondary hover:text-text-primary text-14 font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
      >
        <ArrowLeft size={16} aria-hidden />
        Voltar para a lista
      </Link>
    </>
  );
}
