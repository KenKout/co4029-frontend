import type { Dispatch, FormEvent, SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, ShieldOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DisableState } from "./types";

interface DisableConfirmFormProps {
  state: Extract<DisableState, { phase: "confirm" }>;
  setState: Dispatch<SetStateAction<DisableState>>;
  isPending: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

function DisableModeTabs({
  state,
  setState,
}: {
  state: Extract<DisableState, { phase: "confirm" }>;
  setState: Dispatch<SetStateAction<DisableState>>;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex gap-2 text-xs font-semibold">
      <Button variant="ghost"
        type="button"
        onClick={() => setState({ phase: "confirm", mode: "totp", code: "" })}
        className={`h-auto whitespace-normal rounded-full px-3 py-1 ring-1 ring-inset transition ${
          state.mode === "totp"
            ? "bg-m3-primary text-white ring-m3-primary"
            : "bg-white text-m3-on-surface ring-m3-outline-variant/40 hover:bg-muted"
        }`}
      >
        {t("settings_security.disable_mode_totp")}
      </Button>
      <Button variant="ghost"
        type="button"
        onClick={() =>
          setState({ phase: "confirm", mode: "recovery", code: "" })
        }
        className={`h-auto whitespace-normal rounded-full px-3 py-1 ring-1 ring-inset transition ${
          state.mode === "recovery"
            ? "bg-m3-primary text-white ring-m3-primary"
            : "bg-white text-m3-on-surface ring-m3-outline-variant/40 hover:bg-muted"
        }`}
      >
        {t("settings_security.disable_mode_recovery")}
      </Button>
    </div>
  );
}

export default function DisableConfirmForm({
  form,
}: {
  form: DisableConfirmFormProps;
}) {
  const { t } = useTranslation();
  const { state, setState, isPending, onSubmit } = form;
  const isRecovery = state.mode === "recovery";

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 rounded-xl border border-rose-200/60 bg-rose-50/40 p-5"
    >
      <div>
        <h4 className="font-headline text-base font-bold text-m3-on-surface">
          {t("settings_security.disable_panel_title")}
        </h4>
        <p className="mt-1 text-sm font-medium text-m3-on-surface-variant">
          {t("settings_security.disable_panel_intro")}
        </p>
      </div>

      <DisableModeTabs state={state} setState={setState} />

      <div className="space-y-2">
        <label
          htmlFor="disable-code"
          className="text-sm font-semibold text-m3-on-surface"
        >
          {isRecovery
            ? t("settings_security.recovery_code_label")
            : t("settings_security.six_digit_code")}
        </label>
        <Input
          id="disable-code"
          inputMode={isRecovery ? "text" : "numeric"}
          autoComplete="one-time-code"
          autoFocus
          value={state.code}
          onChange={(event) =>
            setState((prev) =>
              prev.phase === "confirm"
                ? { ...prev, code: event.target.value }
                : prev,
            )
          }
          maxLength={isRecovery ? 32 : 6}
          placeholder={isRecovery ? "abcd1234-ef567890" : "123456"}
          className={
            isRecovery
              ? "h-12 font-mono text-sm"
              : "h-12 text-center text-lg tracking-[0.4em]"
          }
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
          className="gap-2 bg-rose-600 text-white hover:bg-rose-700"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ShieldOff className="h-4 w-4" />
          )}
          {t("settings_security.confirm_disable")}
        </Button>
      </div>
    </form>
  );
}
