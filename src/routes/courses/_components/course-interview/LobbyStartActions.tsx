import { useRouter } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight, History } from "lucide-react";

import { StartInterviewDialog } from "@/components/interview/dialogs";
import { InterviewCameraErrorNotice } from "./InterviewCameraGateScreen";
import { Button } from "@/components/ui/button";
import type { CourseInterviewController } from "./use-course-interview";

/**
 * The lobby's action row (back link + start/resume button) and, as a separate
 * export because it renders OUTSIDE the lobby card, the start confirmation
 * dialog. Both moved verbatim out of course-interview.tsx.
 */

/**
 * The lobby's "back to course" affordance uses REAL browser history, not a
 * hardcoded Link. Reached through the curriculum item route, the lobby renders
 * at /courses/$slug/learn/$itemSlug — a Link to /learn would skip the student
 * to the bare learn index and lose their place. history.back() returns to
 * wherever they actually came from (lesson page, dashboard…); the learn route
 * is only the deep-link/no-history fallback. A live session elsewhere in the
 * page still gets its leave-blocker dialog — history.back() is a blocked
 * navigation the resolver can intercept, a Link bypasses the ask.
 */
function useBackToCourse(slug: string) {
  const router = useRouter();
  return () => {
    if (router.history.canGoBack()) {
      router.history.back();
      return;
    }
    void router.navigate({ to: "/courses/$slug/learn", params: { slug } });
  };
}

export function LobbyStartActions({ iv }: { iv: CourseInterviewController }) {
  const { t } = useTranslation();
  const { resumableSession, startSession } = iv;
  const startBlocked = startSession.isPending || iv.previousSessionsLoading;
  const goBack = useBackToCourse(iv.slug);

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <Button
        type="button"
        variant="outline"
        onClick={goBack}
        className="h-auto rounded-xl border-m3-outline-variant/40 px-6 py-3 text-sm font-bold text-m3-on-surface-variant hover:bg-m3-surface-container hover:text-m3-on-surface"
      >
        {t("course_interview.actions.back_to_course")}
      </Button>
      <Button
        onClick={() => iv.setStartDialogOpen(true)}
        disabled={startBlocked}
        className="gradient-primary text-white rounded-xl font-bold gap-2 px-8 py-3 h-auto"
      >
        {startBlocked
          ? t("course_interview.actions.starting")
          : resumableSession
            ? t("course_interview.resume_dialog.continue")
            : t("course_interview.actions.start")}
        {resumableSession ? (
          <History className="h-4 w-4" />
        ) : (
          <ArrowRight className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

export function LobbyStartDialog({ iv }: { iv: CourseInterviewController }) {
  const { resumableSession, startSession } = iv;
  return (
    <StartInterviewDialog
      open={iv.startDialogOpen}
      onOpenChange={(open) => {
        if (startSession.isPending && !open) return;
        iv.setStartDialogOpen(open);
      }}
      onConfirm={() => void iv.handleStart()}
      isPending={startSession.isPending}
      isResume={Boolean(resumableSession)}
      recordingConsentRequired={
        Boolean(iv.takingPayload?.recording_consent_required)
      }
      recordingConsentAccepted={iv.recordingConsentAccepted}
      onRecordingConsentChange={iv.setRecordingConsentAccepted}
      cameraNotice={<InterviewCameraErrorNotice camera={iv.cameraGate} />}
    />
  );
}
