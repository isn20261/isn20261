"use client";

// THROWAWAY — Phase 12 manual smoke harness for feature/issue-131-fetch-wrapper.
// Delete the entire `smoke/` folder before merging back to frontend.

import { useState } from "react";
import { getSession } from "@/lib/api/auth";
import { getRecommendationReal } from "@/lib/api/recommend.real";
import { type ApiError } from "@/lib/api/client";
import { useApiErrorUx } from "@/lib/api/useApiErrorUx";

type SessionPreview = {
  email: string;
  sub: string;
  idTokenHead: string;
  idTokenTail: string;
  expiresAt: string;
};

export default function SmokePage() {
  const [sessionPreview, setSessionPreview] = useState<SessionPreview | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [apiResult, setApiResult] = useState<string | null>(null);
  const [syntheticError, setSyntheticError] = useState<ApiError | null>(null);

  useApiErrorUx(syntheticError);

  async function refreshSession() {
    setSessionError(null);
    try {
      const s = await getSession();
      if (!s) {
        setSessionPreview(null);
        setSessionError("getSession() retornou null — Cognito não tem usuário atual.");
        return;
      }
      setSessionPreview({
        email: s.user.email,
        sub: s.user.sub,
        idTokenHead: s.IdToken.slice(0, 24),
        idTokenTail: s.IdToken.slice(-12),
        expiresAt: new Date(s.ExpiresAt * 1000).toISOString(),
      });
    } catch (err) {
      setSessionError(err instanceof Error ? err.message : String(err));
    }
  }

  async function copyIdToken() {
    const s = await getSession();
    if (!s) {
      setSessionError("Sem sessão — entre primeiro.");
      return;
    }
    await navigator.clipboard.writeText(s.IdToken);
    setSessionError("IdToken copiado para a área de transferência. Cole em jwt.io.");
  }

  async function callWrapper() {
    setApiResult("Chamando getRecommendationReal()…");
    const res = await getRecommendationReal();
    setApiResult(JSON.stringify(res, null, 2));
  }

  function fireSynthetic(kind: ApiError["kind"]) {
    // eslint-disable-next-line react-hooks/purity -- event-handler, not render-time; harness is scheduled for deletion in Phase 17 (STATE.md "Pending Todos")
    const stamp = Date.now();
    switch (kind) {
      case "network":
        setSyntheticError({ kind, message: `Synthetic network error @ ${stamp}` });
        return;
      case "unauthorized":
        setSyntheticError({ kind, message: `Synthetic unauthorized @ ${stamp}` });
        return;
      case "forbidden":
        setSyntheticError({ kind, status: 403, message: `Synthetic forbidden @ ${stamp}` });
        return;
      case "validation":
        setSyntheticError({
          kind,
          status: 422,
          message: `Synthetic validation @ ${stamp}`,
          fields: { example: "expected to be inline-rendered, not toast" },
        });
        return;
      case "server":
        setSyntheticError({ kind, status: 500, message: `Synthetic server @ ${stamp}` });
        return;
    }
  }

  return (
    <main className="min-h-screen bg-bg text-text-primary p-8 font-body">
      <header className="mb-8">
        <h1 className="font-display text-28 mb-2">Smoke do fetch-wrapper — Fase 12</h1>
        <p className="text-14 text-text-secondary">
          Superfície dev descartável. Ligada a <code className="text-accent">lib/api/client.ts</code> +{" "}
          <code className="text-accent">recommend.real.ts</code>. Apague <code>/smoke</code> antes do merge.
        </p>
      </header>

      <section className="mb-8 rounded-md border border-border bg-surface p-6">
        <h2 className="font-display text-20 mb-4">Sessão</h2>
        <div className="flex flex-wrap gap-3 mb-4">
          <button
            type="button"
            onClick={refreshSession}
            className="rounded-md border border-border bg-surface-elevated px-4 py-2 text-14 hover:bg-surface-2"
          >
            Atualizar info da sessão
          </button>
          <button
            type="button"
            onClick={copyIdToken}
            className="rounded-md border border-border bg-surface-elevated px-4 py-2 text-14 hover:bg-surface-2"
          >
            Copiar IdToken (para jwt.io)
          </button>
        </div>
        {sessionError && <p className="text-14 text-warning mb-2">{sessionError}</p>}
        {sessionPreview && (
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-14">
            <dt className="text-text-muted">e-mail</dt>
            <dd>{sessionPreview.email}</dd>
            <dt className="text-text-muted">sub</dt>
            <dd className="font-mono">{sessionPreview.sub}</dd>
            <dt className="text-text-muted">IdToken (preview)</dt>
            <dd className="font-mono text-12">
              {sessionPreview.idTokenHead}…{sessionPreview.idTokenTail}
            </dd>
            <dt className="text-text-muted">Expira em</dt>
            <dd className="font-mono text-12">{sessionPreview.expiresAt}</dd>
          </dl>
        )}
      </section>

      <section className="mb-8 rounded-md border border-border bg-surface p-6">
        <h2 className="font-display text-20 mb-2">Chamada do wrapper</h2>
        <p className="text-14 text-text-secondary mb-4">
          Chama <code>apiGet&lt;Movie&gt;(&quot;/api/v1/recommend&quot;)</code> pelo seam tipado. Abra o
          Network do DevTools e veja o header <code>Authorization: Bearer …</code>.
        </p>
        <button
          type="button"
          onClick={callWrapper}
          className="rounded-md bg-accent text-on-accent px-4 py-2 text-14 font-display hover:bg-accent-hover"
        >
          Chamar getRecommendationReal()
        </button>
        {apiResult && (
          <pre className="mt-4 rounded-md border border-border bg-surface-elevated p-4 text-12 font-mono overflow-auto">
            {apiResult}
          </pre>
        )}
      </section>

      <section className="mb-8 rounded-md border border-border bg-surface p-6">
        <h2 className="font-display text-20 mb-2">useApiErrorUx — feed sintético de ApiError</h2>
        <p className="text-14 text-text-secondary mb-4">
          network / server / forbidden ⇒ toast. unauthorized / validation ⇒ silencioso (por design).
        </p>
        <div className="flex flex-wrap gap-3">
          {(["network", "server", "forbidden", "unauthorized", "validation"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => fireSynthetic(k)}
              className="rounded-md border border-border bg-surface-elevated px-4 py-2 text-14 hover:bg-surface-2"
            >
              tipo: {k}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
