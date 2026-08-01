import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight, History } from "lucide-react";

import { StartInterviewDialog } from "@/components/interview/dialogs";
import { Button } from "@/components/ui/button";
import type { CourseInterviewController } from "./use-course-interview";

/**
 * The lobby's action row (back link + start/resume button) and, as a separate
 * export because it renders OUTSIDE the lobby card, the start confirmation
 * dialog. Both moved verbatim out of course-interview.tsx.
 */

export function LobbyStartActions({ iv }: { iv: CourseInterviewController }) {
  const { t } = useTranslation();
  const { resumableSession, startSession } = iv;
  const startBlocked = startSession.isPending || iv.previousSessionsLoading;

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <Link
        to="/courses/$slug/learn"
        params={{ slug: iv.slug }}
        className="inline-flex h-auto items-center rounded-xl border border-m3-outline-variant/40 px-6 py-3 text-sm font-bold text-m3-on-surface-variant outline-none transition-colors hover:bg-m3-surface-container hover:text-m3-on-surface focus-visible:ring-2 focus-visible:ring-m3-primary/40"
      >
        {t("course_interview.actions.back_to_course")}
      </Link>
      <Button
        onClick={() => iv.setStartDialogOpen(true)}
        disabled={startBlocked}
        className="gradient-primary text-white rounded-xl font-bold gap-2 px-8 py-3 h-auto"
      >
        {startBlocked
          ? t("course_interview.actions.starting")
          : resumableSession
            ? t("course_interview.resume_dialog.continue")
            : iv.inputMode === "voice"
              ? t("course_interview.actions.start_voice")
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
    />
  );
}
