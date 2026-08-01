import { AuditStatCards } from "./AuditStatCards";
import { AuditTokenGrid } from "./AuditTokenGrid";
import type { CourseDetailController } from "./use-admin-course-detail";

/** Error / loading / loaded switch for the cost-audit block. */
export function CourseAuditSection({ c }: { c: CourseDetailController }) {
  const { t, f, audit } = c;

  if (audit.isError) {
    return (
      <div className="bg-surface-elev border border-border rounded-lg p-5">
        <p className="text-sm text-danger">
          {t("admin.course_detail.audit_load_failed")}
        </p>
      </div>
    );
  }

  if (audit.isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-24 bg-surface-muted animate-pulse rounded-xl"
          />
        ))}
      </div>
    );
  }

  return (
    <>
      <AuditStatCards t={t} f={f} audit={audit} />

      <AuditTokenGrid t={t} f={f} audit={audit} />
    </>
  );
}
