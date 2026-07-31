import { useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  GraduationCap,
  Mail,
  Trash2,
  Users,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/use-confirm";
import { Input } from "@/components/ui/input";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import {
  useAssignTeacher,
  useCourseRoster,
  useCourseTeachers,
  useDeptCourses,
  useRemoveTeacher,
} from "@/lib/api/hooks/dept";
import {
  usePermissions,
  useRequirePermission,
} from "@/lib/auth/use-permissions";
import { ApiError } from "@/lib/api/client";
import type { RosterEntry, TeacherAssignmentRead } from "@/lib/api/types";

const UUID_RX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ENROLLMENT_COLOR: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  completed: "bg-m3-primary-fixed text-m3-primary",
  dropped: "bg-slate-100 text-slate-500",
  pending: "bg-amber-100 text-amber-700",
};

type TabKey = "teachers" | "students";

function TabButton({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors cursor-pointer ${
        active
          ? "bg-m3-primary text-white"
          : "bg-surface-muted text-text-muted hover:bg-surface-elev"
      }`}
    >
      {children}
      {typeof count === "number" && (
        <span
          className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] ${
            active ? "bg-white/20" : "bg-surface-elev"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function TeacherRow({
  assignment,
  courseId,
  canManage,
}: {
  assignment: TeacherAssignmentRead;
  courseId: string;
  canManage: boolean;
}) {
  const { t } = useTranslation();
  const remove = useRemoveTeacher(courseId);
  const { confirm: confirmRemove, dialog: confirmDialog } = useConfirm({
    title: t("dept_course_detail.remove"),
    confirmLabel: t("dept_course_detail.remove"),
    cancelLabel: t("common.cancel"),
  });

  const handleRemove = async () => {
    const name = assignment.display_name || assignment.primary_email;
    if (
      !(await confirmRemove({
        description: t("dept_course_detail.remove_confirm", { name }),
      }))
    ) {
      return;
    }
    remove.mutate(assignment.user_id, {
      onSuccess: () => toast.success(t("dept_course_detail.success.removed")),
      onError: (err) => {
        const detail =
          err instanceof ApiError ? err.body || err.message : String(err);
        toast.error(t("dept_course_detail.errors.remove_failed", { detail }));
      },
    });
  };

  return (
    <div className="flex items-center gap-4 bg-surface-elev border border-border rounded-lg p-4 mb-2">
      <div className="w-9 h-9 rounded-full bg-m3-primary-fixed flex items-center justify-center shrink-0">
        <GraduationCap className="h-4 w-4 text-m3-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text-strong truncate">
          {assignment.display_name || t("dept_course_detail.no_name")}
        </p>
        <p className="text-xs text-text-muted flex items-center gap-1.5 mt-0.5">
          <Mail className="h-3 w-3" />
          <span className="truncate">{assignment.primary_email}</span>
        </p>
      </div>
      {canManage && (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={() => void handleRemove()}
          disabled={remove.isPending}
        >
          <Trash2 className="h-3.5 w-3.5" />
          {t("dept_course_detail.remove")}
        </Button>
      )}
      {confirmDialog}
    </div>
  );
}

function AssignTeacherForm({ courseId }: { courseId: string }) {
  const { t } = useTranslation();
  const [userId, setUserId] = useState("");
  const assign = useAssignTeacher(courseId);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = userId.trim();
    if (!UUID_RX.test(trimmed)) {
      toast.error(t("dept_course_detail.errors.invalid_uuid"));
      return;
    }
    assign.mutate(
      { user_id: trimmed },
      {
        onSuccess: () => {
          toast.success(t("dept_course_detail.success.assigned"));
          setUserId("");
        },
        onError: (err) => {
          const detail =
            err instanceof ApiError ? err.body || err.message : String(err);
          toast.error(t("dept_course_detail.errors.assign_failed", { detail }));
        },
      },
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-surface-elev border border-border rounded-lg p-4 mb-4"
    >
      <label className="block text-xs font-semibold text-text-muted mb-2">
        {t("dept_course_detail.assign_label")}
      </label>
      <div className="flex gap-2">
        <Input
          type="text"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="00000000-0000-0000-0000-000000000000"
          disabled={assign.isPending}
          className="font-mono text-xs"
        />
        <Button type="submit" disabled={assign.isPending || !userId.trim()}>
          <UserPlus className="h-3.5 w-3.5" />
          {t("dept_course_detail.assign_button")}
        </Button>
      </div>
      <p className="text-[11px] text-text-muted mt-2">
        {t("dept_course_detail.assign_help")}
      </p>
    </form>
  );
}

function StudentRow({ entry }: { entry: RosterEntry }) {
  const { t, i18n } = useTranslation();
  const locale =
    (i18n.resolvedLanguage ?? i18n.language ?? "en") === "vi"
      ? "vi-VN"
      : "en-US";
  const cls = ENROLLMENT_COLOR[entry.status] ?? "bg-slate-100 text-slate-700";
  const label = t(`dept_course_detail.enrollment_status.${entry.status}`, {
    defaultValue: entry.status,
  });
  const enrolled = new Date(entry.enrolled_at).toLocaleDateString(locale);

  return (
    <div className="flex items-center gap-4 bg-surface-elev border border-border rounded-lg p-4 mb-2">
      <div className="w-9 h-9 rounded-full bg-surface-muted flex items-center justify-center shrink-0">
        <Users className="h-4 w-4 text-text-muted" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text-strong truncate">
          {entry.display_name || entry.primary_email}
        </p>
        <p className="text-xs text-text-muted flex items-center gap-1.5 mt-0.5">
          <Mail className="h-3 w-3" />
          <span className="truncate">{entry.primary_email}</span>
        </p>
      </div>
      <div className="text-right shrink-0">
        <span
          className={`inline-block px-2 py-0.5 text-[11px] font-semibold rounded-md ${cls}`}
        >
          {label}
        </span>
        <p className="text-[11px] text-text-muted mt-1">
          {t("dept_course_detail.enrolled_at", { date: enrolled })}
        </p>
      </div>
    </div>
  );
}

export default function DeptCourseDetailPage() {
  const { t } = useTranslation();
  const { courseId } = useParams({ strict: false }) as { courseId: string };

  const permissions = usePermissions();
  const canAssign = permissions.hasAny(
    "course.assign_teacher",
    "system.administer",
  );
  const canRead = canAssign || permissions.has("course.enrollment.read");

  useRequirePermission(canRead, {
    messageKey: "dept_course_detail.no_permission",
  });

  const enabled = !permissions.isLoading && canRead;

  const courses = useDeptCourses();
  const course = courses.data?.find((c) => c.id === courseId);

  const teachers = useCourseTeachers(enabled ? courseId : undefined);
  const roster = useCourseRoster(enabled ? courseId : undefined);

  const [tab, setTab] = useState<TabKey>("teachers");

  if (permissions.isLoading) {
    return (
      <div className="space-y-3 pb-12">
        <div className="h-16 bg-surface-muted animate-pulse rounded-lg" />
        <div className="h-32 bg-surface-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!canRead) {
    return null;
  }

  return (
    <div className="space-y-6 pb-12">
      <div>
        <Link
          to="/dept"
          className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-m3-primary transition-colors mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("dept_course_detail.back")}
        </Link>
        <h1 className="text-2xl font-headline font-bold text-text-strong">
          {course?.title ?? t("dept_course_detail.course_fallback")}
        </h1>
        {course?.slug && (
          <p className="text-sm text-text-muted mt-1">{course.slug}</p>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        <TabButton
          active={tab === "teachers"}
          onClick={() => setTab("teachers")}
          count={teachers.data?.length}
        >
          {t("dept_course_detail.tabs.teachers")}
        </TabButton>
        <TabButton
          active={tab === "students"}
          onClick={() => setTab("students")}
          count={roster.data?.length}
        >
          {t("dept_course_detail.tabs.students")}
        </TabButton>
      </div>

      {tab === "teachers" && (
        <div>
          {canAssign && <AssignTeacherForm courseId={courseId} />}

          {teachers.isLoading ? (
            <PageSkeleton
              rows={3}
              rounded="rounded-lg"
              bg="bg-surface-muted"
              gap="space-y-2"
            />
          ) : teachers.isError ? (
            <div className="bg-surface-elev border border-border rounded-lg p-5">
              <p className="text-sm text-danger">
                {t("dept_course_detail.load_failed_teachers")}
              </p>
            </div>
          ) : (teachers.data ?? []).length === 0 ? (
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
          ) : (
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
          )}
        </div>
      )}

      {tab === "students" && (
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
          {roster.isLoading ? (
            <PageSkeleton
              rows={4}
              rounded="rounded-lg"
              bg="bg-surface-muted"
              gap="space-y-2"
            />
          ) : roster.isError ? (
            <div className="bg-surface-elev border border-border rounded-lg p-5">
              <p className="text-sm text-danger">
                {t("dept_course_detail.load_failed_students")}
              </p>
            </div>
          ) : (roster.data ?? []).length === 0 ? (
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
          ) : (
            <div>
              {(roster.data ?? []).map((entry) => (
                <StudentRow key={entry.enrollment_id} entry={entry} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
