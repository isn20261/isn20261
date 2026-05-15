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
        setSessionError("getSession() returned null — Cognito has no current user.");
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
      setSessionError("No session — sign in first.");
      return;
    }
    await navigator.clipboard.writeText(s.IdToken);
    setSessionError("IdToken copied to clipboard. Paste at jwt.io.");
  }

  async function callWrapper() {
    setApiResult("Calling getRecommendationReal()…");
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
        <h1 className="font-display text-28 mb-2">Phase 12 fetch-wrapper smoke</h1>
        <p className="text-14 text-text-secondary">
          Throwaway dev surface. Wired to <code className="text-accent">lib/api/client.ts</code> +{" "}
          <code className="text-accent">recommend.real.ts</code>. Delete <code>/smoke</code> before merging.
        </p>
      </header>

      <section className="mb-8 rounded-md border border-border bg-surface p-6">
        <h2 className="font-display text-20 mb-4">Session</h2>
        <div className="flex flex-wrap gap-3 mb-4">
          <button
            type="button"
            onClick={refreshSession}
            className="rounded-md border border-border bg-surface-elevated px-4 py-2 text-14 hover:bg-surface-2"
          >
            Refresh session info
          </button>
          <button
            type="button"
            onClick={copyIdToken}
            className="rounded-md border border-border bg-surface-elevated px-4 py-2 text-14 hover:bg-surface-2"
          >
            Copy IdToken (for jwt.io)
          </button>
        </div>
        {sessionError && <p className="text-14 text-warning mb-2">{sessionError}</p>}
        {sessionPreview && (
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-14">
            <dt className="text-text-muted">email</dt>
            <dd>{sessionPreview.email}</dd>
            <dt className="text-text-muted">sub</dt>
            <dd className="font-mono">{sessionPreview.sub}</dd>
            <dt className="text-text-muted">IdToken (preview)</dt>
            <dd className="font-mono text-12">
              {sessionPreview.idTokenHead}…{sessionPreview.idTokenTail}
            </dd>
            <dt className="text-text-muted">Expires</dt>
            <dd className="font-mono text-12">{sessionPreview.expiresAt}</dd>
          </dl>
        )}
      </section>

      <section className="mb-8 rounded-md border border-border bg-surface p-6">
        <h2 className="font-display text-20 mb-2">Wrapper call</h2>
        <p className="text-14 text-text-secondary mb-4">
          Calls <code>apiGet&lt;Movie&gt;(&quot;/api/v1/recommend&quot;)</code> via the typed seam. Open DevTools
          Network and watch for the <code>Authorization: Bearer …</code> header.
        </p>
        <button
          type="button"
          onClick={callWrapper}
          className="rounded-md bg-accent text-on-accent px-4 py-2 text-14 font-display hover:bg-accent-hover"
        >
          Call getRecommendationReal()
        </button>
        {apiResult && (
          <pre className="mt-4 rounded-md border border-border bg-surface-elevated p-4 text-12 font-mono overflow-auto">
            {apiResult}
          </pre>
        )}
      </section>

      <section className="mb-8 rounded-md border border-border bg-surface p-6">
        <h2 className="font-display text-20 mb-2">useApiErrorUx — synthetic ApiError feed</h2>
        <p className="text-14 text-text-secondary mb-4">
          network / server / forbidden ⇒ toast. unauthorized / validation ⇒ silent (by design).
        </p>
        <div className="flex flex-wrap gap-3">
          {(["network", "server", "forbidden", "unauthorized", "validation"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => fireSynthetic(k)}
              className="rounded-md border border-border bg-surface-elevated px-4 py-2 text-14 hover:bg-surface-2"
            >
              kind: {k}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
