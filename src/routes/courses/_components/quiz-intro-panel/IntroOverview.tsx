import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  ListChecks,
  RotateCcw,
  Target,
} from "lucide-react";
import type { QuizPublic } from "@/lib/api/types";
import { formatTime } from "@/lib/quiz/quiz-session-helpers";
import type { IntroState } from "./helpers";

/**
 * Module-context eyebrow — frames the bare title (which course /
 * that this is a quiz), matching the interview-lobby pattern.
 */
export function IntroOverviewHeader({
  quiz,
  intro,
  courseTitle,
}: {
  quiz: QuizPublic;
  intro: IntroState;
  courseTitle?: string | null;
}) {
  const { t } = useTranslation();
  const { hasPassed, bestScore } = intro;

  return (
    <>
      <div className="mb-3 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-m3-secondary">
        <BookOpen className="h-3.5 w-3.5" />
        <span>{t("course_quiz.overview.eyebrow")}</span>
        {courseTitle && (
          <>
            <span className="text-m3-outline">·</span>
            <span className="max-w-[220px] truncate font-semibold normal-case text-m3-on-surface-variant">
              {courseTitle}
            </span>
          </>
        )}
      </div>
      <h1 className="font-headline font-extrabold text-3xl text-m3-primary mb-3">
        {quiz.title}
      </h1>
      {quiz.description && (
        <p className="text-m3-on-surface-variant mb-6">{quiz.description}</p>
      )}

      {/* Already-passed banner — flips the page tone from "take it" to
          "you're done, retake optional" when the student has cleared it. */}
      {hasPassed && (
        <div className="mb-6 flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{t("course_quiz.overview.passed_banner_title")}</span>
          {bestScore != null && (
            <span className="text-emerald-700">
              ·{" "}
              {t("course_quiz.overview.passed_banner_best", {
                score: bestScore.toFixed(0),
              })}
            </span>
          )}
        </div>
      )}
    </>
  );
}

/**
 * One stat tile: icon chip + label + value, one consistent value
 * colour (the old design used three different colours for no
 * reason) and a hairline border for contrast.
 */
function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Target;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-m3-surface-container ghost-border p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-m3-primary-fixed text-m3-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-m3-on-surface-variant">
          {label}
        </span>
        <span className="font-headline text-base font-black text-m3-on-surface">
          {value}
        </span>
      </div>
    </div>
  );
}

/** Passing score / question count / time limit / attempts used. */
export function IntroStatTiles({
  quiz,
  intro,
}: {
  quiz: QuizPublic;
  intro: IntroState;
}) {
  const { t } = useTranslation();
  const { passingScore, questionCount, completed } = intro;

  return (
    <div className="mb-8 grid grid-cols-2 gap-3 text-left sm:grid-cols-4">
      <StatTile
        icon={Target}
        label={t("course_quiz.labels.passing_score")}
        value={`${passingScore}%`}
      />
      <StatTile
        icon={ListChecks}
        label={t("course_quiz.overview.questions")}
        value={questionCount > 0 ? questionCount : "—"}
      />
      <StatTile
        icon={Clock}
        label={t("course_quiz.labels.time")}
        value={
          quiz.time_limit_seconds
            ? formatTime(quiz.time_limit_seconds)
            : t("course_quiz.values.no_limit")
        }
      />
      <StatTile
        icon={RotateCcw}
        label={t("course_quiz.labels.attempts")}
        value={
          <>
            {completed}
            {quiz.max_attempts != null && (
              <span className="text-sm font-medium text-m3-outline-variant">
                /{quiz.max_attempts}
              </span>
            )}
          </>
        }
      />
    </div>
  );
}
