/**
 * Typed fetch seam for API Gateway v2 / Lambda calls.
 *
 * This is the single React-free seam every authenticated frontend → backend
 * request routes through. It mirrors `lib/api/auth.ts`'s pattern: module-init
 * env validation, async source-of-truth, error-translating boundary. Where the
 * auth seam wraps the Cognito SDK, this seam wraps `fetch` against API
 * Gateway v2 — auto-injecting the Cognito IdToken sourced from `getSession()`.
 *
 * Locked decisions (see .planning/phases/12-secure-lambda-fetch-wrapper/12-CONTEXT.md):
 *   - Pre-emptive `getSession()` refresh before every request; retry budget = 0.
 *     The Cognito SDK refreshes the IdToken internally when near expiry — that
 *     pre-emptive refresh IS the budget. 401s after that fire `onUnauthorized`
 *     and return immediately; the wrapper never replays.
 *   - IdToken (NOT AccessToken) is the only token field read. API Gateway v2's
 *     JWT authorizer expects the IdToken — see __main__.py routing.
 *   - Return shape is `Result<T, ApiError>` discriminated union (not throw).
 *     Callers branch on `res.ok` then exhaustively switch on `res.error.kind`.
 *   - `RequestOptions` has NO `headers` field. Authorization is built fresh
 *     here on every request — single source of header injection (T-12-02).
 *   - 10s default timeout via `AbortController`; caller `signal` is composed
 *     with the wrapper's so either can abort.
 *
 * Public surface:
 *   - apiGet<T>(path, opts?) → Promise<Result<T, ApiError>>
 *   - apiPost<T>(path, body, opts?) → Promise<Result<T, ApiError>>
 *   - setOnUnauthorized(cb) — AuthProvider registers signOut here on mount.
 *   - ApiError (discriminated union, 5 kinds)
 *   - Result<T, E> (discriminated union)
 *   - RequestOptions (signal / timeoutMs only — no headers slot by design)
 */

import { getSession } from "@/lib/api/auth";

// -----------------------------------------------------------------------------
// Public types (locked contract — see 12-CONTEXT.md §"Implementation Decisions")
// -----------------------------------------------------------------------------

export type Result<T, E> = { ok: true; data: T } | { ok: false; error: E };

export type ApiError =
  | { kind: "network"; message: string; cause?: Error }
  | { kind: "unauthorized"; message: string }
  | { kind: "forbidden"; status: 403; message: string }
  | { kind: "validation"; status: number; message: string; fields?: Record<string, string> }
  | { kind: "server"; status: number; message: string; cause?: Error };

export type RequestOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
  // Note: no `headers` field. Callers cannot override Authorization (T-12-02).
  // If a narrow per-call header need arises later (e.g. Idempotency-Key), add
  // a whitelisted slot rather than opening the door.
};

// -----------------------------------------------------------------------------
// Module-init env-var validation (lazy cached — mirrors auth.ts:56-68)
// -----------------------------------------------------------------------------

const DEFAULT_TIMEOUT_MS = 10_000;

let cachedBaseUrl: string | null = null;
function getBaseUrl(): string {
  if (cachedBaseUrl !== null) return cachedBaseUrl;
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!raw) {
    throw new Error(
      "Missing NEXT_PUBLIC_API_BASE_URL. Copy .env.example to .env.local and fill in the Pulumi `api_internal_url` stack output.",
    );
  }
  cachedBaseUrl = raw.replace(/\/+$/, ""); // defensive: strip trailing slashes per CONTEXT decision
  return cachedBaseUrl;
}

// -----------------------------------------------------------------------------
// onUnauthorized callback registry (single slot, last registration wins)
// -----------------------------------------------------------------------------

let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(cb: () => void): void {
  onUnauthorized = cb;
}

function fireUnauthorized(): void {
  if (onUnauthorized) onUnauthorized();
}

// -----------------------------------------------------------------------------
// Authorization header builder — single source of injection (T-12-02 mitigation)
// -----------------------------------------------------------------------------

