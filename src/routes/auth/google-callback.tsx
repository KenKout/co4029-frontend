import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { resolveLandingPath } from "@/lib/auth/resolve-landing";
import {
  consumePostLoginRedirect,
  GOOGLE_OAUTH_STATE_STORAGE_KEY,
  storeAuthSession,
} from "@/lib/auth";
import { useGoogleCallback } from "@/lib/api/hooks/auth";

const processedCallbackKeys = new Set<string>();

export default function GoogleCallbackPage() {
  const { t } = useTranslation();
  const search = useSearch({ strict: false }) as {
    code?: string | null;
    state?: string | null;
    error?: string | null;
  };

  const navigate = useNavigate();
  const googleCallback = useGoogleCallback();

  const [status, setStatus] = useState(t("google_callback.in_progress"));
  const [details, setDetails] = useState<string | null>(null);
  const [hasFailed, setHasFailed] = useState(false);
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const { code, state, error } = search;

    function fail(message: string, detail: string) {
      setHasFailed(true);
      setStatus(message);
      setDetails(detail);
      toast.error(t("google_callback.toast_failed"));
      void navigate({
        to: "/login",
        search: { error: "oauth" } as never,
        replace: true,
      });
    }

    async function finishLogin() {
      if (error) {
        fail(t("google_callback.cancelled_title"), error);
        return;
      }

      if (!code) {
        fail(
          t("google_callback.missing_code_title"),
          t("google_callback.missing_code_detail"),
        );
        return;
      }

      const expectedState = sessionStorage.getItem(
        GOOGLE_OAUTH_STATE_STORAGE_KEY,
      );
      sessionStorage.removeItem(GOOGLE_OAUTH_STATE_STORAGE_KEY);

      if (!state || !expectedState || state !== expectedState) {
        fail(
          t("google_callback.state_mismatch_title"),
          t("google_callback.state_mismatch_detail"),
        );
        return;
      }

      const callbackKey = `${state}:${code}`;
      if (processedCallbackKeys.has(callbackKey)) {
        return;
      }
      processedCallbackKeys.add(callbackKey);

      // OAuth codes are single-use. Remove them from the URL before the
      // network exchange so a remount, refresh, or history replay cannot
      // submit the same callback again from this tab.
      window.history.replaceState(
        window.history.state,
        document.title,
        window.location.pathname,
      );

      try {
        const tokenResponse = await googleCallback.mutateAsync(code);
        storeAuthSession(tokenResponse);

        if (tokenResponse.requires_mfa) {
          const next = consumePostLoginRedirect();
          setStatus(t("google_callback.mfa_redirect"));
          window.location.replace(
            `/login/mfa?next=${encodeURIComponent(next)}`,
          );
          return;
        }

        setStatus(t("google_callback.success_redirecting"));
        // consumePostLoginRedirect() returns "" when nothing was stashed, so
        // the role-based default applies; a stashed deep link still wins.
        const stashed = consumePostLoginRedirect("");
        window.location.replace(await resolveLandingPath(stashed || null));
      } catch (err) {
        fail(
          t("google_callback.exchange_failed_title"),
          err instanceof Error
            ? err.message
            : t("google_callback.exchange_failed_detail"),
        );
      }
    }

    void finishLogin();
  }, [search, googleCallback, navigate, t]);

  return (
    <main className="min-h-screen bg-m3-surface-bright px-6 py-10 flex items-center justify-center">
      <section className="w-full max-w-md rounded-xl bg-white/80 p-8 text-center shadow-[0_24px_80px_rgba(25,28,30,0.08)] ring-1 ring-m3-outline-variant/20 backdrop-blur">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-m3-secondary-fixed text-m3-secondary">
          {hasFailed ? (
            <AlertCircle className="h-7 w-7" />
          ) : (
            <ShieldCheck className="h-7 w-7" />
          )}
        </div>

        <h1 className="font-headline text-3xl font-black tracking-tight text-m3-primary">
          {status}
        </h1>

        <p className="mt-4 text-sm font-medium leading-relaxed text-m3-on-surface-variant">
          {details ?? t("google_callback.exchange_default")}
        </p>

        {!hasFailed && (
          <Loader2 className="mx-auto mt-8 h-6 w-6 animate-spin text-m3-secondary" />
        )}
      </section>
    </main>
  );
}
