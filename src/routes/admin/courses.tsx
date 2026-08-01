import { Skeleton } from "@/components/ui/skeleton";

import { CoursesTable } from "./_components/courses/CoursesTable";
import { useAdminCourses } from "./_components/courses/use-admin-courses";

export default function AdminCoursesPage() {
  const c = useAdminCourses();
  const { t, table } = c;

  if (c.permissionsLoading) {
    return (
      <div className="space-y-3 pb-12">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!c.canAdmin) {
    return null;
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-headline font-bold text-text-strong">
            {t("admin.courses_list.title")}
          </h1>
          <p className="text-sm text-text-muted mt-1">
            {t("admin.courses_list.subtitle")}
          </p>
        </div>
      </div>

      {table.isError ? (
        <div className="bg-surface-elev border border-border rounded-lg p-5">
          <p className="text-sm text-danger">
            {t("admin.courses_list.load_failed")}
          </p>
        </div>
      ) : (
        <CoursesTable c={c} />
      )}
    </div>
  );
}
