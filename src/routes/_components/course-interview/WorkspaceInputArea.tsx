import { useTranslation } from "react-i18next";

import { FocusedAnswerComposer } from "@/components/interview/composer";
import { Button } from "@/components/ui/button";
import type { CourseInterviewController } from "./use-course-interview";
import { WorkspaceWindDown } from "./WorkspaceWindDown";

/**
 * Everything below the interview stage: the wrap-up skip bar, and the bottom
 * input surface. Moved verbatim out of course-interview.tsx.
 */
export function WorkspaceInputArea({ iv }: { iv: CourseInterviewController }) {
  const { t } = useTranslation();
  const { dictation } = iv;
  const questioning = iv.phase === "questioning";

  return (
    <>
      {iv.closingCeremonyActive && questioning && (
        <div className="shrink-0 border-t border-border bg-primary-soft/40 px-4 py-3">
          <div className="mx-auto flex max-w-[840px] flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-text-muted">
              {t("course_interview.workspace.wrap_up_hint")}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={iv.respond.isPending}
              onClick={() => void iv.beginClosing("natural")}
              className="gap-1.5 bg-white"
            >
              {t("course_interview.workspace.skip_and_finish")}
            </Button>
          </div>
        </div>
      )}

      {/* The bottom composer (Voice/Type bar) is only the answer surface
          during the assessed questioning phase. Throughout onboarding
          (opening/readiness) the SetupChecklist above is the sole input —
          name field, language, readiness — so the composer is hidden to
          avoid a redundant/confusing second input, then reappears once
          setup completes and the first question is asked. */}
      {iv.currentQuestion && questioning ? (
        <FocusedAnswerComposer
          value={
            dictation.listening && dictation.interim
              ? `${iv.answerText}${iv.answerText.trim().length > 0 ? " " : ""}${dictation.interim}`
              : iv.answerText
          }
          draftLength={iv.answerText.length}
          onChange={iv.setAnswerText}
          onSubmit={() => void iv.handleRespond()}
          onFinishRecording={() => void iv.handleRespond()}
          sending={iv.respond.isPending || iv.onboarding.isPending}
          micAvailable={Boolean(iv.isHybrid && dictation.supported)}
          micActive={dictation.listening}
          micPaused={dictation.paused}
          micError={
            dictation.error === "unsupported" ? undefined : dictation.error
          }
          onMicStart={dictation.start}
          onMicPause={dictation.pause}
          onMicResume={dictation.resume}
          onMicCancel={dictation.cancel}
          onMicRetry={dictation.retry}
          transcriptOpen={iv.transcriptOpen}
          onTranscriptToggle={() => iv.setTranscriptOpen((open) => !open)}
          elapsed={iv.elapsed}
          status={iv.agentStatus}
          onEndInterview={iv.openEndDialog}
        />
      ) : // Onboarding: the SetupChecklist above is the sole input surface,
      // so render no bottom bar at all (no composer, no wind-down).
      iv.phase === "opening" || iv.phase === "readiness" ? null : (
        <WorkspaceWindDown iv={iv} />
      )}
    </>
  );
}
