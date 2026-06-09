"use client";

/**
 * /forgot page — two-step password reset flow.
 *
 * Step 1 (RequestStep): user enters their email → calls forgotPassword() from
 * the auth seam, which triggers Cognito to send a verification code.
 *
 * Step 2 (ConfirmStep): user enters the code + new password → calls
 * confirmForgotPassword() directly from lib/api/auth (unauthenticated, no
 * context needed). On success, redirects to /login?confirmed=1 so the login
 * page shows the "account confirmed" banner — reused here for consistency.
 *
 * Styling mirrors app/(auth)/login/page.tsx exactly (same Field, same button,
 * same error banner, same typography tokens).
 */

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, AlertCircle, MailCheck } from "lucide-react";
import { Field } from "@/components/Field";
import {
  CodeMismatchException,
  InvalidPasswordException,
  confirmForgotPassword,
} from "@/lib/api/auth";
import { useAuth } from "@/lib/auth/AuthContext";

export default function ForgotPage() {
  return (
    <Suspense fallback={<div className="min-h-[400px]" aria-busy="true" />}>
      <ForgotFlow />
    </Suspense>
  );
}

function ForgotFlow() {
  const searchParams = useSearchParams();
  // Allow pre-filling the email if coming from /login?email=…
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [step, setStep] = useState<"request" | "confirm">("request");
  const [submittedEmail, setSubmittedEmail] = useState("");

  if (step === "confirm") {
    return (
      <ConfirmStep
        email={submittedEmail}
        onBack={() => setStep("request")}
      />
    );
  }

  return (
    <RequestStep
      email={email}
      setEmail={setEmail}
      onSuccess={(sentTo) => {
        setSubmittedEmail(sentTo);
        setStep("confirm");
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Step 1 — request the reset code
// ---------------------------------------------------------------------------

type RequestStepProps = {
  email: string;
  setEmail: (v: string) => void;
  onSuccess: (email: string) => void;
};

function RequestStep({ email, setEmail, onSuccess }: RequestStepProps) {
  const { forgotPassword } = useAuth();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;

    const errs: Record<string, string> = {};
    if (!email.includes("@")) errs.email = "Digite um e-mail válido";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setFormError(null);
    setIsSubmitting(true);
    try {
      await forgotPassword(email);
      onSuccess(email);
    } catch {
      // Cognito intentionally returns a generic error for unknown usernames to
      // avoid account enumeration — surface a neutral message regardless.
      setFormError("Não foi possível enviar o código. Verifique o e-mail e tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <h1 className="font-display text-[26px] font-extrabold tracking-[-0.02em] leading-[1.02] text-center text-text-primary">
        Esqueceu a senha?
      </h1>
      <p className="text-center text-text-secondary text-[13px] mt-1.5">
        Informe seu e-mail e enviaremos um código de verificação.
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
          className="h-14 flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-on-accent text-16 font-semibold tracking-[-0.005em] rounded-md transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-90 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
        >
          {isSubmitting ? (
            <>
              Enviando
              <span
                className="w-4 h-4 rounded-full border-2 border-on-accent border-t-transparent animate-spin"
                aria-hidden
              />
            </>
          ) : (
            <>
              Enviar código
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      <p className="text-center text-text-secondary text-[13px] mt-4">
        Lembrou a senha?{" "}
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

// ---------------------------------------------------------------------------
// Step 2 — submit the code + choose a new password
// ---------------------------------------------------------------------------

type ConfirmStepProps = {
  email: string;
  onBack: () => void;
};

function ConfirmStep({ email, onBack }: ConfirmStepProps) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;

    const errs: Record<string, string> = {};
    if (code.trim().length === 0) errs.code = "Digite o código recebido";
    if (password.length < 6) errs.password = "Mínimo de 6 caracteres";
    if (password !== passwordConfirm) errs.passwordConfirm = "As senhas não coincidem";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setFormError(null);
    setIsSubmitting(true);
    try {
      await confirmForgotPassword(email, code.trim(), password);
      // Reuse the login page's "confirmed" banner as a success signal.
      router.push(`/login?confirmed=1&email=${encodeURIComponent(email)}`);
    } catch (err) {
      if (err instanceof CodeMismatchException) {
        setFormError("Código inválido ou expirado. Verifique e tente novamente.");
      } else if (err instanceof InvalidPasswordException) {
        setFormError("A senha não atende aos requisitos mínimos de segurança.");
      } else {
        setFormError("Não foi possível redefinir a senha. Tente novamente.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div className="flex flex-col items-center gap-2">
        <span className="flex items-center justify-center w-11 h-11 rounded-full bg-accent/10 text-accent">
          <MailCheck size={22} />
        </span>
        <h1 className="font-display text-[26px] font-extrabold tracking-[-0.02em] leading-[1.02] text-center text-text-primary">
          Verifique seu e-mail
        </h1>
      </div>
      <p className="text-center text-text-secondary text-[13px] mt-1.5">
        Enviamos um código para{" "}
        <span className="font-medium text-text-primary">{email}</span>.
        <br />
        Digite-o abaixo junto com sua nova senha.
      </p>

      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-3.5 mt-6">
        <Field
          label="Código de verificação"
          type="text"
          name="code"
          autoComplete="one-time-code"
          value={code}
          onChange={setCode}
          error={errors.code}
          disabled={isSubmitting}
        />
        <Field
          label="Nova senha"
          type="password"
          name="password"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          error={errors.password}
          disabled={isSubmitting}
        />
        <Field
          label="Confirmar nova senha"
          type="password"
          name="passwordConfirm"
          autoComplete="new-password"
          value={passwordConfirm}
          onChange={setPasswordConfirm}
          error={errors.passwordConfirm}
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

        <button
          type="submit"
          disabled={isSubmitting}
          aria-busy={isSubmitting || undefined}
          className="h-14 flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-on-accent text-16 font-semibold tracking-[-0.005em] rounded-md transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-90 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
        >
          {isSubmitting ? (
            <>
              Redefinindo
              <span
                className="w-4 h-4 rounded-full border-2 border-on-accent border-t-transparent animate-spin"
                aria-hidden
              />
            </>
          ) : (
            <>
              Redefinir senha
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      <p className="text-center text-text-secondary text-[13px] mt-4">
        Não recebeu o código?{" "}
        <button
          type="button"
          onClick={onBack}
          className="text-accent font-semibold hover:underline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-sm"
        >
          Reenviar
        </button>
      </p>
    </>
  );
}