async function authorizedHeaders(): Promise<Record<string, string> | null> {
  const session = await getSession(); // Cognito SDK refreshes internally; null if no valid session
  if (!session) return null;
  return { Authorization: `Bearer ${session.IdToken}` }; // IdToken — JWT authorizer expects this, NOT AccessToken (T-12-03)
}

// -----------------------------------------------------------------------------
// Sanitization helpers (T-12-01 / T-12-06 mitigations)
// -----------------------------------------------------------------------------

const MAX_USER_MESSAGE_LEN = 240;

function sanitizeMessage(raw: unknown, fallback: string): string {
  if (typeof raw !== "string" || raw.trim() === "") return fallback;
  const stripped = raw
    .replace(/Authorization:\s*Bearer\s+[A-Za-z0-9._-]+/gi, "[redacted]")
    .replace(/\bat\s+[^\s]+\s+\([^)]+\)/g, "") // stack frames like `at fn (file.ts:1:1)`
    .replace(/\s{2,}/g, " ")
    .trim();
  if (stripped === "") return fallback;
  return stripped.length > MAX_USER_MESSAGE_LEN
    ? stripped.slice(0, MAX_USER_MESSAGE_LEN - 1) + "…"
    : stripped;
}

function extractBackendMessage(body: unknown): string | undefined {
  if (
    body &&
    typeof body === "object" &&
    "message" in body &&
    typeof (body as { message: unknown }).message === "string"
  ) {
    return (body as { message: string }).message;
  }
  return undefined;
}

function extractValidationFields(body: unknown): Record<string, string> | undefined {
  if (body && typeof body === "object" && "fields" in body) {
    const fields = (body as { fields: unknown }).fields;
    if (fields && typeof fields === "object" && !Array.isArray(fields)) {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(fields as Record<string, unknown>)) {
        if (typeof v === "string") out[k] = v;
      }
      if (Object.keys(out).length > 0) return out;
    }
  }
  return undefined;
}

function defaultMessageForStatus(status: number): string {
  if (status === 401) return "Sua sessão expirou. Entre novamente.";
  if (status === 403) return "Você não tem permissão para fazer isso.";
  if (status === 404) return "Não encontramos o que você procurava.";
  if (status >= 400 && status < 500) return "Não foi possível processar sua solicitação.";
  return "Algo deu errado no servidor. Tente novamente.";
}

// -----------------------------------------------------------------------------
// classifyError — translates a non-2xx Response into an ApiError
// -----------------------------------------------------------------------------

async function classifyError(response: Response, cause?: Error): Promise<ApiError> {
  const status = response.status;
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // Non-JSON response (e.g. API Gateway 502 HTML). body stays null; we'll use the default.
  }
  const fallback = defaultMessageForStatus(status);
  const message = sanitizeMessage(extractBackendMessage(body), fallback);

  if (status === 401) return { kind: "unauthorized", message };
  if (status === 403) return { kind: "forbidden", status: 403, message };
  if (status >= 400 && status < 500) {
    const fields = extractValidationFields(body);
    const validation: ApiError = fields
      ? { kind: "validation", status, message, fields }
      : { kind: "validation", status, message };
    return validation;
  }
  const server: ApiError = cause
    ? { kind: "server", status, message, cause }
    : { kind: "server", status, message };
  return server;
}

// -----------------------------------------------------------------------------
// Signal composition — wrapper's 10s timeout AbortController + caller's signal
// -----------------------------------------------------------------------------

function composeSignals(
  timeoutMs: number,
  callerSignal?: AbortSignal,
): { signal: AbortSignal; cancelTimeout: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("Request timed out")), timeoutMs);
  if (callerSignal) {
    if (callerSignal.aborted) {
      controller.abort(callerSignal.reason);
    } else {
      callerSignal.addEventListener("abort", () => controller.abort(callerSignal.reason), {
        once: true,
      });
    }
  }
  const cancelTimeout = () => clearTimeout(timer);
  return { signal: controller.signal, cancelTimeout };
}

