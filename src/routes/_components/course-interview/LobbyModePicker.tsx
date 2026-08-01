import { useTranslation } from "react-i18next";
import { ListChecks } from "lucide-react";

import { cn } from "@/lib/utils";
import type { CourseInterviewController } from "./use-course-interview";

/**
 * Mode picker. Rendered only when a rehearsal is actually startable
 * — offering a choice that then 409s is worse than not offering it.
 * Hidden while resuming, because start_session returns the live
 * session untouched and the picker would be a lie.
 *
 * Moved verbatim out of course-interview.tsx.
 */
export function LobbyModePicker({
  sessionMode,
  setSessionMode,
  practiceInfo,
}: {
  sessionMode: CourseInterviewController["sessionMode"];
  setSessionMode: CourseInterviewController["setSessionMode"];
  practiceInfo: CourseInterviewController["practiceInfo"];
}) {
  const { t } = useTranslation();
  return (
    <fieldset className="mb-6 rounded-2xl border border-m3-outline-variant/40 bg-m3-surface-container-lowest p-4 text-left">
      <legend className="px-1 text-xs font-bold text-text-strong">
        {t("course_interview.mode.legend")}
      </legend>
      <div className="mt-1 grid gap-2 sm:grid-cols-2">
        {(["assessment", "practice"] as const).map((mode) => {
          const selected = sessionMode === mode;
          return (
            <button
              key={mode}
              type="button"
              aria-pressed={selected}
              onClick={() => setSessionMode(mode)}
              className={cn(
                "rounded-xl border p-3 text-left transition-colors motion-safe:duration-150",
                selected
                  ? "border-m3-primary bg-m3-primary-fixed"
                  : "border-m3-outline-variant/50 hover:border-m3-outline-variant",
              )}
            >
              <span className="block text-sm font-bold text-text-strong">
                {t(`course_interview.mode.${mode}_title`)}
              </span>
              <span className="mt-1 block text-xs leading-5 text-text-muted">
                {mode === "practice"
                  ? t("course_interview.mode.practice_help", {
                      count: practiceInfo?.runs_remaining ?? 0,
                    })
                  : t("course_interview.mode.assessment_help")}
              </span>
            </button>
          );
        })}
      </div>

      {/* The criteria, shown before the run rather than on request.
          Asking the interviewer for the rubric mid-session is still
          classified as an exfiltration attempt and refused, so the
          answer has to be on screen already for the student never to
          need to ask. */}
      {sessionMode === "practice" &&
        (practiceInfo?.criteria.length ?? 0) > 0 && (
          <div className="mt-3 rounded-xl border border-m3-outline-variant/30 bg-m3-surface p-3">
            <p className="text-xs font-bold text-text-strong">
              {t("course_interview.mode.criteria_title")}
            </p>
            <ul className="mt-2 space-y-1.5">
              {practiceInfo?.criteria.map((c) => (
                <li
                  key={c.id}
                  className="flex gap-2 text-xs leading-5 text-text-muted"
                >
                  <ListChecks
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-m3-primary"
                    aria-hidden="true"
                  />
                  <span>{c.outcome_text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
    </fieldset>
  );
}
