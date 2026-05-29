/**
 * Cognito-direct auth seam (Pattern B).
 *
 * Talks to the Cognito User Pool from the browser using amazon-cognito-identity-js.
 * The SDK persists tokens in localStorage on its own keys
 * (`CognitoIdentityServiceProvider.<clientId>.*`), so rehydrate is a matter of
 * asking the pool for `getCurrentUser()` + `getSession()`.
 *
 * Public surface kept stable for the rest of the app:
 *   - signUp / signIn / signOut / getSession
 *   - confirmSignUp / resendConfirmationCode (new — real Cognito needs email verification)
 *   - Session type
 *   - UsernameExistsException / NotAuthorizedException / UserNotConfirmedException /
 *     CodeMismatchException / InvalidPasswordException — typed error names so call
 *     sites can branch without scraping message strings.
 *
 * getSession is now async because Cognito validates / refreshes tokens against the
 * User Pool — that has always been an HTTP round-trip in disguise.
 */

import {
  AuthenticationDetails,
  CognitoAccessToken,
  CognitoIdToken,
  CognitoRefreshToken,
  CognitoUser,
  CognitoUserAttribute,
  CognitoUserPool,
  CognitoUserSession,
  type ISignUpResult,
} from "amazon-cognito-identity-js";

export type Session = {
  AccessToken: string;
  IdToken: string;
  RefreshToken: string;
  ExpiresAt: number;
  user: { email: string; sub: string };
};

type Credentials = { email: string; password: string };

export class UsernameExistsException extends Error {
  override name = "UsernameExistsException" as const;
}
export class NotAuthorizedException extends Error {
  override name = "NotAuthorizedException" as const;
}
export class UserNotConfirmedException extends Error {
  override name = "UserNotConfirmedException" as const;
}
export class CodeMismatchException extends Error {
  override name = "CodeMismatchException" as const;
}
export class InvalidPasswordException extends Error {
  override name = "InvalidPasswordException" as const;
}

let cachedPool: CognitoUserPool | null = null;
function getPool(): CognitoUserPool {
  if (cachedPool) return cachedPool;
  const UserPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
  const ClientId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID;
  if (!UserPoolId || !ClientId) {
    throw new Error(
      "Missing NEXT_PUBLIC_COGNITO_USER_POOL_ID or NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID. Copy .env.example to .env.local.",
    );
  }
  cachedPool = new CognitoUserPool({ UserPoolId, ClientId });
  return cachedPool;
}

function translateError(err: unknown): Error {
  const e = err as { name?: string; code?: string; message?: string };
  const name = e?.name ?? e?.code ?? "";
  const msg = e?.message ?? "Falha na autenticação.";
  switch (name) {
    case "UsernameExistsException":
      return new UsernameExistsException(msg);
    case "NotAuthorizedException":
      return new NotAuthorizedException(msg);
    case "UserNotConfirmedException":
      return new UserNotConfirmedException(msg);
    case "CodeMismatchException":
    case "ExpiredCodeException":
      return new CodeMismatchException(msg);
    case "InvalidPasswordException":
    case "InvalidParameterException":
      return new InvalidPasswordException(msg);
    default:
      return err instanceof Error ? err : new Error(msg);
  }
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  // ID/Access tokens are base64url-encoded JWTs; we only need the payload (claims).
  // API Gateway already cryptographically validates this token before any Lambda
  // sees it, so client-side we just read fields out of it.
  const [, payload] = token.split(".");
  if (!payload) return {};
  const padded = payload.replace(/-/g, "+").replace(/_/g, "/");
  try {
    return JSON.parse(atob(padded));
  } catch {
    return {};
  }
}

function toSession(cognitoSession: CognitoUserSession): Session {
  const idToken = cognitoSession.getIdToken().getJwtToken();
  const accessToken = cognitoSession.getAccessToken().getJwtToken();
  const refreshToken = cognitoSession.getRefreshToken().getToken();
  const claims = decodeJwtPayload(idToken);
  const expSeconds = typeof claims.exp === "number" ? claims.exp : 0;
  return {
    AccessToken: accessToken,
    IdToken: idToken,
    RefreshToken: refreshToken,
    ExpiresAt: expSeconds * 1000,
    user: {
      email: typeof claims.email === "string" ? claims.email : "",
      sub: typeof claims.sub === "string" ? claims.sub : "",
    },
  };
}

