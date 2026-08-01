import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, LockIcon } from "lucide-react";

import { AIInsightChip } from "@/components/ui/ai-insight-chip";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";

import type {
  LoadedModule,
  LoadedQuiz,
  QuizManageDataController,
} from "./use-quiz-manage-data";

/**
 * Page chrome above the sticky action strip: breadcrumbs, back button, quiz
 * title with its status badges, and the published-readonly banner.
 *
 * Extracted from quiz-manage.tsx verbatim.
 */
export function QuizManageHeader({
  course,
  courseModule,
  quiz,
  courseId,
  moduleId,
  questionCount,
  isPublished,
}: {
  course: QuizManageDataController["course"];
  courseModule: LoadedModule;
  quiz: LoadedQuiz;
  courseId: string;
  moduleId: string;
  questionCount: number;
  isPublished: boolean;
}) {
  const { t } = useTranslation();
  return (
    <>
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
          {
            label: courseModule.title,
            to: "/teacher/courses/$courseId/modules/$moduleId",
            params: { courseId, moduleId },
          },
          { label: quiz.title },
        ]}
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <Link
            to="/teacher/courses/$courseId/modules/$moduleId"
            params={{ courseId, moduleId }}
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 mt-1 shrink-0"
              title={t("teacher_quiz_manage.actions.back_to_module")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>

          <div className="min-w-0 flex-1 space-y-2">
            <h1 className="text-3xl lg:text-4xl font-extrabold font-headline tracking-tight text-gradient-primary leading-tight">
              {quiz.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border border-m3-outline-variant/30 bg-m3-surface-container-low text-m3-on-surface-variant rounded-full text-[11px] font-bold px-2.5 py-1">
                {t("teacher_quiz_manage.header.questions_count", {
                  count: questionCount,
                })}
              </Badge>
              {isPublished ? (
                <Badge className="border-0 bg-emerald-100 text-emerald-700 text-[11px] font-bold gap-1.5 rounded-full px-2.5 py-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {t("teacher_quiz_manage.status.published")}
                </Badge>
              ) : (
                <Badge className="border-0 bg-amber-50 text-amber-700 text-[11px] font-bold rounded-full px-2.5 py-1">
                  {t("teacher_quiz_manage.status.draft")}
                </Badge>
              )}
              <AIInsightChip>AI Quiz Editor</AIInsightChip>
            </div>
            {quiz.description && (
              <p className="text-sm text-m3-on-surface-variant max-w-2xl leading-relaxed">
                {quiz.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Published = frozen. Students can see/attempt the quiz, so the backend
          rejects all authoring edits (409 quiz_published_readonly). Surface a
          clear banner and disable the editing controls so teachers understand
          the lock instead of hitting errors. */}
      {isPublished && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <LockIcon className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            {t(
              "teacher_quiz_manage.published_readonly_banner",
              "This quiz is published. Questions and any settings that affect scoring, timing, or presentation are frozen so students mid-attempt aren't disrupted. You can still edit the title, description, schedule, and reminders. Archive the quiz first to change anything else.",
            )}
          </span>
        </div>
      )}
    </>
  );
}
