import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { ClipboardCheck, ClipboardEdit, Mail, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  avatarColor,
  avatarInitials,
} from "@/components/ui/avatar";
import { useConfirm } from "@/components/ui/use-confirm";
import { useRemoveTeacher, useSetTeacherTitles } from "@/lib/api/hooks/dept";
import { ApiError } from "@/lib/api/client";
import type { TeacherAssignmentRead } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * Title pill(s) beside a teacher's name.
 *
 * Titles are now independent flags (user decision 2026-08-30): a teacher may
 * be Course Instructor, Teacher Assistant, or BOTH — which renders as both
 * pills side by side instead of one string that could not say it.
 */
export function TeacherTitleBadges({
  assignment,
}: {
  assignment: TeacherAssignmentRead;
}) {
  const { t } = useTranslation();
  return (
    <span className="inline-flex items-center gap-1">
      {assignment.is_instructor && (
        <TitlePill
          label={t("dept_course_detail.teacher_role_course_instructor")}
          tone="primary"
        />
      )}
      {assignment.is_assistant && (
        <TitlePill
          label={t("dept_course_detail.teacher_role_teacher_assistant")}
          tone="muted"
        />
      )}
    </span>
  );
}

function TitlePill({
  label,
  tone,
}: {
  label: string;
  tone: "primary" | "muted";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap",
        tone === "primary"
          ? "bg-m3-primary/10 text-m3-primary"
          : "bg-surface-muted text-text-muted",
      )}
    >
      {label}
    </span>
  );
}

/**
 * Cells for the teachers table. These used to be one hand-rolled
 * `bg-surface-elev border rounded-lg` row; they are now DataTable cells so the
 * tab matches the `/management/courses` worklist it is reached from.
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
          <TeacherTitleBadges assignment={assignment} />
        </div>
        <p className="text-xs text-text-muted flex items-center gap-1.5 mt-0.5">
          <Mail className="h-3 w-3 shrink-0" />
          <span className="truncate">{assignment.primary_email}</span>
        </p>
      </div>
    </div>
  );
}

/**
 * Per-row actions: toggle the two title flags + remove.
 *
 * User decision 2026-08-30: titles are independent flags, so "promote /
 * demote" became two toggles. The backend owns the two invariants (both
 * flags never both false; a staffed course keeps >= 1 instructor), but the
 * toggles pre-disable the exact transitions that would 409 so the manager
 * learns the rule from the UI, not from an error toast:
 * - turning the LAST instructor's flag off is disabled;
 * - turning a title off when it is the teacher's only title is disabled.
 */
export function TeacherRowActions({
  assignment,
  courseId,
  hasAnotherInstructor,
}: {
  assignment: TeacherAssignmentRead;
  courseId: string;
  /** True when a DIFFERENT teacher on this course is Course Instructor. */
  hasAnotherInstructor: boolean;
}) {
  const { t } = useTranslation();
  const remove = useRemoveTeacher(courseId);
  const setTitles = useSetTeacherTitles(courseId);
  const { confirm: confirmRemove, dialog: confirmDialog } = useConfirm({
    title: t("dept_course_detail.remove"),
    confirmLabel: t("dept_course_detail.remove"),
    cancelLabel: t("common.cancel"),
  });

  const isInstructor = Boolean(assignment.is_instructor);
  const isAssistant = Boolean(assignment.is_assistant);

  // Turning the last instructor off would 409 (staffed course keeps >= 1 CI).
  const instructorOffDisabled = isInstructor && !hasAnotherInstructor;
  // Turning a title off when it is the teacher's ONLY title would 409
  // (course-scoped teacher must hold at least one).
  const instructorOnDisabled = !isInstructor && !isAssistant;
  const assistantOffDisabled = isAssistant && !isInstructor;
  const assistantOnDisabled = !isAssistant && !isInstructor;

  const handleToggle = (field: "instructor" | "assistant", next: boolean) => {
    const isInstructorNext = field === "instructor" ? next : isInstructor;
    const isAssistantNext = field === "assistant" ? next : isAssistant;
    setTitles.mutate(
      { userId: assignment.user_id, isInstructor: isInstructorNext, isAssistant: isAssistantNext },
      {
        onSuccess: () =>
          toast.success(t("dept_course_detail.success.title_updated")),
        onError: (err) => {
          const detail =
            err instanceof ApiError ? err.body || err.message : String(err);
          toast.error(t("dept_course_detail.errors.role_failed", { detail }));
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
      <Button
        type="button"
        variant={isInstructor ? "default" : "outline"}
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          handleToggle("instructor", !isInstructor);
        }}
        disabled={setTitles.isPending || instructorOnDisabled || instructorOffDisabled}
        className="gap-1.5"
        title={
          instructorOffDisabled
            ? t("dept_course_detail.last_instructor_title")
            : instructorOnDisabled
              ? t("dept_course_detail.title_required_title")
              : t("dept_course_detail.title_instructor_title")
        }
      >
        <ClipboardEdit className="h-3.5 w-3.5" />
        {t("dept_course_detail.teacher_role_course_instructor")}
      </Button>
      <Button
        type="button"
        variant={isAssistant ? "default" : "outline"}
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          handleToggle("assistant", !isAssistant);
        }}
        disabled={setTitles.isPending || assistantOnDisabled || assistantOffDisabled}
        className="gap-1.5"
        title={
          assistantOnDisabled
            ? t("dept_course_detail.title_required_title")
            : t("dept_course_detail.title_assistant_title")
        }
      >
        <ClipboardCheck className="h-3.5 w-3.5" />
        {t("dept_course_detail.teacher_role_teacher_assistant")}
      </Button>
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