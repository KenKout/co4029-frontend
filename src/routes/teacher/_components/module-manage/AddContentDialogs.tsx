import { Input } from "@/components/ui/input";
import { PromptDialog } from "@/components/ui/prompt-dialog";
import type { AddContentController } from "./use-add-content";
import type { TranslateFn } from "./types";

/**
 * The two title prompts behind the "add content" pills — one for a new
 * interview config, one for a new quiz. Moved verbatim out of the former
 * 211-line `AddContentPills` in `module-manage.tsx`.
 */
export function AddContentDialogs({
  ctl,
  t,
}: {
  ctl: AddContentController;
  t: TranslateFn;
}) {
  const {
    createQuiz,
    createInterview,
    interviewModalOpen,
    setInterviewModalOpen,
    interviewTitle,
    setInterviewTitle,
    quizModalOpen,
    setQuizModalOpen,
    quizTitle,
    setQuizTitle,
    handleCreateQuiz,
    handleCreateInterview,
  } = ctl;

  return (
    <>
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

      <PromptDialog
        open={quizModalOpen}
        onOpenChange={setQuizModalOpen}
        title={t("teacher_quiz_new.modal_title")}
        description={t("teacher_quiz_new.modal_description")}
        confirmLabel={
          createQuiz.isPending
            ? t("teacher_quiz_new.submitting")
            : t("teacher_quiz_new.submit")
        }
        isPending={createQuiz.isPending}
        onConfirm={handleCreateQuiz}
      >
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-m3-on-surface">
            {t("teacher_quiz_new.fields.title")} *
          </label>
          <Input
            autoFocus
            required
            placeholder={t("teacher_quiz_new.fields.title_placeholder")}
            value={quizTitle}
            onChange={(e) => setQuizTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleCreateQuiz();
              }
            }}
          />
        </div>
      </PromptDialog>
    </>
  );
}
