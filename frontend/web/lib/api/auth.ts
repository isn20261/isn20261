/**
 * Phase 4 (AUTH-04, AUTH-05, issue #93) — typed mock auth seam.
 *
 * Cognito-shaped surface that the real Cognito SDK will replace in v2 (INTG-01..04).
 * Persists registered users in `recommend-a.users` localStorage key (CONTEXT D-02);
 * persists the active session in `recommend-a.session` (CONTEXT D-04).
 * Throws Cognito-shaped error names: UsernameExistsException, NotAuthorizedException.
 *
 * Module is import-safe (no top-level localStorage access — every read/write happens
 * inside an exported function). Tests may override MOCK_LATENCY_MS to [0, 0] (D-03).
 *
 * Plain-text password storage in `recommend-a.users` is acceptable for this mock
 * (D-02): the real Cognito SDK in v2 will hold passwords server-side. This module
 * is the swap point — INTG-01 replaces these four exported functions one-for-one.
 */

export const MOCK_LATENCY_MS = [400, 700] as const;
export const SESSION_KEY = "recommend-a.session" as const;
export const USERS_KEY = "recommend-a.users" as const;

const ONE_HOUR_MS = 3_600_000;

export type Session = {
  AccessToken: string;
  IdToken: string;
  RefreshToken: string;
  ExpiresAt: number;
  user: { email: string; sub: string };
};

type Credentials = { email: string; password: string };

type UsersMap = Record<string, { password: string; sub: string }>;

export class UsernameExistsException extends Error {
  override name = "UsernameExistsException" as const;
}

export class NotAuthorizedException extends Error {
  override name = "NotAuthorizedException" as const;
}

function delay(): Promise<void> {
  const [min, max] = MOCK_LATENCY_MS;
  if (max <= 0) return Promise.resolve();
  const ms = Math.floor(min + Math.random() * (max - min));
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readUsers(): UsersMap {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(USERS_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    // Defensive: reject non-object shapes (prototype-pollution / corruption guard).
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return parsed as UsersMap;
  } catch {
    return {};
  }
}

function writeUsers(users: UsersMap): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function issueSession(email: string, sub: string): Session {
  return {
    AccessToken: crypto.randomUUID(),
    IdToken: crypto.randomUUID(),
    RefreshToken: crypto.randomUUID(),
    ExpiresAt: Date.now() + ONE_HOUR_MS,
    user: { email, sub },
  };
}

function writeSession(session: Session): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function signUp({ email, password }: Credentials): Promise<Session> {
  await delay();
  const users = readUsers();
  if (Object.prototype.hasOwnProperty.call(users, email)) {
    throw new UsernameExistsException(
      "An account with the given email already exists.",
    );
  }
  const sub = crypto.randomUUID();
  users[email] = { password, sub };
  writeUsers(users);
  const session = issueSession(email, sub);
  writeSession(session);
  return session;
}

export async function signIn({ email, password }: Credentials): Promise<Session> {
  await delay();
  const users = readUsers();
  // Same error for unknown email AND wrong password — avoids user enumeration (D-02).
  const record = Object.prototype.hasOwnProperty.call(users, email)
    ? users[email]
    : undefined;
  if (!record || record.password !== password) {
    throw new NotAuthorizedException("Incorrect email or password.");
  }
  const session = issueSession(email, record.sub);
  writeSession(session);
  return session;
}

export function signOut(): void {
  if (typeof window === "undefined") return;
  // Removes session ONLY — recommend-a.users persists so a demo user can sign back in (D-04).
  window.localStorage.removeItem(SESSION_KEY);
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Session;
  } catch {
    return null;
  }
}
