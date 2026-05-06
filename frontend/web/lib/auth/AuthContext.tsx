"use client";

/**
 * Phase 5 (AUTH-08, AUTH-10, AUTH-12, issue #94) — global auth context.
 *
 * Wraps the typed mock seam (lib/api/auth.ts) in a React context so chrome,
 * pages, and protected routes can read auth state without prop-drilling.
 * The seam stays the swap point for v2 Cognito integration (INTG-01).
 *
 * Rehydrates from localStorage on mount; if the persisted session is past
 * its ExpiresAt timestamp, clears it and renders the logged-out tree.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  getSession,
  signIn as seamSignIn,
  signUp as seamSignUp,
  signOut as seamSignOut,
  type Session,
} from "@/lib/api/auth";

type Credentials = { email: string; password: string };

type AuthContextValue = {
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  user: { email: string; sub: string } | null;
  signIn: (creds: Credentials) => Promise<void>;
  signUp: (creds: Credentials) => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function isLive(session: Session | null): boolean {
  return session !== null && session.ExpiresAt > Date.now();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const persisted = getSession();
    if (persisted && persisted.ExpiresAt > Date.now()) {
      setSession(persisted);
    } else if (persisted) {
      seamSignOut();
    }
    setIsLoading(false);
  }, []);

  const signIn = useCallback(async (creds: Credentials) => {
    const next = await seamSignIn(creds);
    setSession(next);
  }, []);

  const signUp = useCallback(async (creds: Credentials) => {
    const next = await seamSignUp(creds);
    setSession(next);
  }, []);

  const signOut = useCallback(() => {
    seamSignOut();
    setSession(null);
  }, []);

  const isAuthenticated = isLive(session);
  const user = isAuthenticated && session ? session.user : null;

  const value: AuthContextValue = {
    session,
    isLoading,
    isAuthenticated,
    user,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === null) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
