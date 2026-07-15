import { createContext, useContext, useEffect, useState } from "react";
import i18n from "@/i18n";

import {
  AUTH_CHANGED_EVENT,
  getCurrentUser,
  getStoredAuthSession,
  isStoredSessionExpired,
  logout as logoutRequest,
  refreshAuthSession,
  RefreshAuthError,
  RefreshTransientError,
  type AuthUser,
} from "@/lib/auth";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  isAuthenticated: boolean;
  requiresMfa: boolean;
  user: AuthUser | null;
  refreshUser: () => Promise<AuthUser | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function applySessionState(setState: (nextState: {
  status: AuthStatus;
  requiresMfa: boolean;
  user: AuthUser | null;
}) => void) {
  const session = getStoredAuthSession();

  if (session) {
    setState({
      status: "authenticated",
      requiresMfa: session.requiresMfa,
      user: session.user,
    });
    return session;
  }

  setState({ status: "unauthenticated", requiresMfa: false, user: null });
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<{
    status: AuthStatus;
    requiresMfa: boolean;
    user: AuthUser | null;
  }>({
    status: "loading",
    requiresMfa: false,
    user: null,
  });

  useEffect(() => {
    let isCurrent = true;

    function setState(nextState: {
      status: AuthStatus;
      requiresMfa: boolean;
      user: AuthUser | null;
    }) {
      if (isCurrent) {
        setAuthState(nextState);
      }
    }

    function syncFromStorage() {
      applySessionState(setState);
    }

    async function hydrateSession() {
      const session = applySessionState(setState);

      if (!session) {
        return;
      }

      if (isStoredSessionExpired(session)) {
        try {
          const refreshedSession = await refreshAuthSession();

          if (!isCurrent) return;

          if (refreshedSession) {
            setState({
              status: "authenticated",
              requiresMfa: refreshedSession.requiresMfa,
              user: refreshedSession.user,
            });
            return;
          }
        } catch (err) {
          if (!isCurrent) return;
          if (err instanceof RefreshTransientError) {
            // Network blip / 5xx during boot. Keep the (expired)
            // session in state — the user appears authenticated, and
            // the next API call will re-attempt the refresh. Do NOT
            // log them out for a transient hiccup.
            return;
          }
          if (err instanceof RefreshAuthError) {
            // Genuine auth failure — refreshAuthSession already
            // cleared storage. Sync state to unauthenticated.
            setState({ status: "unauthenticated", requiresMfa: false, user: null });
            return;
          }
          // Unknown error — be conservative and keep the session
          // visible; the user can retry. We avoid the silent logout.
          return;
        }
      }

      try {
        const user = await getCurrentUser();
        const currentSession = getStoredAuthSession();
        if (!isCurrent) return;
        setState({
          status: "authenticated",
          requiresMfa: currentSession?.requiresMfa ?? false,
          user,
        });
      } catch {
        // /users/me failed — could be transient or auth. Resync from
        // storage (which is the source of truth for whether refresh
        // hit a real auth failure).
        if (!isCurrent) return;
        syncFromStorage();
      }
    }

    void hydrateSession();

    window.addEventListener("storage", syncFromStorage);
    window.addEventListener(AUTH_CHANGED_EVENT, syncFromStorage);

    return () => {
      isCurrent = false;
      window.removeEventListener("storage", syncFromStorage);
      window.removeEventListener(AUTH_CHANGED_EVENT, syncFromStorage);
    };
  }, []);

  // Hydrate the UI language from the user's saved profile locale. The
  // language switch persists ``locale`` server-side (drives notification
  // language too); on load we mirror it back into i18next so a user who
  // picked Vietnamese on one device sees Vietnamese everywhere. Only
  // override when the saved locale actually differs from the active one,
  // so an unauthenticated visitor's localStorage/navigator choice stands.
  useEffect(() => {
    const locale = authState.user?.profile?.locale;
    if (locale && i18n.resolvedLanguage !== locale) {
      void i18n.changeLanguage(locale);
    }
  }, [authState.user?.profile?.locale]);

  async function refreshUser() {
    try {
      const user = await getCurrentUser();
      const session = getStoredAuthSession();
      setAuthState({
        status: "authenticated",
        requiresMfa: session?.requiresMfa ?? false,
        user,
      });
      return user;
    } catch {
      const session = getStoredAuthSession();
      if (session) {
        setAuthState({
          status: "authenticated",
          requiresMfa: session.requiresMfa,
          user: session.user,
        });
        return session.user;
      }
      setAuthState({ status: "unauthenticated", requiresMfa: false, user: null });
      return null;
    }
  }

  async function logout() {
    await logoutRequest();
    setAuthState({ status: "unauthenticated", requiresMfa: false, user: null });
  }

  return (
    <AuthContext.Provider
      value={{
        status: authState.status,
        isAuthenticated: authState.status === "authenticated",
        requiresMfa: authState.requiresMfa,
        user: authState.user,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
