import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

import type { MfaController } from "./types";

/**
 * "Minting a challenge…" progress line, and — once a challenge attempt has
 * settled without producing an id — the manual resend escape hatch.
 */
export default function MfaChallengeFooter({
  controller,
}: {
  controller: MfaController;
}) {
  const { t } = useTranslation();
  const {
    challengeId,
    isLoadingChallenge,
    isAuthenticated,
    requiresMfa,
    requestedRef,
    requestChallenge,
  } = controller;

  return (
    <>
      {isLoadingChallenge && (
        <p className="flex items-center justify-center gap-2 text-xs font-medium text-m3-on-surface-variant">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("login_mfa.creating_challenge")}
        </p>
      )}

      {!challengeId && !isLoadingChallenge && isAuthenticated && requiresMfa ? (
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
    </>
  );
}
