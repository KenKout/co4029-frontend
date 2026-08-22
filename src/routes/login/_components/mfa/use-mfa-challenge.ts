import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useAuth } from "@/components/auth/AuthProvider";
import { useVerifyMfa } from "@/lib/api/hooks/auth";
import { apiPost } from "@/lib/api/client";
import { clearMfaRequired } from "@/lib/auth";
import type { MfaChallengeResponse, MfaController, Mode } from "./types";

/**
 * The MFA challenge/verify state machine.
 *
 * Hook order is exactly the order the former inline `LoginMfaPage` used
 * (useTranslation → useNavigate → useSearch → useAuth → useVerifyMfa → useRef →
 * five useState → useEffect). This is the second factor of the sign-in flow, so
 * a reordered hook or a reordered redirect branch is a security-relevant
 * regression rather than a cosmetic one.
 */
export function useMfaChallenge(): MfaController {
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
  const [, setChallengeError] = useState<string | null>(null);
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

  return {
    mode,
    setMode,
    code,
    setCode,
    challengeId,
    isVerifying,
    isLoadingChallenge,
    status,
    isAuthenticated,
    requiresMfa,
    requestedRef,
    requestChallenge,
    handleSubmit,
  };
}
