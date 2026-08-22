import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { AlertCircle, ArrowLeft, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";

/**
 * The three pre-take screens of course-quiz.tsx: the loading skeleton, the
 * "quiz not found" card, and the "live take carries zero questions" notice.
 * Markup moved verbatim from the route's early returns.
 */

export function QuizLoadingSkeleton() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6">
      <div className="space-y-3 w-full max-w-sm">
        <div className="h-4 rounded-full bg-m3-surface-container animate-pulse" />
        <div className="h-4 rounded-full bg-m3-surface-container animate-pulse w-4/5" />
        <div className="h-32 rounded-xl bg-m3-surface-container animate-pulse mt-6" />
      </div>
    </div>
  );
}

export function QuizNotFoundPanel({ slug }: { slug: string }) {
  const { t } = useTranslation();
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-8">
      <GlassCard className="p-10 text-center max-w-md">
        <BookOpen className="h-10 w-10 text-m3-outline mx-auto mb-4" />
        <h2 className="font-headline font-bold text-xl text-m3-on-surface mb-2">
          {t("course_quiz.empty_states.no_quiz_found")}
        </h2>
        <p className="text-sm text-m3-on-surface-variant mb-6">
          {t("course_quiz.empty_states.quiz_not_loadable")}
        </p>
        <Link to="/courses/$slug/learn" params={{ slug }}>
          <Button className="gradient-primary text-white rounded-xl font-bold gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t("course_quiz.actions.back_to_course")}
          </Button>
        </Link>
      </GlassCard>
    </div>
  );
}

/**
 * Defensive: a live take can legitimately carry zero questions — e.g. a
 * quiz published before the approval gate whose questions are all still
 * pending review (the approved-only taking filter excludes them). Render a
 * friendly empty state instead of dereferencing an undefined question.
 */
export function QuizNoQuestionsPanel({ slug }: { slug: string }) {
  const { t } = useTranslation();
  return (
    <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-10">
      <div className="max-w-lg mx-auto text-center bg-m3-surface-container-lowest rounded-xl p-10 shadow-editorial space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 flex items-center justify-center">
          <AlertCircle className="h-7 w-7 text-amber-600" />
        </div>
        <h2 className="font-headline font-bold text-xl text-m3-on-surface">
          {t("course_quiz.empty.no_questions_title")}
        </h2>
        <p className="text-sm text-m3-on-surface-variant">
          {t("course_quiz.empty.no_questions_body")}
        </p>
        <Link to="/courses/$slug/learn" params={{ slug }}>
          <Button variant="outline" className="gap-2 mt-2">
            <ArrowLeft className="h-4 w-4" />
            {t("course_interview.actions.course")}
          </Button>
        </Link>
      </div>
    </div>
  );
}
