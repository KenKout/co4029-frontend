import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { BarChart3, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { QuizPublishButton } from "./QuizPublishButton";

/**
 * Actions stay pinned to the right. Once stuck, the tab rail peels
 * off to an absolute left-gutter position, leaving this as the only
 * in-flow child — `ml-auto` keeps it hard-right, and it gets its own
 * compact blurred pill so the buttons don't float bare over the
 * content (the old full-width band is gone).
 *
 * Extracted from quiz-manage.tsx verbatim.
 */
export function QuizPageActions({
  courseId,
  quizId,
  isPublished,
  actionsStuck,
  publishDisabled,
  publishPending,
  deletePending,
  questionCount,
  onPublish,
  onDelete,
}: {
  courseId: string;
  quizId: string;
  isPublished: boolean;
  actionsStuck: boolean;
  publishDisabled: boolean;
  publishPending: boolean;
  deletePending: boolean;
  questionCount: number;
  onPublish: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        "flex items-center gap-2 shrink-0 transition-all",
        // The parent strip is now the solid band; actions just hug right.
        actionsStuck && "ml-auto",
      )}
    >
      {/* Results only make sense once the quiz is published — a draft
          being configured has no attempts yet, so the button is hidden
          during configuration and appears after publish. */}
      {isPublished && (
        <Link
          to="/teacher/courses/$courseId/quizzes/$quizId/results"
          params={{ courseId, quizId }}
        >
          <Button
            variant="outline"
            className="gap-2"
            type="button"
            title={t("teacher_quiz_manage.actions.view_results")}
          >
            <BarChart3 className="h-4 w-4" />
            {!actionsStuck && t("teacher_quiz_manage.actions.view_results")}
          </Button>
        </Link>
      )}
      {/* "View as student" used to be a button here, but it was
          redundant with the Preview tab (both open the same in-app
          WYSIWYG PreviewTab). Removed the button; the Preview tab is
          now the single entry point (plus a jump-to-preview button in
          the publish dialog). The tab intentionally does NOT link to
          the live student route (/courses/$slug/quiz/$quizId) — that
          serves only PUBLISHED quizzes, so previewing a draft 404s. */}
      <QuizPublishButton
        isPublished={isPublished}
        actionsStuck={actionsStuck}
        publishDisabled={publishDisabled}
        publishPending={publishPending}
        questionCount={questionCount}
        onClick={onPublish}
      />
      {/* Delete is hidden once published: students may be mid-attempt,
          and the backend blocks destructive changes on a live quiz.
          Archive first (frees the freeze) to delete. */}
      {!isPublished && (
        <Button
          type="button"
          variant="outline"
          className="gap-2 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-700"
          onClick={onDelete}
          disabled={deletePending}
          title={t("teacher_quiz_manage.actions.delete_quiz_tooltip")}
        >
          <Trash2 className="h-4 w-4" />
          {!actionsStuck && t("common.delete")}
        </Button>
      )}
    </div>
  );
}