export function signUp({
  email,
  password,
}: Credentials): Promise<{ email: string; needsConfirmation: boolean }> {
  const pool = getPool();
  const attrs = [new CognitoUserAttribute({ Name: "email", Value: email })];
  return new Promise((resolve, reject) => {
    pool.signUp(
      email,
      password,
      attrs,
      [],
      (err: Error | undefined, result: ISignUpResult | undefined) => {
        if (err || !result) {
          reject(translateError(err));
          return;
        }
        resolve({ email, needsConfirmation: !result.userConfirmed });
      },
    );
  });
}

export function confirmSignUp(email: string, code: string): Promise<void> {
  const user = new CognitoUser({ Username: email, Pool: getPool() });
  return new Promise((resolve, reject) => {
    user.confirmRegistration(code, false, (err) => {
      if (err) {
        reject(translateError(err));
        return;
      }
      resolve();
    });
  });
}

export function resendConfirmationCode(email: string): Promise<void> {
  const user = new CognitoUser({ Username: email, Pool: getPool() });
  return new Promise((resolve, reject) => {
    user.resendConfirmationCode((err) => {
      if (err) {
        reject(translateError(err));
        return;
      }
      resolve();
    });
  });
}

export function signIn({ email, password }: Credentials): Promise<Session> {
  const user = new CognitoUser({ Username: email, Pool: getPool() });
  // The User Pool Client is created with ALLOW_USER_PASSWORD_AUTH only
  // (see __main__.py: explicit_auth_flows). The SDK defaults to USER_SRP_AUTH,
  // which the pool refuses with "USER_SRP_AUTH is not enabled for the client."
  user.setAuthenticationFlowType("USER_PASSWORD_AUTH");
  const auth = new AuthenticationDetails({ Username: email, Password: password });
  return new Promise((resolve, reject) => {
    user.authenticateUser(auth, {
      onSuccess: (cognitoSession) => resolve(toSession(cognitoSession)),
      onFailure: (err) => reject(translateError(err)),
    });
  });
}

export function signOut(): void {
  if (typeof window === "undefined") return;
  const user = getPool().getCurrentUser();
  user?.signOut();
}

export function getSession(): Promise<Session | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  const user = getPool().getCurrentUser();
  if (!user) return Promise.resolve(null);
  return new Promise((resolve) => {
    user.getSession((err: Error | null, cognitoSession: CognitoUserSession | null) => {
      if (err || !cognitoSession || !cognitoSession.isValid()) {
        resolve(null);
        return;
      }
      resolve(toSession(cognitoSession));
    });
  });
}

/* ------------------------------------------------------------------ *
 * OAuth 2.0 — Google via Cognito Hosted UI (issue #181).
 *
 * The amazon-cognito-identity-js SDK has no Hosted-UI flow, so we drive the
 * authorization-code-with-PKCE dance by hand:
 *   1. startGoogleSignIn  -> redirect the browser to /oauth2/authorize
 *   2. (Cognito brokers Google, redirects back to /callback?code=…&state=…)
 *   3. completeGoogleSignIn -> exchange the code at /oauth2/token, then hand
 *      the tokens back to the SDK via setSignInUserSession so they land on the
 *      same localStorage keys getSession()/refresh already use. Everything
 *      downstream (getSession, client.ts, AuthContext) stays unchanged.
 * ------------------------------------------------------------------ */

const PKCE_VERIFIER_KEY = "oauth_pkce_verifier";
const OAUTH_STATE_KEY = "oauth_state";
const OAUTH_FROM_KEY = "oauth_from";

