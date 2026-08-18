import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Mail,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  avatarColor,
  avatarInitials,
} from "@/components/ui/avatar";
import { useConfirm } from "@/components/ui/use-confirm";
import { useRemoveTeacher, useSetTeacherRole } from "@/lib/api/hooks/dept";
import { ApiError } from "@/lib/api/client";
import type { CourseTeacherRole, TeacherAssignmentRead } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/** Small pill drawn beside a teacher's name: Course Instructor vs Assistant. */
export function TeacherRoleBadge({
  role,
}: {
  role: CourseTeacherRole | null | undefined;
}) {
  const { t } = useTranslation();
  const isInstructor = role === "course_instructor";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap",
        isInstructor
          ? "bg-m3-primary/10 text-m3-primary"
          : "bg-surface-muted text-text-muted",
      )}
    >
      {t(
        isInstructor
          ? "dept_course_detail.teacher_role_course_instructor"
          : "dept_course_detail.teacher_role_teacher_assistant",
      )}
    </span>
  );
}

/**
 * Cells for the teachers table. These used to be one hand-rolled
 * `bg-surface-elev border rounded-lg` row; they are now DataTable cells so the
 * tab matches the `/dept` worklist it is reached from.
 *
 * The avatar treatment is deliberately identical to `InstructorCell` on the
 * worklist — the same person was previously drawn as a generic cap icon here
 * and as an initialled avatar there. It now also renders the uploaded photo
 * when there is one (`avatar_url`, presigned by the backend); showing initials
 * for a teacher who has an avatar made this table look like a different
 * person's row from the worklist it is reached from.
 */
export function TeacherIdentityCell({
  assignment,
}: {
  assignment: TeacherAssignmentRead;
}) {
  const { t } = useTranslation();
  const name = assignment.display_name || t("dept_course_detail.no_name");
  return (
    <div className="flex items-center gap-3 min-w-0">
      <Avatar size="sm" className={avatarColor(assignment.user_id)}>
        {assignment.avatar_url && (
          <AvatarImage src={assignment.avatar_url} alt={name} />
        )}
        <AvatarFallback>
          {avatarInitials(name, { uppercase: true })}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-sm font-semibold text-text-strong truncate">
            {name}
          </p>
          <TeacherRoleBadge role={assignment.course_role} />
        </div>
        <p className="text-xs text-text-muted flex items-center gap-1.5 mt-0.5">
          <Mail className="h-3 w-3 shrink-0" />
          <span className="truncate">{assignment.primary_email}</span>
        </p>
      </div>
    </div>
  );
}

export function TeacherRowActions({
  assignment,
  courseId,
  hasAnotherInstructor,
  isSoleTeacher,
}: {
  assignment: TeacherAssignmentRead;
  courseId: string;
  /** True when a DIFFERENT teacher on this course is already Course Instructor. */
  hasAnotherInstructor: boolean;
  /** True when this teacher is the only one assigned to the course. */
  isSoleTeacher: boolean;
}) {
  const { t } = useTranslation();
  const remove = useRemoveTeacher(courseId);
  const setRole = useSetTeacherRole(courseId);
  const { confirm: confirmRemove, dialog: confirmDialog } = useConfirm({
    title: t("dept_course_detail.remove"),
    confirmLabel: t("dept_course_detail.remove"),
    cancelLabel: t("common.cancel"),
  });

  const isInstructor = assignment.course_role === "course_instructor";
  // A TA (or pre-backfill null) can be promoted to Course Instructor only
  // while no Course Instructor exists yet — the backend enforces exactly one.
  const showPromote = !isInstructor && !hasAnotherInstructor;
  // A Course Instructor can be demoted to TA only when another teacher would
  // remain — demoting the sole instructor with no TA is a server 409.
  const showDemote = isInstructor && !isSoleTeacher;

  const handleSetRole = (courseRole: CourseTeacherRole) => {
    setRole.mutate(
      { userId: assignment.user_id, courseRole },
      {
        onSuccess: () =>
          toast.success(
            courseRole === "course_instructor"
              ? t("dept_course_detail.success.promoted")
              : t("dept_course_detail.success.demoted"),
          ),
        onError: (err) => {
          const detail =
            err instanceof ApiError ? err.body || err.message : String(err);
          toast.error(
            t("dept_course_detail.errors.role_failed", { detail }),
          );
        },
      },
    );
  };

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
    <div className="flex items-center gap-1.5">
      {showPromote && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleSetRole("course_instructor");
          }}
          disabled={setRole.isPending}
          className="gap-1.5"
          title={t("dept_course_detail.promote_title")}
        >
          <ArrowUpCircle className="h-3.5 w-3.5" />
          {t("dept_course_detail.promote")}
        </Button>
      )}
      {showDemote && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleSetRole("teacher_assistant");
          }}
          disabled={setRole.isPending}
          className="gap-1.5"
          title={t("dept_course_detail.demote_title")}
        >
          <ArrowDownCircle className="h-3.5 w-3.5" />
          {t("dept_course_detail.demote")}
        </Button>
      )}
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          void handleRemove();
        }}
        disabled={remove.isPending}
        className="gap-1.5"
      >
        <Trash2 className="h-3.5 w-3.5" />
        {t("dept_course_detail.remove")}
      </Button>
      {confirmDialog}
    </div>
  );
}
