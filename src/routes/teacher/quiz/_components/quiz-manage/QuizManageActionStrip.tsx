import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";

import { QuizPageActions } from "./QuizPageActions";
import { QuizTabSwitcher } from "./QuizTabSwitcher";
import type { QuizManageDataController } from "./use-quiz-manage-data";
import type { QuizManageStateController } from "./use-quiz-manage-state";
import type { StickyActionsController } from "./use-sticky-actions";

export function QuizManageActionStrip({
  courseId,
  quizId,
  isPublished,
  canDelete,
  publishDisabled,
  data,
  state,
  sticky,
}: {
  courseId: string;
  quizId: string;
  isPublished: boolean;
  canDelete: boolean;
  publishDisabled: boolean;
  data: QuizManageDataController;
  state: QuizManageStateController;
  sticky: StickyActionsController;
}) {
  const { actionsStuck } = sticky;
  const { t } = useTranslation();
  const pendingMessage = t(
    `teacher_quiz_manage.settings.assist.${state.settingsBusy ? "mutation_pending" : "save_before_publish"}`,
  );
  return (
    <>
      <div ref={sticky.stickySentinelRef} aria-hidden className="h-px w-full" />

      <div className="sticky top-16 z-20 -mx-1 px-1">
        <div
          className={cn(
            "flex items-center justify-between gap-3 rounded-xl transition-[background-color,border-color,box-shadow,padding] duration-200",
            actionsStuck
              ? "border border-m3-outline-variant/30 bg-m3-surface shadow-sm px-2 py-2"
              : "border border-transparent px-0 py-0",
          )}
        >
          <QuizTabSwitcher
            tab={state.tab}
            actionsStuck={actionsStuck}
            onSelect={state.selectTab}
          />

          <div className="flex items-center gap-2">
            {!isPublished && state.hasUnsavedWork && (
              <Tooltip content={pendingMessage} side="bottom">
                <Button
                  type="button"
                  role="status"
                  aria-label={pendingMessage}
                  variant="ghost"
                  size="icon"
                  className="cursor-help text-amber-600 hover:bg-amber-500/10 hover:text-amber-700"
                >
                  <TriangleAlert className="size-4" aria-hidden />
                </Button>
              </Tooltip>
            )}
            <QuizPageActions
              courseId={courseId}
              quizId={quizId}
              isPublished={isPublished}
              canDelete={canDelete}
              actionsStuck={actionsStuck}
              publishDisabled={publishDisabled}
              publishPending={data.publishQuiz.isPending}
              deletePending={
                data.deleteQuiz.isPending ||
                state.settingsBusy ||
                data.patchQuiz.isPending
              }
              questionCount={data.questions.length}
              onPublish={() => state.setConfirmPublish(true)}
              onDelete={() => state.setConfirmDelete(true)}
            />
          </div>
        </div>
      </div>
    </>
  );
}
