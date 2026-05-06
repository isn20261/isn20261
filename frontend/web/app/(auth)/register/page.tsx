"use client";

/**
 * Phase 4 (AUTH-02, AUTH-03, AUTH-05, issue #93) — /register page (Client).
 *
 * Form lives inside the AuthShell card (rendered by app/(auth)/layout.tsx).
 * Submits to lib/api/auth.signUp (mock seam — Cognito-shaped, see CONTEXT D-04).
 * On success: router.push('/') (CONTEXT D-11).
 * On UsernameExistsException: form-level error banner with copy
 * "An account with this email already exists." (UI-SPEC §Copywriting).
 *
 * Validators (D-09 verbatim):
 *   - email contains '@'                   → "Enter a valid email"
 *   - password length >= 8                 → "Use at least 8 characters"
 *   - password === confirm                 → "Passwords don't match"  (STRAIGHT ASCII apostrophe)
 *   - Terms checkbox checked               → "Required"
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, AlertCircle } from "lucide-react";
import { Field } from "@/components/Field";
import { signUp, UsernameExistsException } from "@/lib/api/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return; // in-flight guard per UI-SPEC §Interaction Contracts

    // D-09 verbatim — STRAIGHT ASCII apostrophe in "Passwords don't match" (UI-SPEC hook #10)
    const errs: Record<string, string> = {};
    if (!email.includes("@")) errs.email = "Enter a valid email";
    if (pw1.length < 8) errs.pw1 = "Use at least 8 characters";
    if (pw1 !== pw2) errs.pw2 = "Passwords don't match";
    if (!agree) errs.agree = "Required";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setFormError(null);
    setIsSubmitting(true);
    try {
      await signUp({ email, password: pw1 });
      router.push("/"); // D-11
    } catch (err) {
      // Collapse all unknown failures into the safe "An account with this email already exists."
      // copy — never leak Cognito-internal messages (UI-SPEC §Interaction Contracts).
      if (err instanceof UsernameExistsException) {
        setFormError("An account with this email already exists.");
      } else {
        setFormError("An account with this email already exists.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {/* non-tokenized: text-[26px], tracking-[-0.02em], leading-[1.02] match the reference .display class — see UI-SPEC §Typography */}
      <h1 className="font-display text-[26px] font-extrabold tracking-[-0.02em] leading-[1.02] text-center text-text-primary">
        Make it yours.
      </h1>
      {/* non-tokenized: text-[13px] is the reference auth.jsx:135 fontSize:13 — see UI-SPEC §Typography */}
      <p className="text-center text-text-secondary text-[13px] mt-1.5">
        Save recommendations, build a queue, learn what you love.
      </p>

      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-3.5 mt-6">
        <Field
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
          error={errors.email}
          disabled={isSubmitting}
        />
        <Field
          label="Password"
          type="password"
          name="password"
          autoComplete="new-password"
          value={pw1}
          onChange={setPw1}
          error={errors.pw1}
          hint="At least 8 characters"
          disabled={isSubmitting}
        />
        <Field
          label="Confirm password"
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          value={pw2}
          onChange={setPw2}
          error={errors.pw2}
          disabled={isSubmitting}
        />

        <div className="flex flex-col gap-1.5">
          <label className="flex items-start gap-3 text-12 text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              disabled={isSubmitting}
              className="accent-accent mt-0.5"
            />
            <span>I agree to the Terms and Privacy Policy.</span>
          </label>
          {errors.agree && (
            <p className="text-12 text-danger leading-tight" aria-live="polite">
              {errors.agree}
            </p>
          )}
        </div>

        {formError && (
          <div
            role="alert"
            aria-live="polite"
            className="flex items-center gap-2 bg-danger/10 border border-danger text-danger text-14 font-medium rounded-md px-3 py-2"
          >
            <AlertCircle size={16} />
            <span>{formError}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          aria-busy={isSubmitting || undefined}
          /* non-tokenized: tracking-[-0.005em] matches reference .btn class — see UI-SPEC §Typography */
          className="h-14 flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-on-accent text-16 font-semibold tracking-[-0.005em] rounded-md transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-90 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
        >
          {isSubmitting ? (
            <>
              Create account
              <span
                className="w-4 h-4 rounded-full border-2 border-on-accent border-t-transparent animate-spin"
                aria-hidden
              />
            </>
          ) : (
            <>
              Create account
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      <p className="text-center text-text-secondary text-[13px] mt-4">
        Already have one?{" "}
        <Link
          href="/login"
          className="text-accent font-semibold hover:underline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-sm"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
