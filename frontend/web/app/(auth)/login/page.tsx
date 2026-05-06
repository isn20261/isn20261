"use client";

/**
 * Phase 4 (AUTH-01, AUTH-03, AUTH-05, issue #93) — /login page (Client).
 *
 * Form lives inside the AuthShell card (rendered by app/(auth)/layout.tsx).
 * Submits to lib/api/auth.signIn (mock seam — Cognito-shaped, see CONTEXT D-04).
 * On success: router.push('/') (CONTEXT D-11).
 * On NotAuthorizedException: form-level error banner with copy
 * "Incorrect email or password." (UI-SPEC §Copywriting).
 *
 * Phase 4 hardcodes the post-auth redirect to '/'. The ?from=<protected-path>
 * extension (Phase 5 / AUTH-09) is forward-compatible — Phase 5 will read
 * searchParams.from if present, fall back to '/'.
 */

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, AlertCircle } from "lucide-react";
import { Field } from "@/components/Field";
import { NotAuthorizedException } from "@/lib/api/auth";
import { useAuth } from "@/lib/auth/AuthContext";

const AUTH_PATHS = new Set(["/login", "/register", "/forgot"]);

function safeReturnPath(raw: string | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  // Avoid redirect loops back into the auth group.
  for (const p of AUTH_PATHS) {
    if (raw === p || raw.startsWith(`${p}/`) || raw.startsWith(`${p}?`)) return "/";
  }
  return raw;
}

export default function LoginPage() {
  // useSearchParams requires a Suspense boundary in Next.js 16 — wrap the
  // form so the page still pre-renders the static AuthShell shell at build.
  return (
    <Suspense fallback={<div className="min-h-[400px]" aria-busy="true" />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return; // in-flight guard per UI-SPEC §Interaction Contracts

    // D-09 verbatim: email contains '@'; password length >= 6
    const errs: Record<string, string> = {};
    if (!email.includes("@")) errs.email = "Enter a valid email";
    if (password.length < 6) errs.password = "Min 6 characters";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setFormError(null);
    setIsSubmitting(true);
    try {
      await signIn({ email, password });
      router.push(safeReturnPath(searchParams.get("from")));
    } catch (err) {
      // Collapse all unknown failures into the safe "Incorrect email or password."
      // copy — never leak Cognito-internal messages (UI-SPEC §Interaction Contracts).
      if (err instanceof NotAuthorizedException) {
        setFormError("Incorrect email or password.");
      } else {
        setFormError("Incorrect email or password.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {/* non-tokenized: text-[26px], tracking-[-0.02em], leading-[1.02] match the reference .display class — see UI-SPEC §Typography */}
      <h1 className="font-display text-[26px] font-extrabold tracking-[-0.02em] leading-[1.02] text-center text-text-primary">
        Welcome back.
      </h1>
      {/* non-tokenized: text-[13px] is the reference auth.jsx:88 fontSize:13 — see UI-SPEC §Typography */}
      <p className="text-center text-text-secondary text-[13px] mt-1.5">
        Pick up your queue and history.
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
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          error={errors.password}
          disabled={isSubmitting}
        />

        <div className="flex justify-end -mt-1.5">
          <Link
            href="/forgot"
            className="text-text-secondary hover:text-text-primary text-12 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-sm"
          >
            Forgot password?
          </Link>
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
              Sign in
              <span
                className="w-4 h-4 rounded-full border-2 border-on-accent border-t-transparent animate-spin"
                aria-hidden
              />
            </>
          ) : (
            <>
              Sign in
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      <p className="text-center text-text-secondary text-[13px] mt-4">
        New here?{" "}
        <Link
          href="/register"
          className="text-accent font-semibold hover:underline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-sm"
        >
          Create an account
        </Link>
      </p>
    </>
  );
}
