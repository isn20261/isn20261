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
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { NotAuthorizedException, UserNotConfirmedException } from "@/lib/api/auth";
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
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const justConfirmed = searchParams.get("confirmed") === "1";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return; // in-flight guard per UI-SPEC §Interaction Contracts

    // D-09 verbatim: email contains '@'; password length >= 6
    const errs: Record<string, string> = {};
    if (!email.includes("@")) errs.email = "Digite um e-mail válido";
    if (password.length < 6) errs.password = "Mínimo de 6 caracteres";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setFormError(null);
    setIsSubmitting(true);
    try {
      await signIn({ email, password });
      router.push(safeReturnPath(searchParams.get("from")));
    } catch (err) {
      if (err instanceof UserNotConfirmedException) {
        const from = searchParams.get("from");
        const fromQuery = from ? `&from=${encodeURIComponent(from)}` : "";
        router.push(`/confirm?email=${encodeURIComponent(email)}${fromQuery}`);
        return;
      }
      if (err instanceof NotAuthorizedException) {
        setFormError("E-mail ou senha incorretos.");
      } else {
        setFormError("E-mail ou senha incorretos.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {/* non-tokenized: text-[26px], tracking-[-0.02em], leading-[1.02] match the reference .display class — see UI-SPEC §Typography */}
      <h1 className="font-display text-[26px] font-extrabold tracking-[-0.02em] leading-[1.02] text-center text-text-primary">
        Bem-vindo de volta.
      </h1>
      {/* non-tokenized: text-[13px] is the reference auth.jsx:88 fontSize:13 — see UI-SPEC §Typography */}
      <p className="text-center text-text-secondary text-[13px] mt-1.5">
        Continue de onde parou na sua fila e histórico.
      </p>

      <div className="flex flex-col gap-3.5 mt-6">
        <GoogleSignInButton
          from={searchParams.get("from") ?? undefined}
          disabled={isSubmitting}
        />
        <div className="flex items-center gap-3 text-text-muted text-12">
          <span className="h-px flex-1 bg-border" />
          ou
          <span className="h-px flex-1 bg-border" />
        </div>
      </div>

      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-3.5 mt-3.5">
        <Field
          label="E-mail"
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
          error={errors.email}
          disabled={isSubmitting}
        />
        <Field
          label="Senha"
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
            Esqueceu a senha?
          </Link>
        </div>

        {justConfirmed && !formError && (
          <div
            role="status"
            aria-live="polite"
            className="text-accent text-12 font-medium text-center"
          >
            Sua conta foi confirmada. Entre para continuar.
          </div>
        )}

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
              Entrar
              <span
                className="w-4 h-4 rounded-full border-2 border-on-accent border-t-transparent animate-spin"
                aria-hidden
              />
            </>
          ) : (
            <>
              Entrar
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      <p className="text-center text-text-secondary text-[13px] mt-4">
        Novo por aqui?{" "}
        <Link
          href="/register"
          className="text-accent font-semibold hover:underline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-sm"
        >
          Criar uma conta
        </Link>
      </p>
    </>
  );
}
