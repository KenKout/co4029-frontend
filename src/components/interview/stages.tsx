import { useTranslation } from "react-i18next";

// Conversation building blocks the stages compose.
import { UserTypingIndicator } from "@/components/interview/conversation";

import { FocusedStageIntroBadge } from "./stages/FocusedStageIntroBadge";
import { FocusedStageOnboardingTurn } from "./stages/FocusedStageOnboardingTurn";
import { FocusedStagePlaceholder } from "./stages/FocusedStagePlaceholder";
import { FocusedStageQuestionBlock } from "./stages/FocusedStageQuestionBlock";
import { FocusedStageStatusBar } from "./stages/FocusedStageStatusBar";
import { InterviewHeaderActions } from "./stages/InterviewHeaderActions";
import { InterviewHeaderBrand } from "./stages/InterviewHeaderBrand";
import { InterviewHeaderProgress } from "./stages/InterviewHeaderProgress";
import { InterviewHeaderStatus } from "./stages/InterviewHeaderStatus";
import { resolveHeaderProgress } from "./stages/helpers";
import type {
  FocusedInterviewStageProps,
  InterviewHeaderProps,
} from "./stages/types";
import { useFocusedStageTurns } from "./stages/use-focused-stage-turns";

export { QuestionCard } from "./stages/QuestionCard";

export function InterviewHeader({
  slug,
  courseName,
  interviewTitle,
  elapsed,
  timerActive = true,
  assessmentStartedAtMs,
  expectedDurationMinutes,
  currentQuestion,
  totalQuestions,
  connected = true,
  voiceOn,
  onToggleVoice,
  onEndInterview,
  endInterviewDisabled = false,
  showVoiceControl = true,
  questionElapsed,
  questionLingering = false,
}: InterviewHeaderProps) {
  const { safeCurrent, safeTotal, progress, expected } = resolveHeaderProgress({
    timerActive,
    assessmentStartedAtMs,
    expectedDurationMinutes,
    currentQuestion,
    totalQuestions,
  });

  return (
    <header className="sticky top-0 z-20 shrink-0 border-b border-border bg-white/95 backdrop-blur-md">
      <div className="mx-auto grid min-h-16 max-w-[1120px] grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-2 px-3 py-2.5 sm:px-6 lg:grid-cols-[minmax(220px,1fr)_minmax(260px,420px)_minmax(220px,1fr)]">
        <InterviewHeaderBrand
          slug={slug}
          courseName={courseName}
          interviewTitle={interviewTitle}
        />

        <InterviewHeaderProgress
          currentQuestion={currentQuestion}
          safeCurrent={safeCurrent}
          safeTotal={safeTotal}
          progress={progress}
          questionElapsed={questionElapsed}
          questionLingering={questionLingering}
        />

        <div className="flex items-center justify-end gap-1.5 lg:col-start-3">
          <InterviewHeaderStatus
            connected={connected}
            timerActive={timerActive}
            elapsed={elapsed}
            expected={expected}
          />
          <InterviewHeaderActions
            voiceOn={voiceOn}
            onToggleVoice={onToggleVoice}
            showVoiceControl={showVoiceControl}
            onEndInterview={onEndInterview}
            endInterviewDisabled={endInterviewDisabled}
          />
        </div>
      </div>
    </header>
  );
}

/** Focus-mode stage: one active prompt, status, and an on-demand transcript. */
export function FocusedInterviewStage({
  transcript,
  status,
  transcriptOpen,
  onTranscriptOpenChange,
  assessmentActive,
  currentQuestionNumber,
  totalQuestions,
  currentQuestionType,
  isUserTyping,
  questionTypeLabel,
  speak,
  onSpeakingChange,
  onTurnPresented,
  onClarifyQuestion,
  onRequestHint,
  onExplainTerm,
  onRetry,
  statusMessage,
  activeTurnActions,
  activeTurnActionsVisible = false,
  replayAvailable = true,
  submissionSlot,
  transcriptDocked = false,
}: FocusedInterviewStageProps) {
  const { t } = useTranslation();
  const {
    presentedAiTurnIds,
    replayingTurnId,
    activeTurn,
    assistanceTurn,
    hintUsed,
    replayBlocked,
    replayTurn,
    markPresented,
    announcement,
  } = useFocusedStageTurns({
    transcript,
    status,
    assessmentActive,
    currentQuestionNumber,
    replayAvailable,
    speak,
    onSpeakingChange,
    onTurnPresented,
    t,
  });

  return (
    <main
      className="min-h-0 flex-1 overflow-y-auto bg-surface"
      aria-label={t("course_interview.workspace.interview_room")}
    >
      {/* Polite SR announcement of the newest interviewer turn (#9). */}
      <p
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement}
      </p>
      {/* Top-aligned, NOT vertically centred. This column's height changes on
          almost every beat — the question card grows as the typewriter wraps to
          a new line, the submission rail mounts, the assistance card appears —
          and under `justify-center` every one of those re-centred the whole
          column, so the text drifted upward character by character while the
          candidate was reading it. Anchoring to the top costs a little empty
          space below on short turns and buys a stage that never moves. */}
      <div className="mx-auto flex min-h-full w-full max-w-[1000px] flex-col gap-5 px-4 py-6 sm:px-8 sm:py-8">
        <FocusedStageIntroBadge
          assessmentActive={assessmentActive}
          transcript={transcript}
        />

        {activeTurn ? (
          assessmentActive ? (
            <FocusedStageQuestionBlock
              activeTurn={activeTurn}
              assistanceTurn={assistanceTurn}
              status={status}
              currentQuestionNumber={currentQuestionNumber}
              totalQuestions={totalQuestions}
              currentQuestionType={currentQuestionType}
              questionTypeLabel={questionTypeLabel}
              speak={speak}
              onSpeakingChange={onSpeakingChange}
              onClarifyQuestion={onClarifyQuestion}
              onRequestHint={onRequestHint}
              onExplainTerm={onExplainTerm}
              presentedAiTurnIds={presentedAiTurnIds}
              replayBlocked={replayBlocked}
              replayingTurnId={replayingTurnId}
              hintUsed={hintUsed}
              markPresented={markPresented}
              replayTurn={replayTurn}
            />
          ) : (
            <FocusedStageOnboardingTurn
              activeTurn={activeTurn}
              questionTypeLabel={questionTypeLabel}
              speak={speak}
              onSpeakingChange={onSpeakingChange}
              activeTurnActions={activeTurnActions}
              activeTurnActionsVisible={activeTurnActionsVisible}
              presentedAiTurnIds={presentedAiTurnIds}
              replayAvailable={replayAvailable}
              replayBlocked={replayBlocked}
              replayingTurnId={replayingTurnId}
              markPresented={markPresented}
              replayTurn={replayTurn}
            />
          )
        ) : (
          <FocusedStagePlaceholder />
        )}

        {submissionSlot}

        <FocusedStageStatusBar
          status={status}
          statusMessage={statusMessage}
          onRetry={onRetry}
          transcript={transcript}
          transcriptOpen={transcriptOpen}
          transcriptDocked={transcriptDocked}
          onTranscriptOpenChange={onTranscriptOpenChange}
          presentedAiTurnIds={presentedAiTurnIds}
          questionTypeLabel={questionTypeLabel}
          speak={speak}
          onSpeakingChange={onSpeakingChange}
          replayBlocked={replayBlocked}
          replayingTurnId={replayingTurnId}
          replayTurn={replayTurn}
        />

        <UserTypingIndicator visible={isUserTyping} />
      </div>
    </main>
  );
}
