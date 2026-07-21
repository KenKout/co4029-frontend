import { Check, Loader2, Mic, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Backend-driven onboarding stages (unchanged). The checklist is a purely
 * presentational reframe of these — it drives the SAME `onAction` contract the
 * conversational flow used, so no API/business-logic changes are required.
 */
export type SetupStage =
  | "identity_check"
  | "audio_check"
  | "language_check"
  | "preparation"
  | "readiness";

export type SetupLanguage = "en" | "vi";

export type SetupAction =
  | "confirm_identity"
  | "audio_clear"
  | "needs_adjustment"
  | "confirm_language"
  | "continue_setup"
  | "ready"
  | "not_ready";

type ChecklistItemState = "done" | "active" | "upcoming";

const STAGE_ORDER: readonly SetupStage[] = [
  "identity_check",
  "audio_check",
  "language_check",
  "preparation",
  "readiness",
];

/** Which checklist rows are considered satisfied once we reach a given stage. */
function itemState(rowStage: SetupStage, current: SetupStage): ChecklistItemState {
  const rowIndex = STAGE_ORDER.indexOf(rowStage);
  const currentIndex = STAGE_ORDER.indexOf(current);
  if (rowIndex < currentIndex) return "done";
  if (rowIndex === currentIndex) return "active";
  return "upcoming";
}

function ChecklistRow({
  state,
  icon,
  label,
  value,
  children,
}: {
  state: ChecklistItemState;
  icon: React.ReactNode;
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <li
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3 transition-colors",
        state === "done" && "border-success/30 bg-success/5",
        state === "active" && "border-primary/40 bg-primary-soft/40 shadow-editorial",
        state === "upcoming" && "border-border bg-surface-muted/40 opacity-70",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full border",
          state === "done" && "border-success bg-success text-white",
          state === "active" && "border-primary/30 bg-white text-primary",
          state === "upcoming" && "border-border-strong bg-white text-text-subtle",
        )}
      >
        {state === "done" ? <Check className="h-4 w-4" /> : icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <p className="text-sm font-semibold text-text-strong">{label}</p>
          {value && <p className="truncate text-sm text-text-muted">{value}</p>}
        </div>
        {children && <div className="mt-2.5">{children}</div>}
      </div>
    </li>
  );
}

/**
 * Compact readiness checklist for interview setup (spec §3).
 *
 * Replaces the multi-message conversational onboarding with a single scannable
 * card: identity, microphone, audio test, language, and a Start action. Each
 * step resolves through quick-action buttons (no free typing required) and maps
 * onto the existing onboarding stage machine via `onAction`.
 */
export function SetupChecklist({
  stage,
  candidateName,
  language,
  micConnected = true,
  disabled = false,
  pending = false,
  onLanguageChange,
  onAction,
}: {
  stage: SetupStage;
  candidateName: string;
  language: SetupLanguage;
  /** Whether a capture device is available (drives the mic row copy). */
  micConnected?: boolean;
  disabled?: boolean;
  /** True while an onboarding request is in flight (drives the spinner). */
  pending?: boolean;
  onLanguageChange: (language: SetupLanguage) => void;
  onAction: (action: SetupAction, language?: SetupLanguage) => void;
}) {
  const { t } = useTranslation();

  const identityState = itemState("identity_check", stage);
  const audioState = itemState("audio_check", stage);
  const languageState = itemState("language_check", stage);
  const isReady = stage === "readiness";

  return (
    <section
      aria-labelledby="setup-checklist-title"
      className="mx-auto w-full max-w-[520px] rounded-2xl border border-border bg-white px-5 py-6 shadow-editorial motion-safe:animate-fade-in-up sm:px-7 sm:py-7"
    >
      <div className="mb-5 text-center">
        <span className="mb-3 inline-flex size-12 items-center justify-center rounded-full border border-primary/15 bg-primary-soft text-primary">
          <ShieldCheck className="h-6 w-6" aria-hidden="true" />
        </span>
        <h2
          id="setup-checklist-title"
          className="text-xl font-semibold tracking-[-0.01em] text-text-strong"
        >
          {t("course_interview.setup.title")}
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          {t("course_interview.setup.subtitle")}
        </p>
      </div>

      <ol className="flex flex-col gap-2.5">
        <ChecklistRow
          state={identityState}
          icon={<UserRound className="h-4 w-4" />}
          label={t("course_interview.setup.identity")}
          value={candidateName}
        >
          {identityState === "active" && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="lg"
                disabled={disabled}
                onClick={() => onAction("confirm_identity")}
                className="min-h-11 rounded-lg"
              >
                <Check className="h-4 w-4" />
                {t("course_interview.onboarding.confirm_identity")}
              </Button>
              <Link
                to="/profile"
                className="text-xs font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              >
                {t("course_interview.onboarding.wrong_name")}
              </Link>
            </div>
          )}
        </ChecklistRow>

        <ChecklistRow
          state={audioState}
          icon={<Mic className="h-4 w-4" />}
          label={t("course_interview.setup.microphone")}
          value={
            micConnected
              ? t("course_interview.setup.mic_connected")
              : t("course_interview.setup.mic_unavailable")
          }
        >
          {audioState === "active" && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="lg"
                disabled={disabled}
                onClick={() => onAction("audio_clear")}
                className="min-h-11 rounded-lg"
              >
                <Check className="h-4 w-4" />
                {t("course_interview.onboarding.audio_clear")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                disabled={disabled}
                onClick={() => onAction("needs_adjustment")}
                className="min-h-11 rounded-lg"
              >
                {t("course_interview.onboarding.need_moment")}
              </Button>
            </div>
          )}
        </ChecklistRow>

        <ChecklistRow
          state={languageState}
          icon={<Sparkles className="h-4 w-4" />}
          label={t("course_interview.setup.language")}
          value={
            languageState === "done"
              ? t(`course_interview.onboarding.languages.${language}`)
              : undefined
          }
        >
          {languageState === "active" && (
            <div
              className="flex flex-wrap items-center gap-2"
              role="group"
              aria-label={t("course_interview.onboarding.language_label")}
            >
              {(["en", "vi"] as const).map((item) => (
                <Button
                  key={item}
                  type="button"
                  variant={language === item ? "default" : "outline"}
                  size="lg"
                  disabled={disabled}
                  aria-pressed={language === item}
                  onClick={() => {
                    onLanguageChange(item);
                    onAction("confirm_language", item);
                  }}
                  className="min-h-11 rounded-lg px-4"
                >
                  {t(`course_interview.onboarding.languages.${item}`)}
                </Button>
              ))}
            </div>
          )}
        </ChecklistRow>
      </ol>

      {/* Preparation + readiness collapse into a single primary Start action so
          the candidate isn't gated behind extra AI messages. */}
      {(stage === "preparation" || isReady) && (
        <div className="mt-5 border-t border-border pt-5">
          <Button
            type="button"
            size="lg"
            disabled={disabled}
            onClick={() => onAction(isReady ? "ready" : "continue_setup")}
            className="min-h-12 w-full rounded-xl text-sm font-semibold"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {t("course_interview.onboarding.ready")}
          </Button>
          <p className="mt-2 text-center text-xs text-text-muted">
            {t("course_interview.onboarding.timer_waiting")}
          </p>
        </div>
      )}
    </section>
  );
}
