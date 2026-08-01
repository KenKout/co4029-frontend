import { Link } from "@tanstack/react-router";
import { AlertTriangle, Clock, Eye } from "lucide-react";

import type { DataTableColumn } from "@/components/ui/data-table";
import type { useRelDate } from "@/lib/format/date";
import type { AtRiskStudent } from "@/lib/api/types";
import { cn } from "@/lib/utils";

import { SR_DETAIL_TO, type TranslateFn } from "./constants";
import { flagCountOf } from "./helpers";
import { WhyFlaggedChips } from "./WhyFlaggedChips";

function PriorityPill({
  student,
  t,
}: {
  student: AtRiskStudent;
  t: TranslateFn;
}) {
  const count = flagCountOf(student);
  const high = count >= 2;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold whitespace-nowrap",
        high ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700",
      )}
      title={t("teacher_sr_at_risk.flag_count", { count })}
    >
      {high ? (
        <AlertTriangle className="h-3 w-3" />
      ) : (
        <Eye className="h-3 w-3" />
      )}
      {high
        ? t("teacher_sr_at_risk.priority.high_label")
        : t("teacher_sr_at_risk.priority.low_label")}
    </span>
  );
}

export interface AtRiskColumnDeps {
  courseId: string;
  t: TranslateFn;
  relDate: ReturnType<typeof useRelDate>;
}

/** Student / why-flagged / priority columns for the at-risk roster table. */
export function buildAtRiskColumns({
  courseId,
  t,
  relDate,
}: AtRiskColumnDeps): DataTableColumn<AtRiskStudent>[] {
  return [
    {
      id: "student",
      header: t("teacher_sr_at_risk.cols.student"),
      cell: (s) => (
        <div className="min-w-0">
          <Link
            to={SR_DETAIL_TO}
            params={{ courseId, studentId: s.student_id }}
            onClick={(e) => e.stopPropagation()}
            className="block max-w-[24ch] truncate text-sm font-semibold text-m3-on-surface hover:text-m3-primary hover:underline"
          >
            {s.name}
          </Link>
          <span className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-m3-on-surface-variant">
            <Clock className="h-3 w-3" />
            {relDate(s.last_active_at)}
          </span>
        </div>
      ),
    },
    {
      id: "why_flagged",
      header: t("teacher_sr_at_risk.cols.why_flagged"),
      cell: (s) => <WhyFlaggedChips student={s} />,
    },
    {
      id: "priority",
      header: t("teacher_sr_at_risk.cols.priority"),
      align: "center",
      cell: (s) => <PriorityPill student={s} t={t} />,
    },
  ];
}
