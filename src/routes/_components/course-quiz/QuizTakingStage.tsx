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

  /**
   * Jump to a question from the summary rail.
   *
   * Setting the active index is not enough on the 5 / 10 / All layouts: the
   * target card is already on screen (or one page-switch away), so nothing
   * moves and the click feels dead. So we also scroll the card into view.
   *
   * The card may live on a different page — `setActiveIdx` makes the pagination
   * effect switch pages on a LATER commit, so the node isn't in the DOM yet on
   * this tick. Retry across a few animation frames until it mounts, then scroll
   * (honouring reduced-motion, matching the teacher navigator's behaviour).
   */
  const jumpToQuestion = (index: number) => {
    const question = displayQuestions[index];
    session.setActiveIdx(index);
    if (!question) return;
    let attempts = 0;
    const tryScroll = () => {
      const el = document.getElementById(`quiz-question-${question.id}`);
      if (el) {
        const reduceMotion =
          typeof window !== "undefined" &&
          typeof window.matchMedia === "function" &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        el.scrollIntoView({
          behavior: reduceMotion ? "auto" : "smooth",
          block: "start",
        });
        return;
      }
      if (attempts++ < 10) window.requestAnimationFrame(tryScroll);
    };
    window.requestAnimationFrame(tryScroll);
  };

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
              onJump={jumpToQuestion}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
