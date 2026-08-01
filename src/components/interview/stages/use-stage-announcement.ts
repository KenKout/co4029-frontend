import { useMemo } from "react";
import type { TFunction } from "i18next";

import type { ConversationTurn } from "@/lib/interview/types";

/**
 * A11y (#9): announce the newest AI turn to screen readers. The visible
 * transcript re-renders silently on submit, so without a live region a SR
 * user never learns a new question / follow-up / hint arrived. We mirror the
 * latest AI turn's text (prefixed with its kind + question number when known)
 * into a polite, visually-hidden region. Only announce once a turn has been
 * presented so the typing animation and the announcement don't fight.
 *
 * Called last in `useFocusedStageTurns` so the overall hook order matches the
 * pre-split component, where this was the final `useMemo`.
 */
export function useStageAnnouncement({
  announceTurn,
  presentedAiTurnIds,
  assessmentActive,
  currentQuestionNumber,
  t,
}: {
  announceTurn: ConversationTurn | null;
  presentedAiTurnIds: ReadonlySet<string>;
  assessmentActive: boolean;
  currentQuestionNumber: number;
  t: TFunction;
}) {
  return useMemo(() => {
    if (!announceTurn || announceTurn.role !== "ai") return "";
    if (!presentedAiTurnIds.has(announceTurn.id)) return "";
    const kindPrefix =
      announceTurn.kind === "hint"
        ? `${t("course_interview.workspace.small_hint")}: `
        : announceTurn.kind === "clarification"
          ? `${t("course_interview.workspace.interviewer_clarification")}: `
          : announceTurn.kind === "followup"
            ? `${t("course_interview.sections.follow_up")}: `
            : assessmentActive && currentQuestionNumber
              ? `${t("course_interview.workspace.question_number", { current: currentQuestionNumber })}: `
              : "";
    return `${kindPrefix}${announceTurn.text}`;
  }, [
    announceTurn,
    presentedAiTurnIds,
    assessmentActive,
    currentQuestionNumber,
    t,
  ]);
}
