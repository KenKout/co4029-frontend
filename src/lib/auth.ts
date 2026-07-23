const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

export const GOOGLE_OAUTH_STATE_STORAGE_KEY = "abridgeai.google_oauth_state";
export const POST_LOGIN_REDIRECT_STORAGE_KEY = "abridgeai.post_login_redirect";
export const AUTH_CHANGED_EVENT = "abridgeai.auth.changed";
const ACCESS_TOKEN_REFRESH_BUFFER_MS = 30_000;

export const AUTH_STORAGE_KEYS = {
  accessToken: "abridgeai.access_token",
  refreshToken: "abridgeai.refresh_token",
  tokenType: "abridgeai.token_type",
  expiresAt: "abridgeai.access_token_expires_at",
  requiresMfa: "abridgeai.requires_mfa",
  user: "abridgeai.user",
} as const;

export interface GoogleLoginResponse {
  authorization_url: string;
  state: string;
}

export interface AuthUserProfile {
  user_id: string;
  given_name?: string | null;
  family_name?: string | null;
  display_name: string;
  avatar_object_id?: string | null;
  bio?: string | null;
  // Preferred UI + notification language ('en' | 'vi'). NULL = not set;
  // AuthProvider hydrates i18n from this on load, LanguageSwitcher
  // persists it on change (drives server-side notification language).
  // Typed as string to mirror the generated UserProfileRead.locale
  // (the read side isn't enum-narrowed); AuthProvider guards the value.
  locale?: string | null;
}

export interface AuthUser {
  id: string;
  primary_email: string;
  status: string;
  last_login_at?: string | null;
  created_at: string;
  updated_at: string;
  profile?: AuthUserProfile | null;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  requires_mfa: boolean;
  user: AuthUser;
}

export interface StoredAuthSession {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresAt: number;
  requiresMfa: boolean;
  user: AuthUser;
}

function apiUrl(path: string) {
  return `${API_BASE_URL.replace(/\/$/, "")}${path}`;
}

function notifyAuthChanged() {
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

function isSafeRedirectTarget(
  value: string | null | undefined,
): value is string {
  return (
    typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//")
  );
}

function withDefaultHeaders(init: RequestInit = {}) {
  const headers = new Headers(init.headers);

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return { ...init, headers, cache: "no-store" as const };
}

function withAuthorization(accessToken: string, headers?: HeadersInit) {
  const nextHeaders = new Headers(headers);
  nextHeaders.set("Authorization", `Bearer ${accessToken}`);
  nextHeaders.set("Accept", "application/json");
  return nextHeaders;
}

async function apiRequest(path: string, init: RequestInit = {}) {
  return fetch(apiUrl(path), withDefaultHeaders(init));
}

async function getErrorMessage(response: Response) {
  try {
    const payload: unknown = await response.json();

    if (
      payload &&
      typeof payload === "object" &&
      "detail" in payload &&
      typeof payload.detail === "string"
    ) {
      return payload.detail;
    }
  } catch {
    // Fall back to HTTP status text.
  }

  return response.statusText || "Authentication request failed";
}

function getStoredUser() {
  const rawUser = localStorage.getItem(AUTH_STORAGE_KEYS.user);

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser) as AuthUser;
  } catch {
    clearAuthSession();
    return null;
  }
}

export async function getGoogleLogin() {
  const response = await apiRequest("/auth/google/login");

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return (await response.json()) as GoogleLoginResponse;
}

export async function exchangeGoogleCode(code: string) {
  const query = new URLSearchParams({ code });
  const response = await apiRequest(`/auth/google/callback?${query}`);

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return (await response.json()) as TokenResponse;
}

export function storeAuthSession(tokenResponse: TokenResponse) {
  const expiresAt = Date.now() + tokenResponse.expires_in * 1000;

  localStorage.setItem(
    AUTH_STORAGE_KEYS.accessToken,
    tokenResponse.access_token,
  );
  localStorage.setItem(
    AUTH_STORAGE_KEYS.refreshToken,
    tokenResponse.refresh_token,
  );
  localStorage.setItem(AUTH_STORAGE_KEYS.tokenType, tokenResponse.token_type);
  localStorage.setItem(AUTH_STORAGE_KEYS.expiresAt, String(expiresAt));
  localStorage.setItem(
    AUTH_STORAGE_KEYS.requiresMfa,
    String(tokenResponse.requires_mfa),
  );
  localStorage.setItem(
    AUTH_STORAGE_KEYS.user,
    JSON.stringify(tokenResponse.user),
  );

  notifyAuthChanged();
}

