import { useTranslation } from "react-i18next";
import { History } from "lucide-react";

import type {
  CourseInterviewController,
  InterviewConfig,
} from "./use-course-interview";

/**
 * Resume banner for a still-live attempt, moved verbatim out of
 * course-interview.tsx.
 */
export function LobbyResumeNotice({
  resumableSession,
  config,
}: {
  resumableSession: NonNullable<CourseInterviewController["resumableSession"]>;
  config: InterviewConfig;
}) {
  const { t } = useTranslation();
  return (
    <div
      className="mb-6 flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary-soft p-4 text-left"
      role="status"
    >
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-primary">
        <History className="h-4 w-4" aria-hidden="true" />
      </span>
      <div>
        <p className="text-sm font-bold text-text-strong">
          {t("course_interview.resume_dialog.notice_title", {
            attempt: resumableSession.attempt_number,
          })}
        </p>
        <p className="mt-1 text-xs leading-5 text-text-muted">
          {t(
            resumableSession.onboarding_stage === "completed"
              ? config.time_limit_minutes
                ? "course_interview.resume_dialog.assessment_notice"
                : "course_interview.resume_dialog.untimed_assessment_notice"
              : "course_interview.resume_dialog.onboarding_notice",
          )}
        </p>
      </div>
    </div>
  );
}
