import { useTranslation } from "react-i18next";
import type { MfaController } from "./types";

/** Authenticator-app vs recovery-code switch. Switching clears the input. */
export default function MfaModeTabs({
  controller,
}: {
  controller: MfaController;
}) {
  const { t } = useTranslation();
  const { mode, setMode, setCode } = controller;

  return (
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
  );
}
