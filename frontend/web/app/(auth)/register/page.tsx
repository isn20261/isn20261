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

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, AlertCircle } from "lucide-react";
import { Field } from "@/components/Field";
import { InvalidPasswordException, UsernameExistsException } from "@/lib/api/auth";
import { useAuth } from "@/lib/auth/AuthContext";

const AUTH_PATHS = new Set(["/login", "/register", "/forgot"]);

function safeReturnPath(raw: string | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  for (const p of AUTH_PATHS) {
    if (raw === p || raw.startsWith(`${p}/`) || raw.startsWith(`${p}?`)) return "/";
  }
  return raw;
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-[400px]" aria-busy="true" />}>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signUp } = useAuth();
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
    if (!email.includes("@")) errs.email = "Digite um e-mail válido";
    if (pw1.length < 8) errs.pw1 = "Use pelo menos 8 caracteres";
    if (pw1 !== pw2) errs.pw2 = "As senhas não coincidem";
    if (!agree) errs.agree = "Obrigatório";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setFormError(null);
    setIsSubmitting(true);
    try {
      const result = await signUp({ email, password: pw1 });
      const from = searchParams.get("from");
      const fromQuery = from ? `&from=${encodeURIComponent(from)}` : "";
      if (result.needsConfirmation) {
        router.push(`/confirm?email=${encodeURIComponent(result.email)}${fromQuery}`);
      } else {
        router.push(safeReturnPath(from));
      }
    } catch (err) {
      if (err instanceof UsernameExistsException) {
        setFormError("Já existe uma conta com este e-mail.");
      } else if (err instanceof InvalidPasswordException) {
        setFormError(err.message || "A senha não atende aos requisitos.");
      } else {
        setFormError("Não foi possível criar sua conta. Tente novamente.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {/* non-tokenized: text-[26px], tracking-[-0.02em], leading-[1.02] match the reference .display class — see UI-SPEC §Typography */}
      <h1 className="font-display text-[26px] font-extrabold tracking-[-0.02em] leading-[1.02] text-center text-text-primary">
        Personalize do seu jeito.
      </h1>
      {/* non-tokenized: text-[13px] is the reference auth.jsx:135 fontSize:13 — see UI-SPEC §Typography */}
      <p className="text-center text-text-secondary text-[13px] mt-1.5">
        Salve recomendações, monte uma fila e descubra o que você ama.
      </p>

      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-3.5 mt-6">
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
          autoComplete="new-password"
          value={pw1}
          onChange={setPw1}
          error={errors.pw1}
          hint="No mínimo 8 caracteres"
          disabled={isSubmitting}
        />
        <Field
          label="Confirmar senha"
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
            <span>Concordo com os Termos e a Política de Privacidade.</span>
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
              Criar conta
              <span
                className="w-4 h-4 rounded-full border-2 border-on-accent border-t-transparent animate-spin"
                aria-hidden
              />
            </>
          ) : (
            <>
              Criar conta
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      <p className="text-center text-text-secondary text-[13px] mt-4">
        Já tem uma conta?{" "}
        <Link
          href="/login"
          className="text-accent font-semibold hover:underline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-sm"
        >
          Entrar
        </Link>
      </p>
    </>
  );
}
