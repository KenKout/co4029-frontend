import { useTranslation } from "react-i18next";
import { BookOpen, Loader2 } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import StudyPlanList from "./StudyPlanList";
import type { GapReportCardProps } from "./types";

/** Study plan / gap report. */
export function GapReportCard({ gapReport, phase }: GapReportCardProps) {
  const { t } = useTranslation();
  const studyPlan = gapReport.study_plan ?? [];

  return (
    <GlassCard className="p-6 motion-safe:animate-fade-in-up">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-full bg-m3-primary-fixed text-m3-primary">
          <BookOpen className="h-4 w-4" />
        </span>
        <h2 className="font-headline font-bold text-m3-primary">
          {phase === "pass"
            ? t("course_interview.sections.keep_growing")
            : t("course_interview.sections.your_path_forward")}
        </h2>
      </div>
      {gapReport.discrepancy_summary && (
        <p className="mb-4 text-sm leading-relaxed text-m3-on-surface-variant">
          {gapReport.discrepancy_summary}
        </p>
      )}
      {studyPlan.length > 0 && <StudyPlanList studyPlan={studyPlan} />}
    </GlassCard>
  );
}

/**
 * Post-session evaluation runs async in a worker, so the report can legitimately
 * be missing for a minute or two after the interview ends.
 */
export function GapReportPendingCard() {
  const { t } = useTranslation();
  return (
    <GlassCard className="p-6">
      <div className="flex items-center gap-2 text-sm font-semibold text-m3-primary">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t("course_interview.sections.gap_report_pending")}
      </div>
      <div className="mt-4 space-y-2">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="h-14 rounded-xl bg-m3-surface-container-low motion-safe:animate-pulse"
          />
        ))}
      </div>
    </GlassCard>
  );
}
