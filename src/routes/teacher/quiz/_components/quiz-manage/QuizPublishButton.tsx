import { useTranslation } from "react-i18next";
import { CheckCircle2, Loader2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The publish action. Once published it stays mounted as a solid green
 * "Published" affordance rather than disappearing, so the state is legible.
 *
 * Extracted from quiz-manage.tsx verbatim.
 */
export function QuizPublishButton({
  isPublished,
  actionsStuck,
  publishDisabled,
  publishPending,
  questionCount,
  onClick,
}: {
  isPublished: boolean;
  actionsStuck: boolean;
  publishDisabled: boolean;
  publishPending: boolean;
  questionCount: number;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Button
      type="button"
      disabled={publishDisabled}
      onClick={onClick}
      className={cn(
        "gap-2 border-0 shadow-glass",
        isPublished
          ? "bg-emerald-600 text-white hover:bg-emerald-600 cursor-default"
          : "gradient-primary text-white hover:shadow-ai-glow",
      )}
      title={
        questionCount === 0
          ? t("teacher_quiz_manage.actions.publish_needs_question")
          : isPublished
            ? t("teacher_quiz_manage.status.published")
            : t("teacher_quiz_manage.actions.publish_quiz_tooltip")
      }
    >
      {publishPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isPublished ? (
        <CheckCircle2 className="h-4 w-4" />
      ) : (
        <Upload className="h-4 w-4" />
      )}
      {!actionsStuck &&
        (isPublished
          ? t("teacher_quiz_manage.status.published")
          : t("teacher_quiz_manage.actions.publish"))}
    </Button>
  );
}
