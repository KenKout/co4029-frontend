import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Loader2, ShieldCheck, ArrowRight, KeyRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/auth/AuthProvider";
import { useVerifyMfa } from "@/lib/api/hooks/auth";
import { apiPost } from "@/lib/api/client";
import { clearMfaRequired } from "@/lib/auth";

type Mode = "totp" | "recovery";

interface MfaChallengeResponse {
  challenge_id: string;
  expires_at: string;
}

export default function LoginMfaPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { next?: string };
  const { isAuthenticated, requiresMfa, status } = useAuth();

  const verify = useVerifyMfa();
  const requestedRef = useRef(false);

  const [mode, setMode] = useState<Mode>("totp");
  const [code, setCode] = useState("");
  // Plain useState + plain fetch instead of useMutation for the
  // challenge. react-query's mutation state machine kept resetting
  // ``data`` to undefined whenever the component remounted (HMR /
  // StrictMode), so even though the backend returned 200 with a
  // valid challenge_id, the UI saw ``challenge.data === undefined``
  // forever and the verify button stayed disabled. A boring
  // useState survives all of that.
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [challengeError, setChallengeError] = useState<string | null>(null);
  const [challengeLoading, setChallengeLoading] = useState(false);

  async function requestChallenge() {
    setChallengeError(null);
    setChallengeLoading(true);
    try {
      const response = await apiPost<MfaChallengeResponse>(
        "/auth/me/mfa/challenge",
      );
      setChallengeId(response.challenge_id);
    } catch (err) {
      // Allow a retry: the next nav into this page (or a manual
      // refresh) should mint a new challenge instead of being
      // permanently locked out by the ref guard.
      requestedRef.current = false;
      const message = err instanceof Error ? err.message : "challenge_failed";
      setChallengeError(message);
      toast.error(t("login_mfa.errors.challenge_failed"));
    } finally {
      setChallengeLoading(false);
    }
  }

  useEffect(() => {
    // Wait for AuthProvider to finish hydrating from localStorage —
    // otherwise we'd evaluate ``isAuthenticated`` while ``status``
    // is still "loading" right after a page reload, see false, and
    // bounce the user back to /login on a fresh OAuth round-trip.
    if (status === "loading") return;

    if (!isAuthenticated) {
      void navigate({
        to: "/login",
        search: { next: undefined },
        replace: true,
      });
      return;
    }

    if (!requiresMfa) {
      const next = search.next ?? "/dashboard";
      window.location.replace(next);
      return;
    }

    if (requestedRef.current) return;
    requestedRef.current = true;

    void requestChallenge();
    // ``requestChallenge`` is a stable closure over setters; deps
    // only track auth-state inputs to keep the array shape constant
    // across HMR swaps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, isAuthenticated, requiresMfa, search.next, navigate, t]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!challengeId) {
      toast.error(t("login_mfa.errors.session_not_ready"));
      return;
    }

    const trimmed = code.trim();
    if (!trimmed) return;

    const body =
      mode === "totp"
        ? { challenge_id: challengeId, code: trimmed }
        : { challenge_id: challengeId, recovery_code: trimmed };

    verify.mutate(body, {
      onSuccess: () => {
        clearMfaRequired();
        toast.success(t("login_mfa.success"));
        const next = search.next ?? "/dashboard";
        window.location.replace(next);
      },
      onError: (err) => {
        if (err instanceof Error && err.message === "Invalid MFA challenge") {
          toast.error(t("login_mfa.errors.challenge_expired"));
          setChallengeId(null);
          requestChallenge();
        } else {
          toast.error(t("login_mfa.errors.invalid_code"));
        }
        setCode("");
      },
    });
  }

  const isVerifying = verify.isPending;
  const isLoadingChallenge = challengeLoading && !challengeId;

  // Hide the form until AuthProvider has hydrated. The effect above
  // already short-circuits while ``status === "loading"`` so we never
  // run the redirect/challenge logic too early, but the form would
  // otherwise flash on screen with the verify button disabled and
  // give the impression we ate the user's session.
  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-m3-surface-bright px-6 py-10">
        <Loader2 className="h-6 w-6 animate-spin text-m3-secondary" />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-m3-surface-bright px-6 py-10">
      <section className="w-full max-w-md space-y-8 rounded-xl bg-white/80 p-8 shadow-[0_24px_80px_rgba(25,28,30,0.08)] ring-1 ring-m3-outline-variant/20 backdrop-blur">
        <div className="flex justify-center">
          <Link
            to="/"
            className="font-headline text-3xl font-black tracking-tighter text-m3-primary"
            search={{}}
          >
            aBridgeAI
          </Link>
        </div>

        <header className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-m3-secondary-fixed text-m3-secondary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="font-headline text-3xl font-extrabold tracking-tight text-m3-on-surface">
            {t("login_mfa.title")}
          </h1>
          <p className="mt-2 text-sm font-medium text-m3-on-surface-variant">
            {t("login_mfa.subtitle")}
          </p>
        </header>

        <div
          className="grid grid-cols-2 gap-1 rounded-xl bg-m3-surface-container-low p-1"
          role="tablist"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "totp"}
            onClick={() => {
              setMode("totp");
              setCode("");
            }}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              mode === "totp"
                ? "bg-surface-elev text-m3-primary shadow-sm"
                : "text-m3-on-surface-variant hover:text-m3-on-surface"
            }`}
          >
            {t("login_mfa.tab_totp")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "recovery"}
            onClick={() => {
              setMode("recovery");
              setCode("");
            }}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              mode === "recovery"
                ? "bg-surface-elev text-m3-primary shadow-sm"
                : "text-m3-on-surface-variant hover:text-m3-on-surface"
            }`}
          >
            {t("login_mfa.tab_recovery")}
          </button>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label
              htmlFor="mfa-code"
              className="text-sm font-semibold text-m3-on-surface"
            >
              {mode === "totp"
                ? t("login_mfa.totp_label")
                : t("login_mfa.recovery_label")}
            </label>
            <Input
              id="mfa-code"
              autoComplete="one-time-code"
              inputMode={mode === "totp" ? "numeric" : "text"}
              autoFocus
              value={code}
              onChange={(event) => setCode(event.target.value)}
              disabled={isVerifying}
              placeholder={mode === "totp" ? "123456" : "abcd-efgh-ijkl"}
              className="h-12 text-center text-lg tracking-[0.4em]"
              maxLength={mode === "totp" ? 6 : 32}
            />
          </div>

          <Button
            type="submit"
            disabled={!challengeId || !code.trim() || isVerifying}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl font-bold"
          >
            {isVerifying ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <KeyRound className="h-5 w-5" />
            )}
            <span>
              {isVerifying ? t("login_mfa.verifying") : t("login_mfa.verify")}
            </span>
            {!isVerifying && <ArrowRight className="h-5 w-5" />}
          </Button>
        </form>

        {isLoadingChallenge && (
          <p className="flex items-center justify-center gap-2 text-xs font-medium text-m3-on-surface-variant">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("login_mfa.creating_challenge")}
          </p>
        )}

        {!challengeId &&
        !isLoadingChallenge &&
        isAuthenticated &&
        requiresMfa ? (
          <button
            type="button"
            onClick={() => {
              requestedRef.current = true;
              requestChallenge();
            }}
            className="mx-auto block text-xs font-medium text-m3-secondary hover:underline"
          >
            {t("login_mfa.resend_challenge")}
          </button>
        ) : null}
      </section>
    </main>
  );
}
