import { useNavigate, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { ScrollToTop } from "@/components/ui/scroll-to-top";

import { createQuizManageActions } from "./_components/quiz-manage/actions";
import { PendingDeletesBanner } from "./_components/quiz-manage/PendingDeletesBanner";
import { QuizManageActionStrip } from "./_components/quiz-manage/QuizManageActionStrip";
import { QuizManageHeader } from "./_components/quiz-manage/QuizManageHeader";
import { QuizManageOverlays } from "./_components/quiz-manage/QuizManageOverlays";
import {
  QuizManageLoading,
  QuizManageNotFound,
} from "./_components/quiz-manage/QuizManageStates";
import { QuizManageTabPanels } from "./_components/quiz-manage/QuizManageTabPanels";
import { useQuizManageData } from "./_components/quiz-manage/use-quiz-manage-data";
import { useQuizManageState } from "./_components/quiz-manage/use-quiz-manage-state";
import { useStickyActions } from "./_components/quiz-manage/use-sticky-actions";

/**
 * Quiz authoring workspace: header, sticky action strip, the three authoring
 * tabs, and the page-level overlays. A thin orchestrator — data fetching lives
 * in `use-quiz-manage-data`, UI state in `use-quiz-manage-state`, the async
 * mutations in `actions`, and every rendered block in
 * `./_components/quiz-manage/`.
 */
export default function QuizManagePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { courseId, quizId } = useParams({ strict: false }) as {
    courseId: string;
    quizId: string;
  };

  const data = useQuizManageData(courseId, quizId);
  const { quiz, questions, courseModule, pendingDeletes } = data;
  const state = useQuizManageState({ quiz, questions });
  const sticky = useStickyActions();

  if (data.authoringLoading || data.contentLoading) {
    return <QuizManageLoading />;
  }

  if (!quiz || !courseModule) {
    return <QuizManageNotFound courseId={courseId} />;
  }

  const moduleId = courseModule.id;
  const isPublished = quiz.status === "published";
  // Partial publish: students only ever see approved questions, so publish is
  // allowed as soon as at least ONE question is approved. Un-approved
  // questions stay on the quiz as reusable drafts and are never served to
  // students. This mirrors the backend publish_gate (needs ≥1 approved).
  const approvedCount = questions.filter(
    (q) => q.review_status === "approved",
  ).length;
  const publishDisabled =
    data.publishQuiz.isPending || isPublished || approvedCount === 0;

  const actions = createQuizManageActions({
    t,
    navigate,
    courseId,
    moduleId,
    publishDisabled,
    draft: state.draft,
    data,
    state,
  });

  return (
    <div className="space-y-6 pt-4 lg:pt-6 pb-12 max-w-[1800px] mx-auto">
      <QuizManageHeader
        course={data.course}
        courseModule={courseModule}
        quiz={quiz}
        courseId={courseId}
        moduleId={moduleId}
        questionCount={questions.length}
        isPublished={isPublished}
      />

      <QuizManageActionStrip
        courseId={courseId}
        quizId={quizId}
        isPublished={isPublished}
        publishDisabled={publishDisabled}
        data={data}
        state={state}
        sticky={sticky}
      />

      <QuizManageTabPanels
        courseId={courseId}
        quizId={quizId}
        quiz={quiz}
        isPublished={isPublished}
        navigate={navigate}
        data={data}
        state={state}
        actions={actions}
      />

      {pendingDeletes.comboCount > 0 && (
        <PendingDeletesBanner pendingDeletes={pendingDeletes} />
      )}

      <QuizManageOverlays
        quizId={quizId}
        quiz={quiz}
        approvedCount={approvedCount}
        data={data}
        state={state}
        actions={actions}
      />

      {/* Long page — the Questions tab stacks every question card, so a
          20-question quiz scrolls a long way from the tab strip and actions.
          Lifted above the pending-delete undo snackbar while that's showing:
          the snackbar is bottom-centre but wide enough to reach under a
          bottom-right button, and both sit at z-30. */}
      <ScrollToTop
        className={pendingDeletes.comboCount > 0 ? "bottom-24" : undefined}
      />
      {state.leaveGuard.dialog}
    </div>
  );
}
