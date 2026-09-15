import { Link } from "@tanstack/react-router";
import { AlertTriangle, Clock, Eye } from "lucide-react";

import type { DataTableColumn } from "@/components/ui/data-table";
import { UserEmailIdentity } from "@/components/ui/user-identity";
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
  /** id → User, from the page's one shared `/users/by-ids` lookup. */
  userById: Map<string, import("@/lib/api/types").User>;
}

/** Student / why-flagged / priority columns for the at-risk roster table. */
export function buildAtRiskColumns({
  courseId,
  t,
  relDate,
  userById,
}: AtRiskColumnDeps): DataTableColumn<AtRiskStudent>[] {
  return [
    {
      id: "student",
      header: t("teacher_sr_at_risk.cols.student"),
      cell: (s) => {
        const u = userById.get(s.student_id);
        return (
          <Link
            to={SR_DETAIL_TO}
            params={{ courseId, studentId: s.student_id }}
            onClick={(e) => e.stopPropagation()}
            className="flex min-w-0 items-center gap-3 max-w-[26ch]"
          >
            <UserEmailIdentity
              id={s.student_id}
              displayName={u?.profile?.display_name || s.name}
              avatarUrl={u?.profile?.avatar_url ?? null}
              email={u?.primary_email ?? null}
              subtitle={
                <>
                  <Clock className="h-3 w-3 shrink-0" />
                  {relDate(s.last_active_at)}
                </>
              }
              className="min-w-0"
            />
          </Link>
        );
      },
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
