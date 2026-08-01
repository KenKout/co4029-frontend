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
  } = controller;
  return (
    <>
      {/* ── Mode help blurb ── */}
      <div className="rounded-xl bg-m3-secondary-fixed/20 border border-m3-secondary/10 p-3 flex gap-2 text-xs text-m3-on-surface-variant">
        <Sparkles className="h-4 w-4 text-m3-secondary shrink-0 mt-0.5" />
        <p>
          {isCoverageMode
            ? "Coverage mode allocates questions per section so every chunk of the lesson gets representation."
            : "Topic mode picks a balanced spread across the selected lessons. Switch to coverage mode for full lesson breadth."}
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
        {generationInProgress ? "Generating…" : "Generate questions"}
      </Button>
    </>
  );
}
