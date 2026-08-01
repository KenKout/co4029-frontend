import { useTranslation } from "react-i18next";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CodeRowController } from "./use-code-row";

/**
 * Edit + delete buttons for one invitation code, swapping to an inline
 * confirm/cancel pair once deletion has been requested.
 */
export function CodeRowActions({
  controller,
  onEdit,
}: {
  controller: CodeRowController;
  onEdit: () => void;
}) {
  const { t } = useTranslation();
  const { del, confirming, setConfirming, handleDelete } = controller;

  return (
    <div className="flex justify-end gap-1">
      {confirming ? (
        <>
          <Button
            size="xs"
            variant="destructive"
            onClick={handleDelete}
            disabled={del.isPending}
          >
            {del.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              t("common.confirm")
            )}
          </Button>
          <Button
            size="xs"
            variant="ghost"
            onClick={() => setConfirming(false)}
            disabled={del.isPending}
          >
            {t("common.cancel")}
          </Button>
        </>
      ) : (
        <>
          <Button size="xs" variant="outline" onClick={onEdit}>
            {t("management_course_enrollments.codes.edit_button")}
          </Button>
          <Button
            size="xs"
            variant="ghost"
            onClick={() => setConfirming(true)}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </>
      )}
    </div>
  );
}