export function getStoredAuthSession(): StoredAuthSession | null {
  const accessToken = localStorage.getItem(AUTH_STORAGE_KEYS.accessToken);
  const refreshToken = localStorage.getItem(AUTH_STORAGE_KEYS.refreshToken);
  const tokenType =
    localStorage.getItem(AUTH_STORAGE_KEYS.tokenType) ?? "bearer";
  const expiresAt = Number(localStorage.getItem(AUTH_STORAGE_KEYS.expiresAt));
  const user = getStoredUser();

  if (!accessToken || !refreshToken || !user || !Number.isFinite(expiresAt)) {
    clearAuthSession();
    return null;
  }

  const requiresMfa =
    localStorage.getItem(AUTH_STORAGE_KEYS.requiresMfa) === "true";

  return {
    accessToken,
    refreshToken,
    tokenType,
    expiresAt,
    requiresMfa,
    user,
  };
}

export function isStoredSessionExpired(session: StoredAuthSession) {
  return session.expiresAt <= Date.now() + ACCESS_TOKEN_REFRESH_BUFFER_MS;
}

export function updateStoredAuthUser(user: AuthUser) {
  if (!getStoredAuthSession()) {
    return;
  }

  localStorage.setItem(AUTH_STORAGE_KEYS.user, JSON.stringify(user));
  notifyAuthChanged();
}

export function clearAuthSession() {
  // Only emit the change event if something was actually cleared. Otherwise
  // calling this from getStoredAuthSession() (which fires when localStorage
  // is already empty — e.g. on first paint or after logout) would loop:
  // listeners call getStoredAuthSession → which calls clearAuthSession →
  // which notifies → which re-enters the listener. RangeError ensues.
  let removedAny = false;
  Object.values(AUTH_STORAGE_KEYS).forEach((key) => {
    if (localStorage.getItem(key) !== null) {
      localStorage.removeItem(key);
      removedAny = true;
    }
  });

  if (removedAny) {
    notifyAuthChanged();
  }
}

export function setMfaRequired(value: boolean) {
  if (!getStoredAuthSession()) {
    return;
  }

  localStorage.setItem(AUTH_STORAGE_KEYS.requiresMfa, String(value));
  notifyAuthChanged();
}

export function clearMfaRequired() {
  setMfaRequired(false);
}

export function setPostLoginRedirect(path: string | null | undefined) {
  if (isSafeRedirectTarget(path)) {
    sessionStorage.setItem(POST_LOGIN_REDIRECT_STORAGE_KEY, path);
    return;
  }

  sessionStorage.removeItem(POST_LOGIN_REDIRECT_STORAGE_KEY);
}

export function consumePostLoginRedirect(defaultPath = "/dashboard") {
  const redirectPath = sessionStorage.getItem(POST_LOGIN_REDIRECT_STORAGE_KEY);
  sessionStorage.removeItem(POST_LOGIN_REDIRECT_STORAGE_KEY);
  return isSafeRedirectTarget(redirectPath) ? redirectPath : defaultPath;
}

export class RefreshAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RefreshAuthError";
  }
}

export class RefreshTransientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RefreshTransientError";
  }
}

/**
 * Single-flight gate for ``/auth/refresh``. Multiple concurrent callers
 * (AuthProvider hydration + React Query hooks firing in parallel after
 * an F5) share the same in-flight request so the backend only sees one
 * refresh-token rotation. Without this gate, the second caller hits a
 * rotated-out token, gets 401, and the user is logged out — exactly the
 * "inactive tab → F5 → logged out" bug.
 */
let inFlightRefresh: Promise<StoredAuthSession | null> | null = null;

