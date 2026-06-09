"use client";

/**
 * Global auth context — wraps lib/api/auth (Cognito-direct seam) in a React
 * context so chrome, pages, and protected routes can read auth state without
 * prop-drilling.
 *
 * On mount: asks the Cognito SDK for the current user and validates/refreshes
 * the session. signUp returns confirmation info instead of a session — the
 * caller routes to /confirm and the session arrives via signIn after the user
 * enters their email code.
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
  startGoogleSignIn as seamStartGoogleSignIn,
  completeGoogleSignIn as seamCompleteGoogleSignIn,
  changePassword as seamChangePassword,
  type Session,
} from "@/lib/api/auth";
import { setOnUnauthorized } from "@/lib/api/client";

type Credentials = { email: string; password: string };
type SignUpResult = { email: string; needsConfirmation: boolean };

type AuthContextValue = {
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  user: { email: string; sub: string } | null;
  signIn: (creds: Credentials) => Promise<void>;
  signUp: (creds: Credentials) => Promise<SignUpResult>;
  signInWithGoogle: (from?: string) => Promise<void>;
  completeGoogleSignIn: (code: string, state: string) => Promise<void>;
  signOut: () => void;
  changePassword: (token: string, previousPassword: string, newPassword: string) => Promise<void>;
  forgotPassword?: (email: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function isLive(session: Session | null): boolean {
  return session !== null && session.ExpiresAt > Date.now();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Rehydrate session from Cognito on mount. The SDK validates / refreshes
    // tokens against the User Pool, so this is async.
    let cancelled = false;
    getSession().then((persisted) => {
      if (cancelled) return;
      if (persisted) setSession(persisted);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (creds: Credentials) => {
    const next = await seamSignIn(creds);
    setSession(next);
  }, []);

  const signUp = useCallback(
    async (creds: Credentials): Promise<SignUpResult> => seamSignUp(creds),
    [],
  );

  // Kicks off the Hosted-UI redirect; the browser leaves the app, so there is
  // no session to set here — that happens on return via completeGoogleSignIn.
  const signInWithGoogle = useCallback(
    (from?: string): Promise<void> => seamStartGoogleSignIn(from),
    [],
  );

  const completeGoogleSignIn = useCallback(async (code: string, state: string) => {
    const next = await seamCompleteGoogleSignIn(code, state);
    setSession(next);
  }, []);

  const signOut = useCallback(() => {
    seamSignOut();
    setSession(null);
  }, []);

  const changePassword = useCallback(async (previousPassword: string, newPassword: string) => {
    await seamChangePassword(previousPassword, newPassword);
  }, []);

  useEffect(() => {
    // Register the wrapper's unauthorized callback. Invoked by lib/api/client when
    // getSession() returns null mid-request OR an in-flight request returns 401.
    // signOut clears the Cognito session; RequireAuth (mounted on protected routes)
    // observes the isAuthenticated flip and redirects to /login.
    setOnUnauthorized(signOut);
  }, [signOut]);

  const isAuthenticated = isLive(session);
  const user = isAuthenticated && session ? session.user : null;

  const value: AuthContextValue = {
    session,
    isLoading,
    isAuthenticated,
    user,
    signIn,
    signUp,
    signInWithGoogle,
    completeGoogleSignIn,
    signOut,
    changePassword,
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
