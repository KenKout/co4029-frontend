import { GlassCard } from "@/components/ui/glass-card";
import { Camera } from "lucide-react";
import { useTranslation } from "react-i18next";
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
      <div className="w-full space-y-6">
        <GlassCard className="p-8 sm:p-10 text-center">
          <IntroOverviewHeader
            quiz={quiz}
            intro={intro}
            courseTitle={courseTitle}
          />

          <IntroStatTiles quiz={quiz} intro={intro} />

          <IntroScheduleList intro={intro} />

          <div className="mb-6 flex items-start gap-3 rounded-xl bg-m3-surface-container p-4 text-left">
            <Camera className="mt-0.5 h-5 w-5 shrink-0 text-m3-primary" aria-hidden="true" />
            <div>
              <p className="text-sm font-bold text-m3-on-surface">
                {t(
                  quiz.require_camera
                    ? "course_quiz.camera.required_label"
                    : "course_quiz.camera.optional_label",
                )}
              </p>
              <p className="mt-1 text-xs text-m3-on-surface-variant">
                {t("course_quiz.camera.privacy")}
              </p>
            </div>
          </div>

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