// -----------------------------------------------------------------------------
// Core request — used by apiGet / apiPost. Caller headers are NEVER merged.
// -----------------------------------------------------------------------------

async function request<T>(
  method: "GET" | "POST",
  path: string,
  body: unknown,
  opts: RequestOptions = {},
): Promise<Result<T, ApiError>> {
  const headers = await authorizedHeaders();
  if (!headers) {
    fireUnauthorized();
    return { ok: false, error: { kind: "unauthorized", message: defaultMessageForStatus(401) } };
  }

  const finalHeaders: Record<string, string> = { ...headers };
  if (method === "POST") finalHeaders["Content-Type"] = "application/json";

  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const { signal, cancelTimeout } = composeSignals(timeoutMs, opts.signal);

  const url = `${getBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: finalHeaders,
      body: method === "POST" ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    cancelTimeout();
    const cause = err instanceof Error ? err : new Error(String(err));
    const isAbort = cause.name === "AbortError" || cause.message === "Request timed out";
    const error: ApiError = {
      kind: "network",
      message: isAbort
        ? "Tempo limite esgotado. Tente novamente."
        : "Erro de rede. Verifique sua conexão.",
      cause,
    };
    return { ok: false, error };
  }
  cancelTimeout();

  if (!response.ok) {
    const error = await classifyError(response);
    if (error.kind === "unauthorized") fireUnauthorized();
    return { ok: false, error };
  }

  // Parse 2xx body. Empty body (204) returns `null as T` — Phase 13+ tightens this per endpoint.
  let data: T;
  try {
    const text = await response.text();
    data = (text === "" ? (null as unknown) : JSON.parse(text)) as T;
  } catch (err) {
    const cause = err instanceof Error ? err : new Error(String(err));
    const error: ApiError = {
      kind: "server",
      status: response.status,
      message: "Recebemos uma resposta inválida do servidor.",
      cause,
    };
    return { ok: false, error };
  }
  return { ok: true, data };
}

// -----------------------------------------------------------------------------
// Public method surface — generic wrappers consumed by Phases 13–16
// -----------------------------------------------------------------------------

export function apiGet<T>(
  path: string,
  opts?: RequestOptions,
): Promise<Result<T, ApiError>> {
  return request<T>("GET", path, undefined, opts);
}

export function apiPost<T>(
  path: string,
  body: unknown,
  opts?: RequestOptions,
): Promise<Result<T, ApiError>> {
  return request<T>("POST", path, body, opts);
}

// For public endpoints that require no auth token (e.g. /recommend_anon).
// Reuses the same timeout and error-classification logic but never attaches Authorization.
export async function apiGetNoAuth<T>(
  path: string,
  opts: RequestOptions = {},
): Promise<Result<T, ApiError>> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const { signal, cancelTimeout } = composeSignals(timeoutMs, opts.signal);
  const url = `${getBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;

  let response: Response;
  try {
    response = await fetch(url, { method: "GET", headers: {}, signal });
  } catch (err) {
    cancelTimeout();
    const cause = err instanceof Error ? err : new Error(String(err));
    const isAbort = cause.name === "AbortError" || cause.message === "Request timed out";
    return {
      ok: false,
      error: {
        kind: "network",
        message: isAbort
          ? "Tempo limite esgotado. Tente novamente."
          : "Erro de rede. Verifique sua conexão.",
        cause,
      },
    };
  }
  cancelTimeout();

  if (!response.ok) {
    const error = await classifyError(response);
    return { ok: false, error };
  }

  let data: T;
  try {
    const text = await response.text();
    data = (text === "" ? (null as unknown) : JSON.parse(text)) as T;
  } catch (err) {
    const cause = err instanceof Error ? err : new Error(String(err));
    return {
      ok: false,
      error: { kind: "server", status: response.status, message: "Recebemos uma resposta inválida do servidor.", cause },
    };
  }
  return { ok: true, data };
}
