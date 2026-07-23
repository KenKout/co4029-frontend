import { useState } from "react";
import {
  Loader2,
  ShieldCheck,
  KeyRound,
  Copy,
  RefreshCw,
  ShieldOff,
  ArrowLeft,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useNavigate, useRouter } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useDisableMfa,
  useEnrollTotp,
  useMfaChallenge,
  useMfaStatus,
  useRegenerateRecoveryCodes,
  useVerifyMfa,
  useVerifyTotp,
} from "@/lib/api/hooks/auth";
import { useAuth } from "@/components/auth/AuthProvider";

type EnrollState =
  | { phase: "idle" }
  | {
      phase: "verifying";
      factorId: string;
      secret: string;
      otpauthUrl: string;
      code: string;
    }
  | { phase: "showRecoveryCodes"; codes: string[] };

type RegenState =
  | { phase: "idle" }
  | { phase: "challenge"; challengeId: string; code: string }
  | { phase: "showCodes"; codes: string[] };

function useCopyToClipboard() {
  const { t } = useTranslation();
  return (value: string, label: string) => {
    void navigator.clipboard.writeText(value).then(
      () =>
        toast.success(t("settings_security.toasts.copied_label", { label })),
      () => toast.error(t("settings_security.toasts.copy_failed")),
    );
  };
}

