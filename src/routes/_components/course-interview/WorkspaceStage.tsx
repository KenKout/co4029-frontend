import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useVoiceAssistant } from "@livekit/components-react";

import { SetupChecklist } from "@/components/interview/setup-checklist";
import { FocusedInterviewStage } from "@/components/interview/stages";
import { useMicrophoneAvailability } from "@/lib/hooks/use-microphone-availability";
import { questionTypeLabel } from "@/lib/interview/turn-factory";
import type { CourseInterviewController } from "./use-course-interview";
import {
  resolveIsUserTyping,
  resolveSetupStage,
  resolveStageStatusMessage,
} from "./workspace-helpers";

/**
 * The focused interview stage — the transcript, the active question card, the
 * status bar and the onboarding checklist. Moved verbatim out of
 * course-interview.tsx.
 */
export function WorkspaceStage({
  iv,
  submissionSlot,
}: {
  iv: CourseInterviewController;
  submissionSlot: ReactNode;
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

  return (
    <FocusedInterviewStage
      transcript={iv.transcript}
      status={iv.agentStatus}
      transcriptOpen={iv.transcriptOpen}
      onTranscriptOpenChange={iv.setTranscriptOpen}
      submissionSlot={submissionSlot}
      transcriptDocked
      assessmentActive={questioning}
      currentQuestionNumber={iv.currentQuestionNumber}
      totalQuestions={iv.totalQuestions}
      currentQuestionType={iv.currentQuestion?.question_type}
      isUserTyping={resolveIsUserTyping(iv)}
      questionTypeLabel={(type) => questionTypeLabel(type, t)}
      speak={iv.speakIfOn}
      replaySpeak={iv.replayIfOn}
      agentSpeaks={agentSpeaks}
      agentTranscriptions={agentTranscriptions}
      onSpeakingChange={(speaking) => {
        iv.setAiSpeaking(iv.voiceOn && speaking);
        iv.setAiPresenting(speaking);
      }}
      onTurnPresented={iv.handleTurnPresented}
      onClarifyQuestion={
        questioning
          ? () =>
              void iv.handleAssistance(
                t("course_interview.workspace.clarification_request"),
                "clarify",
                t("course_interview.workspace.clarification_request"),
              )
          : undefined
      }
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
      activeTurnActions={
        onboardingStage !== null ? (
          <SetupChecklist
            stage={onboardingStage}
            candidateName={iv.candidateName}
            language={iv.interviewLanguage}
            micConnected={microphone.available}
            disabled={iv.onboarding.isPending || iv.aiSpeaking}
            pending={iv.onboarding.isPending}
            onLanguageChange={(language) => {
              iv.setInterviewLanguage(language);
              void i18n.changeLanguage(language);
            }}
            onAction={(action, payload) =>
              void iv.handleOnboarding(action, payload?.language, payload?.name)
            }
          />
        ) : undefined
      }
      activeTurnActionsVisible={
        onboardingStage !== null && !iv.onboarding.isPending
      }
    />
  );
}
