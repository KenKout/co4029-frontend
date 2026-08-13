import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Clock, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GradientProgress } from "@/components/ui/gradient-progress";
import { QuizConfigPopover } from "@/routes/_components/QuizConfigPopover";
import { QuizIntegrityNotice } from "@/routes/_components/QuizIntegrityNotice";
import { formatTime } from "@/lib/quiz/quiz-session-helpers";
import { QuizTimerChip } from "./QuizTimerChip";
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

/**
 * Mobile take bar (compact): back + quiz name + config/monitor icons on row
 * one, the Q counter + countdown on row two, answered-progress on row three.
 * The richer desktop bar (below) replaces it from lg up.
 */
function MobileTakeBar({
  session,
  quiz,
  slug,
  progressPct,
}: QuizStageProps & { progressPct: number }) {
  const { t } = useTranslation();
  const { taking, activeAttemptId, activeIdx, displayQuestions, attempts, pageSize, changePageSize, quizElapsed } =
    session;
  const isTimed = Boolean(quiz.time_limit_seconds);

  return (
    <div className="lg:hidden sticky top-16 z-10 bg-white/95 backdrop-blur-md border-b border-m3-outline-variant/30 py-2 px-3 sm:px-6 mb-6 -mx-4 sm:-mx-6 -mt-6 shadow-sm">
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
          timeLimitSeconds={quiz.time_limit_seconds}
        />
        {taking && activeAttemptId && <QuizIntegrityNotice />}
      </div>

      {/* Row 2: Q counter · countdown */}
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
          <QuizTimerChip session={session} timeLimitSeconds={quiz.time_limit_seconds} />
        ) : (
          <span className="flex items-center gap-1.5 font-mono font-bold text-sm tabular-nums text-m3-on-surface-variant">
            <Clock className="h-3.5 w-3.5" />
            {formatTime(quizElapsed)}
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

/**
 * Desktop take bar (original layout): back + course title, then config,
 * integrity notice, started-at, elapsed and the countdown — icons with
 * labels, not the compact mobile bar.
 */
function DesktopTakeBar({
  session,
  quiz,
  slug,
  courseTitle,
}: QuizStageProps & { courseTitle: string }) {
  const { t } = useTranslation();
  const { taking, activeAttemptId, quizStartedAt, quizElapsed } = session;

  return (
    <div className="hidden lg:block sticky top-16 z-10 bg-m3-surface/95 backdrop-blur-md border-b border-m3-outline-variant/30 py-4 mb-6 px-4 sm:px-6 lg:px-10 -mx-4 sm:-mx-6 lg:-mx-10 -mt-6 shadow-sm">
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
            attemptsBefore={session.attempts.length}
            pageSize={session.pageSize}
            onPageSizeChange={session.changePageSize}
            timeLimitSeconds={quiz.time_limit_seconds}
          />
          {taking && activeAttemptId && <QuizIntegrityNotice />}
          {quizStartedAt != null && (
            <StartedAtChip quizStartedAt={quizStartedAt} />
          )}
          {/* Elapsed: always visible, timed or not. */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-m3-surface-container text-m3-on-surface-variant font-mono font-bold text-sm">
            <Timer className="h-4 w-4 text-m3-secondary" />
            <span className="tabular-nums text-m3-on-surface">
              {formatTime(quizElapsed)}
            </span>
          </div>
          <QuizTimerChip session={session} timeLimitSeconds={quiz.time_limit_seconds} />
        </div>
      </div>
    </div>
  );
}

/**
 * The sticky take bar: the compact mobile bar below lg, the original rich
 * desktop bar from lg up (icons-with-labels, started-at, elapsed).
 */
export function QuizTakingTopBar({
  session,
  quiz,
  slug,
  courseTitle,
  progressPct,
}: QuizStageProps & { courseTitle: string; progressPct: number }) {
  return (
    <>
      <MobileTakeBar session={session} quiz={quiz} slug={slug} progressPct={progressPct} />
      <DesktopTakeBar session={session} quiz={quiz} slug={slug} courseTitle={courseTitle} />
    </>
  );
}

export default QuizTakingTopBar;
