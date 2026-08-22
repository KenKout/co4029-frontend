import { useInterviewActions } from "./use-interview-actions";
import { useInterviewDrafts } from "./use-interview-drafts";
import { useInterviewPhaseState } from "./use-interview-phase-state";
import { useInterviewProgress } from "./use-interview-progress";
import { useInterviewRouteData } from "./use-interview-route-data";
import { useInterviewServerSync } from "./use-interview-server-sync";
import { useInterviewSpeech } from "./use-interview-speech";
import { useInterviewTurnState } from "./use-interview-turn-state";
import type { InterviewBase } from "./types";

/**
 * Every hook the course-interview page used to call inline, in EXACTLY the
 * original order. The groups are contiguous slices of that order, so React sees
 * the same hook sequence it saw before the file was split:
 *
 *   route → turn state → phase state → drafts → server sync → speech →
 *   progress → actions (beginClosing, handleTurnPresented, timeout)
 *
 * Reordering these calls, or moving a hook between groups, changes when effects
 * fire. Don't.
 */
export function useCourseInterview() {
  const route = useInterviewRouteData();
  const turnState = useInterviewTurnState();
  const phaseState = useInterviewPhaseState(route, turnState);
  const drafts = useInterviewDrafts(turnState, phaseState);
  const serverSync = useInterviewServerSync(route, turnState, phaseState);
  const speech = useInterviewSpeech(route, turnState, phaseState);
  const progress = useInterviewProgress(
    route,
    turnState,
    phaseState,
    serverSync,
    speech,
  );
  const base: InterviewBase = {
    ...route,
    ...turnState,
    ...phaseState,
    ...drafts,
    ...serverSync,
    ...speech,
    ...progress,
  };
  const actions = useInterviewActions(base);

  return { ...base, ...actions };
}

export type CourseInterviewController = ReturnType<typeof useCourseInterview>;
export type InterviewCourse = NonNullable<CourseInterviewController["course"]>;
export type InterviewConfig = NonNullable<CourseInterviewController["config"]>;
