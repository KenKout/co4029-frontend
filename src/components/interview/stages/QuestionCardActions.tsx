import { useTranslation } from "react-i18next";
import { CircleHelp, Loader2, Volume2 } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Replay / ask-for-clarification rail under the question. Both actions stay
 * disabled until the question has finished presenting. */
export function QuestionCardActions({
  presentationComplete,
  replayDisabled,
  clarificationDisabled,
  isReplaying,
  onReplay,
  onClarify,
}: {
  presentationComplete: boolean;
  replayDisabled: boolean;
  clarificationDisabled: boolean;
  isReplaying: boolean;
  onReplay: () => void;
  onClarify: (() => void) | undefined;
}) {
  const { t } = useTranslation();

  return (
    <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-4 sm:pl-14">
      <Button
        type="button"
        variant="ghost"
        size="lg"
        onClick={onReplay}
        disabled={!presentationComplete || replayDisabled}
        className="min-h-11 rounded-lg px-3 text-text-muted hover:text-primary"
        aria-label={t("course_interview.workspace.replay_question")}
        title={t("course_interview.workspace.replay_question")}
      >
        {isReplaying ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Volume2 className="h-4 w-4" />
        )}
        {t("course_interview.workspace.replay")}
      </Button>
      {onClarify && (
        <Button
          type="button"
          variant="ghost"
          size="lg"
          onClick={onClarify}
          disabled={!presentationComplete || clarificationDisabled}
          className="min-h-11 rounded-lg px-3 text-text-muted hover:text-primary"
        >
          <CircleHelp className="h-4 w-4" />
          {t("course_interview.workspace.ask_clarification")}
        </Button>
      )}
    </div>
  );
}
