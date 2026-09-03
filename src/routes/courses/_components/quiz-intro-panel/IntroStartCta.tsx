import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { ArrowRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { QuizAttemptRead, QuizPublic } from "@/lib/api/types";
import type { IntroState } from "./helpers";

function blockedMessage(t: TFunction, quiz: QuizPublic, intro: IntroState) {
  if (intro.notYetOpen) {
    return t("course_quiz.messages.not_yet_open", {
      when: intro.openAt?.toLocaleString() ?? "",
    });
  }
  if (intro.windowClosed) {
    return t("course_quiz.messages.window_closed", {
      when: intro.closeAt?.toLocaleString() ?? "",
    });
  }
  if (intro.noRetakesLeft) return t("course_quiz.messages.no_retakes");
  if (intro.maxAttemptsReached) {
    return t("course_quiz.messages.max_attempts_reached", {
      count: quiz.max_attempts ?? 0,
    });
  }
  return t("course_quiz.messages.cooldown_active_until", {
    when: intro.retryAvailableAt?.toLocaleString() ?? "",
  });
}

/** Why the start button is unavailable — window, retakes or attempt ceiling. */
function IntroBlockedNotice({
  quiz,
  intro,
}: {
  quiz: QuizPublic;
  intro: IntroState;
}) {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl bg-m3-surface-container-low px-4 py-3 text-sm text-m3-on-surface-variant">
      {blockedMessage(t, quiz, intro)}
    </div>
  );
}

/** Resume notice + button for an attempt that is still in progress. */
function IntroResumeCta({
  inProgressAttempt,
  onResume,
  starting,
  resuming,
}: {
  inProgressAttempt: QuizAttemptRead;
  onResume: () => void;
  starting: boolean;
  resuming: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-m3-primary-fixed/30 border border-m3-primary/20 px-4 py-3 text-sm text-m3-on-surface flex items-center justify-center gap-2">
        <RotateCcw className="h-4 w-4 text-m3-primary shrink-0" />
        <span>
          {t("course_quiz.resume.pending_notice", {
            number: inProgressAttempt.attempt_number,
          })}
        </span>
      </div>
      <div className="flex items-center gap-3 justify-center flex-wrap">
        <Button
          onClick={onResume}
          disabled={resuming || starting}
          className="gradient-primary text-white rounded-xl font-bold gap-2 px-8 py-3 h-auto"
        >
          {resuming
            ? t("course_quiz.resume.resuming")
            : t("course_quiz.resume.resume")}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/**
 * The primary call to action: resume an open attempt, explain why the quiz is
 * blocked, or start a fresh attempt — in that priority order.
 */
export function IntroStartCta({
  quiz,
  intro,
  inProgressAttempt,
  onStart,
  onResume,
  starting,
  resuming,
}: {
  quiz: QuizPublic;
  intro: IntroState;
  inProgressAttempt: QuizAttemptRead | null;
  onStart: () => void;
  onResume: () => void;
  starting: boolean;
  resuming: boolean;
}) {
  const { t } = useTranslation();

  if (inProgressAttempt) {
    return (
      <IntroResumeCta
        inProgressAttempt={inProgressAttempt}
        onResume={onResume}
        starting={starting}
        resuming={resuming}
      />
    );
  }

  if (intro.blocked) {
    return <IntroBlockedNotice quiz={quiz} intro={intro} />;
  }

  return (
    <Button
      onClick={onStart}
      disabled={starting}
      className="gradient-primary text-white rounded-xl font-bold gap-2 px-8 py-3 h-auto"
    >
      {starting
        ? t("course_quiz.actions.starting")
        : t("course_quiz.actions.start")}
      <ArrowRight className="h-4 w-4" />
    </Button>
  );
}
