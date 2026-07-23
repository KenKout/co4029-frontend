import {
  Check,
  FastForward,
  Loader2,
  Mic,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  | "reject_identity"
  | "set_name"
  | "audio_clear"
  | "needs_adjustment"
  | "confirm_language"
  | "continue_setup"
  | "ready"
  | "not_ready"
  | "skip_setup";

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
  onAction: (
    action: SetupAction,
    payload?: { language?: SetupLanguage; name?: string },
  ) => void;
}) {
  const { t } = useTranslation();
  // When the candidate says the profile name isn't theirs, the identity row
  // switches to a name-entry field ("What should I call you?") before the
  // set_name action is dispatched.
  const [enteringName, setEnteringName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  const identityState = itemState("identity_check", stage);
  const audioState = itemState("audio_check", stage);
  const languageState = itemState("language_check", stage);
  const isReady = stage === "readiness";

  return (
    <section
      aria-labelledby="setup-checklist-title"
      className="mx-auto mt-6 w-full max-w-[520px] rounded-2xl border border-border bg-white px-5 py-6 shadow-editorial motion-safe:animate-fade-in-up sm:mt-8 sm:px-7 sm:py-7"
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
          {identityState === "active" && !enteringName && (
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
              <Button
                type="button"
                variant="outline"
                size="lg"
                disabled={disabled}
                onClick={() => {
                  setEnteringName(true);
                  onAction("reject_identity");
                }}
                className="min-h-11 rounded-lg"
              >
                {t("course_interview.onboarding.wrong_name")}
              </Button>
            </div>
          )}
          {identityState === "active" && enteringName && (
            <form
              className="flex flex-col gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                const name = nameDraft.trim();
                if (!name) return;
                onAction("set_name", { name });
                setEnteringName(false);
                setNameDraft("");
              }}
            >
              <label
                htmlFor="setup-preferred-name"
                className="text-xs font-medium text-text-muted"
              >
                {t("course_interview.onboarding.ask_name")}
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  id="setup-preferred-name"
                  value={nameDraft}
                  onChange={(event) => setNameDraft(event.target.value)}
                  maxLength={60}
                  autoFocus
                  autoComplete="off"
                  placeholder={t("course_interview.onboarding.name_placeholder")}
                  className="h-11 max-w-[220px] flex-1"
                  aria-label={t("course_interview.onboarding.ask_name")}
                />
                <Button
                  type="submit"
                  size="lg"
                  disabled={disabled || nameDraft.trim().length === 0}
                  className="min-h-11 rounded-lg"
                >
                  <Check className="h-4 w-4" />
                  {t("course_interview.onboarding.save_name")}
                </Button>
              </div>
            </form>
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
                    onAction("confirm_language", { language: item });
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

      {/* Preparation + readiness each offer a primary "advance" action and a
          secondary "hold" action, so when the interviewer asks whether the
          candidate needs a moment, both answers are available (not just Start). */}
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
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={disabled}
            onClick={() => onAction(isReady ? "not_ready" : "needs_adjustment")}
            className="mt-2 min-h-11 w-full rounded-xl text-sm font-semibold"
          >
            {t(
              isReady
                ? "course_interview.onboarding.not_ready"
                : "course_interview.onboarding.need_moment",
            )}
          </Button>
          <p className="mt-2 text-center text-xs text-text-muted">
            {t("course_interview.onboarding.timer_waiting")}
          </p>
        </div>
      )}

      {/* Skip fast-forwards the remaining setup checks straight to the readiness
          briefing. Shown only before readiness; it never starts the assessed
          timer (the candidate still confirms "ready" on the briefing). */}
      {!isReady && stage !== "preparation" && (
        <div className="mt-4 border-t border-border pt-4 text-center">
          <Button
            type="button"
            variant="ghost"
            size="lg"
            disabled={disabled}
            onClick={() => onAction("skip_setup")}
            className="min-h-11 rounded-xl text-sm font-medium text-text-muted"
          >
            <FastForward className="h-4 w-4" />
            {t("course_interview.onboarding.skip_setup")}
          </Button>
        </div>
      )}
    </section>
  );
}
