import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  MinusCircle,
  XCircle,
} from "lucide-react";

import { useInterviewSessionsForConfig } from "@/lib/api/hooks/interviews";
import { formatDate } from "@/lib/format/date";
import type { InterviewSessionSummary } from "@/lib/api/types";

type VerdictState =
  | "passed"
  | "not_passed"
  | "evaluating"
  | "in_progress"
  | "evaluation_failed"
  | "not_graded";

function verdictState(s: InterviewSessionSummary): VerdictState {
  if (s.status === "in_progress") return "in_progress";
  if (s.status === "failed") return "evaluation_failed";
  if (s.status === "abandoned") return "not_graded";
  if (s.pass_verdict === true) return "passed";
  if (s.pass_verdict === false) return "not_passed";
  return "evaluating";
}

const BADGE_CLASS: Record<VerdictState, string> = {
  passed: "bg-emerald-100 text-emerald-700",
  not_passed: "bg-red-100 text-red-700",
  evaluating: "bg-amber-50 text-amber-700",
  in_progress: "bg-slate-100 text-slate-600",
  evaluation_failed: "bg-red-100 text-red-700",
  not_graded: "bg-slate-100 text-slate-600",
};

// PLACEHOLDER_LIST
export function InterviewSessionsList({ configId }: { configId: string }) {
  const { t, i18n } = useTranslation();
  const locale =
    (i18n.resolvedLanguage ?? i18n.language ?? "en") === "vi"
      ? "vi-VN"
      : "en-US";
  const { data, isLoading } = useInterviewSessionsForConfig(configId);
  const sessions = data ?? [];

  return (
    <div className="bg-m3-surface-container-lowest border border-m3-outline-variant/20 rounded-xl p-6 lg:p-8 space-y-4 shadow-glass">
      <div>
        <h3 className="font-headline font-extrabold text-base text-m3-on-surface">
          {t("teacher_interview_config.sessions.list_title")}
        </h3>
        <p className="text-xs text-m3-on-surface-variant mt-0.5">
          {t("teacher_interview_config.sessions.list_description")}
        </p>
      </div>

      {isLoading && (
        <p className="text-xs text-m3-on-surface-variant">
          {t("common.loading")}
        </p>
      )}

      {!isLoading && sessions.length === 0 && (
        <p className="text-[11px] text-m3-on-surface-variant bg-m3-surface-container-low rounded-xl px-3 py-2">
          {t("teacher_interview_config.sessions.empty")}
        </p>
      )}

      {sessions.length > 0 && (
        <ul className="space-y-2">
          {sessions.map((s) => {
            const state = verdictState(s);
            return (
              <li key={s.session_id}>
                <Link
                  to="/teacher/interview-sessions/$sessionId/gap-report"
                  params={{ sessionId: s.session_id }}
                  className="flex items-center gap-3 rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-low p-3 hover:shadow-editorial transition-all group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-m3-on-surface truncate">
                      {s.student_name ?? s.student_id}
                    </p>
                    <div className="mt-0.5 flex items-center gap-3 text-[11px] text-m3-on-surface-variant">
                      <span>
                        {t("teacher_interview_config.sessions.attempt", {
                          n: s.attempt_number,
                        })}
                      </span>
                      <span>{formatDate(s.started_at, locale)}</span>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md shrink-0 ${BADGE_CLASS[state]}`}
                  >
                    {state === "passed" && <CheckCircle2 className="h-3 w-3" />}
                    {state === "evaluating" && (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    )}
                    {state === "evaluation_failed" && (
                      <XCircle className="h-3 w-3" />
                    )}
                    {state === "not_graded" && (
                      <MinusCircle className="h-3 w-3" />
                    )}
                    {t(`teacher_interview_config.sessions.state.${state}`)}
                  </span>
                  <ArrowRight className="h-4 w-4 text-m3-on-surface-variant shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
