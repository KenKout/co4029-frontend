import type { CourseAuditQuery, CourseDetailFormatters, TFn } from "./types";

export function AuditTokenGrid({
  t,
  f,
  audit,
}: {
  t: TFn;
  f: CourseDetailFormatters;
  audit: CourseAuditQuery;
}) {
  const { formatDate, formatNumber } = f;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-surface-elev border border-border rounded-lg p-4">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
          {t("admin.course_detail.stats.input_tokens")}
        </p>
        <p className="text-lg font-bold text-text-strong mt-1">
          {formatNumber(audit.data?.total_input_tokens)}
        </p>
      </div>
      <div className="bg-surface-elev border border-border rounded-lg p-4">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
          {t("admin.course_detail.stats.output_tokens")}
        </p>
        <p className="text-lg font-bold text-text-strong mt-1">
          {formatNumber(audit.data?.total_output_tokens)}
        </p>
      </div>
      <div className="bg-surface-elev border border-border rounded-lg p-4">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
          {t("admin.course_detail.stats.first_call")}
        </p>
        <p className="text-sm text-text-strong mt-1">
          {formatDate(audit.data?.first_call_at)}
        </p>
      </div>
      <div className="bg-surface-elev border border-border rounded-lg p-4">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
          {t("admin.course_detail.stats.last_call")}
        </p>
        <p className="text-sm text-text-strong mt-1">
          {formatDate(audit.data?.last_call_at)}
        </p>
      </div>
    </div>
  );
}
