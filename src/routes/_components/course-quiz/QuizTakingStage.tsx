import { useState } from "react";
import { useEffect } from "react";
import { QuizHintDialog } from "@/routes/_components/QuizHintDialog";
import { QuizSummaryCard } from "@/routes/_components/QuizSummaryCard";
import { setScrollToTopBump } from "@/components/ui/scroll-to-top";
import { buildSummaryItems, deriveTakingView } from "./helpers";
import { QuizPageQuestions } from "./QuizPageQuestions";
import { QuizTakingFooter } from "./QuizTakingFooter";
import { QuizSummaryDialog } from "./QuizSummaryDialog";
import { QuizTakingTopBar } from "./QuizTakingTopBar";
import type { QuizStageProps } from "./types";

/**
 * The live take screen: compact sticky bar (title / Q counter / progress /
 * config), the current page of question cards, and the sticky question
 * footer (flag / question list / hint / prev / next).
 *
 * The summary rail is desktop-only now — on phones the question-list icon
 * in the footer opens the same layout as a dialog.
 */
export function QuizTakingStage({ session, quiz, slug }: QuizStageProps) {
  const { hintDialogOpen, setHintDialogOpen, displayQuestions } = session;
  const view = deriveTakingView(session, quiz);
  const summaryItems = buildSummaryItems(session);
  const [summaryOpen, setSummaryOpen] = useState(false);

  // The sticky question footer occupies the bottom edge; lift the shell's
  // ScrollToTop button above it so the two never overlap.
  useEffect(() => {
    setScrollToTopBump("bottom-24");
    return () => setScrollToTopBump("");
  }, []);

  /**
   * Jump to a question from the summary rail/dialog.
   *
   * Setting the active index is not enough on the 5 / 10 / All layouts: the
   * target card is already on screen (or one page-switch away), so nothing
   * moves and the click feels dead. So we also scroll the card into view.
   *
   * The card may live on a different page — `setActiveIdx` makes the
   * pagination effect switch pages on a LATER commit, so the node isn't in
   * the DOM yet on this tick. Retry across a few animation frames until it
   * mounts, then scroll (honouring reduced-motion).
   */
  const jumpToQuestion = (index: number) => {
    const question = displayQuestions[index];
    session.setActiveIdx(index);
    setSummaryOpen(false);
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
    <div className="pb-4">
      <QuizTakingTopBar
        session={session}
        quiz={quiz}
        slug={slug}
        progressPct={view.progressPct}
      />

      <div className="w-full px-4 sm:px-6 lg:px-8 pt-2">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 xl:col-span-9">
            <QuizPageQuestions session={session} />

            <QuizTakingFooter
              session={session}
              view={view}
              onOpenSummary={() => setSummaryOpen(true)}
            />
          </div>

          {/* Summary rail — desktop only; phones use the footer's
              question-list dialog. */}
          <div className="lg:col-span-4 xl:col-span-3 hidden lg:block space-y-5 lg:sticky lg:top-32 lg:self-start">
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

      <QuizHintDialog
        open={hintDialogOpen}
        onOpenChange={setHintDialogOpen}
        hintText={view.activeQuestion.hint_text ?? ""}
      />

      <QuizSummaryDialog
        open={summaryOpen}
        onOpenChange={setSummaryOpen}
        items={summaryItems}
        answeredCount={view.completedCount}
        flaggedCount={view.flaggedCount}
        total={displayQuestions.length}
        passingScore={view.passingScore}
        onJump={jumpToQuestion}
      />
    </div>
  );
}
