import { cn } from "@/lib/utils";

import { QuizPageActions } from "./QuizPageActions";
import { QuizTabSwitcher } from "./QuizTabSwitcher";
import type { QuizManageDataController } from "./use-quiz-manage-data";
import type { QuizManageStateController } from "./use-quiz-manage-state";
import type { StickyActionsController } from "./use-sticky-actions";

/**
 * Sticky strip: tab bar + page actions (View-as-student / Publish /
 * Delete). Pinned at top-16 (just under the global ContentTopBar) so
 * the teacher can publish/preview/delete from anywhere in a long quiz
 * without scrolling back up. z-20 keeps it below ContentTopBar and the
 * sidebar per frontend/AGENTS.md. Once stuck, it gains a solid blurred
 * background + shadow and the action buttons drop their text labels
 * (icons only) to stay compact.
 *
 * Extracted from quiz-manage.tsx verbatim, including the zero-height sentinel
 * that drives the stuck detection.
 */
export function QuizManageActionStrip({
  courseId,
  quizId,
  isPublished,
  publishDisabled,
  data,
  state,
  sticky,
}: {
  courseId: string;
  quizId: string;
  isPublished: boolean;
  publishDisabled: boolean;
  data: QuizManageDataController;
  state: QuizManageStateController;
  sticky: StickyActionsController;
}) {
  const { actionsStuck } = sticky;
  return (
    <>
      {/* Zero-height sentinel: when it scrolls up under the global top bar,
          the sticky strip below is pinned and we condense actions to icons. */}
      <div ref={sticky.stickySentinelRef} aria-hidden className="h-px w-full" />

      {/* `relative` so the condensed vertical tab rail can be absolutely
          positioned into the left gutter (out of content flow) once stuck. */}
      <div className="sticky top-16 z-20 -mx-1 px-1">
        <div
          className={cn(
            "flex items-center justify-between gap-3 rounded-xl transition-all",
            // Once pinned, the strip becomes a single solid, blurred toolbar
            // band that stays IN FLOW and horizontal. A solid background is
            // what stops content bleeding through; the previous "peel the tabs
            // off into an absolute left rail" trick floated them OVER the
            // content (the overlay bug). One in-flow band = no overlay.
            actionsStuck
              ? "border border-m3-outline-variant/30 bg-m3-surface/95 backdrop-blur-md shadow-sm px-2 py-2"
              : "border border-transparent px-0 py-0",
          )}
        >
          <QuizTabSwitcher
            tab={state.tab}
            actionsStuck={actionsStuck}
            onSelect={(key) => state.leaveGuard.run(() => state.setTab(key))}
          />

          <QuizPageActions
            courseId={courseId}
            quizId={quizId}
            isPublished={isPublished}
            actionsStuck={actionsStuck}
            publishDisabled={publishDisabled}
            publishPending={data.publishQuiz.isPending}
            deletePending={data.deleteQuiz.isPending}
            questionCount={data.questions.length}
            onPublish={() => state.setConfirmPublish(true)}
            onDelete={() => state.setConfirmDelete(true)}
          />
        </div>
      </div>
    </>
  );
}
