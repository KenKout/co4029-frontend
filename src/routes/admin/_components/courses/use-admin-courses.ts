import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { useServerTable } from "@/lib/api/use-server-table";
import { usePermissions } from "@/lib/auth/use-permissions";
import { useFormatDateTime } from "@/lib/format/date";
import type { CourseAuthoring } from "@/lib/api/types";

import { buildCourseColumns } from "./courses-columns";

/**
 * Permission gate, the include-deleted filter, the server-side table and the
 * column definitions for the admin courses list.
 *
 * Hook call order is identical to the original component body: translation →
 * navigate → permissions → includeDeleted state → date formatter → permission
 * requirement → server table → columns memo.
 */
export function useAdminCourses() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const permissions = usePermissions();
  const canAdmin = permissions.has("system.administer");
  const [includeDeleted, setIncludeDeleted] = useState(true);
  // Server-side status filter (`status` query param on /admin/courses/search).
  // Undefined = all statuses; draft | published | archived narrows the list.
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const formatDate = useFormatDateTime();

  // Server-side search + sort + page across every course (the old
  // InfiniteList had no search). `include_deleted` and `status` are server
  // filters; falsy values are omitted from the query string by useServerTable.
  const table = useServerTable<CourseAuthoring>({
    queryKey: ["admin", "courses", "search"],
    path: "/admin/courses/search",
    pageSize: 25,
    filters: {
      include_deleted: String(includeDeleted),
      status: statusFilter,
    },
    enabled: !permissions.isLoading && canAdmin,
  });

  const columns = useMemo(
    () => buildCourseColumns(t, formatDate),
    [t, formatDate],
  );

  return {
    t,
    navigate,
    permissionsLoading: permissions.isLoading,
    canAdmin,
    includeDeleted,
    setIncludeDeleted,
    statusFilter,
    setStatusFilter,
    table,
    columns,
  };
}

export type AdminCoursesController = ReturnType<typeof useAdminCourses>;
