import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";

import type { ConversationTurn } from "@/lib/interview/types";

/** "Introduction completed" cue, shown once the assessment has started and the
 * transcript still carries the opening/briefing turns. */
export function FocusedStageIntroBadge({
  assessmentActive,
  transcript,
}: {
  assessmentActive: boolean;
  transcript: ConversationTurn[];
}) {
  const { t } = useTranslation();
  const introduced = transcript.some(
    (turn) => turn.kind === "opening" || turn.kind === "briefing",
  );
  if (!assessmentActive || !introduced) return null;

  return (
    <div className="flex items-center gap-2 text-xs font-semibold text-success">
      <span className="flex size-5 items-center justify-center rounded-full bg-success/10">
        <Check className="h-3.5 w-3.5" />
      </span>
      {t("course_interview.workspace.introduction_completed")}
    </div>
  );
}
