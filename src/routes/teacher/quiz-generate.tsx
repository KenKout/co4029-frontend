/**
 * Quiz AI generation — full page.
 *
 * The generator used to live in a modal on quiz-manage (`GenerateModal`),
 * but the form outgrew the dialog (coverage picker, bloom distribution,
 * topic tags, lesson picker, live run progress). This promotes it to its
 * own routed screen at
 * `/teacher/courses/$courseId/quizzes/$quizId/generate`, with breadcrumbs
 * back to the quiz, so it gets the full content width and vertical space.
 *
 * All the generation logic stays in the shared `QuizGenerationPanel`; this
 * page only supplies the chrome (breadcrumbs, header, back button) and wires
 * the params the panel needs.
 */

import { Link, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { useQuizAuthoring } from "@/lib/api/hooks/quizzes";
import {
  useTeacherCourseById,
  useTeacherCourseContent,
} from "@/lib/api/hooks/teacher-courses";
import { QuizGenerationPanel } from "./_components/quiz-generation-panel";

export default function QuizGeneratePage() {
  const { t } = useTranslation();
  const { courseId, quizId } = useParams({ strict: false }) as {
    courseId: string;
    quizId: string;
  };

  const { data: course } = useTeacherCourseById(courseId);
  const { data: authoring, isLoading: authoringLoading } =
    useQuizAuthoring(quizId);
  const { data: content, isLoading: contentLoading } =
    useTeacherCourseContent(courseId);

  const quiz = authoring?.quiz;
  const questions = authoring?.questions ?? [];
  const courseModule = content?.modules.find(
    (entry) => entry.id === quiz?.module_id,
  );

  if (authoringLoading || contentLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-m3-primary" />
      </div>
    );
  }

  if (!quiz || !quiz.module_id) {
    return (
      <div className="max-w-[1800px] mx-auto pt-4 lg:pt-6">
        <p className="text-sm text-m3-on-surface-variant">
          {t("teacher_quiz_manage.errors.not_found", "Quiz not found.")}
        </p>
      </div>
    );
  }

  const moduleId = quiz.module_id;

  return (
    <div className="space-y-6 pt-4 lg:pt-6 pb-12 max-w-[1800px] mx-auto">
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
                  to: "/teacher/courses/$courseId/modules/$moduleId",
                  params: { courseId, moduleId },
                },
              ]
            : []),
          {
            label: quiz.title,
            to: "/teacher/courses/$courseId/quizzes/$quizId",
            params: { courseId, quizId },
          },
          { label: t("teacher_quiz_manage.generate_modal.title") },
        ]}
      />

      <div className="flex items-start gap-3 min-w-0">
        <Link
          to="/teacher/courses/$courseId/quizzes/$quizId"
          params={{ courseId, quizId }}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 mt-1 shrink-0"
            title={t("common.back", "Back")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl gradient-primary flex items-center justify-center shadow-ai-glow shrink-0">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl lg:text-4xl font-extrabold font-headline tracking-tight text-gradient-primary leading-tight">
              {t("teacher_quiz_manage.generate_modal.title")}
            </h1>
          </div>
          <p className="text-sm text-m3-on-surface-variant max-w-3xl leading-relaxed">
            {t("teacher_quiz_manage.generate_modal.description")}
          </p>
        </div>
      </div>

      <div className="bg-m3-surface-container-lowest border border-m3-outline-variant/20 rounded-xl p-6 lg:p-8 shadow-glass">
        {/* The panel keeps all generation logic and shows live run progress
            in place. No onRunStarted here — the teacher stays on this page to
            watch progress, then returns via the breadcrumb / back button. */}
        <QuizGenerationPanel
          quizId={quizId}
          moduleId={moduleId}
          courseId={courseId}
          hasExistingQuestions={questions.length > 0}
        />
      </div>
    </div>
  );
}