function RecoveryCodesPanel({
  codes,
  onAcknowledge,
  title,
}: {
  codes: string[];
  onAcknowledge: () => void;
  title: string;
}) {
  const { t } = useTranslation();
  const copy = useCopyToClipboard();
  return (
    <div className="space-y-4 rounded-xl border border-m3-outline-variant/30 bg-m3-secondary-fixed/30 p-5">
      <div>
        <h4 className="font-headline text-base font-bold text-m3-on-surface">
          {title}
        </h4>
        <p className="mt-1 text-sm font-medium text-m3-on-surface-variant">
          {t("settings_security.save_codes")}
        </p>
      </div>

      <ul className="grid grid-cols-2 gap-2 rounded-lg bg-white/80 p-4 font-mono text-sm">
        {codes.map((code) => (
          <li key={code} className="text-m3-on-surface">
            {code}
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            copy(codes.join("\n"), t("settings_security.toasts.list_label"))
          }
          className="gap-2"
        >
          <Copy className="h-4 w-4" />
          {t("settings_security.copy_all")}
        </Button>
        <Button type="button" onClick={onAcknowledge} className="gap-2">
          <ShieldCheck className="h-4 w-4" />
          {t("settings_security.saved")}
        </Button>
      </div>
    </div>
  );
}

function EnrollSection({ onEnrolled }: { onEnrolled: () => void }) {
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
      <form
        onSubmit={handleVerify}
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

        <div className="flex flex-col items-center gap-3 rounded-xl border border-m3-outline-variant/30 bg-white p-4 sm:flex-row sm:items-start sm:gap-5">
          <div className="rounded-lg bg-white p-2 ring-1 ring-m3-outline-variant/20">
            <QRCodeSVG
              value={state.otpauthUrl}
              size={176}
              level="M"
              marginSize={2}
            />
          </div>
          <div className="space-y-2 text-center sm:text-left">
            <p className="text-xs font-semibold uppercase tracking-widest text-m3-secondary">
              {t("settings_security.manual_entry_label")}
            </p>
            <p className="break-all rounded-md bg-m3-surface-container-low px-2 py-1 font-mono text-sm text-m3-on-surface">
              {state.secret}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  copy(state.secret, t("settings_security.toasts.secret_label"))
                }
                className="gap-2"
              >
                <Copy className="h-3.5 w-3.5" />
                {t("settings_security.copy_secret")}
              </Button>
              <a
                href={state.otpauthUrl}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm font-medium text-m3-primary hover:bg-muted"
              >
                <KeyRound className="h-4 w-4" />
                {t("settings_security.open_in_app")}
              </a>
            </div>
          </div>
        </div>

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
            disabled={verify.isPending}
          >
            {t("settings_security.cancel")}
          </Button>
          <Button
            type="submit"
            disabled={verify.isPending || !state.code.trim()}
            className="gap-2"
          >
            {verify.isPending ? (
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

function RegenerateSection() {
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
      <form
        onSubmit={handleConfirm}
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
            disabled={verifyMfa.isPending || regenerate.isPending}
          >
            {t("settings_security.cancel")}
          </Button>
          <Button
            type="submit"
            disabled={
              verifyMfa.isPending || regenerate.isPending || !state.code.trim()
            }
            className="gap-2"
          >
            {verifyMfa.isPending || regenerate.isPending ? (
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

type DisableState =
  | { phase: "idle" }
  | { phase: "confirm"; mode: "totp" | "recovery"; code: string };

function DisableSection({ onDisabled }: { onDisabled: () => void }) {
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
    const isRecovery = state.mode === "recovery";
    return (
      <form
        onSubmit={handleConfirm}
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

        <div className="flex gap-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() =>
              setState({ phase: "confirm", mode: "totp", code: "" })
            }
            className={`rounded-full px-3 py-1 ring-1 ring-inset transition ${
              state.mode === "totp"
                ? "bg-m3-primary text-white ring-m3-primary"
                : "bg-white text-m3-on-surface ring-m3-outline-variant/40 hover:bg-muted"
            }`}
          >
            {t("settings_security.disable_mode_totp")}
          </button>
          <button
            type="button"
            onClick={() =>
              setState({ phase: "confirm", mode: "recovery", code: "" })
            }
            className={`rounded-full px-3 py-1 ring-1 ring-inset transition ${
              state.mode === "recovery"
                ? "bg-m3-primary text-white ring-m3-primary"
                : "bg-white text-m3-on-surface ring-m3-outline-variant/40 hover:bg-muted"
            }`}
          >
            {t("settings_security.disable_mode_recovery")}
          </button>
        </div>

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
            disabled={disable.isPending}
          >
            {t("settings_security.cancel")}
          </Button>
          <Button
            type="submit"
            disabled={disable.isPending || !state.code.trim()}
            className="gap-2 bg-rose-600 text-white hover:bg-rose-700"
          >
            {disable.isPending ? (
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

export default function SettingsSecurityPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const navigate = useNavigate();
  const { requiresMfa } = useAuth();
  const [hasEnrolledThisSession, setHasEnrolledThisSession] = useState(false);
  const status = useMfaStatus();

  const enrolled = status.data?.enrolled ?? false;
  const showRegenerate = enrolled || requiresMfa || hasEnrolledThisSession;

  // Settings sub-pages are typically reached from /settings; fall back there
  // if the user lands here directly (refresh / deep link) so the back button
  // never becomes a no-op.
  function goBack() {
    if (window.history.length > 1) {
      router.history.back();
    } else {
      void navigate({ to: "/settings" });
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8 p-6">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={goBack}
          aria-label={t("settings_hub.back")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium text-m3-on-surface-variant">
          {t("settings_hub.back")}
        </span>
      </div>
      <header>
        <h1 className="font-headline text-3xl font-extrabold tracking-tight text-m3-on-surface">
          {t("settings_security.title")}
        </h1>
        <p className="mt-2 text-sm font-medium text-m3-on-surface-variant">
          {t("settings_security.intro")}
        </p>
      </header>

      <section className="space-y-4 rounded-xl bg-white/70 p-6 shadow-[0_24px_80px_rgba(25,28,30,0.06)] ring-1 ring-m3-outline-variant/20">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-headline text-xl font-bold text-m3-on-surface">
              {t("settings_security.two_factor_title")}
            </h2>
            <p className="mt-1 text-sm font-medium text-m3-on-surface-variant">
              {t("settings_security.two_factor_intro")}
            </p>
          </div>
          {status.isLoading ? null : enrolled ? (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              {t("settings_security.enabled_badge")}
            </span>
          ) : null}
        </div>

        {status.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-m3-on-surface-variant">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("settings_security.loading_status")}
          </div>
        ) : enrolled ? (
          <div className="space-y-3">
            <p className="rounded-lg bg-emerald-50/60 px-3 py-2 text-sm text-emerald-900 ring-1 ring-emerald-100">
              {t("settings_security.already_enrolled")}
            </p>
            <DisableSection
              onDisabled={() => {
                setHasEnrolledThisSession(false);
                void status.refetch();
              }}
            />
          </div>
        ) : (
          <EnrollSection
            onEnrolled={() => {
              setHasEnrolledThisSession(true);
              void status.refetch();
            }}
          />
        )}
      </section>

      {showRegenerate && (
        <section className="space-y-4 rounded-xl bg-white/70 p-6 shadow-[0_24px_80px_rgba(25,28,30,0.06)] ring-1 ring-m3-outline-variant/20">
          <div>
            <h2 className="font-headline text-xl font-bold text-m3-on-surface">
              {t("settings_security.recovery_codes_title")}
            </h2>
            <p className="mt-1 text-sm font-medium text-m3-on-surface-variant">
              {t("settings_security.recovery_codes_intro")}
            </p>
          </div>
          <RegenerateSection />
        </section>
      )}
    </div>
  );
}
