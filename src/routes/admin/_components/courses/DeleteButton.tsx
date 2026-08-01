import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useDeleteCourse } from "@/lib/api/hooks/admin";
import type { CourseAuthoring } from "@/lib/api/types";

export function DeleteButton({ course }: { course: CourseAuthoring }) {
  const { t } = useTranslation();
  const del = useDeleteCourse();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function runDelete() {
    setConfirmOpen(false);
    del.mutate(course.id, {
      onSuccess: () => toast.success(t("admin.course_detail.toasts.deleted")),
      onError: (err) =>
        toast.error(
          (err as Error).message ||
            t("admin.course_detail.toasts.delete_failed"),
        ),
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          // Cascade tombstone — confirm before deleting. It's reversible
          // (Restore appears on the row afterwards), but it also removes the
          // course's modules/lessons from every listing, so make it deliberate.
          setConfirmOpen(true);
        }}
        disabled={del.isPending}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-danger text-white hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
      >
        <Trash2 className="h-3.5 w-3.5" />
        {del.isPending
          ? t("admin.course_detail.deleting")
          : t("admin.course_detail.delete")}
      </button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("admin.course_detail.delete")}
        description={t("admin.course_detail.delete_confirm", {
          title: course.title,
        })}
        confirmLabel={t("admin.course_detail.delete")}
        cancelLabel={t("common.cancel")}
        onConfirm={runDelete}
        isPending={del.isPending}
      />
    </>
  );
}
