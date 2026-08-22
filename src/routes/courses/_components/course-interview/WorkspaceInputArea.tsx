import { useTranslation } from "react-i18next";

import { FocusedAnswerComposer } from "@/components/interview/composer/FocusedAnswerComposer";
import { RoomControlBar } from "@/components/interview/composer/RoomControlBar";
import { Button } from "@/components/ui/button";
import { isComposerLocked } from "@/lib/interview/composer-lock";
import type { CourseInterviewController } from "./use-course-interview";
import { WorkspaceWindDown } from "./WorkspaceWindDown";

/**
 * Everything below the interview stage: the wrap-up skip bar, and the bottom
 * input surface (room control bar + answer composer). Moved verbatim out of
 * course-interview.tsx.
 */
export function WorkspaceInputArea({
  iv,
  chatPending = false,
  roomDown = false,
}: {
  iv: CourseInterviewController;
  /** In-flight flag of the LiveKit turn transport, read directly from the hook. */
  chatPending?: boolean;
  /** The room is down (not connected) — there is no second transport. */
  roomDown?: boolean;
}) {
  const { t } = useTranslation();
  const questioning = iv.phase === "questioning";
  const sending = chatPending || iv.onboarding.isPending;
  // Wider than `sending` on purpose — see isComposerLocked. Keeps the composer
  // shut through the beat between "turn accepted" and "AI has replied", which is
  // when a second answer used to reach a handler that silently discarded it.
  const submitLocked = isComposerLocked({
    answerStatus: iv.answer.state.status,
    requestPending: sending,
    agentStatus: iv.agentStatus,
    roomDown,
  });

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
              disabled={iv.turnPending}
              onClick={() => void iv.beginClosing("natural")}
              className="gap-1.5 bg-white"
            >
              {t("course_interview.workspace.skip_and_finish")}
            </Button>
          </div>
        </div>
      )}

      {/* The bottom surface is only the answer surface during the assessed
          questioning phase. Throughout onboarding (opening/readiness) the
          SetupChecklist above is the sole input — name field, language,
          readiness — so the composer is hidden to avoid a redundant/confusing
          second input, then reappears once setup completes and the first
          question is asked. */}
      {iv.currentQuestion && questioning ? (
        <FocusedAnswerComposer
          value={iv.answerText}
          draftLength={iv.answerText.length}
          onChange={iv.setAnswerText}
          onSubmit={() => void iv.handleRespond()}
          sending={sending}
          submitLocked={submitLocked}
          controlBar={
            <RoomControlBar
              // Mirror the real track state up to the controller so the room
              // provider's `audio` prop (and its reconnect-sync effect) agree
              // with what useTrackToggle actually published — otherwise a
              // reconnect would mute a candidate who had toggled the mic on.
              onMicEnabledChange={iv.setMicOn}
              disabled={submitLocked || roomDown}
              endDisabled={iv.endInterviewDisabled}
              onEndInterview={iv.openEndDialog}
            />
          }
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
