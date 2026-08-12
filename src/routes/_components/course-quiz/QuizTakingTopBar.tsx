import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Clock, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GradientProgress } from "@/components/ui/gradient-progress";
import { QuizConfigPopover } from "@/routes/_components/QuizConfigPopover";
import { QuizIntegrityNotice } from "@/routes/_components/QuizIntegrityNotice";
import { cn } from "@/lib/utils";
import { formatDuration, formatTime } from "@/lib/quiz/quiz-session-helpers";
import type { QuizStageProps } from "./types";

/**
 * The compact sticky take bar (mobile-first): back + quiz name + the
 * config/integrity icons on row one, the Q counter + countdown on row two,
 * and the answered-progress bar on row three. Everything that used to live
 * in the page header (title, counter, progress, prior attempts) moved here.
 */
export function QuizTakingTopBar({
  session,
  quiz,
  slug,
  progressPct,
}: QuizStageProps & { progressPct: number }) {
  const { t } = useTranslation();
  const {
    taking,
    activeAttemptId,
    activeIdx,
    displayQuestions,
    attempts,
    pageSize,
    changePageSize,
    quizElapsed,
  } = session;

  const isTimed = Boolean(quiz.time_limit_seconds);
  const timeLeft = session.timeLeft;
  const sessionReady = session.sessionReady;
  const isTimeLow = isTimed && timeLeft < 120;

  return (
    <div className="sticky top-16 z-10 bg-white/95 backdrop-blur-md border-b border-m3-outline-variant/30 py-2 px-3 sm:px-6 mb-6 -mx-4 sm:-mx-6 lg:-mx-10 -mt-6 shadow-sm">
      {/* Row 1: back · quiz name · config + monitor icons */}
      <div className="flex items-center gap-2">
        <Link to="/courses/$slug/learn" params={{ slug }}>
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-xl text-m3-on-surface-variant hover:text-m3-primary shrink-0"
            aria-label={t("course_quiz.labels.back_to_course")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <span className="flex-1 min-w-0 truncate font-headline font-bold text-sm sm:text-base text-m3-on-surface">
          {quiz.title}
        </span>
        <QuizConfigPopover
          allowRetakes={quiz.allow_retakes}
          maxAttempts={quiz.max_attempts}
          showHints={quiz.show_hints}
          cooldownHours={quiz.cooldown_hours}
          attemptsBefore={attempts.length}
          pageSize={pageSize}
          onPageSizeChange={changePageSize}
        />
        {taking && activeAttemptId && <QuizIntegrityNotice />}
      </div>

      {/* Row 2: Q counter · countdown / elapsed */}
      <div className="flex items-center gap-2 mt-1.5">
        <span className="font-headline font-bold text-sm text-m3-secondary tabular-nums">
          {String(activeIdx + 1).padStart(2, "0")}
          <span className="text-m3-outline-variant font-medium text-xs">
            {" "}
            / {displayQuestions.length}
          </span>
        </span>
        <span className="flex-1" />
        {isTimed ? (
          <span
            className={cn(
              "flex items-center gap-1.5 font-mono font-bold text-sm tabular-nums",
              isTimeLow ? "text-red-600" : "text-m3-primary",
            )}
          >
            <Timer
              className={cn("h-3.5 w-3.5", isTimeLow && "animate-pulse")}
            />
            {formatTime(
              sessionReady ? (timeLeft ?? 0) : (quiz.time_limit_seconds ?? 0),
            )}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 font-mono font-bold text-sm tabular-nums text-m3-on-surface-variant">
            <Clock className="h-3.5 w-3.5" />
            {formatDuration(quizElapsed)}
          </span>
        )}
      </div>

      {/* Row 3: answered progress */}
      <div className="mt-2">
        <GradientProgress value={progressPct} variant="secondary" size="sm" />
      </div>
    </div>
  );
}

export default QuizTakingTopBar;
