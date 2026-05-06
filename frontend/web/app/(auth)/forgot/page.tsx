/**
 * Phase 4 (D-01, issue #93) — /forgot password-reset stub.
 *
 * Server Component placeholder. The design reference's 3-step recovery flow
 * (auth.jsx:162-261: email → check-email → strength-meter new-password) is
 * deferred to a future phase / v2 — issue #93 explicitly scopes Phase 4 to
 * AUTH-01..07 only.
 *
 * Renders inside the existing AuthShell card from app/(auth)/layout.tsx.
 *
 * DSGN-06 escape hatches (carry over from auth title styling — see UI-SPEC §Typography):
 *   - text-[26px], tracking-[-0.02em], leading-[1.02] : auth-title scale
 *   - text-[13px]                                     : auth-subtitle scale
 */

import Link from "next/link";

export default function ForgotPage() {
  return (
    <>
      {/* non-tokenized: text-[26px], tracking-[-0.02em], leading-[1.02] match the reference .display class — see UI-SPEC §Typography */}
      <h1 className="font-display text-[26px] font-extrabold tracking-[-0.02em] leading-[1.02] text-center text-text-primary">
        Reset password — coming soon
      </h1>
      {/* non-tokenized: text-[13px] is the auth-subtitle scale — see UI-SPEC §Typography */}
      <p className="text-center text-text-secondary text-[13px] mt-1.5">
        Password reset is coming in a future update.
      </p>
      <div className="flex justify-center mt-6">
        <Link
          href="/login"
          className="text-text-secondary hover:text-text-primary text-14 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-sm"
        >
          ← Back to sign in
        </Link>
      </div>
    </>
  );
}
