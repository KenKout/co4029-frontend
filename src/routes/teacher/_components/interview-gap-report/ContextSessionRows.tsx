import { useTranslation } from "react-i18next";

import type { InterviewSessionPublic } from "@/lib/api/types";
import { ContextRow } from "./ContextRow";
import { VerdictBadge } from "./VerdictBadge";
import { formatDate } from "./helpers";

/**
 * When / how / how it ended — the session half of the context grid. Returns a
 * fragment so the rows stay direct children of the grid.
 */
export function ContextSessionRows({
  startedAt,
  endedAt,
  durationSec,
  session,
}: {
  startedAt: string | null;
  endedAt: string | null;
  durationSec: number | null;
  session: InterviewSessionPublic | null;
}) {
  const { t } = useTranslation();

  const status = session?.status ?? null;
  const verdict = session?.pass_verdict ?? null;

  return (
    <>
      <ContextRow
        label={t("teacher_interview_gap_report.labels.started_at")}
        value={startedAt ? formatDate(startedAt) : "—"}
      />
      <ContextRow
        label={t("teacher_interview_gap_report.labels.ended_at")}
        value={
          endedAt
            ? formatDate(endedAt)
            : t("teacher_interview_gap_report.labels.in_progress")
        }
      />
      {durationSec != null && (
        <ContextRow
          label={t("teacher_interview_gap_report.labels.duration")}
          value={t("teacher_interview_gap_report.labels.duration_value", {
            minutes: Math.floor(durationSec / 60),
            seconds: String(durationSec % 60).padStart(2, "0"),
          })}
        />
      )}
      {session?.input_mode && (
        <ContextRow
          label={t("teacher_interview_gap_report.labels.mode")}
          value={session.input_mode}
        />
      )}
      {status && (
        <ContextRow
          label={t("teacher_interview_gap_report.labels.status")}
          value={status}
        />
      )}
      {verdict !== null && (
        <ContextRow
          label={t("teacher_interview_gap_report.labels.verdict")}
          value={<VerdictBadge verdict={verdict} />}
        />
      )}
    </>
  );
}
