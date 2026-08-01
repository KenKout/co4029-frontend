import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Clock, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuizConfigPopover } from "@/routes/_components/QuizConfigPopover";
import { QuizIntegrityNotice } from "@/routes/_components/QuizIntegrityNotice";
import { cn } from "@/lib/utils";
import { formatDuration, formatTime } from "@/lib/quiz/quiz-session-helpers";
import type { QuizStageProps } from "./types";

/** Started-at: when the current attempt began (wall clock). */
function StartedAtChip({ quizStartedAt }: { quizStartedAt: number }) {
  const { t } = useTranslation();
  return (
    <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-m3-surface-container text-m3-on-surface-variant text-sm">
      <Clock className="h-4 w-4 text-m3-primary" />
      <span className="font-medium">{t("course_quiz.labels.started_at")}</span>
      <span className="font-semibold tabular-nums text-m3-on-surface">
        {new Date(quizStartedAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
    </div>
  );
}

/** Countdown: only when the quiz has a time limit. */
function CountdownChip({
  session,
  quiz,
}: Pick<QuizStageProps, "session" | "quiz">) {
  const { t } = useTranslation();
  const { timeLeft, sessionReady } = session;
  const isTimeLow = Boolean(quiz.time_limit_seconds) && timeLeft < 120;

  return quiz.time_limit_seconds ? (
    <div
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold text-sm",
        isTimeLow
          ? "bg-red-50 text-red-600 animate-pulse"
          : "bg-m3-primary-fixed/40 text-m3-primary",
      )}
    >
      <Timer className="h-4 w-4" />
      {formatTime(sessionReady ? timeLeft : quiz.time_limit_seconds)}
    </div>
  ) : (
    <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-m3-surface-container text-m3-on-surface-variant text-sm font-medium">
      <Clock className="h-4 w-4" />
      {t("course_quiz.labels.no_time_limit")}
    </div>
  );
}

/**
 * The sticky take-mode bar: back link, course title, quiz config, integrity
 * notice, started-at, elapsed and the countdown.
 *
 * `sticky top-16 z-10` is the per-page sticky layer (see AGENTS.md) — it must
 * stay below ContentTopBar's z-20.
 */
export function QuizTakingTopBar({
  session,
  quiz,
  slug,
  courseTitle,
}: QuizStageProps & { courseTitle: string }) {
  const { t } = useTranslation();
  const { taking, activeAttemptId, quizStartedAt, quizElapsed } = session;

  return (
    <div className="sticky top-16 z-10 bg-m3-surface/95 backdrop-blur-md border-b border-m3-outline-variant/30 py-4 mb-6 px-4 sm:px-6 lg:px-10 -mx-4 sm:-mx-6 lg:-mx-10 -mt-6 shadow-sm">
      <div className="w-full flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3 flex-wrap -ml-3">
          <Link to="/courses/$slug/learn" params={{ slug }}>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl text-m3-on-surface-variant hover:text-m3-primary gap-1.5 text-xs font-bold px-3"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("course_interview.actions.course")}
            </Button>
          </Link>
          <span className="text-m3-on-surface-variant text-sm font-medium hidden sm:block">
            {courseTitle}
          </span>
        </div>

        <div className="flex items-center gap-3 flex-wrap justify-end">
          <QuizConfigPopover
            allowRetakes={quiz.allow_retakes}
            maxAttempts={quiz.max_attempts}
            showHints={quiz.show_hints}
            cooldownHours={quiz.cooldown_hours}
          />
          {taking && activeAttemptId && <QuizIntegrityNotice />}
          {quizStartedAt != null && (
            <StartedAtChip quizStartedAt={quizStartedAt} />
          )}
          {/* Elapsed: always visible, timed or not. */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-m3-surface-container text-m3-on-surface-variant font-mono font-bold text-sm">
            <Timer className="h-4 w-4 text-m3-secondary" />
            <span className="tabular-nums text-m3-on-surface">
              {formatDuration(quizElapsed)}
            </span>
          </div>
          <CountdownChip session={session} quiz={quiz} />
        </div>
      </div>
    </div>
  );
}
