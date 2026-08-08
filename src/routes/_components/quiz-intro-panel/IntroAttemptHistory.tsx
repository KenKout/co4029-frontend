import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import type { QuizAttemptRead, QuizPublic } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { IntroState } from "./helpers";

/** The still-open attempt, rendered as a resume button at the top of history. */
function InProgressRow({
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
    <Button variant="ghost"
      type="button"
      onClick={onResume}
      disabled={resuming || starting}
      className="w-full flex items-center gap-4 p-3 rounded-xl bg-m3-primary-fixed/20 hover:bg-m3-primary-fixed/40 transition-colors group text-left disabled:opacity-60 h-auto whitespace-normal"
    >
      <span className="text-xs font-headline font-black text-m3-primary tabular-nums shrink-0 w-8">
        #{inProgressAttempt.attempt_number}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-m3-primary/10 text-m3-primary">
            {t("course_quiz.status.currently_doing")}
          </span>
        </div>
        <p className="text-xs text-m3-on-surface-variant mt-0.5">
          {new Date(inProgressAttempt.started_at).toLocaleString()}
        </p>
      </div>
      <span className="text-xs font-bold text-m3-primary group-hover:underline shrink-0 flex items-center gap-1">
        <RotateCcw className="h-3.5 w-3.5" />
        {resuming
          ? t("course_quiz.resume.resuming")
          : t("course_quiz.resume.resume")}
      </span>
    </Button>
  );
}

/** One submitted/graded attempt, linking to its review page. */
function AttemptHistoryRow({
  attempt,
  quiz,
  slug,
}: {
  attempt: QuizAttemptRead;
  quiz: QuizPublic;
  slug: string;
}) {
  const { t } = useTranslation();
  const a = attempt;
  const score = a.score_percent != null ? Number(a.score_percent) : null;
  const passed = a.passed === true;

  return (
    <Link
      to="/courses/$slug/quiz/$quizId/attempts/$attemptId"
      params={{ slug, quizId: quiz.id, attemptId: a.id }}
      className="flex items-center gap-4 p-3 rounded-xl bg-m3-surface-container-low hover:bg-m3-surface-container transition-colors group"
    >
      <span className="text-xs font-headline font-black text-m3-secondary tabular-nums shrink-0 w-8">
        #{a.attempt_number}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-m3-on-surface">
            {score != null
              ? `${score.toFixed(0)}%`
              : t("course_quiz.history.no_score")}
          </span>
          {a.passed != null && (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full",
                passed
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700",
              )}
            >
              {passed ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <XCircle className="h-3 w-3" />
              )}
              {passed
                ? t("course_quiz.history.passed")
                : t("course_quiz.history.failed")}
            </span>
          )}
        </div>
        {a.submitted_at && (
          <p className="text-xs text-m3-on-surface-variant mt-0.5">
            {new Date(a.submitted_at).toLocaleString()}
          </p>
        )}
      </div>
      <span className="text-xs font-bold text-m3-primary group-hover:underline shrink-0">
        {t("course_quiz.history.review")}
      </span>
    </Link>
  );
}

/** Attempt history: the open attempt (if any) then every reviewable attempt. */
export function IntroAttemptHistory({
  quiz,
  intro,
  slug,
  inProgressAttempt,
  onResume,
  starting,
  resuming,
}: {
  quiz: QuizPublic;
  intro: IntroState;
  slug: string;
  inProgressAttempt: QuizAttemptRead | null;
  onResume: () => void;
  starting: boolean;
  resuming: boolean;
}) {
  const { t } = useTranslation();
  const { reviewableAttempts } = intro;

  if (reviewableAttempts.length === 0 && !inProgressAttempt) return null;

  return (
    <GlassCard className="p-6 sm:p-8">
      <h2 className="font-headline font-bold text-base text-m3-on-surface mb-4">
        {t("course_quiz.history.title")}
      </h2>
      <div className="space-y-2">
        {inProgressAttempt && (
          <InProgressRow
            inProgressAttempt={inProgressAttempt}
            onResume={onResume}
            starting={starting}
            resuming={resuming}
          />
        )}
        {reviewableAttempts.map((a) => (
          <AttemptHistoryRow key={a.id} attempt={a} quiz={quiz} slug={slug} />
        ))}
      </div>
    </GlassCard>
  );
}
