import { ImportExportPanel } from "@/routes/teacher/_components/quiz-manage/ImportExportPanel";
import { QuestionBankModal } from "@/routes/teacher/_components/question-bank-modal";

import { ConfirmDeleteQuizDialog } from "./ConfirmDeleteQuizDialog";
import { ConfirmPublishQuizDialog } from "./ConfirmPublishQuizDialog";
import type { QuizManageActions } from "./actions";
import type {
  LoadedQuiz,
  QuizManageDataController,
} from "./use-quiz-manage-data";
import type { QuizManageStateController } from "./use-quiz-manage-state";

/**
 * Every modal / dialog layer of the quiz-manage page, in the DOM order it had
 * inline: question bank, import-export, delete confirmation, publish
 * confirmation. Each still mounts only while its own flag is set.
 *
 * Extracted from quiz-manage.tsx verbatim.
 */
export function QuizManageOverlays({
  quizId,
  quiz,
  approvedCount,
  data,
  state,
  actions,
}: {
  quizId: string;
  quiz: LoadedQuiz;
  approvedCount: number;
  data: QuizManageDataController;
  state: QuizManageStateController;
  actions: QuizManageActions;
}) {
  return (
    <>
      {/* The AI generator moved from a modal to its own full-page route
          (/generate) — the form outgrew the dialog. onOpenGenerator now
          navigates there instead of opening a modal. */}

      {state.showBankModal && quiz?.course_id && (
        <QuestionBankModal
          courseId={quiz.course_id}
          quizId={quizId}
          defaultModuleId={quiz.module_id}
          onClose={() => state.setShowBankModal(false)}
        />
      )}

      {state.showImportExport && (
        <ImportExportPanel
          quizId={quizId}
          onClose={() => state.setShowImportExport(false)}
        />
      )}

      {state.confirmDelete && (
        <ConfirmDeleteQuizDialog
          pending={data.deleteQuiz.isPending}
          onCancel={() => state.setConfirmDelete(false)}
          onConfirm={actions.handleDelete}
        />
      )}

      {state.confirmPublish && (
        <ConfirmPublishQuizDialog
          tab={state.tab}
          approvedCount={approvedCount}
          pending={data.publishQuiz.isPending}
          onCancel={() => state.setConfirmPublish(false)}
          onPreview={() => {
            state.setConfirmPublish(false);
            state.setTab("preview");
          }}
          onConfirm={actions.handlePublish}
        />
      )}
    </>
  );
}
