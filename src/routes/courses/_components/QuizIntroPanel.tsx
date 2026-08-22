import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import type { QuizAttemptRead, QuizPublic } from "@/lib/api/types";
import { deriveIntroState } from "@/routes/courses/_components/quiz-intro-panel/helpers";
import { IntroAttemptHistory } from "@/routes/courses/_components/quiz-intro-panel/IntroAttemptHistory";
import {
  IntroOverviewHeader,
  IntroStatTiles,
} from "@/routes/courses/_components/quiz-intro-panel/IntroOverview";
import { IntroScheduleList } from "@/routes/courses/_components/quiz-intro-panel/IntroScheduleList";
import { IntroStartCta } from "@/routes/courses/_components/quiz-intro-panel/IntroStartCta";

/**
 * The pre-attempt landing view: quiz overview (stats, scheduling window,
 * already-passed banner), the start/resume/blocked CTA, and the attempt
 * history list. Rendered before a take begins.
 *
 * The derived scheduling / attempt state lives in
 * `_components/quiz-intro-panel/helpers.ts`; each block below is its own
 * component in that folder.
 */
export function QuizIntroPanel({
  quiz,
  attempts,
  inProgressAttempt,
  onStart,
  onResume,
  starting,
  resuming,
  slug,
  courseTitle,
}: {
  quiz: QuizPublic;
  attempts: QuizAttemptRead[];
  inProgressAttempt: QuizAttemptRead | null;
  onStart: () => void;
  onResume: () => void;
  starting: boolean;
  resuming: boolean;
  slug: string;
  courseTitle?: string | null;
}) {
  const { t } = useTranslation();
  const intro = deriveIntroState(quiz, attempts);

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center gap-3 flex-wrap -ml-3">
        <Link to="/courses/$slug/learn" params={{ slug }}>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-xl text-m3-on-surface-variant hover:text-m3-primary gap-1.5 text-xs font-bold px-3"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("course_quiz.actions.back_to_course")}
          </Button>
        </Link>
      </div>

      <div className="w-full space-y-6">
        <GlassCard className="p-8 sm:p-10 text-center">
          <IntroOverviewHeader
            quiz={quiz}
            intro={intro}
            courseTitle={courseTitle}
          />

          <IntroStatTiles quiz={quiz} intro={intro} />

          <IntroScheduleList intro={intro} />

          <IntroStartCta
            quiz={quiz}
            intro={intro}
            inProgressAttempt={inProgressAttempt}
            onStart={onStart}
            onResume={onResume}
            starting={starting}
            resuming={resuming}
          />
        </GlassCard>

        <IntroAttemptHistory
          quiz={quiz}
          intro={intro}
          slug={slug}
          inProgressAttempt={inProgressAttempt}
          onResume={onResume}
          starting={starting}
          resuming={resuming}
        />
      </div>
    </div>
  );
}
