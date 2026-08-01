import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { QuizHintDialog } from "@/routes/_components/QuizHintDialog";
import { QuizSummaryCard } from "@/routes/_components/QuizSummaryCard";
import { buildSummaryItems, deriveTakingView } from "./helpers";
import { QuizPageQuestions } from "./QuizPageQuestions";
import { QuizPerPageSelector } from "./QuizPerPageSelector";
import { QuizPageNav, QuizTakingActions } from "./QuizTakingActions";
import { QuizTakingHeader } from "./QuizTakingHeader";
import { QuizTakingTopBar } from "./QuizTakingTopBar";
import type { QuizStageProps } from "./types";

/**
 * The live take screen: sticky bar, title/progress, the current page of
 * question cards, pagination + submit controls, and the summary rail.
 *
 * Layout, class names and the `lg:sticky lg:top-32` rail offset are unchanged
 * from course-quiz.tsx.
 */
export function QuizTakingStage({
  session,
  quiz,
  slug,
  courseTitle,
}: QuizStageProps & { courseTitle: string }) {
  const { hintDialogOpen, setHintDialogOpen, displayQuestions } = session;
  const view = deriveTakingView(session, quiz);
  const summaryItems = buildSummaryItems(session);

  return (
    <div className="min-h-[70vh] pb-20">
      <QuizTakingTopBar
        session={session}
        quiz={quiz}
        slug={slug}
        courseTitle={courseTitle}
      />

      <div className="w-full px-4 sm:px-6 lg:px-8 pt-2">
        <QuizTakingHeader
          session={session}
          quiz={quiz}
          progressPct={view.progressPct}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 xl:col-span-9">
            <QuizPerPageSelector session={session} />

            <QuizPageQuestions session={session} quiz={quiz} />

            <QuizPageNav session={session} />

            <QuizTakingActions session={session} view={view} />
          </div>

          <div className="lg:col-span-4 xl:col-span-3 space-y-5 lg:sticky lg:top-32 lg:self-start">
            <QuizHintDialog
              open={hintDialogOpen}
              onOpenChange={setHintDialogOpen}
              hintText={view.activeQuestion.hint_text ?? ""}
            />

            <QuizSummaryCard
              items={summaryItems}
              answeredCount={view.completedCount}
              flaggedCount={view.flaggedCount}
              total={displayQuestions.length}
              passingScore={view.passingScore}
              onJump={(index) => session.setActiveIdx(index)}
            />
          </div>
        </div>
      </div>
      {/* Long page in the 5/10/All layouts — the student can be many screens
          below the timer and the submit controls. */}
      <ScrollToTop />
    </div>
  );
}
