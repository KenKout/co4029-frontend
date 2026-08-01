import { Link } from "@tanstack/react-router";
import { ArrowLeft, BarChart3, HelpCircle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import type { TranslateFn } from "./types";

/** Full-page spinner while the results query is in flight. */
export function ResultsLoading() {
  return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="h-8 w-8 animate-spin text-m3-secondary" />
    </div>
  );
}

/** Shown when the results query errors or returns nothing. */
export function ResultsNotFound({
  courseId,
  quizId,
  t,
}: {
  courseId: string;
  quizId: string;
  t: TranslateFn;
}) {
  return (
    <div className="text-center py-24 text-m3-on-surface-variant space-y-4">
      <div className="flex justify-center">
        <div className="h-12 w-12 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
          <HelpCircle className="h-6 w-6" />
        </div>
      </div>
      <div>
        <p className="font-headline font-bold text-m3-on-surface">
          {t("teacher_quiz_results.errors.not_found_title")}
        </p>
        <p className="text-sm mt-1">
          {t("teacher_quiz_results.errors.not_found_description")}
        </p>
      </div>
      <Link
        to="/teacher/courses/$courseId/quizzes/$quizId"
        params={{ courseId, quizId }}
        className="inline-flex"
      >
        <Button variant="outline" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          {t("teacher_quiz_results.actions.back_to_editor")}
        </Button>
      </Link>
    </div>
  );
}

/** Shown when the quiz exists but nobody has attempted it yet. */
export function ResultsNoAttempts({ t }: { t: TranslateFn }) {
  return (
    <div className="rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest px-6 py-16 text-center space-y-3">
      <div className="flex justify-center">
        <div className="h-12 w-12 rounded-xl bg-m3-primary-fixed text-m3-primary flex items-center justify-center">
          <BarChart3 className="h-6 w-6" />
        </div>
      </div>
      <p className="font-headline font-bold text-m3-on-surface">
        {t("teacher_quiz_results.empty.title")}
      </p>
      <p className="text-sm text-m3-on-surface-variant max-w-md mx-auto">
        {t("teacher_quiz_results.empty.description")}
      </p>
    </div>
  );
}
