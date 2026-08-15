import { useMemo, useRef, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  useTranscriptions,
  useVoiceAssistant,
} from "@livekit/components-react";

import { SetupChecklistDialog } from "@/components/interview/setup-checklist-dialog";
import { FocusedInterviewStage } from "@/components/interview/stages";
import {
  liveAgentConversationTurns,
  mergeTranscriptionSegments,
} from "@/components/interview/voice-transcript/display-items";
import { useMicrophoneAvailability } from "@/lib/hooks/use-microphone-availability";
import type { ConversationTurn } from "@/lib/interview/types";
import { questionTypeLabel } from "@/lib/interview/turn-factory";
import type { CourseInterviewController } from "./use-course-interview";
import {
  resolveIsUserTyping,
  resolveSetupStage,
  resolveStageStatusMessage,
} from "./workspace-helpers";

/**
 * The transcript kind an announced agent beat renders as. `repeat` is absent:
 * a repeat (the rejoin re-read) restates the pinned card and is suppressed
 * from the transcript by its announced text instead of badged.
 */
const AGENT_ACTION_TURN_KIND: Partial<Record<string, ConversationTurn["kind"]>> = {
  hint: "hint",
  clarify: "clarification",
  explain_term: "clarification",
  question: "question",
};

/**
 * The focused interview stage — the transcript, the active question card, the
 * status bar and the onboarding checklist. Moved verbatim out of
 * course-interview.tsx.
 */
