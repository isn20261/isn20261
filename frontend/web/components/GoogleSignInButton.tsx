"use client";

/**
 * "Continuar com Google" button (issue #181). Kicks off the Cognito Hosted-UI
 * redirect via the auth seam. On success the browser navigates away, so the
 * busy state only resets if the redirect itself fails (e.g. missing env vars).
 *
 * The multicolor Google "G" is a brand asset (public/google.svg) rendered via
 * <img> — keeps hardcoded brand colors out of components per the design-token
 * rule (AGENTS.md). Button chrome uses theme tokens only.
 */

import { useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";

export function GoogleSignInButton({
  from,
  disabled,
}: {
  from?: string;
  disabled?: boolean;
}) {
  const { signInWithGoogle } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);

  async function handleClick() {
    if (isRedirecting) return;
    setIsRedirecting(true);
    try {
      await signInWithGoogle(from);
    } catch {
      setIsRedirecting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isRedirecting}
      aria-busy={isRedirecting || undefined}
      /* non-tokenized: tracking-[-0.005em] matches reference .btn class — see UI-SPEC §Typography */
      className="h-14 flex items-center justify-center gap-3 bg-surface-elevated hover:bg-surface-2 border border-border-strong text-text-primary text-16 font-semibold tracking-[-0.005em] rounded-md transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-90 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/google.svg" alt="" aria-hidden width={18} height={18} />
      {isRedirecting ? (
        <>
          Continuar com Google
          <span
            className="w-4 h-4 rounded-full border-2 border-text-primary border-t-transparent animate-spin"
            aria-hidden
          />
        </>
      ) : (
        "Continuar com Google"
      )}
    </button>
  );
}
