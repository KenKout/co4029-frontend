import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { GraduationCap, Mail, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/use-confirm";
import { useRemoveTeacher } from "@/lib/api/hooks/dept";
import { ApiError } from "@/lib/api/client";
import type { TeacherAssignmentRead } from "@/lib/api/types";

export function TeacherRow({
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
