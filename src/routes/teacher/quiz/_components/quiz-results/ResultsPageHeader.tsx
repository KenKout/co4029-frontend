import { Link } from "@tanstack/react-router";
import { ArrowLeft, RotateCcw } from "lucide-react";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";

import type { QuizResultsController } from "./use-quiz-results-page";

/** Teaching → Course → Module → Quiz → Results trail. */
export function ResultsBreadcrumbs({
  controller,
  quizTitle,
}: {
  controller: QuizResultsController;
  quizTitle: string;
}) {
  const { t, courseId, quizId, course, courseModule } = controller;
  return (
    <Breadcrumbs
      items={[
        {
          label: t("teacher_common.breadcrumb_teaching"),
          to: "/teacher/courses",
        },
        {
          label: course?.title ?? t("teacher_common.breadcrumb_course"),
          to: "/teacher/courses/$courseId",
          params: { courseId },
        },
        ...(courseModule
          ? [
              {
                label: courseModule.title,
                to: "/teacher/courses/$courseId/modules/$moduleId" as const,
                params: { courseId, moduleId: courseModule.id },
              },
            ]
          : []),
        {
          label: quizTitle,
          to: "/teacher/courses/$courseId/quizzes/$quizId",
          params: { courseId, quizId },
        },
        { label: t("teacher_quiz_results.breadcrumb") },
      ]}
    />
  );
}

/** Back arrow, page title, quiz title and the regrade affordance. */
export function ResultsPageHeader({
  controller,
  quizTitle,
  hasAttempts,
}: {
  controller: QuizResultsController;
  quizTitle: string;
  hasAttempts: boolean;
}) {
  const { t, courseId, quizId, setRegradeOpen } = controller;
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <Link
          to="/teacher/courses/$courseId/quizzes/$quizId"
          params={{ courseId, quizId }}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 mt-1 shrink-0"
            title={t("teacher_quiz_results.actions.back_to_editor")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="min-w-0 flex-1 space-y-1">
          <h1 className="text-3xl lg:text-4xl font-extrabold font-headline tracking-tight text-gradient-primary leading-tight">
            {t("teacher_quiz_results.title")}
          </h1>
          <p className="text-sm text-m3-on-surface-variant">{quizTitle}</p>
        </div>
      </div>
      {hasAttempts && (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 shrink-0"
          onClick={() => setRegradeOpen(true)}
        >
          <RotateCcw className="h-4 w-4" />
          {t("teacher_quiz_results.regrade.action")}
        </Button>
      )}
    </div>
  );
}
