import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import type { RosterEntry } from "@/lib/api/types";
import { StudentRow } from "./StudentRow";
import type { ListQueryState } from "./types";

function EmptyStudents({
  canAssign,
  courseId,
}: {
  canAssign: boolean;
  courseId: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="bg-surface-elev border border-border rounded-lg p-10 text-center">
      <Users className="h-10 w-10 mx-auto mb-3 text-text-subtle" />
      <p className="text-sm font-medium text-text-strong">
        {t("dept_course_detail.empty_students_title")}
      </p>
      {canAssign && (
        <Link
          to="/management/courses/$courseId/enrollments"
          params={{ courseId }}
          className="inline-flex items-center gap-1.5 mt-3 text-xs text-m3-primary hover:underline"
        >
          {t("dept_course_detail.manage_enrollments")}
        </Link>
      )}
    </div>
  );
}

function StudentsBody({
  roster,
  canAssign,
  courseId,
}: {
  roster: ListQueryState<RosterEntry>;
  canAssign: boolean;
  courseId: string;
}) {
  const { t } = useTranslation();
  if (roster.isLoading) {
    return (
      <PageSkeleton
        rows={4}
        rounded="rounded-lg"
        bg="bg-surface-muted"
        gap="space-y-2"
      />
    );
  }
  if (roster.isError) {
    return (
      <div className="bg-surface-elev border border-border rounded-lg p-5">
        <p className="text-sm text-danger">
          {t("dept_course_detail.load_failed_students")}
        </p>
      </div>
    );
  }
  if ((roster.data ?? []).length === 0) {
    return <EmptyStudents canAssign={canAssign} courseId={courseId} />;
  }
  return (
    <div>
      {(roster.data ?? []).map((entry) => (
        <StudentRow key={entry.enrollment_id} entry={entry} />
      ))}
    </div>
  );
}

export function DeptStudentsTab({
  active,
  roster,
  canAssign,
  courseId,
}: {
  active: boolean;
  roster: ListQueryState<RosterEntry>;
  canAssign: boolean;
  courseId: string;
}) {
  const { t } = useTranslation();
  if (!active) return null;
  return (
    <div className="space-y-4">
      {canAssign && (
        <div className="flex justify-end">
          <Link
            to="/management/courses/$courseId/enrollments"
            params={{ courseId }}
          >
            <Button size="sm" className="gap-2">
              <Users className="h-4 w-4" />
              {t("dept_course_detail.manage_enrollments")}
            </Button>
          </Link>
        </div>
      )}
      <StudentsBody roster={roster} canAssign={canAssign} courseId={courseId} />
    </div>
  );
}
