import { useTranslation } from "react-i18next";
import { Loader2, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RosterTabController } from "./use-roster-tab";

/**
 * The drop button for one roster row, plus the inline confirm/cancel pair it
 * swaps to while that row is the one awaiting confirmation.
 */
export function RosterRowActions({
  studentId,
  controller,
}: {
  studentId: string;
  controller: RosterTabController;
}) {
  const { t } = useTranslation();
  const { confirmId, setConfirmId, drop, handleDrop } = controller;

  return (
    <div className="flex justify-end">
      {confirmId === studentId ? (
        <div className="flex gap-1">
          <Button
            size="xs"
            variant="destructive"
            onClick={() => handleDrop(studentId)}
            disabled={drop.isPending}
          >
            {drop.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              t("common.confirm")
            )}
          </Button>
          <Button
            size="xs"
            variant="ghost"
            onClick={() => setConfirmId(null)}
            disabled={drop.isPending}
          >
            {t("common.cancel")}
          </Button>
        </div>
      ) : (
        <Button
          size="xs"
          variant="outline"
          onClick={() => setConfirmId(studentId)}
          className="gap-1"
        >
          <UserMinus className="h-3 w-3" />
          {t("management_course_enrollments.actions.drop")}
        </Button>
      )}
    </div>
  );
}
