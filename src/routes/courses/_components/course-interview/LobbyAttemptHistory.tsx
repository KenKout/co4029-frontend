import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { CheckCircle2, ChevronRight, Loader2, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import type { CourseInterviewController } from "./use-course-interview";

/**
 * Attempt history from the interview lobby, moved verbatim out of
 * course-interview.tsx.
 */

/**
 * Attempt history — the learner session contract exposes verdict
 * + date (no score %), so we surface a compact pass/fail list so
 * the lobby is a hub, not just a start button. Hidden while a
 * resumable session banner is showing to avoid double context.
 */
export function LobbyAttemptHistory({
  pastAttempts,
  slug,
  configId,
}: {
  pastAttempts: CourseInterviewController["pastAttempts"];
  slug: string;
  configId: string;
}) {
  const { t, i18n } = useTranslation();
  return (
    <div className="mb-6 rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-low p-3 text-left">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-m3-on-surface-variant">
        {t("course_interview.attempts.history_title")}
      </p>
      <ul className="space-y-1.5">
        {pastAttempts.slice(0, 3).map((s) => {
          const passed = s.pass_verdict === true;
          const failed = s.pass_verdict === false;
          return (
            <li key={s.session_id}>
              <Link
                to="/me/interviews/$sessionId"
                params={{ sessionId: s.session_id }}
                search={{ from: "course", course: slug, module: configId }}
                className="group flex items-center justify-between gap-2 rounded-lg px-1.5 py-1 text-xs outline-none transition-colors hover:bg-m3-surface-container focus-visible:ring-2 focus-visible:ring-m3-primary/40"
              >
                <span className="flex items-center gap-1.5 text-m3-on-surface-variant transition-colors group-hover:text-m3-primary">
                  {passed ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  ) : failed ? (
                    <XCircle className="h-3.5 w-3.5 text-danger" />
                  ) : (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-m3-outline" />
                  )}
                  {t("course_interview.attempts.attempt_n", {
                    n: s.attempt_number,
                  })}
                </span>
                <span className="flex items-center gap-2">
                  <span
                    className={cn(
                      "font-semibold",
                      passed
                        ? "text-success"
                        : failed
                          ? "text-danger"
                          : "text-m3-on-surface-variant",
                    )}
                  >
                    {passed
                      ? t("course_interview.attempts.passed")
                      : failed
                        ? t("course_interview.attempts.not_passed")
                        : t("course_interview.attempts.in_review")}
                  </span>
                  {(s.ended_at || s.started_at) && (
                    <span className="text-m3-outline tabular-nums">
                      {new Date(s.ended_at ?? s.started_at).toLocaleDateString(
                        i18n.language?.startsWith("vi") ? "vi-VN" : "en-US",
                        { month: "short", day: "numeric" },
                      )}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <Link
        to="/me/interviews"
        search={{ config: configId }}
        className="group mt-1.5 flex items-center justify-center gap-1 rounded-lg border border-m3-outline-variant/30 px-2 py-1.5 text-xs font-semibold text-m3-primary outline-none transition-all duration-300 opacity-75 hover:opacity-100 hover:border-m3-primary/40 hover:bg-m3-primary/10 focus-visible:ring-2 focus-visible:ring-m3-primary/40"
      >
        {t("course_interview.attempts.view_all")}
        <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}
