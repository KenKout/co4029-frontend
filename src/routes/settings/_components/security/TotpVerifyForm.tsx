import type { Dispatch, FormEvent, SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import TotpQrPanel from "./TotpQrPanel";
import type { EnrollState } from "./types";

interface TotpVerifyFormProps {
  state: Extract<EnrollState, { phase: "verifying" }>;
  setState: Dispatch<SetStateAction<EnrollState>>;
  isPending: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  copy: (value: string, label: string) => void;
}

export default function TotpVerifyForm({
  form,
}: {
  form: TotpVerifyFormProps;
}) {
  const { t } = useTranslation();
  const { state, setState, isPending, onSubmit, copy } = form;

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 rounded-xl border border-m3-outline-variant/30 bg-white/70 p-5"
    >
      <div>
        <h4 className="font-headline text-base font-bold text-m3-on-surface">
          {t("settings_security.scan_qr_title")}
        </h4>
        <p className="mt-1 text-sm font-medium text-m3-on-surface-variant">
          {t("settings_security.scan_qr_subtitle")}
        </p>
      </div>

      <TotpQrPanel
        otpauthUrl={state.otpauthUrl}
        secret={state.secret}
        copy={copy}
      />

      <div className="space-y-2">
        <label
          htmlFor="totp-verify-code"
          className="text-sm font-semibold text-m3-on-surface"
        >
          {t("settings_security.six_digit_code")}
        </label>
        <Input
          id="totp-verify-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          value={state.code}
          onChange={(event) =>
            setState((prev) =>
              prev.phase === "verifying"
                ? { ...prev, code: event.target.value }
                : prev,
            )
          }
          maxLength={6}
          placeholder="123456"
          className="h-12 text-center text-lg tracking-[0.4em]"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setState({ phase: "idle" })}
          disabled={isPending}
        >
          {t("settings_security.cancel")}
        </Button>
        <Button
          type="submit"
          disabled={isPending || !state.code.trim()}
          className="gap-2"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ShieldCheck className="h-4 w-4" />
          )}
          {t("settings_security.confirm")}
        </Button>
      </div>
    </form>
  );
}
