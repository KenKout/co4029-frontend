import { FastForward, Loader2, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";

import type { SetupActionHandler, SetupStage } from "./setup-stages";

/* Preparation + readiness each offer a primary "advance" action and a
   secondary "hold" action, so when the interviewer asks whether the
   candidate needs a moment, both answers are available (not just Start). */
export function ReadinessActions({
  stage,
  disabled,
  pending,
  onAction,
}: {
  stage: SetupStage;
  disabled: boolean;
  pending: boolean;
  onAction: SetupActionHandler;
}) {
  const { t } = useTranslation();
  const isReady = stage === "readiness";
  if (stage !== "preparation" && !isReady) return null;
  return (
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
  );
}

/* Skip fast-forwards the remaining setup checks straight to the readiness
   briefing. Shown only before readiness; it never starts the assessed
   timer (the candidate still confirms "ready" on the briefing). */
export function SkipSetupAction({
  stage,
  disabled,
  onAction,
}: {
  stage: SetupStage;
  disabled: boolean;
  onAction: SetupActionHandler;
}) {
  const { t } = useTranslation();
  if (stage === "readiness" || stage === "preparation") return null;
  return (
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
  );
}
