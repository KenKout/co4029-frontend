import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, HelpCircle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * The two pre-content states of the quiz-manage page: the spinner while the
 * authoring payload and course content load, and the not-found card when
 * either the quiz or its owning module is missing.
 *
 * Extracted from quiz-manage.tsx verbatim.
 */

export function QuizManageLoading() {
  return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="h-8 w-8 animate-spin text-m3-secondary" />
    </div>
  );
}

export function QuizManageNotFound({ courseId }: { courseId: string }) {
  const { t } = useTranslation();
  return (
    <div className="text-center py-24 text-m3-on-surface-variant space-y-4">
      <div className="flex justify-center">
        <div className="h-12 w-12 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
          <HelpCircle className="h-6 w-6" />
        </div>
      </div>
      <div>
        <p className="font-headline font-bold text-m3-on-surface">
          {t("teacher_quiz_manage.errors.not_found_title")}
        </p>
        <p className="text-sm mt-1">
          {t("teacher_quiz_manage.errors.not_found_description")}
        </p>
      </div>
      <Link
        to="/teacher/courses/$courseId"
        params={{ courseId }}
        className="inline-flex"
      >
        <Button variant="outline" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          {t("teacher_quiz_manage.errors.back_to_course")}
        </Button>
      </Link>
    </div>
  );
}
