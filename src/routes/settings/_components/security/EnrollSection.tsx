import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useEnrollTotp, useVerifyTotp } from "@/lib/api/hooks/auth";
import RecoveryCodesPanel from "./RecoveryCodesPanel";
import TotpVerifyForm from "./TotpVerifyForm";
import { useCopyToClipboard } from "./use-copy-to-clipboard";
import type { EnrollState } from "./types";

export default function EnrollSection({
  onEnrolled,
}: {
  onEnrolled: () => void;
}) {
  const { t } = useTranslation();
  const copy = useCopyToClipboard();
  const [state, setState] = useState<EnrollState>({ phase: "idle" });
  const enroll = useEnrollTotp();
  const verify = useVerifyTotp();

  function startEnroll() {
    enroll.mutate(undefined, {
      onSuccess: (response) => {
        setState({
          phase: "verifying",
          factorId: response.factor_id,
          secret: response.secret,
          otpauthUrl: response.otpauth_url,
          code: "",
        });
      },
      onError: () => {
        toast.error(t("settings_security.toasts.start_failed"));
      },
    });
  }

  function handleVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.phase !== "verifying") return;

    const trimmed = state.code.trim();
    if (!trimmed) return;

    verify.mutate(
      { factor_id: state.factorId, code: trimmed },
      {
        onSuccess: (response) => {
          toast.success(t("settings_security.toasts.totp_enabled"));
          onEnrolled();
          setState({
            phase: "showRecoveryCodes",
            codes: response.recovery_codes,
          });
        },
        onError: () => {
          toast.error(t("settings_security.toasts.totp_invalid"));
          setState((prev) =>
            prev.phase === "verifying" ? { ...prev, code: "" } : prev,
          );
        },
      },
    );
  }

  if (state.phase === "showRecoveryCodes") {
    return (
      <RecoveryCodesPanel
        title={t("settings_security.panel_recovery_title")}
        codes={state.codes}
        onAcknowledge={() => setState({ phase: "idle" })}
      />
    );
  }

  if (state.phase === "verifying") {
    return (
      <TotpVerifyForm
        form={{
          state,
          setState,
          isPending: verify.isPending,
          onSubmit: handleVerify,
          copy,
        }}
      />
    );
  }

  return (
    <Button
      type="button"
      onClick={startEnroll}
      disabled={enroll.isPending}
      className="gap-2"
    >
      {enroll.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <ShieldCheck className="h-4 w-4" />
      )}
      {t("settings_security.enable_totp")}
    </Button>
  );
}