export function WorkspaceStage({
  iv,
  submissionSlot,
  agentActions = [],
}: {
  iv: CourseInterviewController;
  submissionSlot: ReactNode;
  agentActions?: readonly { kind: string; seq: number; text?: string }[];
}) {
  const { t, i18n } = useTranslation();
  const { dictation } = iv;
  // NOT `dictation.supported` — Web Speech support is unrelated to whether a
  // microphone exists, so that reported "Connected" to candidates who had none.
  const microphone = useMicrophoneAvailability();
  const questioning = iv.phase === "questioning";
  const onboardingStage = resolveSetupStage(iv.phase, iv.onboardingStage);
  // When an agent is in the room it is the voice, and livekit-agents publishes
  // a transcript already paced to its real TTS playout (sync_transcription is
  // set in realtime/agent.py). The question card mirrors that instead of
  // animating its own guess at the speed. No agent → the card keeps the
  // typewriter, so text-only sessions are untouched.
  //
  // Read HERE, not in the card: this component is inside the room provider,
  // whereas QuestionCard also renders outside any room and useVoiceAssistant
  // throws without a RoomContext.
  const { agent, agentTranscriptions } = useVoiceAssistant();
  const agentSpeaks = Boolean(agent);
  // The agent's follow-ups and probes reach the client ONLY as transcription —
  // the server commits no turn for them — so without this they were dropped and
  // the candidate saw their own answer followed by silence.
  const allStreams = useTranscriptions();
  // Assistance the server announced (a granted hint, a typed clarify request)
  // applies to the agent's NEXT live utterance. LiveKit gives no cross-stream
  // ordering, so the match is made by ARRIVAL: the first live AI segment whose
  // id has not been seen consumes the oldest unconsumed action. Assignments are
  // memoized by segment id — a segment that arrives before its action keeps its
  // derived kind, and re-renders never re-badge a turn that was already tagged.
  const taggedKindsRef = useRef<Map<string, ConversationTurn["kind"]>>(new Map());
  const seenSegmentIdsRef = useRef<Set<string>>(new Set());
  const suppressedTextsRef = useRef<Set<string>>(new Set());
  const consumedActionSeqRef = useRef(0);
  const liveAgentTurns = useMemo(() => {
    const queue = agentActions
      .filter((action) => action.seq > consumedActionSeqRef.current)
      .map((action) => ({
        seq: action.seq,
        kind: AGENT_ACTION_TURN_KIND[action.kind],
        suppress: action.kind === "repeat" ? action.text : undefined,
      }));
    for (const action of agentActions) {
      if (action.kind === "repeat" && action.text) {
        suppressedTextsRef.current.add(action.text.trim().toLowerCase());
      }
    }
    return liveAgentConversationTurns(
      mergeTranscriptionSegments(
        agentTranscriptions,
        allStreams,
        agent?.identity,
      ),
      iv.assessmentStartedAtMs,
    ).map((turn) => {
      if (turn.role === "ai" && suppressedTextsRef.current.size > 0) {
        if (suppressedTextsRef.current.has(turn.text.trim().toLowerCase())) {
          return null;
        }
      }
      if (turn.role !== "ai") return turn;
      const known = taggedKindsRef.current.get(turn.id);
      if (known) {
        seenSegmentIdsRef.current.add(turn.id);
        return { ...turn, kind: known };
      }
      // Only a segment appearing for the FIRST time may consume an action.
      // A segment that predates the action (the opening paraphrase, an old
      // probe) already rendered with its derived kind — re-badging it later
      // made the first question read "Small hint" after the candidate asked
      // for a hint minutes later.
      if (seenSegmentIdsRef.current.has(turn.id)) return turn;
      seenSegmentIdsRef.current.add(turn.id);
      while (queue.length > 0) {
        const action = queue.shift();
        if (action === undefined) break;
        consumedActionSeqRef.current = action.seq;
        if (action.kind === undefined) continue;
        taggedKindsRef.current.set(turn.id, action.kind);
        return { ...turn, kind: action.kind };
      }
      return turn;
    });
  }, [
    agent?.identity,
    agentActions,
    agentTranscriptions,
    allStreams,
    iv.assessmentStartedAtMs,
  ]);

  // The modal is shown ONLY between the interviewer's turns: it hides while a
  // request is in flight and while the new turn is being spoken, then returns with
  // the next step revealed. Per step, not once — a latch kept it open over a
  // speaking interviewer with the next step's buttons already live.
  //
  // `presentedAiTurnIds` is the route's record of turns whose presentation
  // completed, which is the same gate the checklist used when it rendered inline.
  const lastAiTurnId = useMemo(() => {
    for (let index = iv.transcript.length - 1; index >= 0; index -= 1) {
      if (iv.transcript[index].role === "ai") return iv.transcript[index].id;
    }
    return null;
  }, [iv.transcript]);
  const setupReady =
    lastAiTurnId !== null &&
    iv.presentedAiTurnIds.has(lastAiTurnId) &&
    !iv.onboarding.isPending;

  return (
    <>
      <FocusedInterviewStage
        transcript={iv.transcript}
        liveAgentTurns={liveAgentTurns}
        status={iv.agentStatus}
        submissionSlot={submissionSlot}
        assessmentActive={questioning}
        currentQuestionNumber={iv.currentQuestionNumber}
        totalQuestions={iv.totalQuestions}
        currentQuestionType={iv.currentQuestion?.question_type}
        isUserTyping={resolveIsUserTyping(iv)}
        questionTypeLabel={(type) => questionTypeLabel(type, t)}
        speak={iv.speakIfOn}
        replaySpeak={iv.replayIfOn}
        agentSpeaks={agentSpeaks}
        onSpeakingChange={(speaking) => {
          iv.setAiSpeaking(iv.voiceOn && speaking);
          iv.setAiPresenting(speaking);
        }}
        onTurnPresented={iv.handleTurnPresented}
        onRequestHint={
          questioning
            ? () =>
                void iv.handleAssistance(
                  t("course_interview.workspace.hint_request"),
                  "hint",
                  t("course_interview.workspace.hint_request"),
                )
            : undefined
        }
        onExplainTerm={
          questioning
            ? (term) =>
                void iv.handleAssistance(
                  t("course_interview.workspace.term_request", { term }),
                  "explain_term",
                  t("course_interview.workspace.term_request", { term }),
                )
            : undefined
        }
        statusMessage={resolveStageStatusMessage(iv, t)}
        onRetry={() => {
          if (!iv.connected) {
            iv.setConnected(navigator.onLine);
          } else if (iv.dictationHasError) {
            dictation.retry();
          } else {
            void (iv.phase === "opening" || iv.phase === "readiness"
              ? iv.handleOnboarding()
              : iv.handleRespond());
          }
        }}
        replayAvailable={iv.voiceOn}
      />
      {onboardingStage !== null && (
        <SetupChecklistDialog
          open={setupReady}
          stage={onboardingStage}
          candidateName={iv.candidateName}
          language={iv.interviewLanguage}
          micConnected={microphone.available}
          // The modal is only mounted between turns, so there is nothing to guard
          // against here beyond a request already in flight.
          disabled={iv.onboarding.isPending}
          pending={iv.onboarding.isPending}
          onLanguageChange={(language) => {
            iv.setInterviewLanguage(language);
            void i18n.changeLanguage(language);
          }}
          onAction={(action, payload) =>
            void iv.handleOnboarding(action, payload?.language, payload?.name)
          }
        />
      )}
    </>
  );
}