function getOAuthConfig(): { domain: string; clientId: string; redirectUri: string } {
  const domain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN;
  const clientId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_OAUTH_REDIRECT_URI;
  if (!domain || !clientId || !redirectUri) {
    throw new Error(
      "Missing NEXT_PUBLIC_COGNITO_DOMAIN, NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID, or NEXT_PUBLIC_OAUTH_REDIRECT_URI. Copy .env.example to .env.local.",
    );
  }
  return { domain: domain.replace(/\/$/, ""), clientId, redirectUri };
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomUrlToken(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64UrlEncode(new Uint8Array(digest));
}

/**
 * Redirects the browser to Cognito's Hosted UI, pre-selecting Google. Stashes
 * the PKCE verifier + state in sessionStorage for completeGoogleSignIn to read
 * back after Cognito redirects to /callback.
 */
export async function startGoogleSignIn(from?: string): Promise<void> {
  const { domain, clientId, redirectUri } = getOAuthConfig();
  const verifier = randomUrlToken(32);
  const state = randomUrlToken(16);
  sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);
  sessionStorage.setItem(OAUTH_STATE_KEY, state);
  // The redirect_uri is fixed (must match a registered callback), so the
  // post-login return path rides along in sessionStorage instead of the URL.
  if (from) sessionStorage.setItem(OAUTH_FROM_KEY, from);
  else sessionStorage.removeItem(OAUTH_FROM_KEY);
  const challenge = await pkceChallenge(verifier);
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    identity_provider: "Google",
    scope: "openid email profile",
    redirect_uri: redirectUri,
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  window.location.assign(`${domain}/oauth2/authorize?${params.toString()}`);
}

/**
 * Exchanges the authorization code for tokens and persists them through the
 * Cognito SDK. Validates `state` against the value stashed by startGoogleSignIn
 * to defend against CSRF / mismatched callbacks.
 */
export async function completeGoogleSignIn(code: string, state: string): Promise<Session> {
  const { domain, clientId, redirectUri } = getOAuthConfig();

  const expectedState = sessionStorage.getItem(OAUTH_STATE_KEY);
  const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);
  sessionStorage.removeItem(OAUTH_STATE_KEY);
  sessionStorage.removeItem(PKCE_VERIFIER_KEY);
  if (!expectedState || state !== expectedState || !verifier) {
    throw new NotAuthorizedException("Sessão de login inválida. Tente novamente.");
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier,
  });

  let tokens: { id_token?: string; access_token?: string; refresh_token?: string };
  try {
    const res = await fetch(`${domain}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    if (!res.ok) {
      throw new NotAuthorizedException("Não foi possível concluir o login com o Google.");
    }
    tokens = await res.json();
  } catch (err) {
    if (err instanceof NotAuthorizedException) throw err;
    throw translateError(err);
  }

  if (!tokens.id_token || !tokens.access_token || !tokens.refresh_token) {
    throw new NotAuthorizedException("Resposta de token inválida do provedor.");
  }

  // Hand the tokens to the SDK so they persist on the same localStorage keys
  // getSession()/refresh use. Username must match the IdToken's cognito:username.
  const session = new CognitoUserSession({
    IdToken: new CognitoIdToken({ IdToken: tokens.id_token }),
    AccessToken: new CognitoAccessToken({ AccessToken: tokens.access_token }),
    RefreshToken: new CognitoRefreshToken({ RefreshToken: tokens.refresh_token }),
  });
  const claims = decodeJwtPayload(tokens.id_token);
  const username =
    (typeof claims["cognito:username"] === "string" && claims["cognito:username"]) ||
    (typeof claims.sub === "string" && claims.sub) ||
    "";
  const user = new CognitoUser({ Username: username, Pool: getPool() });
  user.setSignInUserSession(session);

  return toSession(session);
}

/** Reads and clears the return path stashed by startGoogleSignIn. */
export function takeOAuthReturnPath(): string | null {
  if (typeof window === "undefined") return null;
  const from = sessionStorage.getItem(OAUTH_FROM_KEY);
  sessionStorage.removeItem(OAUTH_FROM_KEY);
  return from;
}

/**
 * Dev-only: signs the current user out so a reload exercises the logged-out
 * rehydrate path. Real Cognito refreshes the IdToken automatically up to the
 * refresh-token window, so backdating a timestamp the way the mock did would
 * not force expiry — clearing the user is the closest equivalent test hook.
 */
export function forceExpire(): void {
  signOut();
}

if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
  (window as unknown as { __authTest?: { forceExpire: typeof forceExpire } }).__authTest = {
    forceExpire,
  };
}
