import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useDeleteDeptCourse } from "@/lib/api/hooks/dept";

/**
 * Manager-owned course delete (``course.delete``) — the dept surface is where
 * a manager destroys a course. Backend gates the same code with
 * ``allow_owner=False``, so teachers can never delete even their own course.
 */
export function DeleteCourseButton({
  courseId,
  courseTitle,
}: {
  courseId: string;
  courseTitle: string;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const deleteCourse = useDeleteDeptCourse();
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function runDelete() {
    try {
      await deleteCourse.mutateAsync(courseId);
      toast.success(t("dept_course_detail.delete.deleted"));
      setConfirmOpen(false);
      void navigate({ to: "/management/courses" });
    } catch (err: unknown) {
      toast.error(
        (err as Error).message || t("dept_course_detail.delete.failed"),
      );
      setConfirmOpen(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setConfirmOpen(true)}
        disabled={deleteCourse.isPending}
        className="shrink-0 gap-2 border-destructive/40 text-destructive transition-all hover:-translate-y-0.5 hover:bg-destructive hover:text-white hover:shadow-md active:translate-y-0 active:scale-95"
      >
        <Trash2 className="h-4 w-4" />
        {t("dept_course_detail.delete.button")}
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("dept_course_detail.delete.title")}
        description={t("dept_course_detail.delete.body", {
          title: courseTitle,
        })}
        confirmLabel={t("dept_course_detail.delete.button")}
        cancelLabel={t("common.cancel", "Cancel")}
        confirmVariant="destructive"
        onConfirm={runDelete}
        isPending={deleteCourse.isPending}
      />
    </>
  );
}