export async function refreshAuthSession() {
  if (inFlightRefresh) {
    return inFlightRefresh;
  }

  inFlightRefresh = (async () => {
    const session = getStoredAuthSession();

    if (!session) {
      throw new RefreshAuthError("No active session found");
    }

    const attemptedRefreshToken = session.refreshToken;

    let response: Response;
    try {
      response = await apiRequest("/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refresh_token: session.refreshToken }),
      });
    } catch (err) {
      // Network failure (offline, DNS, TLS, browser killed the request).
      // Do NOT clear the session — the user's refresh token is still
      // probably valid; let the caller retry on the next interaction.
      throw new RefreshTransientError(
        err instanceof Error ? err.message : "Network error during refresh",
      );
    }

    if (response.status === 401 || response.status === 403) {
      const latestSession = getStoredAuthSession();

      // Cross-tab race: another tab may have already rotated the refresh
      // token and stored the newer session while this request was in flight.
      // In that case this stale 401 must not wipe the newer shared session.
      if (
        latestSession &&
        latestSession.refreshToken !== attemptedRefreshToken
      ) {
        return latestSession;
      }

      // The refresh token is genuinely invalid (revoked, expired, tampered).
      // Only here do we wipe the session.
      clearAuthSession();
      throw new RefreshAuthError(await getErrorMessage(response));
    }

    if (!response.ok) {
      // 5xx, 429, etc. — server-side flake. Keep the session and let
      // the caller retry. Do NOT log the user out for a 502.
      throw new RefreshTransientError(await getErrorMessage(response));
    }

    const tokenResponse = (await response.json()) as TokenResponse;
    storeAuthSession(tokenResponse);
    return getStoredAuthSession();
  })();

  try {
    return await inFlightRefresh;
  } finally {
    inFlightRefresh = null;
  }
}

export async function getValidAuthSession() {
  const session = getStoredAuthSession();

  if (!session) {
    return null;
  }

  if (!isStoredSessionExpired(session)) {
    return session;
  }

  try {
    return await refreshAuthSession();
  } catch (err) {
    if (err instanceof RefreshTransientError) {
      // Refresh failed for a non-auth reason — return the (expired)
      // stored session so the caller can still try the request. The
      // backend will return 401, the caller will retry once via
      // authenticatedFetch's own retry path, and if THAT also fails
      // we'll surface the error without nuking auth state.
      return session;
    }
    throw err;
  }
}

export async function authenticatedFetch(
  path: string,
  init: RequestInit = {},
  retry = true,
) {
  const session = await getValidAuthSession();

  if (!session) {
    throw new Error("Not authenticated");
  }

  const response = await apiRequest(path, {
    ...init,
    headers: withAuthorization(session.accessToken, init.headers),
  });

  if (response.status !== 401 || !retry) {
    return response;
  }

  try {
    const refreshedSession = await refreshAuthSession();

    if (!refreshedSession) {
      // refreshAuthSession returned null (no stored session) — caller
      // gets the original 401 and the AuthProvider will sync the UI to
      // unauthenticated via the storage event from clearAuthSession.
      return response;
    }

    return apiRequest(path, {
      ...init,
      headers: withAuthorization(refreshedSession.accessToken, init.headers),
    });
  } catch (err) {
    if (err instanceof RefreshTransientError) {
      // Network/5xx during refresh — keep the session, surface the
      // original 401. The next call will re-attempt refresh.
      return response;
    }
    // RefreshAuthError already cleared the session inside
    // refreshAuthSession (the only path that clears).
    return response;
  }
}

export async function getCurrentUser() {
  const response = await authenticatedFetch("/users/me");

  if (!response.ok) {
    // Note: a 401 here means authenticatedFetch already tried to refresh
    // and either (a) hit a real auth failure (RefreshAuthError, which
    // already called clearAuthSession), or (b) hit a transient and the
    // re-fetch still 401'd. We do NOT clear here — the only legitimate
    // clear path is RefreshAuthError. Otherwise transient blips during
    // hydration would log the user out.
    throw new Error(await getErrorMessage(response));
  }

  const user = (await response.json()) as AuthUser;
  updateStoredAuthUser(user);
  return user;
}

export async function logout() {
  const session = getStoredAuthSession();

  try {
    const validSession = session
      ? await getValidAuthSession().catch(() => session)
      : null;

    if (validSession) {
      await apiRequest("/auth/logout", {
        method: "POST",
        headers: withAuthorization(validSession.accessToken),
        body: JSON.stringify({ refresh_token: validSession.refreshToken }),
      });
    }
  } finally {
    clearAuthSession();
    sessionStorage.removeItem(POST_LOGIN_REDIRECT_STORAGE_KEY);
  }
}

export function getAuthDisplayName(user: AuthUser | null | undefined) {
  if (!user) {
    return "Guest";
  }

  return user.profile?.display_name || user.primary_email;
}

export function getAuthUserInitials(user: AuthUser | null | undefined) {
  const displayName = getAuthDisplayName(user);

  return displayName
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
