import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ShieldOff } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useDisableMfa } from "@/lib/api/hooks/auth";
import DisableConfirmForm from "./DisableConfirmForm";
import type { DisableState } from "./types";

export default function DisableSection({
  onDisabled,
}: {
  onDisabled: () => void;
}) {
  const { t } = useTranslation();
  const [state, setState] = useState<DisableState>({ phase: "idle" });
  const disable = useDisableMfa();

  function handleConfirm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.phase !== "confirm") return;

    const trimmed = state.code.trim();
    if (!trimmed) return;

    const payload =
      state.mode === "totp" ? { code: trimmed } : { recovery_code: trimmed };

    disable.mutate(payload, {
      onSuccess: () => {
        toast.success(t("settings_security.toasts.totp_disabled"));
        onDisabled();
        setState({ phase: "idle" });
      },
      onError: () => {
        toast.error(t("settings_security.toasts.totp_invalid"));
        setState((prev) =>
          prev.phase === "confirm" ? { ...prev, code: "" } : prev,
        );
      },
    });
  }

  if (state.phase === "confirm") {
    return (
      <DisableConfirmForm
        form={{
          state,
          setState,
          isPending: disable.isPending,
          onSubmit: handleConfirm,
        }}
      />
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => setState({ phase: "confirm", mode: "totp", code: "" })}
      className="gap-2 border-rose-200 text-rose-700 hover:bg-rose-50"
    >
      <ShieldOff className="h-4 w-4" />
      {t("settings_security.disable_totp")}
    </Button>
  );
}
