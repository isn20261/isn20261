"use client";

/**
 * /confirm — email-code verification step for Cognito sign-up.
 *
 * Real Cognito sends a verification code to the email used at sign-up; the
 * user is UNCONFIRMED until they enter it here. After confirmation the user
 * still needs to sign in to obtain tokens, so this page funnels them to
 * /login with a pre-filled email on success.
 */

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { Field } from "@/components/Field";
import {
  CodeMismatchException,
  confirmSignUp,
  resendConfirmationCode,
} from "@/lib/api/auth";

export default function ConfirmPage() {
  return (
    <Suspense fallback={<div className="min-h-[400px]" aria-busy="true" />}>
      <ConfirmForm />
    </Suspense>
  );
}

function ConfirmForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") ?? "";
  const from = searchParams.get("from");

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;

    const errs: Record<string, string> = {};
    if (!email.includes("@")) errs.email = "Digite um e-mail válido";
    if (code.trim().length < 4) errs.code = "Digite o código enviado para seu e-mail";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setFormError(null);
    setResendNotice(null);
    setIsSubmitting(true);
    try {
      await confirmSignUp(email, code.trim());
      const loginQuery = new URLSearchParams({ email, confirmed: "1" });
      if (from) loginQuery.set("from", from);
      router.push(`/login?${loginQuery.toString()}`);
    } catch (err) {
      if (err instanceof CodeMismatchException) {
        setFormError("Código inválido ou expirado. Tente novamente ou reenvie.");
      } else {
        setFormError("Não foi possível confirmar sua conta. Tente novamente.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    if (isResending) return;
    if (!email.includes("@")) {
      setErrors((prev) => ({ ...prev, email: "Digite um e-mail válido" }));
      return;
    }
    setFormError(null);
    setResendNotice(null);
    setIsResending(true);
    try {
      await resendConfirmationCode(email);
      setResendNotice("Enviamos um novo código para seu e-mail.");
    } catch {
      setFormError("Não foi possível reenviar o código. Tente novamente em um minuto.");
    } finally {
      setIsResending(false);
    }
  }

  return (
    <>
      {/* non-tokenized: text-[26px], tracking-[-0.02em], leading-[1.02] match the reference .display class — see UI-SPEC §Typography */}
      <h1 className="font-display text-[26px] font-extrabold tracking-[-0.02em] leading-[1.02] text-center text-text-primary">
        Verifique seu e-mail.
      </h1>
      {/* non-tokenized: text-[13px] is the auth-subtitle scale — see UI-SPEC §Typography */}
      <p className="text-center text-text-secondary text-[13px] mt-1.5">
        Enviamos um código de 6 dígitos para confirmar seu endereço.
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
          label="Código de verificação"
          type="text"
          name="code"
          autoComplete="one-time-code"
          value={code}
          onChange={setCode}
          error={errors.code}
          hint="6 dígitos enviados ao seu e-mail"
          disabled={isSubmitting}
        />

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

        {resendNotice && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 bg-accent/10 border border-accent text-accent text-14 font-medium rounded-md px-3 py-2"
          >
            <CheckCircle2 size={16} />
            <span>{resendNotice}</span>
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
              Confirmar
              <span
                className="w-4 h-4 rounded-full border-2 border-on-accent border-t-transparent animate-spin"
                aria-hidden
              />
            </>
          ) : (
            <>
              Confirmar
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      <div className="flex justify-between items-center mt-4 text-[13px]">
        <button
          type="button"
          onClick={handleResend}
          disabled={isResending}
          className="text-accent font-semibold hover:underline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-sm disabled:opacity-60"
        >
          {isResending ? "Reenviando…" : "Reenviar código"}
        </button>
        <Link
          href="/login"
          className="text-text-secondary hover:text-text-primary transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-sm"
        >
          Voltar para entrar
        </Link>
      </div>
    </>
  );
}
