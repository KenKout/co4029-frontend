import { useTranslation } from "react-i18next";
import { Loader2, ArrowRight, KeyRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MfaController } from "./types";

/** The code input plus verify button. Placeholder/length follow the mode. */
export default function MfaCodeForm({
  controller,
}: {
  controller: MfaController;
}) {
  const { t } = useTranslation();
  const { mode, code, setCode, challengeId, isVerifying, handleSubmit } =
    controller;

  return (
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
  );
}
