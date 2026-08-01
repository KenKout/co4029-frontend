import { Eye, MoreVertical, UserCog } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AtRiskStudent } from "@/lib/api/types";

import type { TranslateFn } from "./constants";

/** Nobody flagged: the good state, phrased as reassurance not absence. */
export function AtRiskEmptyState({ t }: { t: TranslateFn }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
        <UserCog className="h-6 w-6 text-emerald-600" />
      </div>
      <p className="text-sm font-semibold text-m3-on-surface">
        {t("teacher_sr_at_risk.empty_title")}
      </p>
      <p className="text-xs text-m3-on-surface-variant max-w-md">
        {t("teacher_sr_at_risk.empty_body")}
      </p>
    </div>
  );
}

export function AtRiskRowActions({
  student,
  onViewDetail,
  t,
}: {
  student: AtRiskStudent;
  onViewDetail: (studentId: string) => void;
  t: TranslateFn;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        onClick={(e) => e.stopPropagation()}
        aria-label={t("teacher_sr_at_risk.row_actions")}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-m3-on-surface-variant hover:bg-m3-surface-container-high cursor-pointer"
      >
        <MoreVertical className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onViewDetail(student.student_id)}>
          <Eye className="h-4 w-4" />
          {t("teacher_sr_at_risk.view_detail")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
