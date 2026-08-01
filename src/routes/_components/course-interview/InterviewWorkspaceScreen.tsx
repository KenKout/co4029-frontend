import { useTranslation } from "react-i18next";
import { ListChecks } from "lucide-react";

import { EndInterviewDialog } from "@/components/interview/dialogs";
import { ConnectionLostBanner } from "@/components/interview/error-banner";
import { InterviewProgressSteps } from "@/components/interview/interview-progress-steps";
import { InterviewHeader } from "@/components/interview/stages";
import { TranscriptPanel } from "@/components/interview/transcript";
import { questionTypeLabel } from "@/lib/interview/turn-factory";
import {
  FullscreenDialogs,
  LeaveBlockerDialog,
} from "./InterviewSessionDialogs";
import type {
  CourseInterviewController,
  InterviewConfig,
  InterviewCourse,
} from "./use-course-interview";
import { renderSubmissionSlot } from "./workspace-helpers";
import { WorkspaceInputArea } from "./WorkspaceInputArea";
import { WorkspaceStage } from "./WorkspaceStage";

/**
 * Text / hybrid mode chat UI — moved verbatim out of course-interview.tsx, with
 * the stage, the bottom input surface and the submission slot split into
 * siblings.
 */
export function InterviewWorkspaceScreen({
  iv,
  course,
  config,
}: {
  iv: CourseInterviewController;
  course: InterviewCourse;
  config: InterviewConfig;
}) {
  const { t } = useTranslation();
  const questioning = iv.phase === "questioning";

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-white">
      <InterviewHeader
        slug={iv.slug}
        courseName={course.title}
        interviewTitle={config.title}
        elapsed={iv.elapsed}
        timerActive={iv.assessmentStartedAtMs !== null}
        assessmentStartedAtMs={iv.assessmentStartedAtMs}
        expectedDurationMinutes={config.time_limit_minutes}
        currentQuestion={questioning ? iv.currentQuestionNumber : null}
        totalQuestions={iv.totalQuestions}
        questionElapsed={questioning ? iv.questionPacing.elapsedSeconds : null}
        questionLingering={iv.questionPacing.lingering}
        connected={iv.connected}
        voiceOn={iv.voiceOn}
        onToggleVoice={() =>
          iv.setVoiceOn((current) => {
            if (current) iv.setAiSpeaking(false);
            return !current;
          })
        }
        onEndInterview={iv.openEndDialog}
        endInterviewDisabled={iv.endInterviewDisabled}
      />

      {/* Persistent, not dismissible. The stakes of the run are the one thing a
          student must never be uncertain about mid-interview, and a toast at
          start would be long gone by the time it mattered. */}
      {iv.sessionMode === "practice" && (
        <div
          className="shrink-0 border-b border-m3-outline-variant/40 bg-m3-primary-fixed"
          role="status"
        >
          <div className="mx-auto flex max-w-[1120px] items-center justify-center gap-2 px-3 py-1.5 text-xs font-semibold text-m3-primary sm:px-6">
            <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
            {t("course_interview.mode.banner")}
          </div>
        </div>
      )}

      {/* Coarse step indicator: Setup → Interview → Completed (spec §4). */}
      <div className="shrink-0 border-b border-border bg-white/95">
        <div className="mx-auto flex max-w-[1120px] items-center justify-center px-3 py-2 sm:px-6">
          <InterviewProgressSteps current={iv.interviewStep} />
        </div>
      </div>

      {!iv.connected && (
        <div className="mx-auto w-full max-w-[840px] px-4 pt-3">
          <ConnectionLostBanner
            onRetry={() => iv.setConnected(navigator.onLine)}
          />
        </div>
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col">
          <WorkspaceStage iv={iv} submissionSlot={renderSubmissionSlot(iv)} />
          <WorkspaceInputArea iv={iv} />
        </div>

        <TranscriptPanel
          open={iv.transcriptOpen}
          onClose={() => iv.setTranscriptOpen(false)}
          transcript={iv.transcript}
          presentedAiTurnIds={iv.presentedAiTurnIds}
          questionTypeLabel={(type) => questionTypeLabel(type, t)}
          speak={iv.speakIfOn}
          onSpeakingChange={(speaking) => {
            iv.setAiSpeaking(iv.voiceOn && speaking);
            iv.setAiPresenting(speaking);
          }}
          onReplay={(turn) => void iv.speakIfOn(turn.text)}
          replayDisabled={!iv.voiceOn}
          replayingTurnId={null}
        />
      </div>

      <EndInterviewDialog
        open={iv.endDialogOpen}
        onOpenChange={(open) => {
          if (iv.finish.isPending && !open) return;
          iv.setEndDialogOpen(open);
        }}
        onConfirm={() => void iv.beginClosing("ended_early")}
        isPending={iv.finish.isPending}
      />
      <LeaveBlockerDialog iv={iv} />
      <FullscreenDialogs iv={iv} />
    </div>
  );
}
