"use client";

/**
 * OAuth 2.0 callback (issue #181) — where Cognito's Hosted UI redirects after
 * Google login. Reads ?code & ?state, exchanges them for a session via the
 * auth seam (completeGoogleSignIn), then returns the user to where they were
 * headed. ?error means the user denied consent or the broker failed.
 *
 * Lives in the (auth) group so it inherits the centered AuthShell card chrome.
 */

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { takeOAuthReturnPath } from "@/lib/api/auth";
import { useAuth } from "@/lib/auth/AuthContext";

const AUTH_PATHS = new Set(["/login", "/register", "/forgot", "/callback"]);

function safeReturnPath(raw: string | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  for (const p of AUTH_PATHS) {
    if (raw === p || raw.startsWith(`${p}/`) || raw.startsWith(`${p}?`)) return "/";
  }
  return raw;
}

export default function CallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-[400px]" aria-busy="true" />}>
      <CallbackHandler />
    </Suspense>
  );
}

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { completeGoogleSignIn } = useAuth();
  const [error, setError] = useState<string | null>(null);
  // Guard against React Strict Mode running the effect twice (the auth code is
  // single-use — a second exchange would fail).
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const oauthError = searchParams.get("error");
    if (oauthError) {
      setError("Login com o Google cancelado. Tente novamente.");
      return;
    }

    const code = searchParams.get("code");
    const state = searchParams.get("state");
    if (!code || !state) {
      setError("Resposta de login inválida. Tente novamente.");
      return;
    }

    completeGoogleSignIn(code, state)
      .then(() => {
        router.replace(safeReturnPath(takeOAuthReturnPath()));
      })
      .catch(() => {
        setError("Não foi possível concluir o login com o Google. Tente novamente.");
      });
  }, [searchParams, completeGoogleSignIn, router]);

  if (error) {
    return (
      <>
        {/* non-tokenized: text-[26px], tracking-[-0.02em], leading-[1.02] match the reference .display class — see UI-SPEC §Typography */}
        <h1 className="font-display text-[26px] font-extrabold tracking-[-0.02em] leading-[1.02] text-center text-text-primary">
          Algo deu errado.
        </h1>
        <div
          role="alert"
          aria-live="polite"
          className="flex items-center gap-2 bg-danger/10 border border-danger text-danger text-14 font-medium rounded-md px-3 py-2 mt-6"
        >
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
        <p className="text-center text-text-secondary text-[13px] mt-4">
          <Link
            href="/login"
            className="text-accent font-semibold hover:underline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-sm"
          >
            Voltar para entrar
          </Link>
        </p>
      </>
    );
  }

  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center gap-4" aria-busy="true">
      <span
        className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin"
        aria-hidden
      />
      <p className="text-text-secondary text-[13px]">Concluindo seu login…</p>
    </div>
  );
}
