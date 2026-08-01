import { useTranslation } from "react-i18next";
import { GraduationCap } from "lucide-react";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import type { TeacherAssignmentRead } from "@/lib/api/types";
import { AssignTeacherForm } from "./AssignTeacherForm";
import { TeacherRow } from "./TeacherRow";
import type { ListQueryState } from "./types";

function EmptyTeachers({ canAssign }: { canAssign: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="bg-surface-elev border border-border rounded-lg p-10 text-center">
      <GraduationCap className="h-10 w-10 mx-auto mb-3 text-text-subtle" />
      <p className="text-sm font-medium text-text-strong">
        {t("dept_course_detail.empty_teachers_title")}
      </p>
      {canAssign && (
        <p className="text-xs text-text-muted mt-1">
          {t("dept_course_detail.empty_teachers_body")}
        </p>
      )}
    </div>
  );
}

function TeachersBody({
  teachers,
  canAssign,
  courseId,
}: {
  teachers: ListQueryState<TeacherAssignmentRead>;
  canAssign: boolean;
  courseId: string;
}) {
  const { t } = useTranslation();
  if (teachers.isLoading) {
    return (
      <PageSkeleton
        rows={3}
        rounded="rounded-lg"
        bg="bg-surface-muted"
        gap="space-y-2"
      />
    );
  }
  if (teachers.isError) {
    return (
      <div className="bg-surface-elev border border-border rounded-lg p-5">
        <p className="text-sm text-danger">
          {t("dept_course_detail.load_failed_teachers")}
        </p>
      </div>
    );
  }
  if ((teachers.data ?? []).length === 0) {
    return <EmptyTeachers canAssign={canAssign} />;
  }
  return (
    <div>
      {(teachers.data ?? []).map((teacher) => (
        <TeacherRow
          key={teacher.user_id}
          assignment={teacher}
          courseId={courseId}
          canManage={canAssign}
        />
      ))}
    </div>
  );
}

export function DeptTeachersTab({
  active,
  teachers,
  canAssign,
  courseId,
}: {
  active: boolean;
  teachers: ListQueryState<TeacherAssignmentRead>;
  canAssign: boolean;
  courseId: string;
}) {
  if (!active) return null;
  return (
    <div>
      {canAssign && <AssignTeacherForm courseId={courseId} />}

      <TeachersBody
        teachers={teachers}
        canAssign={canAssign}
        courseId={courseId}
      />
    </div>
  );
}
