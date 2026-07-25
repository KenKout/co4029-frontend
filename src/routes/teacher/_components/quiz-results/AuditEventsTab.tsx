import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

import { useQuizAuditEvents } from "@/lib/api/hooks/quizzes";

/**
 * Phase 13 — audit trail: an append-only, most-recent-first log of teacher /
 * student actions on a quiz (submit, regrade, manual-grade, override CRUD,
 * question edit, publish). Read-only.
 */
export function AuditEventsTab({ quizId }: { quizId: string }) {
  const { t } = useTranslation();
  const { data: events, isLoading } = useQuizAuditEvents(quizId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-m3-secondary" />
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <p className="text-sm text-m3-on-surface-variant py-8 text-center">
        {t("teacher_quiz_results.audit.empty")}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-m3-outline-variant/30">
      <table className="w-full text-sm">
        <thead className="bg-m3-surface-container-low text-m3-on-surface-variant">
          <tr>
            <th className="px-3 py-2 text-left font-semibold">
              {t("teacher_quiz_results.audit.col_event")}
            </th>
            <th className="px-3 py-2 text-left font-semibold">
              {t("teacher_quiz_results.audit.col_when")}
            </th>
            <th className="px-3 py-2 text-left font-semibold">
              {t("teacher_quiz_results.audit.col_details")}
            </th>
          </tr>
        </thead>
        <tbody>
          {events.map((ev) => (
            <tr key={ev.id} className="border-t border-m3-outline-variant/20">
              <td className="px-3 py-2">
                <span className="inline-block rounded-md bg-m3-surface-container px-2 py-0.5 text-xs font-medium text-m3-on-surface">
                  {t(`teacher_quiz_results.audit.events.${ev.event_name}`, {
                    defaultValue: ev.event_name,
                  })}
                </span>
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-m3-on-surface-variant">
                {new Date(ev.occurred_at).toLocaleString()}
              </td>
              <td className="px-3 py-2 max-w-md truncate text-m3-on-surface-variant">
                {Object.keys(ev.payload_json).length > 0
                  ? JSON.stringify(ev.payload_json)
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
