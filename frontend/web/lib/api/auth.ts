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
  CognitoUser,
  CognitoUserAttribute,
  CognitoUserPool,
  type CognitoUserSession,
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
  const msg = e?.message ?? "Authentication failed.";
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
