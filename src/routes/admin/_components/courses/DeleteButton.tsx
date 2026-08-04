import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Tooltip } from "@/components/ui/tooltip";
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
        toast.error(err.message || t("admin.course_detail.toasts.delete_failed")),
    });
  }

  return (
    <>
      <Tooltip content={t("admin.course_detail.delete")}>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t("admin.course_detail.delete")}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // Cascade tombstone — confirm before deleting. It's reversible
            // (Restore appears on the row afterwards), but it also removes the
            // course's modules/lessons from every listing, so make it deliberate.
            setConfirmOpen(true);
          }}
          disabled={del.isPending}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
        >
          <Trash2 />
        </Button>
      </Tooltip>
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
