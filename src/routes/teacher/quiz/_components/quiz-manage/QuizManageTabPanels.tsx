import type { useNavigate } from "@tanstack/react-router";

import { draftFromQuiz } from "@/routes/teacher/_components/quiz-manage/helpers";
import { PreviewTab } from "@/routes/teacher/_components/quiz-manage/PreviewTab";
import { QuestionsTab } from "@/routes/teacher/_components/quiz-manage/QuestionsTab";
import { SettingsTab } from "@/routes/teacher/_components/quiz-manage/SettingsTab";

import type { QuizManageActions } from "./actions";
import type {
  LoadedQuiz,
  QuizManageDataController,
} from "./use-quiz-manage-data";
import type { QuizManageStateController } from "./use-quiz-manage-state";

/**
 * The three authoring tabs and their wiring. Only the active tab is mounted,
 * exactly as before: switching tabs unmounts the other editors, which is why
 * the page guards the switch with the unsaved-work dialog.
 *
 * Extracted from quiz-manage.tsx verbatim.
 */
export function QuizManageTabPanels({
  courseId,
  quizId,
  quiz,
  isPublished,
  navigate,
  data,
  state,
  actions,
}: {
  courseId: string;
  quizId: string;
  quiz: LoadedQuiz;
  isPublished: boolean;
  navigate: ReturnType<typeof useNavigate>;
  data: QuizManageDataController;
  state: QuizManageStateController;
  actions: QuizManageActions;
}) {
  const { questions, outcomes, pendingDeletes } = data;
  const { tab, draft, setDraft } = state;
  return (
    <>
      {/* When published the quiz is frozen (backend hard-blocks with 409). A
          native <fieldset disabled> on the editable tabs disables every input,
          select, textarea and button inside in one shot — no need to thread a
          readOnly flag through every nested control. border-0 p-0 m-0 min-w-0
          neutralize the default fieldset chrome so layout is unchanged. */}
      {tab === "questions" && (
        <fieldset
          disabled={isPublished}
          className="border-0 p-0 m-0 min-w-0 disabled:opacity-70"
        >
          <QuestionsTab
            courseId={courseId}
            quizId={quizId}
            questions={questions}
            outcomes={outcomes ?? []}
            selectedIds={state.selectedQuestionIds}
            onToggleSelect={state.toggleQuestionSelection}
            onSelectAll={state.selectAllQuestions}
            onClearSelection={state.clearSelection}
            bulkSeconds={state.bulkSeconds}
            onBulkSecondsChange={state.setBulkSeconds}
            onAddQuestion={actions.handleAddQuestion}
            addPending={data.addQuestion.isPending}
            onOpenGenerator={() =>
              navigate({
                to: "/teacher/courses/$courseId/quizzes/$quizId/generate",
                params: { courseId, quizId },
              })
            }
            onOpenBank={() => state.setShowBankModal(true)}
            onOpenImportExport={() => state.setShowImportExport(true)}
            onQueueDelete={pendingDeletes.queueDelete}
            published={isPublished}
            onDirtyCountChange={state.setDirtyQuestionCount}
          />
        </fieldset>
      )}

      {tab === "settings" && draft && quiz && (
        // Settings is field-aware when published: student-safe fields
        // (title/description/schedule/reminders) stay editable; the rest is
        // locked per-section inside SettingsTab. Mirrors the backend
        // whitelist in authoring.py (_PUBLISHED_EDITABLE_FIELDS).
        <SettingsTab
          quizId={quizId}
          draft={draft}
          setDraft={setDraft}
          onSubmit={actions.handleSaveSettings}
          saving={data.patchQuiz.isPending}
          locked={isPublished}
          dirty={state.settingsDirty}
          onReset={() => setDraft(draftFromQuiz(quiz))}
        />
      )}

      {tab === "preview" && (
        <PreviewTab
          quiz={quiz}
          questions={questions}
          onEditQuestion={state.goToQuestionInEditor}
          onQueueDelete={pendingDeletes.queueDelete}
        />
      )}
    </>
  );
}
