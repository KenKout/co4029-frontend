import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import type {
  GapReportAuthoringRead,
  InterviewSessionPublic,
} from "@/lib/api/types";
import { formatDate } from "./helpers";

export function Header({
  report,
  session,
  onBack,
}: {
  report: GapReportAuthoringRead;
  session: InterviewSessionPublic | null;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  // Prefer a human title (interview name) over the raw session UUID. Fall back
  // to the short session id only when no title is available.
  const title =
    report.interview_title ||
    session?.interview_title ||
    t("teacher_interview_gap_report.labels.session_id", {
      id: report.id.slice(0, 8),
    });
  return (
    <div className="flex items-start gap-3">
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 mt-1 shrink-0"
        title={t("common.back")}
        onClick={onBack}
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>

      <div className="space-y-1.5">
        <p className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t("teacher_interview_gap_report.sections.title")}
        </p>
        <h1 className="text-2xl lg:text-3xl font-extrabold font-headline tracking-tight text-gradient-primary leading-tight">
          {title}
        </h1>
        <p className="text-xs text-m3-on-surface-variant">
          {t("teacher_interview_gap_report.labels.updated_at", {
            date: formatDate(report.generated_at),
          })}
        </p>
      </div>
    </div>
  );
}
