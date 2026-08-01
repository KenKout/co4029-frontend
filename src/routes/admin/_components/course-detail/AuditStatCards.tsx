import { ActivityIcon, CircleDollarSign, Cpu, HardDrive } from "lucide-react";

import { StatCard } from "@/components/ui/stat-card";

import type { CourseAuditQuery, CourseDetailFormatters, TFn } from "./types";

export function AuditStatCards({
  t,
  f,
  audit,
}: {
  t: TFn;
  f: CourseDetailFormatters;
  audit: CourseAuditQuery;
}) {
  const { formatNumber, formatUsd } = f;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        label={t("admin.course_detail.stats.total_cost")}
        value={formatUsd(audit.data?.total_cost_usd)}
        icon={CircleDollarSign}
      />
      <StatCard
        label={t("admin.course_detail.stats.tokens")}
        value={formatNumber(
          (audit.data?.total_input_tokens ?? 0) +
            (audit.data?.total_output_tokens ?? 0),
        )}
        icon={Cpu}
      />
      <StatCard
        label={t("admin.course_detail.stats.calls")}
        value={formatNumber(audit.data?.total_calls)}
        icon={ActivityIcon}
      />
      <StatCard
        label={t("admin.course_detail.stats.pipeline_runs")}
        value={formatNumber(audit.data?.pipeline_runs)}
        icon={HardDrive}
      />
    </div>
  );
}
