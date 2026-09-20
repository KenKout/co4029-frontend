import { Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

import { GenerationProgress } from "../quiz-results/GenerationProgress";
import type { QuizGenerationController } from "./use-quiz-generation-panel";

/**
 * Everything below the advanced disclosure: the mode help blurb, the live run
 * status (stage stepper + stepped % + elapsed + logs) and the submit button.
 */
export function GenerationPanelFooter({
  controller,
}: {
  controller: QuizGenerationController;
}) {
  const {
    isCoverageMode,
    displayRun,
    generationInProgress,
    selectedLessonIds,
    bloomOverflow,
    t,
  } = controller;
  return (
    <>
      {/* ── Mode help blurb ── */}
      <div className="rounded-xl bg-m3-secondary-fixed/20 border border-m3-secondary/10 p-3 flex gap-2 text-xs text-m3-on-surface-variant">
        <Sparkles className="h-4 w-4 text-m3-secondary shrink-0 mt-0.5" />
        <p>
          {isCoverageMode
            ? t("quiz_generation.mode.coverage_help")
            : t("quiz_generation.mode.topic_help")}
        </p>
      </div>

      {/* ── Live run status: stage stepper + stepped % + elapsed + logs ── */}
      {displayRun && <GenerationProgress run={displayRun} />}

      <Button
        type="submit"
        disabled={
          generationInProgress ||
          selectedLessonIds.length === 0 ||
          bloomOverflow
        }
        className="w-full gap-2 gradient-primary text-white border-0 shadow-ai-glow"
      >
        {generationInProgress ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {generationInProgress
          ? t("quiz_generation.generating")
          : t("quiz_generation.generate")}
      </Button>
    </>
  );
}
