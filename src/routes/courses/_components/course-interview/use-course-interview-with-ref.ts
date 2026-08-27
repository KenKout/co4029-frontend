import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useInterviewActions } from "./use-interview-actions";
import { useInterviewDrafts } from "./use-interview-drafts";
import { useInterviewPhaseState } from "./use-interview-phase-state";
import { useInterviewProgress } from "./use-interview-progress";
import { useInterviewRouteDataWithRef } from "./use-interview-route-data-with-ref";
import { useInterviewServerSync } from "./use-interview-server-sync";
import { useInterviewSpeech } from "./use-interview-speech";
import { useInterviewTurnState } from "./use-interview-turn-state";
import type { InterviewBase } from "./types";

export function useCourseInterviewWithRef(slug: string, configRef: string) {
  const route = useInterviewRouteDataWithRef(slug, configRef);
  const turnState = useInterviewTurnState();
  const phaseState = useInterviewPhaseState(route as never, turnState);
  const drafts = useInterviewDrafts(turnState, phaseState);
  const serverSync = useInterviewServerSync(route as never, turnState, phaseState);
  const speech = useInterviewSpeech(route as never, turnState, phaseState);
  const progress = useInterviewProgress(
    route as never,
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
  const actions = useInterviewActions(base as never);
  return { ...base, ...actions };
}

export type CourseInterviewWithRefController = ReturnType<typeof useCourseInterviewWithRef>;
