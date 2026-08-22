import { GlassCard } from "@/components/ui/glass-card";
import { useTranslation } from "react-i18next";

import { LobbyAttemptHistory } from "./LobbyAttemptHistory";
import { LobbyHeader } from "./LobbyHeader";
import { LobbyResumeNotice } from "./LobbyResumeNotice";
import { LobbyStartActions, LobbyStartDialog } from "./LobbyStartActions";
import { LobbyStatTiles } from "./LobbyStatTiles";
import type {
  CourseInterviewController,
  InterviewConfig,
  InterviewCourse,
} from "./use-course-interview";

/**
 * Pre-start screen (mode selection) — moved verbatim out of
 * course-interview.tsx, with the header, mode picker, resume notice, stat tiles,
 * attempt history, input-mode toggle and start actions split into siblings.
 */
export function InterviewLobbyScreen({
  iv,
  course,
  config,
}: {
  iv: CourseInterviewController;
  course: InterviewCourse;
  config: InterviewConfig;
}) {
  const { t } = useTranslation();
  const { resumableSession } = iv;

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12 sm:px-6">
      <div className="max-w-xl w-full mx-auto space-y-4">
        {/* The lobby had no entrance at all, so the whole card — title, stats,
            attempt history, mode toggle — appeared in one frame. The results
            card and the setup checklist both animate in; this is the screen a
            candidate sees FIRST and it was the one that just popped. Full
            0.7s/32px here is right: this is a page-level card, not a chat beat. */}
        <GlassCard className="p-8 sm:p-10 text-center motion-safe:animate-fade-in-up">
          <LobbyHeader
            course={course}
            config={config}
            takingPayload={iv.takingPayload}
          />

          {resumableSession && (
            <LobbyResumeNotice
              resumableSession={resumableSession}
              config={config}
            />
          )}

          <LobbyStatTiles config={config} />

          {!resumableSession && iv.pastAttempts.length > 0 && (
            <LobbyAttemptHistory
              pastAttempts={iv.pastAttempts}
              slug={iv.slug}
              configId={iv.configId}
            />
          )}

          <LobbyStartActions iv={iv} />
        </GlassCard>
      </div>

      <LobbyStartDialog iv={iv} />
    </div>
  );
}
