import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  useMfaChallenge,
  useRegenerateRecoveryCodes,
  useVerifyMfa,
} from "@/lib/api/hooks/auth";
import RecoveryCodesPanel from "./RecoveryCodesPanel";
import RegenConfirmForm from "./RegenConfirmForm";
import type { RegenState } from "./types";

export default function RegenerateSection() {
  const { t } = useTranslation();
  const [state, setState] = useState<RegenState>({ phase: "idle" });
  const challenge = useMfaChallenge();
  const verifyMfa = useVerifyMfa();
  const regenerate = useRegenerateRecoveryCodes();

  function startRegenerate() {
    challenge.mutate(undefined, {
      onSuccess: (response) => {
        setState({
          phase: "challenge",
          challengeId: response.challenge_id,
          code: "",
        });
      },
      onError: () => {
        toast.error(t("settings_security.toasts.challenge_failed"));
      },
    });
  }

  function handleConfirm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.phase !== "challenge") return;

    const trimmed = state.code.trim();
    if (!trimmed) return;

    verifyMfa.mutate(
      { challenge_id: state.challengeId, code: trimmed },
      {
        onSuccess: () => {
          regenerate.mutate(undefined, {
            onSuccess: (response) => {
              toast.success(t("settings_security.toasts.regen_success"));
              setState({
                phase: "showCodes",
                codes: response.recovery_codes,
              });
            },
            onError: () => {
              toast.error(t("settings_security.toasts.regen_failed"));
              setState({ phase: "idle" });
            },
          });
        },
        onError: () => {
          toast.error(t("settings_security.toasts.totp_invalid"));
          setState((prev) =>
            prev.phase === "challenge" ? { ...prev, code: "" } : prev,
          );
        },
      },
    );
  }

  if (state.phase === "showCodes") {
    return (
      <RecoveryCodesPanel
        title={t("settings_security.panel_new_recovery_title")}
        codes={state.codes}
        onAcknowledge={() => setState({ phase: "idle" })}
      />
    );
  }

  if (state.phase === "challenge") {
    return (
      <RegenConfirmForm
        form={{
          state,
          setState,
          isPending: verifyMfa.isPending || regenerate.isPending,
          onSubmit: handleConfirm,
        }}
      />
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={startRegenerate}
      disabled={challenge.isPending}
      className="gap-2"
    >
      {challenge.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <RefreshCw className="h-4 w-4" />
      )}
      {t("settings_security.regenerate")}
    </Button>
  );
}
