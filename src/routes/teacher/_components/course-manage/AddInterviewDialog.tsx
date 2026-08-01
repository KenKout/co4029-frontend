import { Input } from "@/components/ui/input";
import { PromptDialog } from "@/components/ui/prompt-dialog";
import type { AddLessonItemsController } from "./use-add-lesson-items";
import type { TranslateFn } from "./types";

/**
 * Title prompt shown before an interview config is created — interview creation
 * needs a title up front, unlike lessons and quizzes which get a generated one.
 * Moved verbatim out of `AddLessonPills`.
 */
export function AddInterviewDialog({
  ctl,
  t,
}: {
  ctl: AddLessonItemsController;
  t: TranslateFn;
}) {
  const {
    createInterview,
    interviewModalOpen,
    setInterviewModalOpen,
    interviewTitle,
    setInterviewTitle,
    handleCreateInterview,
  } = ctl;

  return (
    <PromptDialog
      open={interviewModalOpen}
      onOpenChange={setInterviewModalOpen}
      title={t("teacher_interview_config_new.modal_title")}
      description={t("teacher_interview_config_new.modal_description")}
      confirmLabel={
        createInterview.isPending
          ? t("teacher_interview_config_new.submitting")
          : t("teacher_interview_config_new.submit")
      }
      isPending={createInterview.isPending}
      onConfirm={handleCreateInterview}
    >
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-m3-on-surface">
          {t("teacher_interview_config_new.fields.title")} *
        </label>
        <Input
          autoFocus
          required
          placeholder={t(
            "teacher_interview_config_new.fields.title_placeholder",
          )}
          value={interviewTitle}
          onChange={(e) => setInterviewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleCreateInterview();
            }
          }}
        />
      </div>
    </PromptDialog>
  );
}
