import type { Dispatch, FormEvent, SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RegenState } from "./types";

interface RegenConfirmFormProps {
  state: Extract<RegenState, { phase: "challenge" }>;
  setState: Dispatch<SetStateAction<RegenState>>;
  isPending: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export default function RegenConfirmForm({
  form,
}: {
  form: RegenConfirmFormProps;
}) {
  const { t } = useTranslation();
  const { state, setState, isPending, onSubmit } = form;

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 rounded-xl border border-m3-outline-variant/30 bg-white/70 p-5"
    >
      <div>
        <h4 className="font-headline text-base font-bold text-m3-on-surface">
          {t("settings_security.regen_panel_title")}
        </h4>
        <p className="mt-1 text-sm font-medium text-m3-on-surface-variant">
          {t("settings_security.regen_panel_intro")}
        </p>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="regen-code"
          className="text-sm font-semibold text-m3-on-surface"
        >
          {t("settings_security.six_digit_code")}
        </label>
        <Input
          id="regen-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          value={state.code}
          onChange={(event) =>
            setState((prev) =>
              prev.phase === "challenge"
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
            <RefreshCw className="h-4 w-4" />
          )}
          {t("settings_security.confirm_and_regen")}
        </Button>
      </div>
    </form>
  );
}
