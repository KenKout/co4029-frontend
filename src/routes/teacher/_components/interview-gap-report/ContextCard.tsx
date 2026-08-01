import { useTranslation } from "react-i18next";

import { GlassCard } from "@/components/ui/glass-card";
import type {
  GapReportAuthoringRead,
  InterviewSessionPublic,
} from "@/lib/api/types";
import { ContextIdentityRows } from "./ContextIdentityRows";
import { ContextSessionRows } from "./ContextSessionRows";

export function ContextCard({
  report,
  session,
}: {
  report: GapReportAuthoringRead;
  session: InterviewSessionPublic | null;
}) {
  const { t } = useTranslation();

  const startedAt = session?.started_at ?? null;
  const endedAt = session?.ended_at ?? null;
  // Exact duration in whole seconds (not rounded to minutes) so the teacher
  // sees the true attempt length, e.g. "2m 23s".
  const durationSec =
    startedAt && endedAt
      ? Math.max(
          0,
          Math.round(
            (new Date(endedAt).getTime() - new Date(startedAt).getTime()) /
              1000,
          ),
        )
      : null;

  return (
    <GlassCard className="p-6 space-y-4">
      <h2 className="font-headline font-bold text-base text-m3-primary mb-2">
        {t("teacher_interview_gap_report.sections.context")}
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
        <ContextIdentityRows report={report} session={session} />
        <ContextSessionRows
          startedAt={startedAt}
          endedAt={endedAt}
          durationSec={durationSec}
          session={session}
        />
      </div>

      {/* Gap overview merged into the context section. */}
      <div className="border-t border-m3-outline-variant/20 pt-4">
        <p className="text-[11px] uppercase font-bold tracking-widest text-m3-on-surface-variant mb-1.5">
          {t("teacher_interview_gap_report.sections.overview")}
        </p>
        {report.discrepancy_summary ? (
          <p className="text-sm text-m3-on-surface-variant leading-relaxed">
            {report.discrepancy_summary}
          </p>
        ) : (
          <p className="text-sm italic text-m3-on-surface-variant">
            {t("teacher_interview_gap_report.empty_states.no_overview")}
          </p>
        )}
      </div>
    </GlassCard>
  );
}
